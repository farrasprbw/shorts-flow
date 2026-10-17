import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { getAuthUrl, saveRefreshToken } from '../../services/youtube.service.js';
import { env } from '../../config/env.js';
import { bot } from '../../bot.js';

interface CallbackQuery {
  code?: string;
  error?: string;
}

export const youtubeRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // GET /api/youtube/status
  fastify.get('/status', async () => {
    return {
      success: true,
      configured: Boolean(env.YOUTUBE_CLIENT_ID && env.YOUTUBE_CLIENT_SECRET),
      connected: Boolean(env.YOUTUBE_REFRESH_TOKEN),
      redirectUri: env.YOUTUBE_REDIRECT_URI
    };
  });

  // GET /api/youtube/auth -> Redirect to Google OAuth consent
  fastify.get('/auth', async (request, reply) => {
    try {
      const url = getAuthUrl();
      return reply.redirect(url);
    } catch (err: unknown) {
      return reply.status(500).send({
        success: false,
        message: (err as Error).message || 'Gagal membuat Google OAuth URL'
      });
    }
  });

  // GET /api/youtube/callback (Alternative callback route)
  fastify.get('/callback', async (request, reply) => {
    return handleCallback(request, reply);
  });
};

export async function handleCallback(request: FastifyRequest, reply: FastifyReply) {
  const { code, error } = (request.query as CallbackQuery) || {};

  if (error) {
    return reply.type('text/html').send(`
      <!DOCTYPE html>
      <html>
        <head><title>Otorisasi Dibatalkan - ShortsFlow</title></head>
        <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #0f172a; color: #fff;">
          <div style="background: #1e293b; padding: 2.5rem; border-radius: 1rem; max-width: 480px; text-align: center; border: 1px solid #ef4444;">
            <h2 style="color: #ef4444;">❌ Otorisasi Dibatalkan</h2>
            <p style="color: #94a3b8;">${error}</p>
            <a href="http://localhost:4200" style="display: inline-block; margin-top: 1rem; padding: 0.75rem 1.5rem; background: #3b82f6; color: #fff; text-decoration: none; border-radius: 0.5rem;">Kembali ke Dashboard</a>
          </div>
        </body>
      </html>
    `);
  }

  if (!code) {
    return reply.status(400).send({ success: false, message: 'Authorization code tidak ditemukan.' });
  }

  try {
    const { refreshToken, channelTitle } = await saveRefreshToken(code);

    // Notify Telegram if bot is initialized
    if (bot && env.TELEGRAM_CHAT_ID) {
      bot.api.sendMessage(
        env.TELEGRAM_CHAT_ID,
        `🎉 <b>Channel YouTube Terhubung!</b>\n\n` +
        `📺 <b>Channel:</b> ${channelTitle}\n` +
        `🚀 ShortsFlow sekarang siap mengunggah video ke YouTube Shorts secara otomatis setelah Reviewer menyetujui video!`,
        { parse_mode: 'HTML' }
      ).catch(() => {});
    }

    return reply.type('text/html').send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>YouTube Terhubung - ShortsFlow</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0f19; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
            .card { background: #131b2e; border: 1px solid #1e293b; border-radius: 20px; padding: 40px; text-align: center; max-width: 500px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
            .badge { display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; background: rgba(34, 197, 94, 0.15); border-radius: 50%; color: #22c55e; font-size: 32px; margin-bottom: 20px; }
            h1 { font-size: 24px; margin: 0 0 10px; font-weight: 700; }
            p { color: #94a3b8; line-height: 1.6; margin: 0 0 24px; }
            .channel-box { background: #1e293b; border-radius: 12px; padding: 14px; margin-bottom: 24px; font-weight: 600; color: #38bdf8; }
            .btn { display: inline-block; background: #ef4444; color: white; padding: 12px 28px; border-radius: 12px; text-decoration: none; font-weight: 600; transition: background 0.2s; }
            .btn:hover { background: #dc2626; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">✓</div>
            <h1>YouTube Berhasil Terhubung!</h1>
            <p>ShortsFlow berhasil mendapatkan otorisasi akses ke channel YouTube Anda.</p>
            <div class="channel-box">📺 Channel: ${channelTitle}</div>
            <a href="http://localhost:4200/review" class="btn">Buka Review Queue</a>
          </div>
        </body>
      </html>
    `);
  } catch (err: unknown) {
    return reply.type('text/html').send(`
      <!DOCTYPE html>
      <html>
        <head><title>Gagal Menghubungkan YouTube</title></head>
        <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #0f172a; color: #fff;">
          <div style="background: #1e293b; padding: 2.5rem; border-radius: 1rem; max-width: 480px; text-align: center; border: 1px solid #ef4444;">
            <h2 style="color: #ef4444;">Gagal Menyimpan Kredensial</h2>
            <p style="color: #94a3b8;">${(err as Error).message || 'Terjadi kesalahan'}</p>
            <a href="/api/youtube/auth" style="display: inline-block; margin-top: 1rem; padding: 0.75rem 1.5rem; background: #ef4444; color: #fff; text-decoration: none; border-radius: 0.5rem;">Coba Lagi</a>
          </div>
        </body>
      </html>
    `);
  }
}
