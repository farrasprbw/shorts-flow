import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';

export interface BrollSearchResult {
  filePath: string;
  source: 'pexels' | 'pixabay' | 'wikimedia' | 'local_library' | 'commons';
  query: string;
  category: string;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  automotive: ['supercar', 'car driving', 'sports car', 'luxury vehicle', 'racing', 'porsche', 'ferrari'],
  nature: ['mountain landscape', 'ocean waves', 'forest drone', 'sunset vertical', 'river waterfall'],
  technology: ['futuristic technology', 'cyberpunk city', 'computer programming', 'digital data', 'artificial intelligence'],
  city: ['city skyline night', 'urban street', 'tokyo traffic', 'metropolis modern', 'skyscrapers'],
  kids: ['cartoon animation', 'colorful 3d animation', 'cute toys', 'fun playground', 'happy children playing', 'caminandes'],
  general: ['cinematic vertical', 'abstract modern background', 'ambient motion']
};

/**
 * Searches Wikimedia Commons for royalty-free video clips matching the query.
 * No API key needed, completely free and open.
 */
async function searchWikimediaVideo(keywords: string[]): Promise<string | null> {
  try {
    for (const kw of keywords) {
      const query = `${kw} filetype:video`;
      const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&prop=imageinfo&iiprop=url|size|mime&gsrlimit=6&format=json`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'ShortsFlowBot/1.0 (contact: farras@shortsflow.com)' }
      });
      if (!res.ok) continue;

      const data = await res.json() as {
        query?: {
          pages?: Record<string, {
            title?: string;
            imageinfo?: Array<{ url: string; size: number }>;
          }>;
        };
      };

      const pages = Object.values(data.query?.pages || {});
      for (const p of pages) {
        const info = p.imageinfo?.[0];
        if (info?.url && (info.url.endsWith('.webm') || info.url.endsWith('.mp4')) && info.size > 200000 && info.size < 45 * 1024 * 1024) {
          return info.url;
        }
      }
    }
  } catch (err) {
    console.warn('[B-Roll Service] Wikimedia search notice:', (err as Error).message);
  }
  return null;
}

/**
 * Searches Pixabay Video API if PIXABAY_API_KEY is configured.
 * Fetches multiple hits and selects randomly for maximum variety.
 */
async function searchPixabayVideo(apiKey: string, query: string, category: string): Promise<string | null> {
  try {
    const videoType = category === 'kids' ? 'animation' : 'all';
    const cleanQuery = query.replace(/[^\w\s]/gi, ' ').trim().slice(0, 80);
    const url = `https://pixabay.com/api/videos/?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(cleanQuery)}&video_type=${videoType}&per_page=15`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[B-Roll Service] Pixabay API response status ${res.status}: ${res.statusText}`);
      return null;
    }

    const data = await res.json() as {
      hits?: Array<{
        id: number;
        videos?: {
          medium?: { url: string };
          large?: { url: string };
          small?: { url: string };
          tiny?: { url: string };
        };
      }>;
    };

    if (data.hits && data.hits.length > 0) {
      // Pick randomly among top results for variety
      const chosenHit = data.hits[Math.floor(Math.random() * data.hits.length)];
      return chosenHit.videos?.small?.url || chosenHit.videos?.medium?.url || chosenHit.videos?.large?.url || null;
    }
    return null;
  } catch (err) {
    console.warn('[B-Roll Service] Pixabay search notice:', (err as Error).message);
    return null;
  }
}

