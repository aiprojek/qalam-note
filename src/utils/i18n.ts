import type { AppLanguage, DateFormatOption, TimeFormatOption } from '../types';

export const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const MONTH_NAMES_ID_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

export const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MONTH_NAMES_EN_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Formats date based on user's preference
 */
export function formatDate(
  timestamp: number,
  format: DateFormatOption = 'DD/MM/YYYY',
  lang: AppLanguage = 'id'
): string {
  if (!timestamp) return '-';
  const d = new Date(timestamp);
  const day = d.getDate();
  const dayStr = day.toString().padStart(2, '0');
  const month = d.getMonth() + 1;
  const monthStr = month.toString().padStart(2, '0');
  const year = d.getFullYear();

  switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${monthStr}-${dayStr}`;
    case 'MM/DD/YYYY':
      return `${monthStr}/${dayStr}/${year}`;
    case 'D MMMM YYYY': {
      const monthName = lang === 'id' ? MONTH_NAMES_ID[d.getMonth()] : MONTH_NAMES_EN[d.getMonth()];
      return `${day} ${monthName} ${year}`;
    }
    case 'DD/MM/YYYY':
    default:
      return `${dayStr}/${monthStr}/${year}`;
  }
}

/**
 * Formats time based on user's preference (24h or 12h AM/PM)
 */
export function formatTime(timestamp: number, timeFormat: TimeFormatOption = '24h'): string {
  if (!timestamp) return '-';
  const d = new Date(timestamp);

  if (timeFormat === '12h') {
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 becomes 12
    const hoursStr = hours.toString().padStart(2, '0');
    return `${hoursStr}:${minutes} ${ampm}`;
  }

  // 24h
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Formats date and time combined
 */
export function formatDateTime(
  timestamp: number,
  dateFormat: DateFormatOption = 'DD/MM/YYYY',
  timeFormat: TimeFormatOption = '24h',
  lang: AppLanguage = 'id'
): string {
  if (!timestamp) return '-';
  return `${formatDate(timestamp, dateFormat, lang)} ${formatTime(timestamp, timeFormat)}`;
}

/**
 * Formats relative or date for note list
 */
export function formatNoteListDate(
  timestamp: number,
  dateFormat: DateFormatOption = 'DD/MM/YYYY',
  timeFormat: TimeFormatOption = '24h',
  lang: AppLanguage = 'id'
): string {
  if (!timestamp) return '-';
  const d = new Date(timestamp);
  const today = new Date();

  if (d.toDateString() === today.toDateString()) {
    return formatTime(timestamp, timeFormat);
  }

  return formatDate(timestamp, dateFormat, lang);
}

/**
 * Internationalization translations dictionary
 */
export const TRANSLATIONS = {
  id: {
    // Menu bar
    menu_file: 'Berkas',
    menu_edit: 'Sunting',
    menu_view: 'Tampilan',
    menu_tools: 'Alat',
    menu_help: 'Bantuan',
    new_note: 'Catatan Baru',
    new_todo: 'To-do Baru',
    new_notebook: 'Buku Catatan Baru',
    export_backup: 'Ekspor Data (Cadangan JSON)',
    import_backup: 'Impor Berkas Cadangan',
    toggle_sidebar: 'Bilah Samping',
    toggle_note_list: 'Daftar Catatan',
    wysiwyg_editor: 'Editor Teks Kaya (WYSIWYG)',
    split_view: 'Tampilan Belah (Split)',
    markdown_view: 'Tampilan Markdown',
    synchronise: 'Sinkronisasi',
    encryption_config: 'Pengaturan Enkripsi (E2EE)',
    gas_publishing: 'Publikasi Catatan ke Web (GAS)',
    options: 'Pengaturan (Opsi)',
    gas_setup_guide: 'Panduan Google Sheets & Apps Script',
    about_qalam: 'Tentang Qalam Note',
    e2ee_unlocked: 'E2EE Terbuka',
    e2ee_locked: 'E2EE Terkunci',
    e2ee_disabled: 'E2EE: Nonaktif',
    online_status: 'Online (Local-First)',
    offline_status: 'Mode Offline',

    // Sidebar
    notebooks: 'Buku Catatan',
    tags: 'Tag',
    all_notes: 'Semua Catatan',
    starred: 'Berbintang',
    trash: 'Keranjang Sampah',
    empty_trash: 'Kosongkan Sampah',
    last_sync: 'Sinkronisasi terakhir:',
    never: 'Belum pernah',
    sub_notebook: 'Sub-buku catatan',
    new_sub_notebook: 'Buat sub-buku catatan',
    rename: 'Ganti nama',
    delete: 'Hapus',
    no_tags: 'Belum ada tag',
    just_now: 'Baru saja',
    move_to_root: 'Jadikan buku catatan utama (Tingkat Root)',
    drop_to_move_note: '↳ Jatuhkan ke sini untuk memindahkan catatan',
    drop_to_nest_folder: '↳ Jadikan sub-buku catatan di sini',
    drop_here_for_root: '📂 Lepaskan di sini untuk jadikan buku catatan utama (Root)',

    // Note List
    search_notes: 'Cari catatan...',
    sort_by: 'Urutkan Berdasarkan',
    sort_updated: 'Tanggal Diperbarui',
    sort_created: 'Tanggal Dibuat',
    sort_title: 'Judul (Alfabet)',
    filter_all: 'Semua',
    filter_notes: 'Catatan Saja',
    filter_todos: 'To-Do Saja',
    no_notes_found: 'Catatan tidak ditemukan',
    try_another_search: 'Coba kata kunci pencarian yang lain',
    untitled_note: 'Catatan tanpa judul',
    no_additional_text: 'Tidak ada teks tambahan',
    star: 'Beri Bintang',
    unstar: 'Hapus Bintang',
    pin: 'Sematkan ke Atas',
    unpin: 'Lepas Sematan',
    duplicate: 'Duplikatkan Catatan',
    move_to_trash: 'Pindahkan ke Sampah',
    restore_note: 'Pulihkan Catatan',
    delete_forever: 'Hapus Permanen',

    // Toolbar
    tb_bold: 'Tebal (Ctrl+B)',
    tb_italic: 'Miring (Ctrl+I)',
    tb_strikethrough: 'Coret (Strikethrough)',
    tb_h1: 'Judul Utama (H1)',
    tb_h2: 'Sub-Judul (H2)',
    tb_h3: 'Bagian Kecil (H3)',
    tb_bullet: 'Daftar Poin (Bulleted List)',
    tb_numbered: 'Daftar Bernomor (Numbered List)',
    tb_todo: 'Daftar Tugas (Checklist To-Do)',
    tb_code: 'Blok Kode / Kode Sebaris',
    tb_quote: 'Kutipan (Blockquote)',
    tb_link: 'Sisipkan Tautan Web',
    tb_image: 'Sisipkan Gambar (Folder / Tautan)',
    tb_attachment: 'Sisipkan Berkas Lampiran (Folder / Tautan)',
    tb_table: 'Sisipkan Tabel',
    tb_hr: 'Garis Pembatas Horizontal',
    tb_math: 'Rumus Matematika ($$...$$)',
    tb_enter_link_prompt: 'Masukkan alamat tautan URL:',
    tb_publish_gas: 'Publikasikan ke Web (GAS)',
    tb_published_badge: 'Terpublikasi',
    tb_note_properties: 'Properti Catatan',
    tb_wysiwyg: 'Teks Kaya (WYSIWYG)',
    tb_split: 'Belah (Split)',
    tb_markdown: 'Markdown Murni',
    tb_rtl: 'Arah Teks Kanan-ke-Kiri (RTL)',
    tb_ltr: 'Arah Teks Kiri-ke-Kanan (LTR)',
    preview_mode_light: 'Mode Terang',
    preview_mode_dark: 'Mode Gelap',
    preview_theme: 'Tema Pratinjau',
    reader_preview_title: 'Pratinjau Tampilan Pembaca',

    // Note Editor & Properties
    title_placeholder: 'Judul catatan...',
    note_title_placeholder: 'Judul catatan...',
    due_label: 'Batas Waktu:',
    due_date_label: 'Jatuh Tempo:',
    clear_due: 'Hapus batas waktu',
    clear_due_date: 'Hapus tanggal jatuh tempo',
    no_tags_text: 'Belum ada tag',
    new_tag_placeholder: 'Tag baru...',
    add_tag_btn: 'Tambah Tag',
    add_tag: 'Tambah Tag',
    attachments_label: 'Lampiran:',
    locked_note_title: 'Catatan Diamankan dengan E2EE',
    locked_note_desc: 'Catatan ini dienkripsi dengan standar AES-GCM 256-bit di perangkat Anda. Masukkan kata sandi utama untuk membuka dan membaca isinya.',
    unlock_vault_btn: 'Buka Kunci Brankas Utama',
    mark_complete: 'Tandai selesai',
    mark_incomplete: 'Tandai belum selesai',

    // Settings Modal
    settings_title: 'Pengaturan & Opsi Qalam Note',
    tab_general: 'Umum',
    tab_sync: 'Sinkronisasi',
    tab_encryption: 'Enkripsi E2EE',
    tab_gas: 'Publikasi Web (GAS)',
    tab_backup: 'Cadangan & Data',
    tab_about: 'Tentang Aplikasi',
    general: 'Umum',
    general_preferences: 'Preferensi Tampilan & Format',
    theme: 'Tema Antarmuka',
    theme_dark: 'Qalam Gelap (Bawaan)',
    theme_light: 'Qalam Terang',
    theme_nord: 'Qalam Nord Navy',
    default_editor_mode: 'Mode Editor Bawaan',
    editor_font_size: 'Ukuran Font Editor (px)',
    date_format: 'Format Tanggal (Date Format)',
    time_format: 'Format Waktu (Time Format)',
    time_format_24h: '24 Jam (misal: 14:30)',
    time_format_12h: '12 Jam AM/PM (misal: 02:30 PM)',
    date_time_preview: 'Pratinjau Tanggal & Waktu:',
    language: 'Bahasa (Language)',
    lang_id: 'Bahasa Indonesia (Default)',
    lang_en: 'English',
    save_changes: 'Terapkan & Simpan Pengaturan',
    cancel: 'Batal',
    close: 'Tutup',

    // Sync Settings
    sync_target: 'Target Sinkronisasi',
    sync_target_title: 'Konfigurasi Target Sinkronisasi',
    sync_disabled: 'Nonaktif (Hanya Tersimpan di Perangkat Ini)',
    sync_webdav: 'WebDAV (Nextcloud, ownCloud, NAS Pribadi)',
    sync_dropbox: 'Dropbox Cloud Storage',
    webdav_config: 'Konfigurasi Server WebDAV',
    webdav_url_label: 'URL Server WebDAV:',
    webdav_username_label: 'Nama Pengguna (Username):',
    webdav_password_label: 'Kata Sandi / Token Aplikasi:',
    check_sync_config: 'Periksa Konfigurasi Sinkronisasi',
    testing: 'Memeriksa koneksi...',
    dropbox_config: 'Konfigurasi Akun Dropbox',
    dropbox_token_label: 'Token Akses Dropbox (Access Token):',
    dropbox_token_desc: 'Dibuat dari Dropbox App Console dengan izin files.content.read dan write.',
    dropbox_auth_method_label: 'Metode Otorisasi:',
    dropbox_auth_oauth: 'Otorisasi Cepat 1-Klik (Rekomendasi)',
    dropbox_auth_manual: 'Manual (Token Akses Langsung)',
    dropbox_step1_title: 'Langkah 1: Otorisasi Akun',
    dropbox_step1_desc: 'Buka halaman resmi Dropbox, masuk ke akun Anda, dan klik "Allow / Izinkan".',
    dropbox_btn_authorize: 'Buka Halaman Otorisasi Dropbox',
    dropbox_step2_title: 'Langkah 2: Tempel Kode Otorisasi',
    dropbox_step2_placeholder: 'Tempel kode dari Dropbox di sini...',
    dropbox_btn_exchange: 'Tukarkan Kode & Hubungkan',
    dropbox_connected_as: 'Terhubung dengan Dropbox sebagai:',
    dropbox_disconnect: 'Putuskan Akun',
    dropbox_app_key_label: 'App Key Dropbox (Opsional/Kustom):',
    dropbox_app_key_hint: 'Kosongkan untuk menggunakan App Key bawaan, atau masukkan App Key Anda sendiri dari Dropbox Developer Console.',
    dropbox_manual_guide_btn: 'Panduan Cara Mengambil Token Manual',
    dropbox_manual_guide_title: 'Langkah Mengambil Token Akses di Dropbox Developer Console:',
    dropbox_manual_step1: 'Buka Dropbox Developer App Console di peramban.',
    dropbox_manual_step2: 'Klik "Create app", pilih opsi "Scoped access", lalu pilih izin folder "App folder" (atau Full Dropbox), dan beri nama aplikasi Anda.',
    dropbox_manual_step3: 'Di tab "Permissions", centang izin files.content.write, files.content.read, dan files.metadata.read, lalu klik Submit.',
    dropbox_manual_step4: 'Di tab "Settings", gulir ke bawah ke bagian OAuth 2 > Generated access token, lalu klik tombol "Generate".',
    dropbox_manual_step5: 'Salin string token yang muncul (berawalan sl.u...) lalu tempelkan ke kotak isian di bawah.',
    check_connection: 'Periksa Sambungan Akun',
    test_connection: 'Uji Koneksi Sinkronisasi',
    syncing: 'Menyinkronkan catatan...',

    // Pairing Code Keys
    pairing_title: 'Kode Pairing Antar-Perangkat (Device Pairing)',
    pairing_desc: 'Hubungkan perangkat lain (ponsel, tablet, atau laptop) secara instan tanpa perlu memasukkan ulang kata sandi atau token.',
    pairing_export_label: 'Kode Pairing Perangkat Ini:',
    pairing_generate_btn: 'Buat Kode Pairing',
    pairing_copy_btn: 'Salin Kode Pairing',
    pairing_copied: 'Kode Pairing Disalin!',
    pairing_import_title: 'Sambungkan dari Kode Pairing Perangkat Lain:',
    pairing_import_placeholder: 'Tempel kode pairing yang berawalan QLMSYNC1_...',
    pairing_import_btn: 'Terapkan & Sambungkan',
    pairing_import_success: 'Konfigurasi sinkronisasi berhasil diterapkan dari kode pairing!',
    pairing_import_error: 'Kode pairing tidak valid atau format rusak. Pastikan menyalin kode lengkap.',
    pairing_need_setup: 'Atur dan hubungkan WebDAV atau Dropbox di atas terlebih dahulu untuk membuat kode pairing.',

    // E2EE Settings
    e2ee_title: 'Enkripsi End-to-End (E2EE)',
    e2ee_desc_title: 'Proteksi Klien AES-GCM 256-bit',
    e2ee_desc_body: 'Saat E2EE diaktifkan, catatan dan data Anda dienkripsi secara lokal di dalam peramban sebelum disimpan atau disinkronkan. Kunci enkripsi dibentuk dari kata sandi utama Anda menggunakan algoritma PBKDF2 (100.000 iterasi).',
    e2ee_status_label: 'Status E2EE:',
    e2ee_vault_unlocked: 'Brankas Terbuka',
    e2ee_vault_locked: 'Brankas Terkunci',
    vault_unlocked_desc: 'Brankas catatan Anda saat ini terbuka untuk sesi ini. Anda dapat menguncinya sewaktu-waktu untuk menghapus kunci enkripsi dari memori.',
    lock_vault: 'Kunci Brankas Sekarang',
    enter_master_password_to_unlock: 'Masukkan Kata Sandi Utama untuk Membuka Kunci:',
    master_password_placeholder: 'Kata sandi utama Anda...',
    unlock: 'Buka Kunci',
    master_password: 'Kata Sandi Utama',
    set_master_password_title: 'Buat Kata Sandi Utama E2EE',
    master_password_min_chars: 'Kata Sandi Utama (minimal 6 karakter):',
    confirm_master_password_label: 'Konfirmasi Kata Sandi Utama:',
    enable_e2ee_button: 'Aktifkan Enkripsi End-to-End',
    pwd_min_len_err: 'Kata sandi utama harus terdiri dari minimal 6 karakter.',
    pwd_mismatch_err: 'Konfirmasi kata sandi tidak cocok. Silakan periksa kembali.',
    e2ee_enabled_success: 'Kata sandi utama berhasil disimpan dan brankas E2EE telah dibuka!',
    vault_unlocked_success: 'Brankas berhasil dibuka!',
    incorrect_password_err: 'Kata sandi utama salah. Silakan coba lagi.',
    vault_locked_msg: 'Brankas telah dikunci. Kunci enkripsi sesi telah dibersihkan dari memori.',

    // GAS Publishing
    gas_section_title: 'Publikasikan Catatan ke Google Sheets (GAS)',
    gas_view_guide: 'Buka Panduan & Skrip Lengkap',
    gas_overview_desc: 'Publikasikan catatan secara instan mirip Simplenote tanpa perlu menyewa server atau backend khusus. Spreadsheet Google Sheets Anda berfungsi sebagai basis data gratis yang aman.',
    gas_webapp_url_label: 'URL Aplikasi Web Google Apps Script (Web App URL):',
    gas_webapp_url_hint: 'Kosongkan jika ingin menggunakan mode pratinjau pembaca internal.',
    gas_author_label: 'Nama Penulis Bawaan:',
    gas_author_placeholder: 'Nama Anda / Inisial',

    // Backup & Import
    backup_section_title: 'Cadangan, Impor, dan Ekspor Data',
    export_archive_title: 'Ekspor Arsip Catatan Qalam Note',
    export_archive_desc: 'Simpan seluruh buku catatan, catatan, dan tag Anda ke dalam satu berkas cadangan JSON standar.',
    export_archive_button: 'Ekspor Berkas Cadangan (.json)',
    import_archive_title: 'Pulihkan Catatan dari Berkas Cadangan',
    import_archive_desc: 'Kembalikan catatan dan folder yang sebelumnya telah diekspor ke dalam basis data lokal Dexie.',
    import_archive_button: 'Pilih Berkas Cadangan (.json)',

    // About Tab
    about_app_subtitle: 'Aplikasi Catatan Local-First & Second Brain Multibahasa',
    about_intro: 'Aplikasi pencatat modern berorientasi privasi dan kebebasan menulis aksara dunia (Latin & RTL), dengan keunggulan:',
    about_f1: 'Dexie.js IndexedDB: Penyimpanan lokal super cepat tanpa ketergantungan pada backend eksternal.',
    about_f2: 'Progressive Web App (PWA): Mendukung penggunaan offline penuh, caching service worker, dan dapat dipasang ke layar utama.',
    about_f3: 'Enkripsi End-to-End (E2EE): Perlindungan privasi Web Crypto AES-GCM 256-bit di perangkat Anda.',
    about_f4: 'Sinkronisasi WebDAV, Dropbox & Kode Pairing: Hubungkan Nextcloud, NAS pribadi, atau Dropbox dengan pemasangan kode kilat antar-perangkat.',
    about_f5: 'Editor Dua Arah (Bidi): Format LTR dan RTL gaya Word, mode Teks Kaya (WYSIWYG), Belah (Split), dan Markdown.',
    about_f6: 'Publikasi Google Apps Script (GAS): Publikasikan catatan ke web layaknya Simplenote menggunakan Google Sheets gratis.',
    about_f7: 'Memo Suara & Kanvas Sketsa: Rekam audio dan gambar sketsa coretan tangan langsung di dalam catatan.',
    about_f8: 'Riwayat Versi (Time Machine): Snapshot berkala otomatis untuk membandingkan dan memulihkan catatan lampau.',
    about_version_label: 'Versi Aplikasi',
    about_version_val: 'v1.0.0',
    about_license_label: 'Lisensi Perangkat Lunak',
    about_license_val: 'GNU General Public License v3.0 (GNU GPL v3)',
    about_license_desc: 'Perangkat lunak bebas & sumber terbuka. Anda berhak menggunakan, mempelajari, memodifikasi, dan mendistribusikan aplikasi ini di bawah ketentuan GNU GPL v3.',
    about_license_four_freedoms: '4 Kebebasan Perangkat Lunak Bebas (GNU FSF):',
    about_freedom_1: 'Kebebasan menjalankan program untuk keperluan apa pun tanpa batasan.',
    about_freedom_2: 'Kebebasan mempelajari cara kerja program dan menyesuaikan dengan kebutuhan.',
    about_freedom_3: 'Kebebasan menyebarluaskan salinan perangkat lunak untuk membantu sesama.',
    about_freedom_4: 'Kebebasan mendistribusikan versi modifikasi di bawah lisensi GNU GPL v3.',
    about_storage_title: 'Diagnostik Penyimpanan Lokal (IndexedDB)',
    about_storage_used: 'Terpakai:',
    about_storage_quota: 'Kuota Peramban:',
    about_storage_calculating: 'Menghitung kuota...',
    about_changelog_title: 'Catatan Rilis & Riwayat Versi',
    about_changelog_view_all: 'Lihat Semua Catatan Rilis',
    about_changelog_hide: 'Sembunyikan Catatan Rilis',
    about_release_date: 'Dirilis:',
    about_copy_sysinfo: 'Salin Info Sistem & Debug',
    about_sysinfo_copied: 'Info Sistem Tersalin!',
    about_privacy_title: 'Kedaulatan Data & Privasi Terjamin',
    about_privacy_desc: 'Catatan Anda 100% tersimpan secara lokal di peramban (IndexedDB). Tanpa pelacak, tanpa telemetri pihak ketiga, dan tanpa server perantara tanpa izin eksplisit Anda.',
    about_shortcuts_title: 'Pintasan Keyboard Utama',
    about_tech_title: 'Fondasi Teknologi Inti',

    // Status Bar
    words: 'Kata',
    characters: 'Karakter',
    lines: 'Baris',
    local_first: 'Dexie.js (Local-First)',
    up_to_date: 'Tersimpan lokal',
    synced_status: 'Tersinkronisasi',
    publish_note: 'Publikasikan ke Web',
    note_properties: 'Properti Catatan',
    tags_placeholder: '+ Tambah tag...',
    alarm_due_date: 'Batas Waktu To-Do',

    // Modals
    confirm_title: 'Konfirmasi Tindakan',
    processing: 'Memproses...',
    delete_folder_title: 'Hapus Buku Catatan',
    delete_note_title: 'Hapus Catatan',
    delete_tag_title: 'Hapus Tag',

    // PWA
    pwa_installed: 'Terpasang (PWA)',
    pwa_install_app: 'Pasang Aplikasi',
    pwa_install_ios: 'Pasang di iOS',
    pwa_ios_title: 'Pasang Qalam Note di iPhone / iPad',
    pwa_ios_step1: '1. Ketuk tombol Bagikan (Share) di bilah alat Safari.',
    pwa_ios_step2: '2. Gulir ke bawah lalu ketuk Tambahkan ke Layar Utama (Add to Home Screen).',
    pwa_ios_step3: '3. Ketuk Tambah di sudut kanan atas.',
    pwa_ios_footer: '⚡ Nikmati akses tanpa internet (offline), peluncuran instan, dan layar penuh!',
    pwa_got_it: 'Mengerti',
  },
  en: {
    // Menu bar
    menu_file: 'File',
    menu_edit: 'Edit',
    menu_view: 'View',
    menu_tools: 'Tools',
    menu_help: 'Help',
    new_note: 'New Note',
    new_todo: 'New To-do',
    new_notebook: 'New Notebook',
    export_backup: 'Export Data (JSON Backup)',
    import_backup: 'Import Backup File',
    toggle_sidebar: 'Toggle Sidebar',
    toggle_note_list: 'Toggle Note List',
    wysiwyg_editor: 'Rich Text (WYSIWYG) Editor',
    split_view: 'Split View',
    markdown_view: 'Markdown View',
    synchronise: 'Synchronise',
    encryption_config: 'Encryption Configuration (E2EE)',
    gas_publishing: 'Publish Notes to Web (GAS)',
    options: 'Options (Settings)',
    gas_setup_guide: 'Google Sheets & Apps Script Setup Guide',
    about_qalam: 'About Qalam Note',
    e2ee_unlocked: 'E2EE Unlocked',
    e2ee_locked: 'E2EE Locked',
    e2ee_disabled: 'E2EE: Disabled',
    online_status: 'Online (Local-First)',
    offline_status: 'Offline Mode',

    // Sidebar
    notebooks: 'Notebooks',
    tags: 'Tags',
    all_notes: 'All Notes',
    starred: 'Starred',
    trash: 'Trash',
    empty_trash: 'Empty Trash',
    last_sync: 'Last sync:',
    never: 'Never',
    sub_notebook: 'Sub-notebook',
    new_sub_notebook: 'Create sub-notebook',
    rename: 'Rename',
    delete: 'Delete',
    no_tags: 'No tags',
    just_now: 'Just now',
    move_to_root: 'Move notebook to Root level',
    drop_to_move_note: '↳ Drop here to move note into this notebook',
    drop_to_nest_folder: '↳ Make sub-notebook here',
    drop_here_for_root: '📂 Drop here to move notebook to Root level',

    // Note List
    search_notes: 'Search notes...',
    sort_by: 'Sort By',
    sort_updated: 'Updated Date',
    sort_created: 'Created Date',
    sort_title: 'Title (Alphabetical)',
    filter_all: 'All',
    filter_notes: 'Notes Only',
    filter_todos: 'To-Dos Only',
    no_notes_found: 'No notes found',
    try_another_search: 'Try another search term',
    untitled_note: 'Untitled note',
    no_additional_text: 'No additional text',
    star: 'Star Note',
    unstar: 'Remove Star',
    pin: 'Pin to Top',
    unpin: 'Unpin',
    duplicate: 'Duplicate Note',
    move_to_trash: 'Move to Trash',
    restore_note: 'Restore Note',
    delete_forever: 'Delete Forever',

    // Toolbar
    tb_bold: 'Bold (Ctrl+B)',
    tb_italic: 'Italic (Ctrl+I)',
    tb_strikethrough: 'Strikethrough',
    tb_h1: 'Heading 1',
    tb_h2: 'Heading 2',
    tb_h3: 'Heading 3',
    tb_bullet: 'Bulleted List',
    tb_numbered: 'Numbered List',
    tb_todo: 'Checklist To-Do',
    tb_code: 'Code Block / Inline Code',
    tb_quote: 'Blockquote',
    tb_link: 'Insert Web Link',
    tb_image: 'Insert Image (Folder / Link)',
    tb_attachment: 'Insert File Attachment (Folder / Link)',
    tb_table: 'Insert Table',
    tb_hr: 'Horizontal Rule',
    tb_math: 'Math Expression ($$...$$)',
    tb_enter_link_prompt: 'Enter link URL:',
    tb_publish_gas: 'Publish Note (GAS)',
    tb_published_badge: 'Published',
    tb_note_properties: 'Note Properties',
    tb_wysiwyg: 'Rich Text (WYSIWYG)',
    tb_split: 'Split View',
    tb_markdown: 'Markdown View',
    tb_rtl: 'Right-to-Left (RTL)',
    tb_ltr: 'Left-to-Right (LTR)',
    preview_mode_light: 'Light Mode',
    preview_mode_dark: 'Dark Mode',
    preview_theme: 'Preview Theme',
    reader_preview_title: 'Reader View Preview',

    // Note Editor & Properties
    title_placeholder: 'Note title...',
    note_title_placeholder: 'Note title...',
    due_label: 'Due Date:',
    due_date_label: 'Due Date:',
    clear_due: 'Clear due date',
    clear_due_date: 'Clear due date',
    no_tags_text: 'No tags',
    new_tag_placeholder: 'New tag...',
    add_tag_btn: 'Add Tag',
    add_tag: 'Add Tag',
    attachments_label: 'Attachments:',
    locked_note_title: 'Note Encrypted with E2EE',
    locked_note_desc: 'This note is protected with client-side AES-GCM 256-bit encryption. Enter your master password to unlock and read its contents.',
    unlock_vault_btn: 'Unlock Master Vault',
    mark_complete: 'Mark complete',
    mark_incomplete: 'Mark incomplete',

    // Settings Modal
    settings_title: 'Qalam Note Options & Settings',
    tab_general: 'General',
    tab_sync: 'Synchronisation',
    tab_encryption: 'E2EE Encryption',
    tab_gas: 'Web Publishing (GAS)',
    tab_backup: 'Backup & Data',
    tab_about: 'About',
    general: 'General',
    general_preferences: 'Display & Regional Preferences',
    theme: 'Interface Theme',
    theme_dark: 'Qalam Dark (Default)',
    theme_light: 'Qalam Light',
    theme_nord: 'Qalam Nord Navy',
    default_editor_mode: 'Default Editor Mode',
    editor_font_size: 'Editor Font Size (px)',
    date_format: 'Date Format',
    time_format: 'Time Format',
    time_format_24h: '24 Hours (e.g. 14:30)',
    time_format_12h: '12 Hours AM/PM (e.g. 02:30 PM)',
    date_time_preview: 'Date & Time Preview:',
    language: 'Language (Bahasa)',
    lang_id: 'Bahasa Indonesia (Default)',
    lang_en: 'English',
    save_changes: 'Apply & Save Settings',
    cancel: 'Cancel',
    close: 'Close',

    // Sync Settings
    sync_target: 'Synchronisation Target',
    sync_target_title: 'Synchronisation Target Configuration',
    sync_disabled: 'Disabled (Local-only on this device)',
    sync_webdav: 'WebDAV (Nextcloud, ownCloud, Personal NAS)',
    sync_dropbox: 'Dropbox Cloud Storage',
    webdav_config: 'WebDAV Server Configuration',
    webdav_url_label: 'WebDAV Server URL:',
    webdav_username_label: 'Username:',
    webdav_password_label: 'Password / App Token:',
    check_sync_config: 'Check Synchronisation Configuration',
    testing: 'Testing connection...',
    dropbox_config: 'Dropbox Account Configuration',
    dropbox_token_label: 'Dropbox Access Token:',
    dropbox_token_desc: 'Generated from Dropbox App Console with files.content.read and write scopes.',
    dropbox_auth_method_label: 'Authorization Method:',
    dropbox_auth_oauth: 'Quick 1-Click Authorization (Recommended)',
    dropbox_auth_manual: 'Manual (Direct Access Token)',
    dropbox_step1_title: 'Step 1: Authorize Account',
    dropbox_step1_desc: 'Open Dropbox official page, sign in to your account, and click "Allow".',
    dropbox_btn_authorize: 'Open Dropbox Authorization Page',
    dropbox_step2_title: 'Step 2: Paste Authorization Code',
    dropbox_step2_placeholder: 'Paste authorization code from Dropbox here...',
    dropbox_btn_exchange: 'Exchange Code & Connect',
    dropbox_connected_as: 'Connected to Dropbox as:',
    dropbox_disconnect: 'Disconnect Account',
    dropbox_app_key_label: 'Dropbox App Key (Optional/Custom):',
    dropbox_app_key_hint: 'Leave blank to use default Qalam Note App Key, or provide your own from Dropbox Developer Console.',
    dropbox_manual_guide_btn: 'Guide: How to Generate Manual Token',
    dropbox_manual_guide_title: 'Steps to Generate Access Token in Dropbox App Console:',
    dropbox_manual_step1: 'Open Dropbox Developer App Console in your browser.',
    dropbox_manual_step2: 'Click "Create app", select "Scoped access", select folder access "App folder" (or Full Dropbox), and name your app.',
    dropbox_manual_step3: 'In the "Permissions" tab, check files.content.write, files.content.read, and files.metadata.read, then click Submit.',
    dropbox_manual_step4: 'In the "Settings" tab, scroll down to OAuth 2 > Generated access token, then click the "Generate" button.',
    dropbox_manual_step5: 'Copy the generated token string (starts with sl.u...) and paste it in the field below.',
    check_connection: 'Check Account Connection',
    test_connection: 'Test Synchronisation Connection',
    syncing: 'Synchronising notes...',

    // Pairing Code Keys
    pairing_title: 'Cross-Device Pairing Code',
    pairing_desc: 'Instantly connect a second device (phone, tablet, or another laptop) without re-entering server passwords or tokens.',
    pairing_export_label: 'This Device Pairing Code:',
    pairing_generate_btn: 'Generate Pairing Code',
    pairing_copy_btn: 'Copy Pairing Code',
    pairing_copied: 'Pairing Code Copied!',
    pairing_import_title: 'Connect via Pairing Code from Another Device:',
    pairing_import_placeholder: 'Paste pairing code starting with QLMSYNC1_...',
    pairing_import_btn: 'Apply & Connect',
    pairing_import_success: 'Sync configuration successfully applied from pairing code!',
    pairing_import_error: 'Invalid pairing code or corrupted format. Please ensure you copy the full code.',
    pairing_need_setup: 'Set up and connect WebDAV or Dropbox above first to generate a pairing code.',

    // E2EE Settings
    e2ee_title: 'End-to-End Encryption (E2EE)',
    e2ee_desc_title: 'Client-Side AES-GCM 256-bit Protection',
    e2ee_desc_body: 'When E2EE is enabled, your notes and sensitive data are encrypted locally inside your browser before being stored or synchronized. Keys are derived from your master password using PBKDF2 (100,000 iterations).',
    e2ee_status_label: 'E2EE Status:',
    e2ee_vault_unlocked: 'Vault Unlocked',
    e2ee_vault_locked: 'Vault Locked',
    vault_unlocked_desc: 'Your vault is currently unlocked for this session. You can lock it at any time to clear the encryption keys from memory.',
    lock_vault: 'Lock Vault Now',
    enter_master_password_to_unlock: 'Enter Master Password to Unlock:',
    master_password_placeholder: 'Your master password...',
    unlock: 'Unlock',
    master_password: 'Master Password',
    set_master_password_title: 'Create Master Password',
    master_password_min_chars: 'Master Password (min. 6 characters):',
    confirm_master_password_label: 'Confirm Master Password:',
    enable_e2ee_button: 'Enable End-to-End Encryption',
    pwd_min_len_err: 'Master password must be at least 6 characters long.',
    pwd_mismatch_err: 'Passwords do not match. Please verify.',
    e2ee_enabled_success: 'Master password configured and E2EE vault unlocked!',
    vault_unlocked_success: 'Vault unlocked successfully!',
    incorrect_password_err: 'Incorrect master password. Please try again.',
    vault_locked_msg: 'Vault locked. Session encryption key cleared from memory.',

    // GAS Publishing
    gas_section_title: 'Publish Notes to Google Sheets (GAS)',
    gas_view_guide: 'View Full Guide & Script',
    gas_overview_desc: 'Publish notes like Simplenote without running a custom backend. Your Google Sheets spreadsheet acts as a free, reliable cloud database.',
    gas_webapp_url_label: 'Google Apps Script Web App URL:',
    gas_webapp_url_hint: 'Leave blank to use the built-in reader preview mode.',
    gas_author_label: 'Default Author Name:',
    gas_author_placeholder: 'Your Name / Handle',

    // Backup & Import
    backup_section_title: 'Backup, Import & Export Data',
    export_archive_title: 'Export Qalam Note Archive',
    export_archive_desc: 'Export all your notebooks, notes, and tags into a standard JSON backup file.',
    export_archive_button: 'Export Backup File (.json)',
    import_archive_title: 'Restore Notes from Backup File',
    import_archive_desc: 'Restore previously exported notes and folders into your local Dexie database.',
    import_archive_button: 'Select Backup File (.json)',

    // About Tab
    about_app_subtitle: 'Secure Local-First Second Brain & Multilingual PKM',
    about_intro: 'A modern note-taking application designed for bidirectional writing (LTR & RTL), privacy, and flexible publishing, featuring:',
    about_f1: 'Dexie.js IndexedDB: Blazing-fast client-side persistence with zero backend dependency.',
    about_f2: 'Progressive Web App (PWA): Full offline support, service worker caching, and home-screen installability.',
    about_f3: 'End-to-End Encryption (E2EE): Web Crypto AES-GCM 256-bit client-side encryption.',
    about_f4: 'WebDAV & Dropbox Sync + Pairing Code: Connect Nextcloud, personal NAS, or Dropbox with instant device pairing.',
    about_f5: 'Bidirectional (Bidi) Formatting: Word-style LTR & RTL controls, Rich Text (WYSIWYG), Split Live Preview, and raw Markdown.',
    about_f6: 'Google Apps Script (GAS) Publishing: Publish notes to the web like Simplenote using free Google Sheets.',
    about_f7: 'Voice Memos & Sketch Canvas: Record audio notes and draw freehand diagrams directly into notes.',
    about_f8: 'Version History (Time Machine): Automated incremental snapshots to restore previous note revisions anytime.',
    about_version_label: 'App Version',
    about_version_val: 'v1.0.0',
    about_license_label: 'Software License',
    about_license_val: 'GNU General Public License v3.0 (GNU GPL v3)',
    about_license_desc: 'Free & Open Source Software. You are free to run, study, share, and modify this application under the terms of the GNU GPL v3 license.',
    about_license_four_freedoms: '4 Essential Software Freedoms (GNU FSF):',
    about_freedom_1: 'The freedom to run the program as you wish, for any purpose without restrictions.',
    about_freedom_2: 'The freedom to study how the program works and adapt it to your needs.',
    about_freedom_3: 'The freedom to redistribute copies so you can help others.',
    about_freedom_4: 'The freedom to distribute copies of your modified versions under the GNU GPL v3.',
    about_storage_title: 'Local Storage Diagnostics (IndexedDB)',
    about_storage_used: 'Used:',
    about_storage_quota: 'Browser Quota:',
    about_storage_calculating: 'Calculating quota...',
    about_changelog_title: 'Release Notes & Version History',
    about_changelog_view_all: 'Show Full Release History',
    about_changelog_hide: 'Hide Release History',
    about_release_date: 'Released:',
    about_copy_sysinfo: 'Copy System & Debug Info',
    about_sysinfo_copied: 'System Info Copied!',
    about_privacy_title: 'Guaranteed Data Sovereignty & Privacy',
    about_privacy_desc: 'Your notes are 100% stored locally in your browser (IndexedDB). No analytics, no telemetry, and zero third-party transmission without your explicit consent.',
    about_shortcuts_title: 'Key Keyboard Shortcuts',
    about_tech_title: 'Core Technology Foundations',

    // Status Bar
    words: 'Words',
    characters: 'Characters',
    lines: 'Lines',
    local_first: 'Dexie.js (Local-First)',
    up_to_date: 'Local changes saved',
    synced_status: 'Synchronised',
    publish_note: 'Publish Note to Web',
    note_properties: 'Note Properties',
    tags_placeholder: '+ Add tag...',
    alarm_due_date: 'To-Do Due Date',

    // Modals
    confirm_title: 'Confirm Action',
    processing: 'Processing...',
    delete_folder_title: 'Delete Notebook',
    delete_note_title: 'Delete Note',
    delete_tag_title: 'Delete Tag',

    // PWA
    pwa_installed: 'Installed (PWA)',
    pwa_install_app: 'Install App',
    pwa_install_ios: 'Install on iOS',
    pwa_ios_title: 'Install Qalam Note on iPhone / iPad',
    pwa_ios_step1: '1. Tap the Share button in your Safari toolbar.',
    pwa_ios_step2: '2. Scroll down and tap Add to Home Screen.',
    pwa_ios_step3: '3. Tap Add in the top-right corner.',
    pwa_ios_footer: '⚡ Enjoy offline access, fast launch, and full screen experience!',
    pwa_got_it: 'Got it',
  },
};

export function getT(lang: AppLanguage = 'id') {
  return TRANSLATIONS[lang] || TRANSLATIONS.id;
}
