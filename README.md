# Qalam Note ✒️

> **Aplikasi Catatan Local-First, Penulisan Dua Arah (Bidi LTR & RTL), dan Brankas Terenkripsi Pribadi.**

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

---

## 📜 Lisensi

Proyek ini didistribusikan di bawah lisensi **GNU General Public License v3.0 (GNU GPL v3)**.
Lihat ringkasan lisensi resmi di [GNU Operating System](https://www.gnu.org/licenses/gpl-3.0.html).
