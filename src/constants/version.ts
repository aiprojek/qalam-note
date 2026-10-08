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

export const APP_VERSION = '1.0.0';
export const APP_BUILD_DATE = '2026-10-07';
export const APP_LICENSE_NAME = 'GNU General Public License v3.0';
export const APP_LICENSE_SHORT = 'GNU GPL v3';
export const APP_LICENSE_URL = 'https://www.gnu.org/licenses/gpl-3.0.html';
export const FSF_URL = 'https://www.fsf.org';

export const APP_CHANGELOG: ChangelogItem[] = [
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
