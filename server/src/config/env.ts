import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config(); // fallback to local .env

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/shortsflow?schema=public',
  REDIS_URL: process.env.REDIS_URL || 'redis://:redispassword@localhost:6379',
  JWT_SECRET: process.env.JWT_SECRET || 'super-secret-jwt-key-shortsflow-2026',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:4200',
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || '',
  STORAGE_DIR: path.resolve(process.cwd(), '../storage'),
  YOUTUBE_CLIENT_ID: process.env.YOUTUBE_CLIENT_ID || '',
  YOUTUBE_CLIENT_SECRET: process.env.YOUTUBE_CLIENT_SECRET || '',
  YOUTUBE_REDIRECT_URI: process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3000/oauth2callback',
  YOUTUBE_REFRESH_TOKEN: process.env.YOUTUBE_REFRESH_TOKEN || '',
  PIXABAY_API_KEY: process.env.PIXABAY_API_KEY || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || ''
};


