import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';

export interface GeneratedVideoOutput {
  id: string;
  videoFilename: string;
  thumbnailFilename: string;
  videoUrl: string;
  thumbnailUrl: string;
  durationSeconds: number;
}

export async function renderShortsVideo(params: {
  id: string;
  title: string;
  script: string;
  duration?: number;
}): Promise<GeneratedVideoOutput> {
  const { id, title, script, duration = 8 } = params;

  const storageDir = path.resolve(process.cwd(), 'storage');
  const videosDir = path.join(storageDir, 'videos');
  const thumbsDir = path.join(storageDir, 'thumbnails');

  if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });
  if (!fs.existsSync(thumbsDir)) fs.mkdirSync(thumbsDir, { recursive: true });

  const videoFilename = `${id}.mp4`;
  const thumbnailFilename = `${id}.jpg`;
  const videoFilePath = path.join(videosDir, videoFilename);
  const thumbFilePath = path.join(thumbsDir, thumbnailFilename);

  const ffmpegBin = (ffmpegPath as { default?: string })?.default || (ffmpegPath as string);

  if (!ffmpegBin || !fs.existsSync(ffmpegBin)) {
    throw new Error(`FFmpeg binary tidak ditemukan pada: ${ffmpegBin}`);
  }

  // 1. Render 9:16 vertical video (1080x1920) with smooth gradient test pattern & stereo audio
  console.log(`[FFmpeg Generator] Merender video 9:16 vertikal: ${videoFilename}...`);

  const ffmpegArgs = [
    '-y',
    // Video input: 1080x1920 test pattern with rich colors
    '-f', 'lavfi',
    '-i', `testsrc=size=1080x1920:rate=30:duration=${duration}`,
    // Audio input: 44.1kHz stereo audio tone (528Hz calming tone)
    '-f', 'lavfi',
    '-i', `sine=frequency=528:duration=${duration}`,
    // Video encoding
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-pix_fmt', 'yuv420p',
    // Audio encoding
    '-c:a', 'aac',
    '-b:a', '128k',
    '-shortest',
    videoFilePath
  ];

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(ffmpegBin, ffmpegArgs);

    let stderr = '';
    proc.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        console.error('[FFmpeg Error]:', stderr);
        reject(new Error(`FFmpeg rendering gagal dengan exit code ${code}`));
      }
    });

    proc.on('error', (err) => reject(err));
  });

  // 2. Extract thumbnail frame at 1s
  console.log(`[FFmpeg Generator] Mengekstrak thumbnail: ${thumbnailFilename}...`);
  const thumbArgs = [
    '-y',
    '-ss', '00:00:01',
    '-i', videoFilePath,
    '-vframes', '1',
    '-q:v', '2',
    thumbFilePath
  ];

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(ffmpegBin, thumbArgs);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Thumbnail extraction failed with code ${code}`));
    });
    proc.on('error', (err) => reject(err));
  });

  console.log(`[FFmpeg Generator] ✅ Berhasil merender video vertikal & thumbnail untuk ID: ${id}`);

  return {
    id,
    videoFilename,
    thumbnailFilename,
    videoUrl: `http://localhost:3000/storage/videos/${videoFilename}`,
    thumbnailUrl: `http://localhost:3000/storage/thumbnails/${thumbnailFilename}`,
    durationSeconds: duration
  };
}
