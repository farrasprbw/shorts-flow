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

function wrapText(text: string, maxCharsPerLine = 32): string {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.join('\n');
}

async function generateVoiceoverAudio(text: string, audioFilePath: string): Promise<boolean> {
  try {
    const tts = await import('google-tts-api');
    const cleanText = text
      .replace(/#\w+/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[^\w\s.,!?-]/gi, '')
      .trim();

    if (!cleanText) return false;

    const chunks = await tts.getAllAudioBase64(cleanText, {
      lang: 'id',
      slow: false,
      timeout: 10000
    });

    if (!chunks || chunks.length === 0) return false;

    const buffers = chunks.map(c => Buffer.from(c.base64, 'base64'));
    fs.writeFileSync(audioFilePath, Buffer.concat(buffers));
    return true;
  } catch (err) {
    console.warn('[Generator] TTS generation warning (will use audio fallback):', err);
    return false;
  }
}

export async function renderShortsVideo(params: {
  id: string;
  title: string;
  script: string;
  duration?: number;
}): Promise<GeneratedVideoOutput> {
  const { id, title, script, duration: fallbackDuration = 10 } = params;

  const storageDir = path.resolve(process.cwd(), 'storage');
  const videosDir = path.join(storageDir, 'videos');
  const thumbsDir = path.join(storageDir, 'thumbnails');
  const tempDir = path.join(storageDir, 'temp');

  if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });
  if (!fs.existsSync(thumbsDir)) fs.mkdirSync(thumbsDir, { recursive: true });
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const videoFilename = `${id}.mp4`;
  const thumbnailFilename = `${id}.jpg`;
  const videoFilePath = path.join(videosDir, videoFilename);
  const thumbFilePath = path.join(thumbsDir, thumbnailFilename);

  const tempAudioFile = path.join(tempDir, `${id}_audio.mp3`);
  const tempTitleFile = path.join(tempDir, `${id}_title.txt`);
  const tempCaptionFile = path.join(tempDir, `${id}_caption.txt`);

  // Write text files for FFmpeg drawtext (using relative paths to avoid Windows drive colon escaping issues)
  const wrappedTitle = wrapText(title.toUpperCase(), 26);
  const wrappedScript = wrapText(script, 32);

  fs.writeFileSync(tempTitleFile, wrappedTitle, 'utf-8');
  fs.writeFileSync(tempCaptionFile, wrappedScript, 'utf-8');

  // Relative paths from process.cwd()
  const relTitleFile = path.relative(process.cwd(), tempTitleFile).replace(/\\/g, '/');
  const relCaptionFile = path.relative(process.cwd(), tempCaptionFile).replace(/\\/g, '/');
  const relAudioFile = path.relative(process.cwd(), tempAudioFile).replace(/\\/g, '/');

  const ffmpegBin = (ffmpegPath as { default?: string })?.default || (ffmpegPath as string);

  if (!ffmpegBin || !fs.existsSync(ffmpegBin)) {
    throw new Error(`FFmpeg binary tidak ditemukan pada: ${ffmpegBin}`);
  }

  // 1. Generate Voiceover Audio (Indonesian TTS)
  console.log(`[FFmpeg Generator] Menghasilkan voiceover bahasa Indonesia untuk: "${title}"...`);
  const hasVoiceover = await generateVoiceoverAudio(script, tempAudioFile);

  // 2. Prepare FFmpeg filter graph
  // Modern gradient: dark slate (0x0a0f1d) to deep crimson (0x4c0519)
  const fontPath = 'C\\:/Windows/Fonts/arial.ttf';
  const filterGraph = [
    `gradients=s=1080x1920:c0=0x0a0f1d:c1=0x4c0519:type=linear:rate=30`,
    `drawtext=fontfile='${fontPath}':text='SHORTSFLOW':fontcolor=white:fontsize=36:x=(w-text_w)/2:y=240:box=1:boxcolor=0xef4444cc:boxborderw=16`,
    `drawtext=fontfile='${fontPath}':textfile=${relTitleFile}:fontcolor=0xfacc15:fontsize=54:line_spacing=20:x=(w-text_w)/2:y=380:box=1:boxcolor=0x000000bb:boxborderw=24`,
    `drawtext=fontfile='${fontPath}':textfile=${relCaptionFile}:fontcolor=white:fontsize=46:line_spacing=22:x=(w-text_w)/2:y=(h-text_h)/2+100:box=1:boxcolor=0x0f172acc:boxborderw=28`
  ].join(',');

  console.log(`[FFmpeg Generator] Merender video 9:16 Shorts vertikal: ${videoFilename}...`);

  const ffmpegArgs: string[] = ['-y', '-f', 'lavfi', '-i', filterGraph];

  if (hasVoiceover && fs.existsSync(tempAudioFile)) {
    ffmpegArgs.push(
      '-i', relAudioFile,
      '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '128k',
      '-shortest'
    );
  } else {
    ffmpegArgs.push(
      '-f', 'lavfi', '-i', `sine=frequency=528:duration=${fallbackDuration}`,
      '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '128k',
      '-shortest'
    );
  }

  ffmpegArgs.push(videoFilePath);

  try {
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

    // 3. Extract thumbnail frame at 1s
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

    console.log(`[FFmpeg Generator] ✅ Berhasil merender video Shorts dengan Voiceover & Visual untuk ID: ${id}`);
  } finally {
    // Cleanup temporary files
    [tempAudioFile, tempTitleFile, tempCaptionFile].forEach((f) => {
      if (fs.existsSync(f)) {
        try { fs.unlinkSync(f); } catch {}
      }
    });
  }

  return {
    id,
    videoFilename,
    thumbnailFilename,
    videoUrl: `http://localhost:3000/storage/videos/${videoFilename}`,
    thumbnailUrl: `http://localhost:3000/storage/thumbnails/${thumbnailFilename}`,
    durationSeconds: fallbackDuration
  };
}
