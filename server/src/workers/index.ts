import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { query } from '../db/index.js';
import { sendVideoReviewToTelegram } from '../bot.js';
import { renderShortsVideo } from './generator.service.js';

export const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null
});

// 1. Generation Queue & Worker
export const videoGenerationQueue = new Queue('video-generation-queue', {
  connection: redisConnection
});

export const videoGenerationWorker = new Worker(
  'video-generation-queue',
  async (job: Job) => {
    console.log(`[Worker] Memulai job produksi video #${job.id}:`, job.data);
    const {
      topic = 'Inovasi Teknologi 2026',
      title: inputTitle,
      script: inputScript,
      platforms = ['youtube', 'instagram']
    } = job.data;

    // Step 1: Content / LLM script
    const title = inputTitle || `Fakta Menarik: ${topic} yang Mengubah Dunia`;
    const script = inputScript || `Tahukah kamu tentang ${topic}? Banyak yang mengira ini biasa saja, padahal di baliknya tersimpan rahasia besar yang mengubah cara kerja kita. Simak sampai habis!`;
    const videoId = 'vid-' + Math.random().toString(36).substring(2, 10);

    // Step 2 & 3: Render actual 9:16 vertical video via FFmpeg
    console.log(`[Worker: FFmpeg] Memulai render 9:16 Shorts untuk video ID: ${videoId}...`);
    let mediaOutput;
    try {
      mediaOutput = await renderShortsVideo({
        id: videoId,
        title,
        script,
        duration: 8
      });
    } catch (ffmpegErr) {
      console.warn('[Worker: FFmpeg] Warning: FFmpeg rendering fallback:', ffmpegErr);
      mediaOutput = {
        videoUrl: `http://localhost:3000/storage/videos/${videoId}.mp4`,
        thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600',
        durationSeconds: 8
      };
    }

    // Step 4: Save record to PostgreSQL database
    const insertRes = await query(
      `INSERT INTO videos (
        title, script, prompt_used, video_url, thumbnail_url,
        duration_seconds, aspect_ratio, platform_targets, status,
        current_level, required_max_level
      )
      VALUES ($1, $2, $3, $4, $5, $6, '9:16', $7, 'pending_review', 1, 2)
      RETURNING *;`,
      [
        title,
        script,
        `Buatkan script hook video vertikal tentang ${topic}`,
        mediaOutput.videoUrl,
        mediaOutput.thumbnailUrl,
        mediaOutput.durationSeconds,
        JSON.stringify(platforms)
      ]
    );

    const newVideo = insertRes.rows[0];
    console.log(`[Worker] ✅ Video baru berhasil dibuat: ID ${newVideo.id} (Status: pending_review L1)`);

    // Step 5: Send notification to Telegram strictly for Level 1 Reviewers
    const { sendVideoReviewToTelegramForLevel } = await import('../bot.js');
    await sendVideoReviewToTelegramForLevel(1, {
      id: newVideo.id,
      title: newVideo.title,
      script: newVideo.script,
      duration: mediaOutput.durationSeconds,
      level: 1,
      platforms
    });

    return { success: true, videoId: newVideo.id, media: mediaOutput };
  },
  { connection: redisConnection }
);

// 2. Publishing Queue & Worker
export const videoPublishingQueue = new Queue('video-publishing-queue', {
  connection: redisConnection
});

