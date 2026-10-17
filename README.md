# ⚡ ShortsFlow — Multi-Tier Video Automation & Review Platform

ShortsFlow adalah sistem otomasi produksi konten video vertikal (YouTube Shorts, Instagram Reels, TikTok) yang dilengkapi dengan mekanisme persetujuan berjenjang (_multi-tier human-in-the-loop review_), proteksi benturan persetujuan bersamaan (_anti-race condition_), bot Telegram interaktif dua arah, worker antrian background (BullMQ + Redis), serta dashboard modern berbasis Angular v19 Signals & Tailwind CSS.

---

## 🌟 Fitur Utama

- **Multi-Tier Review Pipeline**: Alur persetujuan berjenjang dari Reviewer Level 1 (naskah/audio hook) hingga Reviewer Level 2 (validasi final & brand alignment).
- **Anti-Race Condition Engine**: Transaksi basis data atomik (`conditional UPDATE` dengan level & version check) yang mencegah _double approval_ atau benturan keputusan antara Web Dashboard dan Telegram Bot (menghasilkan HTTP 409 Conflict bagi aksi yang terlambat).
- **Interactive Telegram Bot**: Notifikasi review langsung dikirim ke Telegram sesuai tier reviewer, dilengkapi tombol aksi inline dan sinkronisasi status dua arah secara _real-time_.
- **Automated Video Generation**: Worker background berbasis BullMQ yang merender video vertikal 9:16 (1080x1920) dengan visual test pattern dinamis dan audio sintetis menggunakan FFmpeg.
- **Direct YouTube Shorts Upload**: Integrasi resmi YouTube Data API v3 OAuth2 yang secara otomatis mengunggah video ke YouTube Shorts segera setelah memperoleh persetujuan final (atau sesuai jadwal tayang).
- **Live YouTube Analytics & Sync**: Sinkronisasi metrik performa asli (_Views, Likes, Comments_) secara berkala setiap 60 detik dari YouTube Data API v3 ke tabel basis data, lengkap dengan tombol manual refresh di dashboard.
- **Pure API Architecture**: Seluruh fitur (Review Queue, Jadwal Tayang, RBAC, dan Analitik) berjalan murni dari API dan database PostgreSQL tanpa ketergantungan data dummy/mock lokal.
- **Automated Due Scheduler**: Pengecekan background berkala yang mempublikasikan video terjadwal secara tepat waktu (`scheduled_at <= NOW()`).
- **Dynamic RBAC & Persona Switcher**: Pengelolaan peran fleksibel (`admin`, `reviewer_level_1`, `reviewer_level_2`, `viewer`) dengan pengujian persona langsung di dashboard.
- **Modern Angular v19 UI**: Dibangun dengan Angular Signals tanpa Zone.js, Tailwind CSS, dark aesthetic, dan bebas dari tipe data `any`.

---

## 🏗️ Arsitektur & Teknologi

| Layer             | Teknologi                                                  | Deskripsi                                                                     |
| :---------------- | :--------------------------------------------------------- | :---------------------------------------------------------------------------- |
| **Frontend**      | Angular v19, Tailwind CSS, Lucide Icons, TypeScript Strict | SPA dengan Signals, zero-`any` typing, filter tier dinamis                    |
| **Backend API**   | Node.js, Fastify, TypeScript Strict, JWT, bcryptjs         | REST API modular dengan route guards dan conditional updates                  |
| **Database**      | PostgreSQL 16 (Docker)                                     | Relational persistence, conditional lock queries, custom enums                |
| **Queue & Cache** | Redis 7, BullMQ                                            | Antrian background terdistribusi (`video-generation`, `video-publishing`)     |
| **Video Engine**  | FFmpeg (`@ffmpeg-installer/ffmpeg`)                        | Rendering video 9:16, audio tone generator, snapshot thumbnail                |
| **Bot Service**   | grammY Framework                                           | Bot Telegram long-polling, inline callback keyboards, real-time message edits |
| **Publishing**    | Google APIs (`googleapis`), OAuth2                         | Integrasi resmi upload video ke YouTube Shorts                                |

---

## 📋 Prasyarat Sistem

