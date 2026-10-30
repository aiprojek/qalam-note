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

export const APP_VERSION = '1.0.6';
export const APP_BUILD_DATE = '2026-10-30';
export const APP_LICENSE_NAME = 'GNU General Public License v3.0';
export const APP_LICENSE_SHORT = 'GNU GPL v3';
export const APP_LICENSE_URL = 'https://www.gnu.org/licenses/gpl-3.0.html';
export const FSF_URL = 'https://www.fsf.org';

export const DONATION_URL = 'https://lynk.id/aiprojek/s/bvBJvdA';
export const TELEGRAM_URL = 'https://t.me/aiprojek_community/32#';
export const GITHUB_REPO_URL = 'https://github.com/aiprojek/qalam-note';

export const APP_CHANGELOG: ChangelogItem[] = [
  {
    version: '1.0.6',
    date: '2026-10-30',
    title: {
      id: 'Pembaruan v1.0.6: Optimalisasi Kontras Tema Terang, Disiplin Zero-Pill, Perbaikan Total Grafik Pengetahuan & Peningkatan Navigasi WikiLink',
      en: 'v1.0.6 Update: Light Theme Contrast Polish, Zero-Pill Discipline, Knowledge Graph Parity & WikiLink Navigation Polish',
    },
    highlights: {
      id: [
        'Perbaikan Kontras Menyeluruh pada Tema Terang: Menjamin kontras tinggi (WCAG AA) pada seluruh tombol aksi utama (Terapkan, Simpan Pengaturan, Publikasi, Buat Kode, Sinkronisasi, dan Tab aktif) dengan teks putih tajam di atas latar solid, serta input dan placeholder yang sangat jelas terbaca.',
        'Penyempurnaan Header Catatan & Kanban Bebas Border Kaku: Menghilangkan border kotak kaku pada dropdown buku catatan dan pemilih tag di header editor maupun bilah filter Kanban, digantikan oleh chip teks minimalis yang menyatu anggun di tema terang.',
        'Perbaikan Kontras Tambah Tugas/Kartu di Papan Kanban: Menata ulang formulir penambahan kartu inline di kolom Kanban mode terang dengan latar bersih putih, kolom input jelas terbaca, tombol Batal kontras tinggi, dan tombol Tambah berteks putih tajam.',
        'Pustaka Format Simbol Poin & Penomoran/Abjad (List Styles): Mengadaptasi seluruh antarmuka menu pemilihan gaya butir (bullet) dan penomoran daftar ke tema terang dengan kartu galeri kontras tinggi, teks hitam pekat, badge gaya rapi, dan panel kustomisasi ramah mata.',
        'Disiplin Zero-Pill & Pembersihan Elemen Redundan: Menghapus kapsul/pill dekoratif berlebihan pada penghitung catatan dan pintasan keyboard, serta menghilangkan badge "Terpasang (PWA)" yang redundan di halaman Pengaturan dan Sidebar untuk tampilan antarmuka yang tenang dan bersih.',
        'Sinkronisasi 100% Keterhubungan Grafik Pengetahuan: Menghubungkan node grafik secara komprehensif dengan menyelaraskan deteksi backlink dua arah, pengenalan judul bersih (emoji-stripped), dan tautan berkas sehingga catatan yang saling tertaut di backlink terjamin terhubung di grafik.',
        'Penyederhanaan Header Modal Grafik Pengetahuan: Menyederhanakan bilah header grafik pengetahuan menjadi minimalis dan bersih tanpa lencana/badge kotak yang membuat teks terpotong di layar ponsel.',
        'Navigasi Keyboard & Auto-Scroll Saran WikiLink [[...]: Tombol panah bawah dan atas pada dropdown saran WikiLink [[ kini otomatis menggulir (auto-scroll) wadah daftar secara instan dan akurat di editor WYSIWYG maupun Markdown.',
        'Penyatuan Tombol Buat Baru Mode Ponsel ke FAB (Floating Action Button): Menghilangkan duplikasi tombol "Baru" pada bilah header seluler dan memusatkan seluruh aksi pembuatan catatan ke Floating Action Button (FAB) di sudut kanan bawah.',
        'Tombol Tunggal Switch Edit/Pratinjau Mobile & Proteksi Read-Only: Mengganti switch toggle mobile dengan satu tombol dinamis hemat ruang. Saat mode Pratinjau aktif, editor terkunci sepenuhnya untuk mencegah perubahan catatan yang tidak disengaja.',
        'Header Catatan Kompak di Tablet: Memadatkan judul catatan, tombol grafik, dan tombol papan kanban agar ringkas dan tidak memenuhi layar atau terpotong di batas kanan layar tablet.',
      ],
      en: [
        'Comprehensive Light Theme Contrast Polish: Guaranteed high contrast (WCAG AA) across all primary action buttons (Apply, Save Settings, Publish, Generate Code, Sync, and active tabs) with crisp white text over solid fills and clean readable inputs.',
        'Elegant Borderless Note & Kanban Header Chips: Eliminated rigid boxy borders on notebook dropdowns and tag selectors in both the note header and Kanban filter bar, replacing them with refined, borderless text chips.',
        'Kanban Quick Task Creator Contrast Fix: Overhauled the inline card addition box in Kanban columns for light mode with a clean white background, high-contrast readable input, visible Cancel button, and solid crisp Add button.',
        'Light Theme Support for Bullet & Numbering Library: Full light mode styling for the list style popover with high-contrast choice cards, crisp dark typography, clear format badges, and accessible customization options.',
        'Zero-Pill Discipline & UI De-cluttering: Eliminated gratuitous pill capsules on note counters and shortcuts, and removed redundant "PWA Installed" status pills from Settings and Sidebar for a quiet, distraction-free interface.',
        '100% Knowledge Graph Backlink Parity: Synchronized bidirectional backlink detection with the knowledge graph engine, ensuring every note connected via backlinks is accurately mirrored with an edge line in the graph.',
        'Streamlined Graph View Modal Header: Replaced bulky badge boxes in the graph header with clean, quiet typography that never clips or overflows on mobile screens.',
        'Instant Auto-Scroll for WikiLink [[ Keyboard Suggestions: Arrow-down and arrow-up keys in the [[ autocomplete dropdown now directly and accurately scroll the suggestions container in both WYSIWYG and Markdown editors.',
        'Consolidated Mobile Creation Controls into Single FAB: Eliminated duplicate "New" header button on mobile, channeling all creation options into the Floating Action Button.',
        'Single Dynamic Mobile Edit/Preview Button & Strict Read-Only Mode: Replaced bulky switches with a single responsive button and enforced strict read-only lock in Preview mode.',
        'Compact Tablet Note Header: Compacted titles and header action buttons to eliminate horizontal overflow on tablet viewports.',
      ],
    },
  },
  {
    version: '1.0.5',
    date: '2026-10-25',
    title: {
      id: 'Pembaruan v1.0.5: Papan Kanban Multi-Proyek, Publikasi Web Klien & Menu Kontekstual Lengkap',
      en: 'v1.0.5 Update: Multi-Project Kanban Boards, Live Client Web Publication & Context Menus',
    },
    highlights: {
      id: [
        'Papan Kanban Multi-Proyek Spesifik: Pengguna dapat membuat lebih dari 1 papan Kanban mandiri untuk masing-masing proyek atau klien di dalam buku catatan (notebook) manapun, layaknya membuat catatan biasa.',
        'Publikasi Web Langsung untuk Klien (Client Live Project Progress View): Papan Kanban proyek kini dapat dipublikasikan ke web melalui Google Apps Script (GAS). Klien dapat membuka tautan publik untuk memantau progres pengerjaan proyek secara langsung (Live Progress Dashboard, 4 kolom alur kerja, checklist deliverable, prioritas, dan tenggat waktu) atau beralih ke format laporan teks dokumen.',
        'Editor Papan Kanban Interaktif & Drag-and-Drop: 4 kolom alur kerja industri (Rencana & Ide, Akan Dikerjakan, Sedang Dikerjakan, dan Selesai) dengan geser-dan-lepas halus, modal rincian kartu tugas, pemilih prioritas (Mendesak, Tinggi, Sedang, Rendah), tenggat waktu, dan checklist sub-tugas dinamis.',
        'Konversi Catatan Dua Arah Otomatis: Ubah catatan biasa menjadi papan Kanban kapan saja dengan tombol "Papan Kanban", atau sebaliknya. Data kanban otomatis disinkronkan dua arah ke format teks Markdown rapi.',
        'Badge & Filter Kanban di Daftar Catatan: Setiap papan proyek ditandai dengan badge khusus "KANBAN" dan meteran persentase penyelesaian tugas mini. Tab filter "Kanban" memungkinkan menyaring seluruh papan proyek dalam sekejap.',
        'Menu Kontekstual Klik-Kanan Menyeluruh (Editor, Daftar Catatan, & Folder): Navigasi super responsif dan intuitif dengan klik-kanan di area editor teks (operasi clipboard, format teks, struktur judul, to-do list, tabel, tanggal/waktu, dan alat pro), pada item daftar catatan (buka, buka split-screen, bintang, pin, duplikasi, pindah folder, ekspor, dan hapus), serta pada hierarki buku catatan di bilah sisi (buka, buat catatan/to-do baru, buat papan kanban baru, buat sub-folder, ganti nama, ekspor ZIP, dan hapus). Dilengkapi deteksi tepi layar otomatis agar menu tidak pernah terpotong.',
      ],
      en: [
        'Multi-Project Dedicated Kanban Boards: Users can create multiple independent Kanban boards for specific projects and clients within any notebook, just like standard notes.',
        'Live Client Web Publication (Client Project Progress View): Project boards can be published directly to the web via Google Apps Script (GAS). Clients can open a shareable link to monitor project milestones in real-time with an interactive progress dashboard, 4 workflow columns, task checklists, priorities, and deadlines.',
        'Interactive Drag-and-Drop Kanban Editor: 4 industry-standard columns (Backlog, To Do, In Progress, Done) with smooth drag-and-drop, card detail modals, priority tags (Urgent, High, Medium, Low), due date pickers, and dynamic sub-task checklists.',
        'Bi-Directional Note & Board Conversion: Seamlessly toggle any note into an interactive Kanban board and back with automatic bi-directional Markdown synchronization.',
        'Kanban Badges & Filter in Notes List: Dedicated "KANBAN" badge and mini completion percentage meters on note list cards, with a fast "Kanban" filter pill for quick access.',
        'Universal Contextual Right-Click Menus (Editor, Notes List, & Notebooks): Super intuitive right-click menus for the note editor (clipboard, formatting, headings, checklists, tables, timestamps, pro tools), notes list items (open, split view, star, pin, duplicate, move to notebook, export, delete), and sidebar notebook tree (open, create note/to-do/kanban, new sub-notebook, rename, export ZIP, delete) with smart viewport edge detection.',
      ],
    },
  },
  {
    version: '1.0.4',
    date: '2026-10-23',
    title: {
      id: 'Pembaruan v1.0.4: Tombol Salin Markdown Sosmed, Sinkronisasi GAS, Split-Screen, OCR & Fitur Unggulan Rilis GitHub',
      en: 'v1.0.4 Milestone Release: Social Markdown Copy, GAS Sync, Dual Editor, Client OCR & Pre-Push Audit',
    },
    highlights: {
      id: [
        'Perbaikan Sinkronisasi yang Menyertakan Google Apps Script (GAS): Konfigurasi URL skrip webapp dan nama penulis GAS kini otomatis disertakan dalam kode pairing cepat. Metadata status publikasi catatan (published_info) juga terserialisasi dan terbawa utuh saat sinkronisasi cloud antar-perangkat, sehingga pengguna tidak perlu menginput ulang skrip di perangkat lain dan perubahan catatan terpublikasi langsung tersinkronkan otomatis.',
        'Dukungan Daftar Bertingkat (Multi-Level Ordered & Unordered List): Penambahan fitur indentasi bertingkat untuk daftar poin (bulleted) dan daftar bernomor (numbered) baik di editor WYSIWYG maupun Markdown dengan tombol toolbar serta pintasan keyboard Tab / Shift+Tab dan Ctrl+] / Ctrl+[, menciptakan tata letak outline dokumen yang rapi dan terstruktur.',
        'Tombol Kode Pairing Kompak (1 Baris Rapi Anti-Wrap): Menata tombol Buat Kode Pairing, Salin, Segarkan, dan Terapkan ke dalam layout horizontal 1 baris yang padat dan simetris, menjamin tidak ada pembungkusan baris (wrap) pada layar sempit maupun perangkat ponsel.',
        'Pintasan Keyboard Sinkronisasi Cepat (Ctrl+S / Cmd+S): Menjadikan Ctrl+S sebagai pintasan sinkronisasi dua arah instan, mencegah munculnya jendela dialog unduh halaman peramban dan memberikan konfirmasi visual langsung di bilah status.',
        'Jurnal Harian Otomatis (Daily Notes & Mini Calendar): Pembuatan catatan jurnal harian instan dengan pintasan Alt+D dan navigasi riwayat harian melalui modal kalender mini interaktif.',
        'Pencarian Lanjutan Beroperator (Advanced Search Syntax): Dukungan operator pencarian fleksibel seperti tag:, notebook:, is:todo, is:completed, is:starred, is:pinned, dan type: langsung dari kotak pencarian dan Command Palette (Ctrl+K).',
        'Layar Belah Multi-Catatan (Side-by-Side Dual Editor): Mode editor ganda berdampingan (DualNoteEditor) yang memungkinkan membuka dan menyunting dua catatan yang berbeda secara bersamaan untuk membandingkan referensi atau menerjemahkan catatan.',
        'Flashcard & Pengulangan Berjarak (Spaced Repetition / SRS): Sistem kartu belajar interaktif terintegrasi berbasis algoritma pengulangan bertahap (SuperMemo SM-2) langsung dari materi catatan untuk akselerasi belajar mandiri.',
        'Ekstraksi Teks Gambar Lokal (Client-Side OCR via Tesseract.js): Pindai dan ekstrak teks dari gambar atau dokumen foto langsung di peramban secara 100% lokal dan offline tanpa mengirim gambar ke server luar demi privasi mutlak.',
        'Tombol Salin Seluruh Catatan dalam Format Markdown untuk Media Sosial: Menambahkan tombol salin instan di bilah alat editor desktop, mobile ribbon, top bar seluler, dan menu opsi catatan. Catatan yang dibuat menggunakan editor Teks Kaya (WYSIWYG) otomatis dikonversi ke format Markdown bersih berawalkan judul (# Judul) sehingga langsung terformat rapi saat ditempel di WhatsApp, Telegram, Discord, X, LinkedIn, Facebook.',
        'Tombol Sinkronisasi Kompak (Anti-Wrap): Label teks tombol sinkronisasi saat aktif dibuat ringkas ("Sinkron...") dengan perlindungan anti-wrap (whitespace-nowrap) dan penyembunyian sementara label pintasan keyboard saat proses sinkronisasi berlangsung agar tombol tidak pernah terpecah menjadi dua baris.',
        'Indikator Umpan Balik Visual Cepat & Notifikasi Toast: Tombol salin menyajikan animasi umpan balik centang hijau "Tersalin!" serta notifikasi pop-up toast non-intrusif di layar.',
      ],
      en: [
        'Sync Engine Enhanced with Google Apps Script (GAS) Persistence: Pairing codes now carry GAS Web App URLs and author credentials, and note publication metadata (published_info) is fully serialized and synchronized across devices, eliminating the need to re-enter scripts on secondary devices and keeping web notes automatically up-to-date.',
        'Multi-Level Ordered & Unordered Lists: Full hierarchical indentation support for bulleted and numbered lists in both WYSIWYG and Markdown modes via toolbar buttons and Tab / Shift+Tab or Ctrl+] / Ctrl+[ shortcuts, enabling organized nested outlines.',
        'Compact 1-Row Pairing Code UI (Anti-Wrap): Unified generate, copy, refresh, and apply controls into a single streamlined horizontal row, eliminating line breaks across tight screens and mobile viewports.',
        'Fast Cloud Sync Keyboard Shortcut (Ctrl+S / Cmd+S): Pressing Ctrl+S instantly triggers two-way cloud sync, suppressing native browser save dialogs with immediate visual feedback in the status bar.',
        'Automated Daily Notes & Mini Calendar: Instant daily journaling with Alt+D shortcut, structured date-based notes, and an interactive mini calendar modal for historical navigation.',
        'Advanced Search Syntax & Query Operators: Powerful filtering with operators like tag:, notebook:, is:todo, is:completed, is:starred, is:pinned, and type: available in search bar and Command Palette (Ctrl+K).',
        'Side-by-Side Dual Note Editor (Split Screen): Multi-tasking split view allowing simultaneous editing and cross-referencing of two independent notes on a single screen.',
        'Interactive Flashcards & Spaced Repetition (SRS): Built-in study card system powered by the SM-2 spaced repetition algorithm directly within your knowledge base.',
        'Client-Side Optical Character Recognition (OCR): Offline, private image-to-text extraction powered by Tesseract.js directly inside your browser without uploading data to external servers.',
        'One-Click Copy Entire Note as Markdown for Social Media: Dedicated instant copy button across desktop editor toolbar, mobile ribbon, mobile top bar, and note dropdown menu. Automatically converts rich text (WYSIWYG) to clean Markdown prefixed with # Title, ensuring clean formatting when pasted into WhatsApp, Telegram, Discord, X, and LinkedIn.',
        'Compact Anti-Wrap Sync Button: Streamlined active sync text label ("Syncing...") with strict whitespace-nowrap guarantees and temporary shortcut suppression during sync, preventing button text from wrapping into two lines across sidebars and toolbars.',
        'Instant Visual Confirmation & Toast: Copy action triggers a snappy green checkmark "Copied!" feedback badge alongside a sleek floating toast notification.',
      ],
    },
  },
  {
    version: '1.0.3',
    date: '2026-10-18',
    title: {
      id: 'Pembaruan v1.0.3: UI Kode Pairing Ringkas 1 Baris, Pintasan Sinkronisasi Cepat (Ctrl+S) & Audit Sinkronisasi',
      en: 'v1.0.3 Update: Compact 1-Row Pairing UI, Fast Sync Shortcut (Ctrl+S) & Sync Engine Audit',
    },
    highlights: {
      id: [
        'UI Kode Pairing Ringkas 1 Baris (Anti-Wrap): Menata tombol Buat Kode Pairing, Salin, Segarkan, dan Terapkan ke dalam layout horizontal 1 baris yang padat dan simetris, menjamin tidak ada pembungkusan baris (wrap) pada layar sempit.',
        'Pintasan Keyboard Sinkronisasi Cepat (Ctrl+S / Cmd+S): Menjadikan Ctrl+S sebagai pintasan sinkronisasi dua arah instan, mencegah munculnya jendela dialog unduh halaman peramban dan memberikan konfirmasi visual langsung di bilah status.',
        'Referensi Pintasan Keyboard di Tab Tentang: Menampilkan daftar pintasan penting (Ctrl+S, Ctrl+K, Ctrl+N, Ctrl+T, Ctrl+G, Alt+D, Ctrl+Shift+H, Ctrl+P) secara jelas di menu Setelan.',
        'Audit Rekonsiliasi Sinkronisasi & Penanganan Penghapusan: Penyelarasan siklus hidup item catatan dan buku catatan agar penghapusan lokal tidak memunculkan kembali (resurrect) folder dari penyimpanan cloud.',
      ],
      en: [
        'Compact 1-Row Pairing Code UI (Anti-Wrap): Refactored generate, copy, refresh, and apply controls into a single streamlined horizontal row, eliminating awkward button wrapping across compact screens.',
        'Fast Sync Shortcut (Ctrl+S / Cmd+S): Configured Ctrl+S to trigger instant two-way cloud sync, suppressing browser save dialogs and displaying live progress in the status bar.',
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
        'Publikasi Web Tanpa Server: Terbitkan catatan ke web secara instan menggunakan Google Apps Script (GAS) dan Google Sheets dengan URL ringkas terenkripsi.',
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
        'Serverless Web Publishing: Publish notes directly to the web using Google Apps Script (GAS) and Google Sheets with compact encrypted links.',
        'Creative & Organisation Tools: Audio voice memos, freehand sketch canvas, automatic version history (Time Machine Snapshot), nested tags, and 2D Knowledge Graph (WikiLinks [[...]]).',
        'Comprehensive Multi-Format Export: Export notes to Markdown (.md), HTML, Microsoft Word (.docx), clean printable PDF, and folder ZIP archives.',
        '100% Offline-Ready (PWA Offline-First): Full Service Worker caching and installability to desktop and mobile home screens.',
        'Official GNU General Public License v3.0 (GNU GPL v3): Guaranteed user software freedom, absolute data sovereignty, and zero telemetry.',
      ],
    },
  },
];
