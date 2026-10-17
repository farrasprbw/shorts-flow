import { pool, query } from '../../db/index.js';

export interface ApprovalResult {
  success: boolean;
  conflict?: boolean;
  statusCode: number;
  message: string;
  video?: Record<string, unknown>;
  conflictDetail?: {
    currentStatus: string;
    currentLevel: number;
    lastActionBy?: string;
    lastActionTime?: string;
  };
}

export async function processApproval(
  videoId: string,
  userId: string,
  action: 'approve' | 'reject',
  expectedLevel: number,
  channel: 'dashboard' | 'telegram' = 'dashboard',
  note: string = ''
): Promise<ApprovalResult> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Fetch video to inspect current state
    const currentVideoRes = await client.query(
      `SELECT id, title, status, current_level, required_max_level, version
       FROM videos
       WHERE id = $1 FOR SHARE;`,
      [videoId]
    );

    if (currentVideoRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return {
        success: false,
        statusCode: 404,
        message: 'Video tidak ditemukan.'
      };
    }

    const video = currentVideoRes.rows[0];

    // Determine target status and level
    let nextStatus: string;
    let nextLevel: number;

    if (action === 'reject') {
      nextStatus = 'rejected';
      nextLevel = video.current_level;
    } else {
      const isFinal = expectedLevel >= video.required_max_level;
      nextStatus = isFinal ? 'approved' : 'pending_review';
      nextLevel = isFinal ? expectedLevel : expectedLevel + 1;
    }

    // 2. ATOMIC CONDITIONAL UPDATE (Single Source of Truth)
    // Anti-Race Condition: Only one simultaneous process can succeed
    const updateRes = await client.query(
      `UPDATE videos
       SET status = $1,
           current_level = $2,
           version = version + 1,
           updated_at = NOW(),
           rejection_reason = CASE WHEN $3 = 'reject' THEN $4 ELSE rejection_reason END
       WHERE id = $5
         AND status = 'pending_review'
         AND current_level = $6
       RETURNING id, title, status, current_level, required_max_level, version, updated_at;`,
      [nextStatus, nextLevel, action, note, videoId, expectedLevel]
    );

    // 3. IF AFFECTED ROWS == 0 -> RACE CONDITION CONFLICT!
    if (updateRes.rowCount === 0) {
      await client.query('ROLLBACK');

      // Fetch who acted first to give informative response
      const lastApprovalRes = await query(
        `SELECT a.action, a.created_at, u.name as user_name
         FROM approvals a
         JOIN users u ON a.user_id = u.id
         WHERE a.video_id = $1
         ORDER BY a.created_at DESC
         LIMIT 1;`,
        [videoId]
      );

      const lastApproval = lastApprovalRes.rows[0];

      return {
        success: false,
        conflict: true,
        statusCode: 409,
        message: lastApproval
          ? `Aksi ditolak: Video sudah diproses oleh ${lastApproval.user_name} (${lastApproval.action}) pada ${new Date(lastApproval.created_at).toLocaleTimeString('id-ID')}.`
          : 'Aksi ditolak: Status video telah berubah di server.',
        conflictDetail: {
          currentStatus: video.status,
          currentLevel: video.current_level,
          lastActionBy: lastApproval?.user_name,
          lastActionTime: lastApproval?.created_at
        }
      };
    }

    // 4. INSERT AUDIT LOG
    await client.query(
      `INSERT INTO approvals (video_id, user_id, level, action, channel, note, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW());`,
      [videoId, userId, expectedLevel, action, channel, note]
    );

    await client.query('COMMIT');

    const updatedVideo = updateRes.rows[0];

    // Real-time synchronization: if action was taken in Dashboard, sync & remove buttons on Telegram!
    if (channel === 'dashboard') {
      try {
        const { syncTelegramCardFromDashboard } = await import('../../bot.js');
        const userRes = await query('SELECT name FROM users WHERE id = $1;', [userId]);
        const userName = userRes.rows[0]?.name || 'Reviewer';
        await syncTelegramCardFromDashboard(videoId, expectedLevel, action, userName);
      } catch (err: unknown) {
        console.warn('[processApproval] Gagal sinkronisasi Telegram:', (err as Error).message);
      }
    }

    // If final approved, automatically enqueue to videoPublishingQueue!
    if (nextStatus === 'approved') {
      try {
        const schedRes = await query(
          `INSERT INTO schedules (video_id, platform, scheduled_at, status)
           VALUES ($1, 'youtube', NOW(), 'in_progress')
           RETURNING id;`,
          [videoId]
        );
        const scheduleId = schedRes.rows[0]?.id;
        const { videoPublishingQueue } = await import('../../workers/index.js');
        await videoPublishingQueue.add('publish-youtube', {
          scheduleId,
          videoId,
          platform: 'youtube'
        });
        console.log(`[processApproval] 🚀 Video ${videoId} otomatis dijadwalkan dan dimasukkan ke worker antrian publishing YouTube.`);
      } catch (e: unknown) {
        console.warn('[processApproval] Warning saat enqueue publishing:', (e as Error).message);
      }
    }

    // If advancing to Level 2 review, notify Telegram reviewers for Level 2
    if (nextStatus === 'pending_review' && nextLevel === 2) {
      try {
        const { sendVideoReviewToTelegramForLevel } = await import('../../bot.js');
        await sendVideoReviewToTelegramForLevel(2, {
          id: videoId,
          title: updatedVideo.title,
          script: (video as { script?: string }).script || updatedVideo.title,
          duration: 45,
          level: 2,
          platforms: ['youtube']
        });
        console.log(`[processApproval] 📲 Notifikasi Level 2 review berhasil dikirim ke Telegram untuk video: ${videoId}`);
      } catch (err: unknown) {
        console.warn('[processApproval] Gagal kirim notif Telegram L2:', (err as Error).message);
      }
    }

    const message = action === 'reject'
      ? '❌ Video berhasil ditolak (status: rejected).'
      : nextStatus === 'approved'
        ? '✅ Final approval berhasil! Video disetujui dan antrian upload YouTube Shorts telah diproses.'
        : `✅ Level ${expectedLevel} disetujui! Video lanjut ke Level ${nextLevel}.`;

    return {
      success: true,
      statusCode: 200,
      message,
      video: updatedVideo
    };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    console.error('[processApproval] Error:', error);
    return {
      success: false,
      statusCode: 500,
      message: (error as Error).message || 'Terjadi kesalahan sistem saat memproses approval.'
    };
  } finally {
    client.release();
  }
}
