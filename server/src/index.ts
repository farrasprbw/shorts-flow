import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { env } from './config/env.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { videoRoutes } from './modules/videos/video.routes.js';
import { scheduleRoutes } from './modules/schedules/schedule.routes.js';
import { analyticsRoutes } from './modules/analytics/analytics.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';
import { bot } from './bot.js';
// Import workers to activate BullMQ listeners
import './workers/index.js';

// Extend FastifyInstance with authenticate decorator
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const app = Fastify({
  logger: {
    level: env.NODE_ENV === 'development' ? 'info' : 'warn'
  }
});

async function main() {
  // 1. CORS
  await app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true
  });

  // 2. Static file serving for generated videos & thumbnails
  const storagePath = path.resolve(process.cwd(), 'storage');
  await app.register(fastifyStatic, {
    root: storagePath,
    prefix: '/storage/',
    decorateReply: false
  });

  // 3. JWT Plugin
  await app.register(jwt, {
    secret: env.JWT_SECRET
  });

  // 4. Auth Decorator
  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ success: false, message: 'Autentikasi gagal: Token tidak valid atau kedaluwarsa.' });
    }
  });

  // 5. Healthcheck
  app.get('/api/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'ShortsFlow Backend API'
    };
  });

  // 6. Register Module Routes
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(videoRoutes, { prefix: '/api/videos' });
  await app.register(scheduleRoutes, { prefix: '/api/schedules' });
  await app.register(analyticsRoutes, { prefix: '/api/analytics' });
  await app.register(adminRoutes, { prefix: '/api/admin' });

  // YouTube Data API routes & root OAuth2 callback
  const { youtubeRoutes, handleCallback } = await import('./modules/youtube/youtube.routes.js');
  await app.register(youtubeRoutes, { prefix: '/api/youtube' });
  app.get('/oauth2callback', async (request, reply) => handleCallback(request, reply));

  // 6. Start Server
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    console.log(`\n🚀 [ShortsFlow API Server] Berjalan pada http://localhost:${env.PORT}`);
    console.log(`📌 Healthcheck: http://localhost:${env.PORT}/api/health\n`);

    // 7. Start Telegram Bot Long Polling
    if (bot) {
      bot.start({
        onStart: (info) => {
          console.log(`🤖 [Telegram Bot] Berjalan aktif sebagai @${info.username} (Polling mode)`);
        }
      }).catch(err => {
        console.warn('[Telegram Bot] Long polling warning:', err.message);
      });
    }
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
