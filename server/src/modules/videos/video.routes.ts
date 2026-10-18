import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { query } from '../../db/index.js';
import { processApproval } from '../approvals/approval.service.js';

interface DecodedJwt {
  userId: string;
  email: string;
  roles?: string[];
  levels?: number[];
}

interface VideoQuery {
  status?: string;
  level?: string;
  search?: string;
  onlyActionable?: string;
  userLevel?: string;
}

interface VideoParams {
  id: string;
}

interface ApprovalBody {
  level: number;
  note?: string;
}

interface GenerateBody {
  topic?: string;
  title?: string;
  script?: string;
  platforms?: string[];
}

interface SimulateBody {
  videoId?: string;
}

export const videoRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // GET /api/videos - List videos with role-level payload & actionable filtering
  fastify.get('/', async (request) => {
    let userLevels: number[] = [];
    let isAdmin = false;

    try {
      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decoded = fastify.jwt.verify<DecodedJwt>(token);
        if (decoded) {
          userLevels = decoded.levels || [];
          isAdmin = userLevels.includes(0) || !!(decoded.roles && decoded.roles.includes('admin'));
        }
      }
    } catch {
      // Continue if unauthenticated or token expired
    }

    const { status, level, search, onlyActionable, userLevel } = (request.query as VideoQuery) || {};

    if (userLevel !== undefined) {
      const parsed = parseInt(userLevel, 10);
      if (!isNaN(parsed) && !userLevels.includes(parsed)) {
        userLevels.push(parsed);
      }
    }

    let sql = `
      SELECT v.id, v.title, v.script, v.video_url, v.thumbnail_url, v.duration_seconds,
             v.platform_targets, v.status, v.current_level, v.required_max_level,
             v.created_at, v.updated_at
      FROM videos v
      WHERE 1=1
    `;
    const params: unknown[] = [];

    // Strict review level filtering: each reviewer only reviews their assigned tier
    const reviewLevels = userLevels.filter(lvl => lvl === 1 || lvl === 2);
    if (onlyActionable === 'true') {
      if (reviewLevels.length === 0) {
        // User has no reviewer roles (e.g. viewer)
        sql += ` AND v.status != 'pending_review'`;
      } else {
        params.push(reviewLevels);
        sql += ` AND (v.status != 'pending_review' OR v.current_level = ANY($${params.length}::int[]))`;
      }
    }

    if (status && status !== 'all') {
      params.push(status === 'pending' ? 'pending_review' : status);
      sql += ` AND v.status = $${params.length}`;
    }

    if (level && level !== 'all') {
      const lvlNum = level === 'L1' ? 1 : level === 'L2' ? 2 : parseInt(level, 10);
      if (!isNaN(lvlNum)) {
        params.push(lvlNum);
        sql += ` AND v.current_level = $${params.length}`;
      }
    }

    if (search) {
      params.push(`%${search.trim().toLowerCase()}%`);
      sql += ` AND (LOWER(v.title) LIKE $${params.length} OR LOWER(v.script) LIKE $${params.length})`;
    }

    sql += ` ORDER BY v.created_at DESC;`;

    const res = await query(sql, params);

    const data = res.rows.map(r => {
      const requiredRole = r.current_level === 1
        ? 'Reviewer Level 1'
        : (r.current_level === 2 ? 'Reviewer Level 2' : 'Admin');
      const canReview = r.status === 'pending_review' && reviewLevels.includes(r.current_level);

      return {
        id: r.id,
        title: r.title,
        script: r.script,
        videoUrl: r.video_url,
        thumbnailUrl: r.thumbnail_url,
        durationSeconds: parseFloat(r.duration_seconds || '45'),
        platforms: r.platform_targets,
        status: r.status,
        currentLevel: r.current_level,
        requiredMaxLevel: r.required_max_level,
        canReview,
        requiredRole,
        actionableLevels: [0, r.current_level],
        createdAt: r.created_at,
        updatedAt: r.updated_at
      };
    });

    // Count pending reviews that this user can actually review
    const pendingCount = data.filter(v => v.canReview).length;
    const totalPendingCount = data.filter(v => v.status === 'pending_review').length;

    return {
      success: true,
      pendingCount,
      totalPendingCount,
      userRolePayload: {
        isAdmin,
        userLevels,
        canReviewAny: isAdmin || userLevels.length > 0
      },
      data
    };
  });

  // GET /api/videos/:id - Detail video with approval history
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as VideoParams;

    const vidRes = await query(
      `SELECT v.* FROM videos v WHERE v.id = $1 LIMIT 1;`,
      [id]
    );

    if (vidRes.rows.length === 0) {
      return reply.status(404).send({ success: false, message: 'Video tidak ditemukan.' });
    }

    const video = vidRes.rows[0];

    let userLevels: number[] = [];
    let isAdmin = false;
    try {
      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const decoded = fastify.jwt.verify<DecodedJwt>(authHeader.substring(7));
        if (decoded) {
          userLevels = decoded.levels || [];
          isAdmin = userLevels.includes(0) || !!(decoded.roles && decoded.roles.includes('admin'));
        }
      }
    } catch {}

    const requiredRole = video.current_level === 1
      ? 'Reviewer Level 1'
      : (video.current_level === 2 ? 'Reviewer Level 2' : 'Admin');
    const canReview = video.status === 'pending_review' && (isAdmin || userLevels.includes(video.current_level));

    // Fetch approval history
    const historyRes = await query(
      `SELECT a.id, a.level, a.action, a.channel, a.note, a.created_at,
              u.name as user_name, u.email as user_email
       FROM approvals a
       JOIN users u ON a.user_id = u.id
       WHERE a.video_id = $1
       ORDER BY a.created_at DESC;`,
      [id]
    );

    return {
      success: true,
      data: {
        id: video.id,
        title: video.title,
        script: video.script,
        promptUsed: video.prompt_used,
        videoUrl: video.video_url,
        thumbnailUrl: video.thumbnail_url,
        durationSeconds: parseFloat(video.duration_seconds || '45'),
        aspectRatio: video.aspect_ratio,
        platforms: video.platform_targets,
        status: video.status,
        currentLevel: video.current_level,
        requiredMaxLevel: video.required_max_level,
        canReview,
        requiredRole,
        actionableLevels: [0, video.current_level],
        version: video.version,
        createdAt: video.created_at,
        updatedAt: video.updated_at,
        publishedAt: video.published_at,
        approvalHistory: historyRes.rows.map(h => ({
          id: h.id,
          videoId: id,
          userName: h.user_name,
          userRole: `Reviewer Level ${h.level}`,
          level: h.level,
          action: h.action,
          channel: h.channel,
          note: h.note,
          createdAt: h.created_at
        }))
      }
    };
  });

  // POST /api/videos/:id/approve
  fastify.post('/:id/approve', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { id } = request.params as VideoParams;
    const { level, note } = (request.body as ApprovalBody) || {};
    const user = request.user as DecodedJwt;

    // RBAC: check if user has permission for this specific review level
    const userLevels: number[] = user.levels || [];
    const isAuthorized = userLevels.includes(level);

    if (!isAuthorized) {
      return reply.status(403).send({
        success: false,
        message: `Akses ditolak: Anda tidak memiliki izin untuk mereview Level ${level}.`
      });
    }

    const result = await processApproval(id, user.userId, 'approve', level, 'dashboard', note);
    return reply.status(result.statusCode).send(result);
  });

  // POST /api/videos/:id/reject
  fastify.post('/:id/reject', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { id } = request.params as VideoParams;
    const { level, note } = (request.body as ApprovalBody) || {};
    const user = request.user as DecodedJwt;

    const userLevels: number[] = user.levels || [];
    const isAuthorized = userLevels.includes(level);

    if (!isAuthorized) {
      return reply.status(403).send({
        success: false,
        message: `Akses ditolak: Anda tidak memiliki izin untuk mereview Level ${level}.`
      });
    }

    const result = await processApproval(id, user.userId, 'reject', level, 'dashboard', note || 'Ditolak via Web Dashboard');
    return reply.status(result.statusCode).send(result);
  });

  // POST /api/videos/generate - Trigger automated AI video pipeline
  fastify.post('/generate', async (request, reply) => {
    const { topic, title, script, platforms = ['youtube', 'instagram'] } = (request.body as GenerateBody) || {};
    const { videoGenerationQueue } = await import('../../workers/index.js');

    const job = await videoGenerationQueue.add('generate-video', {
      topic: topic || 'Inovasi & Teknologi 2026',
      title,
      script,
      platforms
    });

    return reply.status(202).send({
      success: true,
      message: 'Job pembuatan video telah masuk antrian BullMQ & sedang diproses.',
      jobId: job.id
    });
  });

  // POST /api/videos/simulate-conflict - Live race condition simulation
  fastify.post('/simulate-conflict', async (request, reply) => {
    const { videoId: targetId } = (request.body as SimulateBody) || {};

    // 1. Get or pick a test video
    let videoId = targetId;
    if (!videoId) {
      const vidRes = await query(`SELECT id FROM videos WHERE status = 'pending_review' LIMIT 1;`);
      if (vidRes.rows.length === 0) {
        return reply.status(400).send({
          success: false,
          message: 'Tidak ada video berstatus pending_review untuk disimulasikan.'
        });
      }
      videoId = vidRes.rows[0].id;
    }

    if (!videoId) {
      return reply.status(400).send({
        success: false,
        message: 'Tidak ada video yang valid untuk disimulasikan.'
      });
    }

    // 2. Fetch users Farras and Michael
    const usersRes = await query(`SELECT id, name FROM users ORDER BY created_at ASC LIMIT 2;`);
    const farras = usersRes.rows[0];
    const michael = usersRes.rows[1] || usersRes.rows[0];

    // 3. Fire simultaneous approval calls at the EXACT same millisecond
    const [result1, result2] = await Promise.all([
      processApproval(videoId, farras.id, 'approve', 1, 'dashboard', 'Disetujui via Web Dashboard'),
      processApproval(videoId, michael.id, 'reject', 1, 'telegram', 'Ditolak via Telegram Bot')
    ]);

    return {
      success: true,
      simulatedVideoId: videoId,
      actor1: {
        name: `${farras.name} (Web Dashboard)`,
        action: 'approve',
        statusCode: result1.statusCode,
        conflict: !!result1.conflict,
        message: result1.message
      },
      actor2: {
        name: `${michael.name} (Telegram Bot)`,
        action: 'reject',
        statusCode: result2.statusCode,
        conflict: !!result2.conflict,
        message: result2.message
      },
      summary: (result1.success && result2.conflict) || (result2.success && result1.conflict)
        ? '🛡️ Proteksi Anti-Race Condition BERHASIL: Tepat satu aksi diterima, aksi kedua ditolak dengan HTTP 409 Conflict tanpa corrupt database.'
        : 'Hasil eksekusi simpanan bersaing selesai.'
    };
  });
};
