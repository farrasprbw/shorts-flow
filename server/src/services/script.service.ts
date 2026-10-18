import { env } from '../config/env.js';

export interface ScriptGenerationResult {
  title: string;
  script: string;
  source: 'gemini' | 'openai' | 'wikipedia' | 'category_engine';
}

const CATEGORY_HOOKS: Record<string, { hookPrefix: string; cta: string }> = {
  nature: {
    hookPrefix: 'Pernahkah kamu melihat keajaiban alam seperti ini?',
    cta: 'Kira-kira kamu berani berpetualang ke sini gak? Tulis di komentar ya!'
  },
  automotive: {
    hookPrefix: 'Pencinta otomotif wajib tahu yang satu ini!',
    cta: 'Kalau kamu punya budget tanpa batas, bakal koleksi ini gak? Share pendapatmu!'
  },
  technology: {
    hookPrefix: 'Teknologi ini sedang mengubah masa depan kita!',
    cta: 'Menurutmu masa depan teknologi ini bakal menguntungkan atau menakutkan? Diskusi di bawah yuk!'
  },
  kids: {
    hookPrefix: 'Halo adik-adik pintar dan ceria!',
    cta: 'Keren banget kan? Jangan lupa klik like dan bagikan ke teman-temanmu ya!'
  },
  city: {
    hookPrefix: 'Ini dia sisi lain dari kota metropolitan yang jarang diketahui!',
    cta: 'Mau jalan-jalan ke sini? Tag teman yang mau kamu ajak!'
  },
  general: {
    hookPrefix: 'Fakta unik yang satu ini dijamin bikin kamu takjub!',
    cta: 'Simpan video ini biar gak lupa, dan share ke temanmu ya!'
  }
};

/**
 * Searches Indonesian Wikipedia for real factual summary of a topic.
 * Completely free, no API key required, reliable real-world facts.
 */
async function fetchWikipediaFacts(topic: string): Promise<{ title: string; extract: string } | null> {
  try {
    const searchUrl = `https://id.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&utf8=&format=json`;
    const sRes = await fetch(searchUrl, {
      headers: { 'User-Agent': 'ShortsFlowBot/1.0 (contact: farras@shortsflow.com)' }
    });
    if (!sRes.ok) return null;

    const sData = await sRes.json() as { query?: { search?: Array<{ title: string }> } };
    const firstHit = sData.query?.search?.[0];
    if (!firstHit) return null;

    const summaryUrl = `https://id.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(firstHit.title)}`;
    const sumRes = await fetch(summaryUrl, {
      headers: { 'User-Agent': 'ShortsFlowBot/1.0 (contact: farras@shortsflow.com)' }
    });
    if (!sumRes.ok) return null;

    const sumData = await sumRes.json() as { title: string; extract: string };
    if (!sumData.extract || sumData.extract.length < 30) return null;

    return {
      title: sumData.title,
      extract: sumData.extract
    };
  } catch (err) {
    console.warn('[Script Service] Wikipedia knowledge fetch notice:', (err as Error).message);
    return null;
  }
}

/**
 * Generates an informative, viral YouTube Shorts script in Indonesian.
 */
