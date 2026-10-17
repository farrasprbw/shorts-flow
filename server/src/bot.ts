import { Bot, InlineKeyboard } from 'grammy';
import { env } from './config/env.js';
import { processApproval } from './modules/approvals/approval.service.js';
import { query } from './db/index.js';

if (!env.TELEGRAM_BOT_TOKEN) {
  console.log('[Telegram Bot] TELEGRAM_BOT_TOKEN belum disetel di .env. Bot service dilewati.');
}

export const bot = env.TELEGRAM_BOT_TOKEN ? new Bot(env.TELEGRAM_BOT_TOKEN) : null;

if (bot) {
  // Command /start
  bot.command('start', async (ctx) => {
    await ctx.reply(
      `👋 <b>Selamat datang di ShortsFlow Telegram Bot!</b>\n\n` +
      `Bot ini berfungsi untuk:\n` +
      `• Menerima notifikasi video baru siap review sesuai tier level Anda\n` +
      `• Approval / Reject instan lewat tombol interaktif\n` +
      `• Terintegrasi real-time dengan Web Dashboard\n\n` +
      `📌 <b>ID Telegram Anda:</b> <code>${ctx.from?.id}</code>\n\n` +
      `💡 <i>Untuk menghubungkan akun Anda, ketik:</i>\n<code>/link email-anda@shortsflow.ai</code>`,
      { parse_mode: 'HTML' }
    );
  });

  // Command /link <email> to link any team member (e.g. Michael, Sarah, Farras)
  bot.command('link', async (ctx) => {
    const text = ctx.message?.text || '';
    const email = text.replace('/link', '').trim().toLowerCase();

    if (!email) {
      return ctx.reply('⚠️ Harap sertakan email akun ShortsFlow Anda.\nContoh: <code>/link michael@shortsflow.ai</code>', { parse_mode: 'HTML' });
    }

    const telegramId = ctx.from?.id;
    const userRes = await query(`SELECT id, name, email FROM users WHERE LOWER(email) = $1;`, [email]);

    if (userRes.rows.length === 0) {
      return ctx.reply(`❌ Email <b>${email}</b> tidak terdaftar di sistem ShortsFlow.`, { parse_mode: 'HTML' });
    }

    const user = userRes.rows[0];
    await query(`UPDATE users SET telegram_user_id = $1 WHERE id = $2;`, [telegramId, user.id]);

    // Fetch user roles
    const rolesRes = await query(
      `SELECT r.label FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = $1;`,
      [user.id]
    );
    const rolesStr = rolesRes.rows.map(r => r.label).join(', ');

    await ctx.reply(
      `✅ <b>Akun Berhasil Ditautkan!</b>\n\n` +
      `👤 <b>Nama:</b> ${user.name}\n` +
      `📧 <b>Email:</b> ${user.email}\n` +
      `🎯 <b>Peran:</b> ${rolesStr}\n\n` +
      `Mulai sekarang, notifikasi review video yang sesuai dengan level peran Anda akan otomatis dikirimkan ke chat ini!`,
      { parse_mode: 'HTML' }
    );
  });

  // Handle Callback Query: Inline Button Clicks
  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data; // e.g. "appr:vid-101:1" or "rej:vid-101:1"
    const [actionCode, videoId, levelStr] = data.split(':');
    const level = parseInt(levelStr, 10);
    const action = actionCode === 'appr' ? 'approve' : 'reject';

    // 1. Identify user from telegram ID or fallback to Michael/Farras
    const telegramId = ctx.from.id;
    let userRes = await query(`SELECT id, name FROM users WHERE telegram_user_id = $1 LIMIT 1;`, [telegramId]);

    let userId: string;
    let userName: string;

    if (userRes.rows.length > 0) {
      userId = userRes.rows[0].id;
      userName = userRes.rows[0].name;
    } else {
      // Fallback for demo testing to Farras Admin or Michael
      const fallbackRes = await query(`SELECT id, name FROM users ORDER BY created_at ASC LIMIT 1;`);
      userId = fallbackRes.rows[0]?.id;
      userName = fallbackRes.rows[0]?.name || ctx.from.first_name;
    }

    // 2. Execute Atomic Conditional Update in Database
    const result = await processApproval(videoId, userId, action, level, 'telegram');

    if (result.success) {
      // Success feedback
      await ctx.answerCallbackQuery({
        text: action === 'approve' ? '✅ Disetujui!' : '❌ Ditolak!'
      });

      // Update message & REMOVE action buttons so it cannot be clicked again
      const statusText = action === 'approve'
        ? `✅ <b>Disetujui oleh ${userName}</b> pada ${new Date().toLocaleTimeString('id-ID')}`
        : `❌ <b>Ditolak oleh ${userName}</b> pada ${new Date().toLocaleTimeString('id-ID')}`;

      await ctx.editMessageText(
        `${ctx.callbackQuery.message?.text || ''}\n\n━━━━━━━━━━━━━━━\n${statusText}`,
        { parse_mode: 'HTML' }
      );
    } else if (result.conflict) {
      // Conflict feedback (Alert popup on Telegram client)
      await ctx.answerCallbackQuery({
        text: result.message,
        show_alert: true
      });

      // Remove buttons to prevent further attempts
      await ctx.editMessageReplyMarkup({ reply_markup: undefined });
    } else {
      await ctx.answerCallbackQuery({
        text: `⚠️ Gagal: ${result.message}`,
        show_alert: true
      });
    }
  });
}