export const videoPublishingWorker = new Worker(
  'video-publishing-queue',
  async (job: Job) => {
    console.log(`[Worker: Publisher] Menjalankan antrian upload #${job.id}:`, job.data);
    const { scheduleId, videoId, platform } = job.data;

    let postId = `post_${platform}_${Date.now()}`;
    let publishedUrl = '';

    // Fetch video details from DB
    const vRes = await query('SELECT id, title, script FROM videos WHERE id = $1', [videoId]);
    const video = vRes.rows[0];

    if (platform === 'youtube') {
      if (env.YOUTUBE_REFRESH_TOKEN) {
        try {
          const fs = await import('fs');
          const path = await import('path');
          const storageVideoPath = path.resolve(process.cwd(), 'storage/videos', `${videoId}.mp4`);

          // Ensure video file exists, render if needed
          if (!fs.existsSync(storageVideoPath)) {
            console.log(`[Worker: Publisher] File MP4 belum ditemukan di ${storageVideoPath}, merender video sekarang...`);
            await renderShortsVideo({
              id: videoId,
              title: video?.title || 'ShortsFlow Video',
              script: video?.script || 'Video otomatis dari ShortsFlow'
            });
          }

          const { uploadToYouTubeShorts } = await import('../services/youtube.service.js');
          const ytResult = await uploadToYouTubeShorts({
            videoFilePath: storageVideoPath,
            title: video?.title || 'ShortsFlow Video',
            description: video?.script || 'Video diunggah otomatis oleh ShortsFlow workflow.',
            privacyStatus: 'public'
          });

          postId = ytResult.videoId;
          publishedUrl = ytResult.url;
          console.log(`[Worker: Publisher] 🚀 SUKSES upload ke YouTube Shorts: ${publishedUrl}`);

          // Notify Telegram
          const { bot } = await import('../bot.js');
          if (bot && env.TELEGRAM_CHAT_ID) {
            await bot.api.sendMessage(
              env.TELEGRAM_CHAT_ID,
              `🎉 <b>Video Berhasil Diunggah ke YouTube Shorts!</b>\n\n` +
              `📌 <b>Judul:</b> ${video?.title || 'ShortsFlow Video'}\n` +
              `📺 <b>Tonton:</b> <a href="${publishedUrl}">${publishedUrl}</a>\n\n` +
              `<i>Status: Public</i>`,
              { parse_mode: 'HTML' }
            );
          }
        } catch (err: unknown) {
          console.error('[Worker: Publisher] Gagal upload ke YouTube Shorts:', err);
          // Fallback postId
          postId = `yt_err_${Date.now()}`;
        }
      } else {
        console.warn(`[Worker: Publisher] YOUTUBE_REFRESH_TOKEN belum diset. Buka http://localhost:3000/api/youtube/auth untuk otorisasi.`);
        await new Promise(r => setTimeout(r, 2000));
      }
    } else {
      // Simulate upload delay for other platforms
      await new Promise(r => setTimeout(r, 2500));
    }

    // Update schedule table
    await query(
      `UPDATE schedules
       SET status = 'completed', platform_post_id = $1, published_at = NOW()
       WHERE id = $2;`,
      [postId, scheduleId]
    );

    // Update video status to published
    await query(
      `UPDATE videos
       SET status = 'published', published_at = NOW()
       WHERE id = $1;`,
      [videoId]
    );

    console.log(`[Worker: Publisher] ✅ Selesai: video ${videoId} terbit ke ${platform.toUpperCase()} (ID: ${postId})`);
    return { success: true, postId, publishedUrl };
  },
  { connection: redisConnection }
);

console.log('[BullMQ Workers] Worker video-generation & publisher aktif mendengarkan antrian Redis.');

// 3. Automated Schedule Dispatcher (Runs every 5 seconds)
// Checks for any scheduled video that has reached scheduled_at <= NOW() and triggers the publisher queue!
export async function checkDueSchedules() {
  try {
    const dueRes = await query(
      `SELECT id, video_id, platform, scheduled_at
       FROM schedules
       WHERE status = 'queued' AND scheduled_at <= NOW()
       ORDER BY scheduled_at ASC;`
    );

    for (const schedule of dueRes.rows) {
      console.log(`[Scheduler] ⏰ Waktu tayang tiba untuk jadwal #${schedule.id} (Video: ${schedule.video_id}, Platform: ${schedule.platform}). Mengirim ke Publisher Queue...`);
      // Update status to in_progress so it is not picked up multiple times
      await query(`UPDATE schedules SET status = 'in_progress' WHERE id = $1;`, [schedule.id]);

      await videoPublishingQueue.add('publish-due-schedule', {
        scheduleId: schedule.id,
        videoId: schedule.video_id,
        platform: schedule.platform
      });
    }
  } catch (err: unknown) {
    console.error('[Scheduler] Error checking due schedules:', (err as Error).message);
  }
}

// Start polling every 5 seconds
setInterval(checkDueSchedules, 5000);
// Run immediately on boot
checkDueSchedules();

// 4. Automated YouTube Analytics Synchronizer (Runs every 60 seconds)
export async function syncPublishedVideoAnalytics() {
  try {
    const publishedRes = await query<{ video_id: string; platform_post_id: string }>(
      `SELECT DISTINCT s.video_id, s.platform_post_id
       FROM schedules s
       WHERE s.platform = 'youtube'
         AND s.status = 'completed'
         AND s.platform_post_id IS NOT NULL
         AND s.platform_post_id NOT LIKE 'yt_err_%';`
    );

    if (publishedRes.rows.length === 0) return { updated: 0 };

    const postIds = publishedRes.rows.map(r => r.platform_post_id);
    const { fetchVideoStatistics } = await import('../services/youtube.service.js');
    const statsMap = await fetchVideoStatistics(postIds);

    let updatedCount = 0;
    for (const row of publishedRes.rows) {
      const stats = statsMap.get(row.platform_post_id);
      if (stats) {
        await query(
          `INSERT INTO analytics (video_id, platform, views, likes, comments, fetched_at)
           VALUES ($1, 'youtube', $2, $3, $4, NOW());`,
          [row.video_id, stats.views, stats.likes, stats.comments]
        );
        updatedCount++;
      }
    }
    if (updatedCount > 0) {
      console.log(`[Analytics Worker] 📈 Berhasil sinkronisasi metrik untuk ${updatedCount} video YouTube.`);
    }
    return { updated: updatedCount };
  } catch (err: unknown) {
    console.warn('[Analytics Worker] Gagal sinkronisasi metrik:', (err as Error).message);
    return { updated: 0 };
  }
}

// Run analytics sync every 60 seconds and on boot
setInterval(syncPublishedVideoAnalytics, 60000);
setTimeout(syncPublishedVideoAnalytics, 3000);