- **Node.js**: Versi 20.x atau lebih baru
- **Docker & Docker Compose**: Untuk menjalankan PostgreSQL dan Redis
- **Akun Google Cloud** _(Opsional, untuk upload YouTube)_: Project dengan YouTube Data API v3 diaktifkan
- **Bot Telegram** _(Opsional, untuk review via chat)_: Token bot dari [@BotFather](https://t.me/BotFather)

---

## 🚀 Panduan Memulai Cepat (Quickstart)

### 1. Clone & Instal Dependensi

```bash
# Clone repositori
git clone https://github.com/username/shorts-flow.git
cd shorts-flow

# Instal dependensi frontend
npm install

# Instal dependensi backend
cd server
npm install
cd ..
```

### 2. Jalankan Layanan Database & Redis

Jalankan container PostgreSQL dan Redis menggunakan Docker Compose:

```bash
docker compose up -d
```

> [!NOTE]
> File `docker/init-db/01-init.sql` akan otomatis diinisialisasi oleh PostgreSQL pada container boot pertama untuk membuat tabel, enum, role, dan baseline user.

### 3. Konfigurasi Environment Variables

Salin template environment pada folder `server`:

```bash
cp server/.env.example server/.env
```

Sesuaikan konfigurasi pada `server/.env` (gunakan placeholder berikut):

```env
# Server
PORT=3000
NODE_ENV=development
JWT_SECRET="<YOUR_RANDOM_JWT_SECRET>"

# Database & Cache (sesuai docker-compose.yml)
DATABASE_URL="postgres://postgres:postgres@localhost:5432/shortsflow"
REDIS_HOST="localhost"
REDIS_PORT=6379

# Telegram Bot (Opsional)
TELEGRAM_BOT_TOKEN="<YOUR_TELEGRAM_BOT_TOKEN>"
TELEGRAM_CHAT_ID="<YOUR_TELEGRAM_CHAT_ID>"

# YouTube OAuth (Opsional)
YOUTUBE_CLIENT_ID="<YOUR_GOOGLE_CLIENT_ID>.apps.googleusercontent.com"
YOUTUBE_CLIENT_SECRET="<YOUR_GOOGLE_CLIENT_SECRET>"
YOUTUBE_REDIRECT_URI="http://localhost:3000/api/youtube/callback"
```

> [!IMPORTANT]
> Jangan pernah mencantumkan token Telegram riil atau Google Client Secret ke dalam repositori publik.

### 4. Jalankan Aplikasi

**Jalankan Backend & Worker (Terminal 1):**

```bash
cd server
npm run dev
```

Backend API akan aktif di `http://localhost:3000`.

**Jalankan Frontend Angular (Terminal 2):**

```bash
npm start
```

Dashboard akan dapat diakses melalui browser di `http://localhost:4200`.

---

## 👥 Akun Pengguna & Persona Pengujian

Untuk memisahkan data akun dan kredensial pengujian dari dokumentasi publik, detail lengkap mengenai:

- Persona pengujian (**Farras** [Admin & L2], **Michael** [Reviewer L1], **Sarah** [L2], **Viewer**)
- Default password
- Cara menghubungkan akun Telegram menggunakan perintah `/link <email>`
- Konfigurasi Google OAuth2 untuk YouTube

---

## 🧪 Validasi Happy Flow & Pengujian Fitur

1. **Membuat Video Baru**:
   - Di dashboard, klik tombol **Buat Video AI**.
   - Masukkan topik (misal: _Inovasi AI & Cloud 2026_), lalu klik **Generate Video**.
   - BullMQ worker akan merender video dan menyimpannya ke database dengan status `pending_review` (Level 1).
2. **Review Level 1 (Michael)**:
   - Gunakan persona switcher di sidebar untuk memilih **Michael (Reviewer Level 1)**.
   - Buka kartu video, lalu klik **Approve Level 1**. Video akan berlanjut ke Level 2.
3. **Review Level 2 & Final Approval (Farras)**:
   - Ganti persona ke **Farras (Admin & Reviewer L2)**.
   - Buka kartu video, lalu klik **Approve Final (L2)** (bisa dilakukan di Web Dashboard maupun melalui tombol inline di Telegram).
4. **Otomasi Upload ke YouTube**:
   - Setelah final approval, worker `videoPublishingQueue` otomatis mengambil file video dan mengunggahnya ke channel YouTube Shorts yang terhubung.
   - Tautan video Shorts yang berhasil diunggah akan langsung dikirimkan ke Telegram bot.
5. **Simulasi Benturan (Anti-Race Condition)**:
   - Di tab Review Queue, klik tombol **Simulasi Benturan Approval**.
   - Sistem akan menembakkan dua aksi simultan pada milidetik yang sama. Tepat satu aksi diterima dan aksi kedua ditolak dengan HTTP 409 Conflict tanpa merusak integritas database.

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah lisensi MIT.
