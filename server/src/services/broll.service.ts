import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';

export interface BrollSearchResult {
  filePath: string;
  source: 'pexels' | 'local_library' | 'commons';
  query: string;
  category: string;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  automotive: ['supercar', 'car driving', 'sports car', 'luxury vehicle', 'racing'],
  nature: ['mountain landscape', 'ocean waves', 'forest drone', 'sunset vertical', 'river waterfall'],
  technology: ['futuristic technology', 'cyberpunk city', 'computer programming', 'digital data', 'smartphone'],
  city: ['city skyline night', 'urban street', 'tokyo traffic', 'metropolis modern', 'skyscrapers'],
  kids: ['colorful animation', 'cute toys', 'fun playground', 'happy children playing', 'cartoon background'],
  general: ['cinematic vertical', 'abstract modern background', 'ambient motion']
};

export async function getBrollVideoForTopic(params: {
  topic: string;
  category?: string;
}): Promise<BrollSearchResult | null> {
  const category = (params.category || 'general').toLowerCase();
  const storageDir = path.resolve(process.cwd(), 'storage');
  const brollDir = path.join(storageDir, 'broll', category);
  fs.mkdirSync(brollDir, { recursive: true });

  // 1. Check local cached library in storage/broll/<category>/
  const existingFiles = fs.readdirSync(brollDir).filter(f => f.endsWith('.mp4') || f.endsWith('.webm'));
  if (existingFiles.length > 0) {
    const chosen = existingFiles[Math.floor(Math.random() * existingFiles.length)];
    return {
      filePath: path.join(brollDir, chosen),
      source: 'local_library',
      query: params.topic,
      category
    };
  }

  // 2. If Pexels API key exists, query Pexels portrait videos
  const pexelsKey = process.env.PEXELS_API_KEY || (env as unknown as Record<string, string>)?.PEXELS_API_KEY;
  const keywordsList = CATEGORY_KEYWORDS[category] || CATEGORY_KEYWORDS.general;
  const searchQuery = `${params.topic} ${keywordsList[0]}`.trim();

  if (pexelsKey) {
    try {
      console.log(`[B-Roll Service] Mencari video vertikal di Pexels API: "${searchQuery}"...`);
      const url = `https://api.pexels.com/v1/videos/search?query=${encodeURIComponent(searchQuery)}&orientation=portrait&per_page=5`;
      const res = await fetch(url, {
        headers: { Authorization: pexelsKey }
      });

      if (res.ok) {
        const data = await res.json() as {
          videos?: Array<{
            id: number;
            video_files?: Array<{ link: string; width: number; height: number; quality: string }>;
          }>;
        };

        const firstVid = data.videos?.[0];
        if (firstVid && firstVid.video_files && firstVid.video_files.length > 0) {
          // Prefer HD vertical file
          const sortedFiles = [...firstVid.video_files].sort((a, b) => (b.width * b.height) - (a.width * a.height));
          const fileToDownload = sortedFiles[0];

          console.log(`[B-Roll Service] Mengunduh klip Pexels (${fileToDownload.width}x${fileToDownload.height})...`);
          const dlRes = await fetch(fileToDownload.link);
          if (dlRes.ok) {
            const buffer = Buffer.from(await dlRes.arrayBuffer());
            const targetPath = path.join(brollDir, `pexels_${firstVid.id}.mp4`);
            fs.writeFileSync(targetPath, buffer);
            return {
              filePath: targetPath,
              source: 'pexels',
              query: searchQuery,
              category
            };
          }
        }
      }
    } catch (err) {
      console.warn('[B-Roll Service] Gagal menarik dari Pexels API, beralih ke fallback:', (err as Error).message);
    }
  }

  // 3. Fallback: Check if temp broll exists or return null to let generator use synthetic motion
  const tempFerrari = path.join(storageDir, 'temp', 'ferrari_broll.webm');
  if (fs.existsSync(tempFerrari) && (category === 'automotive' || category === 'general')) {
    // Copy to category folder for reuse
    const dest = path.join(brollDir, 'ferrari_classic.webm');
    fs.copyFileSync(tempFerrari, dest);
    return {
      filePath: dest,
      source: 'commons',
      query: 'ferrari 365p',
      category: 'automotive'
    };
  }

  return null;
}
