import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    env.YOUTUBE_CLIENT_ID,
    env.YOUTUBE_CLIENT_SECRET,
    env.YOUTUBE_REDIRECT_URI
  );
}

export function getAuthUrl(): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly'
    ]
  });
}

export async function saveRefreshToken(code: string): Promise<{ refreshToken: string; channelTitle?: string }> {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  const refreshToken = tokens.refresh_token;

  if (!refreshToken) {
    throw new Error('Google tidak mengembalikan refresh_token. Pastikan memilih akun dan menyetujui izin akses.');
  }

  // Update in-memory env
  env.YOUTUBE_REFRESH_TOKEN = refreshToken;

  // Persist to server/.env and root .env
  persistTokenToEnv('YOUTUBE_REFRESH_TOKEN', refreshToken);

  let channelTitle = 'YouTube Channel';
  try {
    oauth2Client.setCredentials(tokens);
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    const channelRes = await youtube.channels.list({
      part: ['snippet'],
      mine: true
    });
    channelTitle = channelRes.data.items?.[0]?.snippet?.title || 'YouTube Channel';
  } catch (err) {
    console.warn('[YouTube Service] Gagal mengambil nama channel:', err);
  }

  return { refreshToken, channelTitle };
}

function persistTokenToEnv(key: string, value: string) {
  const envPaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../.env')
  ];

  for (const p of envPaths) {
    if (fs.existsSync(p)) {
      let content = fs.readFileSync(p, 'utf-8');
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(content)) {
        content = content.replace(regex, `${key}=${value}`);
      } else {
        content += `\n${key}=${value}\n`;
      }
      fs.writeFileSync(p, content, 'utf-8');
    }
  }
}

export async function uploadToYouTubeShorts(params: {
  videoFilePath: string;
  title: string;
  description: string;
  tags?: string[];
  privacyStatus?: 'public' | 'unlisted' | 'private';
}): Promise<{ videoId: string; url: string }> {
  if (!env.YOUTUBE_REFRESH_TOKEN) {
    throw new Error('YOUTUBE_REFRESH_TOKEN belum ada. Silakan lakukan otorisasi akun YouTube terlebih dahulu.');
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: env.YOUTUBE_REFRESH_TOKEN
  });

  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

  let title = params.title;
  if (!title.toLowerCase().includes('#shorts')) {
    title = `${title} #Shorts`;
  }

  console.log(`[YouTube Service] Mengupload video vertikal ke YouTube Shorts: "${title}"...`);

  const res = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: title.slice(0, 100),
        description: `${params.description}\n\n#Shorts #ShortsFlow #AI`,
        tags: params.tags || ['shorts', 'ai', 'video'],
        categoryId: '28' // Science & Technology
      },
      status: {
        privacyStatus: params.privacyStatus || 'public',
        selfDeclaredMadeForKids: false
      }
    },
    media: {
      body: fs.createReadStream(params.videoFilePath)
    }
  });

  const videoId = res.data.id;
  if (!videoId) {
    throw new Error('Gagal mendapatkan ID video dari YouTube API response.');
  }

  const url = `https://www.youtube.com/shorts/${videoId}`;
  console.log(`[YouTube Service] 🚀 Upload BERHASIL! Video ID: ${videoId}, URL: ${url}`);

  return { videoId, url };
}

export interface YouTubeVideoStats {
  videoId: string;
  views: number;
  likes: number;
  comments: number;
}

export async function fetchVideoStatistics(videoIds: string[]): Promise<Map<string, YouTubeVideoStats>> {
  const result = new Map<string, YouTubeVideoStats>();
  if (!env.YOUTUBE_REFRESH_TOKEN || videoIds.length === 0) return result;

  try {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: env.YOUTUBE_REFRESH_TOKEN
    });

    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    // YouTube allows up to 50 IDs per call
    const chunks: string[][] = [];
    for (let i = 0; i < videoIds.length; i += 50) {
      chunks.push(videoIds.slice(i, i + 50));
    }

    for (const chunk of chunks) {
      const res = await youtube.videos.list({
        part: ['statistics'],
        id: chunk
      });

      if (res.data.items) {
        for (const item of res.data.items) {
          if (item.id && item.statistics) {
            result.set(item.id, {
              videoId: item.id,
              views: parseInt(item.statistics.viewCount || '0', 10),
              likes: parseInt(item.statistics.likeCount || '0', 10),
              comments: parseInt(item.statistics.commentCount || '0', 10)
            });
          }
        }
      }
    }
  } catch (err: unknown) {
    console.warn('[YouTube Service] Gagal mengambil statistik video:', (err as Error).message);
  }

  return result;
}