export async function getBrollVideoForTopic(params: {
  topic: string;
  category?: string;
}): Promise<BrollSearchResult | null> {
  const category = (params.category || 'general').toLowerCase();
  const storageDir = path.resolve(process.cwd(), 'storage');
  const brollDir = path.join(storageDir, 'broll', category);
  fs.mkdirSync(brollDir, { recursive: true });

  const keywordsList = CATEGORY_KEYWORDS[category] || CATEGORY_KEYWORDS.general;
  // Pick random keyword from list to ensure rich visual diversity
  const randomKeyword = keywordsList[Math.floor(Math.random() * keywordsList.length)];
  const searchQuery = `${params.topic} ${randomKeyword}`.trim();


  // 1. Pixabay API (Highest quality & variety when API key is provided)
  const pixabayKey = process.env.PIXABAY_API_KEY || (env as unknown as Record<string, string>)?.PIXABAY_API_KEY;
  if (pixabayKey) {
    console.log(`[B-Roll Service] 🌐 Mencari video di Pixabay API: keyword "${randomKeyword}" untuk kategori [${category}]...`);
    const pixabayUrl = await searchPixabayVideo(pixabayKey, randomKeyword, category);
    if (pixabayUrl) {
      try {
        console.log(`[B-Roll Service] 📥 Mengunduh footage baru dari Pixabay...`);
        const dlRes = await fetch(pixabayUrl);
        if (dlRes.ok) {
          const buffer = Buffer.from(await dlRes.arrayBuffer());
          const targetPath = path.join(brollDir, `pixabay_${Date.now()}.mp4`);
          fs.writeFileSync(targetPath, buffer);
          console.log(`[B-Roll Service] ✅ Klip Pixabay berhasil disimpan: ${path.basename(targetPath)}`);
          return {
            filePath: targetPath,
            source: 'pixabay',
            query: randomKeyword,
            category
          };
        }
      } catch (err) {
        console.warn('[B-Roll Service] Gagal mengunduh klip Pixabay, menggunakan library lokal:', (err as Error).message);
      }
    }
  }

  // 2. Local cached library in storage/broll/<category>/
  const existingFiles = fs.readdirSync(brollDir).filter(f => f.endsWith('.mp4') || f.endsWith('.webm') || f.endsWith('.ogv'));
  if (existingFiles.length > 0) {
    const chosen = existingFiles[Math.floor(Math.random() * existingFiles.length)];
    console.log(`[B-Roll Service] 🎬 Memilih footage dari library lokal (${existingFiles.length} file tersedia): ${chosen}`);
    return {
      filePath: path.join(brollDir, chosen),
      source: 'local_library',
      query: params.topic,
      category
    };
  }

  // 3. Pexels API (if active)
  const pexelsKey = process.env.PEXELS_API_KEY || (env as unknown as Record<string, string>)?.PEXELS_API_KEY;
  if (pexelsKey) {
    try {
      console.log(`[B-Roll Service] Mencari video vertikal di Pexels API: "${searchQuery}"...`);
      const url = `https://api.pexels.com/v1/videos/search?query=${encodeURIComponent(searchQuery)}&orientation=portrait&per_page=5`;
      const res = await fetch(url, { headers: { Authorization: pexelsKey } });

      if (res.ok) {
        const data = await res.json() as {
          videos?: Array<{
            id: number;
            video_files?: Array<{ link: string; width: number; height: number; quality: string }>;
          }>;
        };

        const firstVid = data.videos?.[0];
        if (firstVid && firstVid.video_files && firstVid.video_files.length > 0) {
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
      console.warn('[B-Roll Service] Gagal menarik dari Pexels API:', (err as Error).message);
    }
  }

  // 4. Wikimedia Commons Free Video Search (No API Key Required)
  console.log(`[B-Roll Service] Mencari klip video gratis di Wikimedia Commons untuk [${category}]...`);
  const commonsUrl = await searchWikimediaVideo(keywordsList);
  if (commonsUrl) {
    try {
      console.log(`[B-Roll Service] Mengunduh klip Wikimedia Commons: ${commonsUrl}`);
      const dlRes = await fetch(commonsUrl, {
        headers: { 'User-Agent': 'ShortsFlowBot/1.0 (contact: farras@shortsflow.com)' }
      });
      if (dlRes.ok) {
        const buffer = Buffer.from(await dlRes.arrayBuffer());
        const ext = commonsUrl.endsWith('.mp4') ? '.mp4' : '.webm';
        const targetPath = path.join(brollDir, `wikimedia_${Date.now()}${ext}`);
        fs.writeFileSync(targetPath, buffer);
        return {
          filePath: targetPath,
          source: 'wikimedia',
          query: searchQuery,
          category
        };
      }
    } catch (err) {
      console.warn('[B-Roll Service] Gagal mengunduh klip Wikimedia:', (err as Error).message);
    }
  }

  // 5. Fallback: Check if temp broll exists
  const tempFerrari = path.join(storageDir, 'temp', 'ferrari_broll.webm');
  if (fs.existsSync(tempFerrari) && (category === 'automotive' || category === 'general')) {
    const dest = path.join(brollDir, 'ferrari_classic.webm');
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(tempFerrari, dest);
    }
    return {
      filePath: dest,
      source: 'commons',
      query: 'ferrari 365p',
      category: 'automotive'
    };
  }

  return null;
}
