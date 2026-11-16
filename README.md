# Qalam Note ✒️

> **Aplikasi Catatan Local-First, Penulisan Dua Arah (Bidi LTR & RTL), dan Brankas Terenkripsi Pribadi.**

[![GitHub](https://img.shields.io/badge/GitHub-qalam--note-181717?logo=github)](https://github.com/aiprojek/qalam-note)
[![Telegram](https://img.shields.io/badge/Telegram-Komunitas-229ED9?logo=telegram)](https://t.me/aiprojek_community/32#)
[![Traktir Kopi](https://img.shields.io/badge/Traktir%20Kopi-Lynk.id-FF813F?logo=buymeacoffee)](https://lynk.id/aiprojek/s/bvBJvdA)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0.html)

---

### 🔗 Tautan Komunitas & Donasi
- ☕ **Donasi / Traktir Kopi**: [https://lynk.id/aiprojek/s/bvBJvdA](https://lynk.id/aiprojek/s/bvBJvdA)
- 💬 **Komunitas Telegram**: [https://t.me/aiprojek_community/32#](https://t.me/aiprojek_community/32#)
- 🐙 **Repositori GitHub**: [https://github.com/aiprojek/qalam-note](https://github.com/aiprojek/qalam-note)

---

Qalam Note adalah aplikasi pencatat catatan yang mengutamakan privasi dan kedaulatan data pengguna. Dibuat dengan arsitektur **Local-First**, seluruh catatan tersimpan langsung di perangkat Anda tanpa ketergantungan pada server pihak ketiga.

---

## ✨ Fitur Utama

- 🏠 **Local-First & 100% Offline (PWA)**: Data tersimpan di IndexedDB menggunakan Dexie.js. Aplikasi dapat dipasang (*installable*) dan berjalan lancar tanpa koneksi internet.
- 🌿 **Publikasi Folder sebagai Wiki Interaktif (Zim-Style Digital Garden)**: Publikasikan seluruh buku catatan ke web dengan navigasi pohon hierarkis, WikiLink SPA instan tanpa reload, enkripsi Zero-Knowledge klien, proteksi kata sandi, dan proteksi anti-copy opsional.
- 📋 **Papan Kanban Multi-Proyek**: Papan tugas visual 4 kolom per proyek/klien dengan drag-and-drop halus, prioritas, tenggat waktu, dan publikasi web langsung untuk klien (*Client Live Progress View*).
- 🔀 **Editor Dua Arah (Bidi LTR & RTL)**: Penulisan aksara Arab, Ibrani, dan Latin yang mulus dengan tombol arah per paragraf, mode Teks Kaya (WYSIWYG), Split Preview, dan Markdown.
- 🔍 **Split View & Sinkronisasi Gulir Dua Arah**: Dilengkapi Penampil Kode Sumber (Inspector) dengan penomoran baris dan penyorotan kursor aktif, Smart Markdown Paste, serta sinkronisasi gulir dua arah halus.
- 📖 **Layar Belah (Dual Editor), Flashcard SRS & OCR Lokal**: Buka dua catatan berdampingan, kartu belajar mandiri pengulangan bertahap (SuperMemo SM-2), dan ekstraksi teks gambar 100% lokal via Tesseract.js.
- 📐 **Matematika & Diagram**: Dukungan penuh untuk formula matematika KaTeX ($E=mc^2$) dan diagram alur Mermaid.js.
- 🔐 **Enkripsi End-to-End (E2EE)**: Perlindungan brankas data sisi klien menggunakan Web Crypto AES-GCM 256-bit dan derivasi kunci PBKDF2 (100.000 iterasi).
- 🔄 **Sinkronisasi Multi-Backend Fleksibel**:
  - WebDAV (Nextcloud, ownCloud, NAS pribadi).
  - Dropbox (OAuth 2.0 PKCE & Manual Access Token).
  - Cloudflare Worker KV (edge serverless cepat & aman).
  - Server Mandiri (Node.js/Docker VPS pribadi dengan REST API terenkripsi).
  - **Kode Pairing Kilat (QLMSYNC1_...)**: Hubungkan perangkat kedua (HP/laptop) dalam hitungan detik.
- 🌐 **Publikasi Web & Wiki Multi-Provider**: Publikasikan catatan tunggal atau wiki buku catatan ke Google Apps Script (GAS), Cloudflare Worker KV, Server Mandiri, atau GitHub Gist/Repo dengan proteksi anti-copy dan enkripsi klien.
- 🎙️ **Kreativitas & Multimedia**: Perekam memo suara langsung di catatan dan kanvas sketsa coretan tangan bebas.
- ⏳ **Riwayat Versi (Time Machine)**: Snapshot revisi otomatis untuk membandingkan dan memulihkan catatan lampau.
- 🕸️ **Grafik Pengetahuan 2D**: Hubungkan ide dengan WikiLinks (`[[Nama Catatan]]`) dan visualisasi grafik interaktif.
- 📄 **Ekspor Multi-Format**: Ekspor ke Microsoft Word (.docx), PDF rapi bervektor, Markdown (.md), HTML dengan kredit aplikasi resmi, atau arsip ZIP.

---

## 🛠️ Tumpukan Teknologi

- **Frontend**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS v4](https://tailwindcss.com/)
- **Build Tool**: [Vite](https://vitejs.dev/) + [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)
- **Penyimpanan Lokal**: [Dexie.js](https://dexie.org/) (IndexedDB wrapper)
- **Kriptografi**: Web Crypto API (AES-GCM & PBKDF2)
- **Dokumen & Media**: KaTeX, Mermaid.js, jsPDF, docx, DOMPurify

---

## 🚀 Memulai Pengembangan

### Prasyarat
- Node.js (versi 18+)
- npm atau pnpm/bun

### Instalasi & Menjalankan Dev Server

```bash
# 1. Pasang dependensi
npm install

# 2. Jalankan server lokal
npm run dev
```

Buka peramban di `http://localhost:3000`.

### Membangun untuk Produksi

```bash
npm run build
```

Hasil build statis akan berada di direktori `dist/`.

### 🌐 Konfigurasi Deployment (Cloudflare Pages / Vercel / Netlify)

Untuk melakukan deploy pada **Cloudflare Pages**:
- **Framework preset**: `Vite`
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Root directory**: `/` (default)
- **Environment variable** (opsional): `NODE_VERSION=22`

> **Catatan**: Repositori menggunakan `package-lock.json` standar npm agar kompatibel dengan lingkungan build CI/CD Cloudflare Pages, Vercel, dan Netlify tanpa kendala versi lockfile.

---

## 🤝 Komunitas & Dukungan

Dukung keberlanjutan pengembangan aplikasi dan bergabung bersama komunitas Qalam Note:

- ☕ **Traktir Kopi**: [https://lynk.id/aiprojek/s/bvBJvdA](https://lynk.id/aiprojek/s/bvBJvdA)
- 💬 **Komunitas Telegram**: [https://t.me/aiprojek_community/32#](https://t.me/aiprojek_community/32#)
- 🐙 **Repositori GitHub**: [https://github.com/aiprojek/qalam-note](https://github.com/aiprojek/qalam-note)

---

## 📜 Lisensi

Proyek ini didistribusikan di bawah lisensi **GNU General Public License v3.0 (GNU GPL v3)**.
Lihat ringkasan lisensi resmi di [GNU Operating System](https://www.gnu.org/licenses/gpl-3.0.html).
