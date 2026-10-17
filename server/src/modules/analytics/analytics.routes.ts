import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { query } from '../../db/index.js';
import { syncPublishedVideoAnalytics } from '../../workers/index.js';

interface AnalyticsQuery {
  range?: string;
  platform?: string;
}

export const analyticsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // GET /api/analytics - Get aggregated metrics
  fastify.get('/', async (request) => {
    const { range = '14d', platform = 'all' } = (request.query as AnalyticsQuery) || {};

    const multiplier = range === '7d' ? 0.6 : range === '30d' ? 2.1 : 1.0;

    // 1. Fetch real aggregated stats from PostgreSQL analytics table
    const aggregateRes = await query<{ total_views: string; total_likes: string; total_comments: string }>(
      `SELECT COALESCE(SUM(a.views), 0) as total_views,
              COALESCE(SUM(a.likes), 0) as total_likes,
              COALESCE(SUM(a.comments), 0) as total_comments
       FROM analytics a
       WHERE 1=1 ${platform !== 'all' ? `AND a.platform = '${platform}'` : ''};`
    );

    const liveViews = parseInt(aggregateRes.rows[0]?.total_views || '0', 10);
    const liveLikes = parseInt(aggregateRes.rows[0]?.total_likes || '0', 10);
    const liveComments = parseInt(aggregateRes.rows[0]?.total_comments || '0', 10);

    const kpiCards = [
      {
        title: 'Total Views',
        value: liveViews.toLocaleString('id-ID'),
        delta: liveViews > 0 ? '+100% Live' : '0%',
        isPositive: liveViews > 0,
        sublabel: liveViews > 0 ? 'dari channel YouTube terhubung' : 'belum ada penayangan'
      },
      {
        title: 'Total Likes',
        value: liveLikes.toLocaleString('id-ID'),
        delta: liveLikes > 0 ? `+${liveLikes}` : '0',
        isPositive: liveLikes > 0,
        sublabel: 'interaksi suka audiens'
      },
      {
        title: 'Total Komentar',
        value: liveComments.toLocaleString('id-ID'),
        unit: '',
        delta: liveComments > 0 ? `+${liveComments}` : '0',
        isPositive: liveComments > 0,
        sublabel: 'diskusi pada video'
      }
    ];

    // 2. Fetch real daily snapshot points from analytics table
    const trafficRes = await query<{
      date: string;
      views: number;
      subs: number;
    }>(`
      SELECT TO_CHAR(fetched_at, 'DD Mon') as date,
             COALESCE(SUM(views), 0)::int as views,
             COALESCE(SUM(likes), 0)::int as subs
      FROM analytics
      WHERE 1=1 ${platform !== 'all' ? `AND platform = '${platform}'` : ''}
      GROUP BY TO_CHAR(fetched_at, 'DD Mon'), DATE_TRUNC('day', fetched_at)
      ORDER BY DATE_TRUNC('day', fetched_at) ASC
      LIMIT 14;
    `);

    const trafficData = trafficRes.rows.map(r => ({
      date: r.date,
      views: r.views,
      subs: r.subs
    }));

    // 3. Fetch top published videos with real metrics
    const topRes = await query<{
      id: string;
      title: string;
      thumbnail_url: string;
      status: string;
      views: string;
      likes: string;
      platform: string;
    }>(`
      SELECT v.id, v.title, v.thumbnail_url, v.status,
             COALESCE(a.views, 0) as views,
             COALESCE(a.likes, 0) as likes,
             COALESCE(a.platform, 'youtube') as platform
      FROM videos v
      LEFT JOIN analytics a ON v.id = a.video_id
      WHERE v.status = 'published' OR v.status = 'approved'
      ORDER BY a.views DESC NULLS LAST
      LIMIT 5;
    `);

    return {
      success: true,
      data: {
        isLive: liveViews > 0,
        kpiCards,
        trafficData,
        topVideos: topRes.rows.map(r => ({
          id: r.id,
          title: r.title,
          thumbnailUrl: r.thumbnail_url,
          platform: r.platform,
          views: parseInt(r.views, 10),
          likes: parseInt(r.likes, 10),
          status: r.status,
          retentionPercent: 0
        }))
      }
    };
  });

  // POST /api/analytics/sync - Trigger on-demand sync from YouTube
  fastify.post('/sync', async () => {
    const res = await syncPublishedVideoAnalytics();
    return {
      success: true,
      message: `Sinkronisasi statistik YouTube berhasil dieksekusi (${res?.updated || 0} video diperbarui).`,
      updated: res?.updated || 0
    };
  });
};
