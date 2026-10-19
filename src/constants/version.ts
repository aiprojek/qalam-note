export interface ChangelogItem {
  version: string;
  date: string;
  title: {
    id: string;
    en: string;
  };
  highlights: {
    id: string[];
    en: string[];
  };
}

export const APP_VERSION = '1.0.3';
export const APP_BUILD_DATE = '2026-10-18';
export const APP_LICENSE_NAME = 'GNU General Public License v3.0';
export const APP_LICENSE_SHORT = 'GNU GPL v3';
export const APP_LICENSE_URL = 'https://www.gnu.org/licenses/gpl-3.0.html';
export const FSF_URL = 'https://www.fsf.org';

export const DONATION_URL = 'https://lynk.id/aiprojek/s/bvBJvdA';
export const TELEGRAM_URL = 'https://t.me/aiprojek_community/32#';
export const GITHUB_REPO_URL = 'https://github.com/aiprojek/qalam-note';

export const APP_CHANGELOG: ChangelogItem[] = [
  {
    version: '1.0.3',
    date: '2026-10-18',
    title: {
      id: 'Pembaruan v1.0.3: UI Kode Pairing Ringkas 1 Baris, Pintasan Sinkronisasi Joplin (Ctrl+S) & Audit Sinkronisasi',
      en: 'v1.0.3 Update: Compact 1-Row Pairing UI, Joplin-Style Sync Shortcut (Ctrl+S) & Sync Engine Audit',
    },
    highlights: {
      id: [
        'UI Kode Pairing Ringkas 1 Baris (Anti-Wrap): Menata tombol Buat Kode Pairing, Salin, Segarkan, dan Terapkan ke dalam layout horizontal 1 baris yang padat dan simetris, menjamin tidak ada pembungkusan baris (wrap) pada layar sempit.',
        'Pintasan Keyboard Sinkronisasi Joplin (Ctrl+S / Cmd+S): Menjadikan Ctrl+S sebagai pintasan sinkronisasi cepat seperti di Joplin Desktop, mencegah munculnya jendela dialog unduh halaman peramban dan memberikan konfirmasi visual instan.',
        'Referensi Pintasan Keyboard di Tab Tentang: Menampilkan daftar pintasan penting (Ctrl+S, Ctrl+K, Ctrl+N, Ctrl+T, Ctrl+G, Alt+D, Ctrl+Shift+H, Ctrl+P) secara jelas di menu Setelan.',
        'Audit Rekonsiliasi Sinkronisasi & Joplin Tombstone: Penyelarasan siklus hidup item catatan dan buku catatan agar penghapusan lokal tidak memunculkan kembali (resurrect) folder dari penyimpanan cloud.',
      ],
      en: [
        'Compact 1-Row Pairing Code UI (Anti-Wrap): Refactored generate, copy, refresh, and apply controls into a single streamlined horizontal row, eliminating awkward button wrapping across compact screens.',
        'Joplin-Standard Sync Shortcut (Ctrl+S / Cmd+S): Configured Ctrl+S to trigger instant two-way cloud sync matching Joplin desktop, suppressing browser save dialogs and displaying live progress in the status bar.',
        'Key Shortcuts Reference in About Tab: Added an elegant quick-reference table for essential keyboard shortcuts in Application Settings and Command Palette (Ctrl+K).',
        'Sync Engine Audit & Tombstone Persistence: Reinforced deletion tombstones to strictly ensure locally deleted notebooks and notes are never resurrected during remote reconciliation.',
      ],
    },
  },
  {
    version: '1.0.2',
    date: '2026-10-14',
    title: {
      id: 'Pembaruan v1.0.2: Tampilan Publikasi Web Sempurna, Tanggal Publikasi, Penamaan Folder Sinkron & Build Cloudflare',
      en: 'v1.0.2 Update: Flawless Web Reader, Publication Date, Folder Sync Naming & Cloudflare CI Fix',
    },
    highlights: {
      id: [
        'Render Teks Publikasi Sempurna: Teks HTML maupun Markdown baik dari editor WYSIWYG maupun editor Markdown kini dirender secara kaya dan akurat dengan format paragraf, tabel, kutipan, dan gaya teks utuh.',
        'Penanggalan Publikasi Eksplisit: Mengganti teks "Tersimpan" di sisi kanan hasil publikasi menjadi Tanggal Publikasi resmi yang informatif.',
        'Penamaan Folder Mengikuti Perangkat Utama: Memperbaiki sinkronisasi agar nama buku catatan/folder dari perangkat induk tidak berubah menjadi "Folder Sinkron", melainkan mempertahankan nama asli dari perangkat utama secara konsisten.',
        'Perbaikan Pengguliran (Scroll) Halaman: Membuka kunci batasan overflow halaman sehingga seluruh isi catatan dapat di-scroll ke bawah sampai tuntas tanpa terpotong di peramban ponsel maupun desktop.',
        'Penguatan Keamanan Publikasi (Security Hardening): Menghilangkan tautan langsung ke endpoint sumber Google Apps Script (GAS) dan skrip mentah untuk melindungi privasi URL Google Sheets pemilik.',
        'Pembersihan Antarmuka Pembaca: Menghilangkan badge/pill "Catatan Publik" dan "?k=cipher" untuk menyajikan ruang membaca yang bersih, minimalis, dan elegan.',
        'Penyelarasan Build Cloudflare Pages: Memperbarui package-lock.json agar perintah "npm ci" berjalan mulus tanpa kegagalan paket hilang pada pipeline Cloudflare.',
      ],
      en: [
        'Flawless Web Reader Rendering: Rich HTML and Markdown from both WYSIWYG and Markdown editor modes now render with full typographical accuracy, styled tables, blockquotes, and lists.',
        'Explicit Publication Date: Replaced "Tersimpan" on the right side of publication with the official formatted Publication Date.',
        'Notebook Naming Follows Primary Device: Fixed sync folder reconciliation so folders never get renamed to "Folder Sinkron", faithfully preserving the folder titles from the master device.',
        'Smooth Vertical Scrolling: Unlocked page overflow constraints, enabling readers to effortlessly scroll long notes all the way to the bottom on both mobile and desktop screens.',
        'Publishing Security Hardening: Completely removed raw Google Apps Script (GAS) source links to safeguard owner deployment URLs and Google Sheets storage.',
        'Clean & Minimalist Reader Interface: Removed redundant "Catatan Publik" and "?k=cipher" badge pills for an uncluttered, reading-focused presentation.',
        'Cloudflare Pages CI/CD Alignment: Synchronized package-lock.json with package.json so "npm ci" completes reliably without missing package errors on automated deployments.',
      ],
    },
  },
  {
    version: '1.0.1',
    date: '2026-10-14',
    title: {
      id: 'Pembaruan v1.0.1: Perbaikan Ekspor PDF, UI Pairing, Layer Menu & Sinkronisasi Lintas Perangkat',
      en: 'v1.0.1 Update: PDF Export Polish, Pairing UI, Action Menu Layer & Robust Cross-Device Sync',
    },
    highlights: {
      id: [
        'Ekspor PDF Lebih Bersih: Menghilangkan kredit duplikat/redundant di footer halaman PDF, menjaga atribusi rapi dan elegan.',
        'Penyempurnaan UI Kode Pairing: Menata ulang tombol aksi ("Salin Kode Pairing" & "Segarkan") tepat di bawah field kode agar tidak terdorong keluar kartu modal pada resolusi sempit.',
        'Peningkatan Layer Dropdown Catatan: Menaikkan z-index/layer dropdown aksi catatan (z-50) serta menambahkan penutup otomatis saat klik di luar area atau menekan tombol Escape agar menu tidak tertutup catatan di bawahnya.',
        'Sistem Sinkronisasi Lintas Perangkat (Multi-Device Sync): Rekonsiliasi sinkronisasi dua arah yang tangguh terhadap clock-skew, memastikan catatan baru dan editan dari perangkat utama langsung tersinkron dan tampil di perangkat kedua.',
        'Auto-Sync Otomatis: Sinkronisasi otomatis saat catatan dibuat, diedit (debounced), dihapus, serta saat aplikasi/tab kembali dibuka (visibility change).',
        'Integritas Data Catatan Pengguna: Mencegah penimpaan catatan oleh pembersih preset bawaan dan menyajikan laporan galat (error reporting) yang transparan jika koneksi cloud terkendala.',
      ],
      en: [
        'Cleaner PDF Export: Eliminated duplicate/redundant credits in PDF page footers, keeping document attribution neat and elegant.',
        'Pairing Code UI Polish: Repositioned action buttons ("Copy Pairing Code" & "Refresh") directly below the input field to prevent overflow outside modal cards on compact displays.',
        'Elevated Action Menu Layer: Raised note action dropdown layer (z-50) and added global click-outside and Escape key dismissal to avoid overlapping note items below.',
        'Robust Cross-Device Sync: Re-engineered two-way synchronization reconciliation to handle clock-skew differences, guaranteeing new notes and edits from the primary device promptly sync and display on the second device.',
        'Automatic Background Sync: Debounced auto-sync when creating, modifying, duplicating, or trashing notes, as well as upon tab focus / app reopen.',
        'Data Integrity & Error Transparency: Shielded user notes from preset sanitation overrides and enabled transparent error reporting for cloud connectivity issues.',
      ],
    },
  },
  {
    version: '1.0.0',
    date: '2026-10-07',
    title: {
      id: 'Rilis Perdana Qalam Note: Local-First, Bidi Editor & E2EE Vault',
      en: 'Initial Release: Local-First, Bidirectional Editor & E2EE Vault',
    },
    highlights: {
      id: [
        'Arsitektur Local-First (Dexie.js / IndexedDB): Penyimpanan data lokal super cepat, instan, dan mandiri tanpa ketergantungan server eksternal.',
        'Editor Teks Dua Arah (Bidi LTR & RTL): Format penulisan aksara Arab, Ibrani, dan Latin yang mulus dengan tombol arah per blok, rendering Markdown, matematika KaTeX ($E=mc^2$), dan diagram alur Mermaid.js.',
        'Privasi & Enkripsi End-to-End (E2EE): Proteksi data sisi klien dengan cipher Web Crypto AES-GCM 256-bit dan derivasi kunci PBKDF2 100.000 iterasi.',
        'Sinkronisasi Multi-Layanan & Pairing Code: Hubungkan WebDAV (Nextcloud, NAS), Dropbox (OAuth 2.0 PKCE & Token), serta sinkronisasi instan antar-perangkat via Kode Pairing.',
        'Publikasi Web Tanpa Server: Terbitkan catatan ke web layaknya Simplenote menggunakan Google Apps Script (GAS) dan Google Sheets dengan URL ringkas terenkripsi.',
        'Fitur Kreatif & Pengorganisasian: Perekam memo suara, kanvas sketsa coretan tangan, riwayat versi otomatis (Time Machine Snapshot), tag bersarang, serta visualisasi Grafik Pengetahuan 2D (WikiLinks [[...]]).',
        'Ekspor Multi-Format Komprehensif: Unduh catatan dalam format Markdown (.md), HTML, Microsoft Word (.docx), PDF berformat rapi, dan arsip ZIP.',
        '100% Siap Luring (PWA Offline-First): Dukungan Service Worker caching penuh dan kemampuan pasang ke layar utama desktop dan ponsel.',
        'Lisensi Resmi GNU General Public License v3.0 (GNU GPL v3): Jaminan 100% kebebasan perangkat lunak dan kedaulatan data pengguna tanpa telemetri atau pelacak.',
      ],
      en: [
        'Local-First Architecture (Dexie.js / IndexedDB): Blazing-fast, client-side data persistence with zero external backend dependency.',
        'Bidirectional (Bidi LTR & RTL) Editor: Seamless writing for Arabic, Hebrew, and Latin scripts with block-level direction controls, Markdown rendering, KaTeX math ($E=mc^2$), and Mermaid.js diagrams.',
        'Privacy & End-to-End Encryption (E2EE): Robust client-side protection powered by Web Crypto AES-GCM 256-bit and PBKDF2 (100,000 iterations).',
        'Multi-Cloud Sync & Device Pairing Code: Connect WebDAV (Nextcloud, NAS), Dropbox (OAuth 2.0 PKCE & Token), plus instant cross-device pairing codes.',
        'Serverless Web Publishing: Publish notes to the web like Simplenote using Google Apps Script (GAS) and Google Sheets with compact encrypted links.',
        'Creative & Organisation Tools: Audio voice memos, freehand sketch canvas, automatic version history (Time Machine Snapshot), nested tags, and 2D Knowledge Graph (WikiLinks [[...]]).',
        'Comprehensive Multi-Format Export: Export notes to Markdown (.md), HTML, Microsoft Word (.docx), clean printable PDF, and folder ZIP archives.',
        '100% Offline-Ready (PWA Offline-First): Full Service Worker caching and installability to desktop and mobile home screens.',
        'Official GNU General Public License v3.0 (GNU GPL v3): Guaranteed user software freedom, absolute data sovereignty, and zero telemetry.',
      ],
    },
  },
];
