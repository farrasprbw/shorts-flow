import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { query } from '../../db/index.js';

interface ScheduleBody {
  videoId: string;
  platforms: string[];
  scheduledAt: string;
}

interface ScheduleParams {
  id: string;
}

export const scheduleRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // GET /api/schedules
  fastify.get('/', async () => {
    const res = await query(`
      SELECT s.id, s.video_id, s.platform, s.scheduled_at, s.status, s.error_message, s.published_at,
             v.title as video_title, v.thumbnail_url
      FROM schedules s
      JOIN videos v ON s.video_id = v.id
      ORDER BY s.scheduled_at ASC;
    `);

    return {
      success: true,
      data: res.rows.map(r => ({
        id: r.id,
        videoId: r.video_id,
        videoTitle: r.video_title,
        thumbnailUrl: r.thumbnail_url,
        platform: r.platform,
        scheduledAt: r.scheduled_at,
        status: r.status,
        errorMessage: r.error_message,
        publishedAt: r.published_at
      }))
    };
  });

  // POST /api/schedules
  fastify.post('/', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { videoId, platforms, scheduledAt } = (request.body as ScheduleBody) || {};

    if (!videoId || !platforms || !Array.isArray(platforms) || platforms.length === 0 || !scheduledAt) {
      return reply.status(400).send({ success: false, message: 'Data penjadwalan tidak lengkap.' });
    }

    const inserted: Record<string, unknown>[] = [];
    for (const platform of platforms) {
      const res = await query(
        `INSERT INTO schedules (video_id, platform, scheduled_at, status)
         VALUES ($1, $2, $3, 'queued')
         RETURNING *;`,
        [videoId, platform, new Date(scheduledAt).toISOString()]
      );
      inserted.push(res.rows[0]);
    }

    // Update video status to 'scheduled'
    await query(`UPDATE videos SET status = 'scheduled' WHERE id = $1;`, [videoId]);

    return reply.status(201).send({
      success: true,
      message: `Jadwal berhasil ditambahkan untuk ${platforms.length} platform.`,
      data: inserted
    });
  });

  // DELETE /api/schedules/:id
  fastify.delete('/:id', {
    preHandler: [fastify.authenticate]
  }, async (request) => {
    const { id } = request.params as ScheduleParams;
    await query(`DELETE FROM schedules WHERE id = $1;`, [id]);
    return { success: true, message: 'Jadwal berhasil dibatalkan.' };
  });
};
