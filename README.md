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
- 🔀 **Editor Dua Arah (Bidi LTR & RTL)**: Penulisan aksara Arab, Ibrani, dan Latin yang mulus dengan tombol arah per paragraf, mode Teks Kaya (WYSIWYG), Split Preview, dan Markdown.
- 📐 **Matematika & Diagram**: Dukungan penuh untuk formula matematika KaTeX ($E=mc^2$) dan diagram alur Mermaid.js.
- 🔐 **Enkripsi End-to-End (E2EE)**: Perlindungan brankas data sisi klien menggunakan Web Crypto AES-GCM 256-bit dan derivasi kunci PBKDF2 (100.000 iterasi).
- 🔄 **Sinkronisasi Fleksibel**:
  - WebDAV (Nextcloud, ownCloud, NAS pribadi).
  - Dropbox (OAuth 2.0 PKCE & Manual Access Token).
  - **Kode Pairing Kilat**: Hubungkan perangkat kedua (HP/laptop) dalam hitungan detik.
- 🌐 **Publikasi Web Tanpa Server**: Publikasikan catatan ke web layaknya Simplenote melalui integrasi Google Apps Script (GAS) dan Google Sheets dengan tautan ringkas terenkripsi.
- 🎙️ **Kreativitas & Multimedia**: Perekam memo suara langsung di catatan dan kanvas sketsa coretan tangan bebas.
- ⏳ **Riwayat Versi (Time Machine)**: Snapshot revisi otomatis untuk membandingkan dan memulihkan catatan lampau.
- 🕸️ **Grafik Pengetahuan 2D**: Hubungkan ide dengan WikiLinks (`[[Nama Catatan]]`) dan visualisasi grafik interaktif.
- 📄 **Ekspor Multi-Format**: Ekspor ke Microsoft Word (.docx), PDF rapi bervektor, Markdown (.md), HTML, atau arsip ZIP.

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
