import { sendVideoReviewToTelegram } from './bot.js';

async function main() {
  console.log('Mengirim kartu notifikasi review interaktif ke Telegram...');
  await sendVideoReviewToTelegram(447234919, {
    id: 'c1111111-1111-1111-1111-111111111111',
    title: '5 Fakta AI yang Bikin Kamu Merinding di Tahun 2026',
    script: 'Tahukah kamu bahwa 70% konten video vertikal kini dirancang oleh model AI dalam hitungan detik? Simak sampai habis!',
    duration: 48,
    level: 1,
    platforms: ['youtube', 'tiktok']
  });
  console.log('✅ Notifikasi video berhasil dikirim ke Telegram chat 447234919!');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Gagal mengirim notifikasi:', err);
  process.exit(1);
});