interface TelegramSentCard {
  chatId: string | number;
  messageId: number;
  baseText: string;
}

// Memory store of active review cards: key `${videoId}:${level}`
const activeReviewCards = new Map<string, TelegramSentCard[]>();

/**
 * Helper to send a new video review request to a Telegram chat/group
 */
export async function sendVideoReviewToTelegram(
  chatId: string | number,
  video: { id: string; title: string; script: string; duration: number; level: number; platforms: string[] }
) {
  if (!bot) return;

  const keyboard = new InlineKeyboard()
    .text(`✅ Approve (L${video.level})`, `appr:${video.id}:${video.level}`)
    .text(`❌ Reject`, `rej:${video.id}:${video.level}`);

  const message =
    `🎬 <b>Video Siap Direview (Level ${video.level})</b>\n\n` +
    `📌 <b>Judul:</b> ${video.title}\n` +
    `⏱️ <b>Durasi:</b> ${video.duration}s (9:16 vertikal)\n` +
    `🎯 <b>Platform:</b> ${video.platforms.join(', ').toUpperCase()}\n\n` +
    `📝 <b>Naskah:</b>\n<i>"${video.script.substring(0, 220)}..."</i>\n\n` +
    `🔗 <b>Link Dashboard:</b> http://localhost:4200/review/${video.id}`;

  const sent = await bot.api.sendMessage(chatId, message, {
    parse_mode: 'HTML',
    reply_markup: keyboard
  });

  // Track sent card for real-time synchronization with dashboard
  const key = `${video.id}:${video.level}`;
  const list = activeReviewCards.get(key) || [];
  list.push({ chatId, messageId: sent.message_id, baseText: message });
  activeReviewCards.set(key, list);
  return sent;
}

/**
 * Real-time Sync: when someone approves/rejects in the Web Dashboard,
 * automatically update the Telegram message and remove the inline buttons!
 */
export async function syncTelegramCardFromDashboard(
  videoId: string,
  level: number,
  action: 'approve' | 'reject',
  userName: string
) {
  if (!bot) return;

  const key = `${videoId}:${level}`;
  const cards = activeReviewCards.get(key);
  if (!cards || cards.length === 0) return;

  const statusText = action === 'approve'
    ? `✅ <b>Disetujui via Web Dashboard oleh ${userName}</b> pada ${new Date().toLocaleTimeString('id-ID')}`
    : `❌ <b>Ditolak via Web Dashboard oleh ${userName}</b> pada ${new Date().toLocaleTimeString('id-ID')}`;

  for (const card of cards) {
    try {
      await bot.api.editMessageText(
        card.chatId,
        card.messageId,
        `${card.baseText}\n\n━━━━━━━━━━━━━━━\n${statusText}`,
        { parse_mode: 'HTML' }
      );
      // Remove inline buttons so no one can click them anymore
      await bot.api.editMessageReplyMarkup(card.chatId, card.messageId, {
        reply_markup: undefined
      });
      console.log(`[Telegram Bot] 🔄 Real-time Sync: Pesan Telegram #${card.messageId} diupdate & tombol dihapus (Aksi: ${action} oleh ${userName})`);
    } catch (err: unknown) {
      console.warn(`[Telegram Bot] Gagal sinkronisasi pesan Telegram #${card.messageId}:`, (err as Error).message);
    }
  }

  activeReviewCards.delete(key);
}

/**
 * Send review card ONLY to reviewers matching the specific level
 */
export async function sendVideoReviewToTelegramForLevel(
  level: number,
  video: { id: string; title: string; script: string; duration: number; level: number; platforms: string[] }
) {
  if (!bot) return;

  // Query users that have this specific review level and a registered telegram_user_id
  const res = await query(
    `SELECT DISTINCT u.telegram_user_id, u.name
     FROM users u
     JOIN user_roles ur ON u.id = ur.user_id
     JOIN roles r ON ur.role_id = r.id
     WHERE r.level = $1 AND u.telegram_user_id IS NOT NULL AND u.is_active = TRUE;`,
    [level]
  );

  if (res.rows.length === 0) {
    console.log(`[Telegram Bot] Info: Tidak ada reviewer terdaftar dengan telegram_user_id untuk Level ${level}.`);
    return;
  }

  for (const user of res.rows) {
    console.log(`[Telegram Bot] 📲 Mengirim notifikasi Level ${level} ke ${user.name} (Chat ID: ${user.telegram_user_id})`);
    await sendVideoReviewToTelegram(user.telegram_user_id, video);
  }
}