export async function generateInformativeScript(params: {
  topic: string;
  category?: string;
  isForKids?: boolean;
  userTitle?: string;
  userScript?: string;
}): Promise<ScriptGenerationResult> {
  const { topic, userTitle, userScript, isForKids } = params;
  const category = (params.category || (isForKids ? 'kids' : 'general')).toLowerCase();

  // If user provided a specific manual script, respect it 100%
  if (userScript && userScript.trim().length > 10) {
    return {
      title: userTitle || topic,
      script: userScript.trim(),
      source: 'category_engine'
    };
  }

  // 1. Try Gemini API if key exists in env
  const geminiKey = process.env.GEMINI_API_KEY || (env as unknown as Record<string, string>)?.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      console.log(`[Script Service] 🤖 Menggunakan Gemini AI untuk menulis naskah: "${topic}" (${category})...`);
      const prompt = `Tuliskan teks narasi voiceover untuk video YouTube Shorts berdurasi 15 detik tentang topik: "${topic}" (kategori: ${category}, ${isForKids ? 'khusus anak-anak ceria dan ramah' : 'konten umum'}).
Syarat mutlak:
1. Berikan fakta nyata yang spesifik, unik, dan informatif tentang topik tersebut (bukan basa-basi umum).
2. Format terdiri dari: Hook menarik di detik awal + 2 kalimat fakta inti + Call to Action singkat di akhir.
3. HANYA keluarkan kalimat yang akan diucapkan oleh voiceover dalam 1 paragraf mengalir (maksimal 40-50 kata). JANGAN gunakan timestamp (00:00), JANGAN tulis nama adegan/musik/visual, JANGAN gunakan tanda kurung atau tanda bintang (*) / markdown formatting.`;

      const gUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`;
      const gRes = await fetch(gUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (gRes.ok) {
        const gData = await gRes.json() as {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
          }>;
        };
        const rawText = gData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (rawText && rawText.length > 25) {
          const cleanScript = rawText
            .replace(/[*#_~`]/g, '')
            .replace(/\([^)]*\)/g, '')
            .replace(/\[[^\]]*\]/g, '')
            .replace(/Voice\s*Over:?/gi, '')
            .replace(/Narator:?/gi, '')
            .replace(/^"|"$/g, '')
            .replace(/\s+/g, ' ')
            .trim();

          console.log(`[Script Service] ✅ Naskah Gemini AI berhasil dibuat: "${cleanScript.slice(0, 60)}..."`);
          return {
            title: userTitle || `${topic} Yang Wajib Kamu Tahu!`,
            script: cleanScript,
            source: 'gemini'
          };
        }
      } else {
        console.warn(`[Script Service] Gemini API returned status ${gRes.status}: ${gRes.statusText}`);
      }
    } catch (gErr) {
      console.warn('[Script Service] Gemini generation warning, beralih ke Wikipedia:', (gErr as Error).message);
    }
  }

  // 2. Wikipedia Factual Knowledge Engine (Real, informative real-world facts)
  console.log(`[Script Service] 📚 Mengambil fakta nyata dari Wikipedia untuk topik: "${topic}"...`);
  const wikiData = await fetchWikipediaFacts(topic);

  const hookConfig = CATEGORY_HOOKS[category] || CATEGORY_HOOKS.general;

  if (wikiData) {
    // Extract first 2-3 clean informative sentences
    const cleanExtract = wikiData.extract
      .replace(/\([^)]*\)/g, '') // remove parenthetical notes
      .replace(/\s+/g, ' ')
      .trim();

    const sentences = cleanExtract
      .split(/(?<=[.!?])\s+/)
      .filter(s => s.length > 25 && !s.includes('adalah merujuk'))
      .slice(0, 2);

    if (sentences.length > 0) {
      let hook = `${hookConfig.hookPrefix} Tahukah kamu tentang ${wikiData.title}?`;
      if (isForKids) {
        hook = `Halo teman-teman! Yuk kenalan dengan ${wikiData.title}!`;
      } else if (category === 'automotive') {
        hook = `Penggemar kecepatan wajib tahu ${wikiData.title}!`;
      } else if (category === 'nature') {
        hook = `Ini dia salah satu keajaiban alam: ${wikiData.title}!`;
      }

      const body = sentences.join(' ');
      const fullScript = `${hook} ${body} ${hookConfig.cta}`.trim();

      return {
        title: userTitle || `${wikiData.title}: Fakta Menarik & Unik`,
        script: fullScript,
        source: 'wikipedia'
      };
    }
  }

  // 3. Fallback Dynamic Structured Engine (Context-aware based on topic & category)
  let structuredScript = '';
  if (isForKids) {
    structuredScript = `Halo adik-adik ceria! Tahukah kamu bahwa ${topic} itu sangat seru dan menyenangkan untuk dipelajari? Banyak hal menarik di dalamnya yang bisa menambah wawasanmu setiap hari. Yuk selalu semangat belajar dan temukan hal baru!`;
  } else if (category === 'nature') {
    structuredScript = `Pernahkah kamu menjelajahi pesona ${topic}? Keindahan panorama alam ini menyimpan karakteristik unik dan daya tarik luar biasa yang selalu memikat para traveler. Keberadaannya jadi bukti betapa menakjubkannya alam sekitar kita. Jangan lupa masukkan ke daftar liburanmu!`;
  } else if (category === 'automotive') {
    structuredScript = `Bicara soal dunia otomotif, ${topic} punya daya tarik tersendiri dengan desain aerodinamis dan performa mesin yang bertenaga. Kendaraan ini dirancang dengan presisi tinggi untuk menghadirkan pengalaman berkendara maksimal. Mobil impian siapa nih?`;
  } else if (category === 'technology') {
    structuredScript = `Perkembangan pesat seputar ${topic} kini membawa perubahan besar dalam industri digital modern. Inovasi mutakhir ini dirancang untuk mempermudah pekerjaan kita dan mempercepat arus informasi di seluruh dunia. Masa depan sudah dimulai hari ini!`;
  } else {
    structuredScript = `Banyak fakta mengejutkan seputar ${topic} yang sering kali tidak kita sadari dalam kehidupan sehari-hari. Mulai dari asal-usulnya hingga dampaknya yang besar, topik ini selalu menarik untuk dibahas. Simak terus konten kami untuk fakta seru lainnya!`;
  }

  return {
    title: userTitle || `Fakta Menarik: ${topic}`,
    script: structuredScript,
    source: 'category_engine'
  };
}
