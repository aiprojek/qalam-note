import Dexie, { type Table } from 'dexie';
import type { Note, Folder, Tag, Attachment, AppSettings, AppLanguage, NoteRevision } from '../types';

export class QalamDB extends Dexie {
  notes!: Table<Note, string>;
  folders!: Table<Folder, string>;
  tags!: Table<Tag, string>;
  attachments!: Table<Attachment, string>;
  settings!: Table<{ key: string; value: any }, string>;
  sync_logs!: Table<{ id: string; timestamp: number; type: string; message: string; details?: any }, string>;
  revisions!: Table<NoteRevision, string>;

  constructor() {
    super('QalamNotesDB');
    this.version(1).stores({
      notes: 'id, folder_id, is_todo, todo_completed, is_favorite, is_pinned, is_deleted, is_encrypted, updated_time, created_time, *tags',
      folders: 'id, parent_id, is_deleted, order',
      tags: 'id, title',
      attachments: 'id, name, created_time',
      settings: 'key',
      sync_logs: 'id, timestamp, type',
    });
    this.version(2).stores({
      revisions: 'id, note_id, created_time',
    });
  }
}

export const db = new QalamDB();
export const JoplinDB = QalamDB;

/**
 * Saves a revision snapshot for a note (keeps history clean, debounced in UI)
 */
export async function saveNoteRevision(noteId: string, title: string, body: string): Promise<NoteRevision | null> {
  if (!noteId || !body) return null;
  try {
    // Check if the latest revision is identical to current body to avoid redundant snapshots
    const latest = await db.revisions.where('note_id').equals(noteId).reverse().sortBy('created_time');
    if (latest.length > 0 && latest[0].body === body && latest[0].title === title) {
      return null;
    }

    const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;
    const rev: NoteRevision = {
      id: `rev_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      note_id: noteId,
      title: title || 'Untitled',
      body,
      created_time: Date.now(),
      word_count: wordCount,
    };
    await db.revisions.put(rev);

    // Keep at most 25 revisions per note to prevent unbounded local storage growth
    if (latest.length >= 25) {
      const toDelete = latest.slice(24);
      for (const r of toDelete) {
        await db.revisions.delete(r.id);
      }
    }
    return rev;
  } catch (err) {
    console.warn('Failed to save note revision:', err);
    return null;
  }
}

export async function getNoteRevisions(noteId: string): Promise<NoteRevision[]> {
  try {
    return await db.revisions.where('note_id').equals(noteId).reverse().sortBy('created_time');
  } catch (err) {
    console.warn('Failed to get note revisions:', err);
    return [];
  }
}

export async function deleteNoteRevision(id: string): Promise<void> {
  try {
    await db.revisions.delete(id);
  } catch (err) {
    console.warn('Failed to delete note revision:', err);
  }
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'qalam-dark',
  editor_mode: 'wysiwyg',
  markdown_view_mode: 'split',
  font_size: 14,
  date_format: 'DD/MM/YYYY',
  time_format: '24h',
  language: 'id',
  sync: {
    target: 'disabled',
    auto_sync_interval: 15,
    last_sync_time: 0,
    webdav: {
      url: 'https://webdav.nextcloud.com/remote.php/webdav/qalam/',
      username: '',
      password: '',
      path: '/qalam',
      cors_proxy: true,
    },
    dropbox: {
      access_token: '',
      path: '/QalamNote',
    },
  },
  e2ee: {
    enabled: false,
    is_unlocked: false,
    salt: '',
    verifier_hash: '',
  },
  gas: {
    web_app_url: '',
    author_name: 'Qalam User',
    auto_update_on_edit: true,
  },
};

/**
 * Robust sanitizer that completely replaces any Joplin URLs, names, services, or leftovers
 */
export function sanitizeJoplinText(text: string): string {
  if (!text) return text;
  return text
    .replace(/https?:\/\/(?:discourse\.)?joplinapp\.org[^\s\)]*/gi, 'https://qalamnote.app')
    .replace(/discourse\.joplinapp\.org/gi, 'forum.qalamnote.app')
    .replace(/joplinapp\.org/gi, 'qalamnote.app')
    .replace(/Welcome to Joplin Web Notes!?/gi, 'Selamat Datang di Qalam Note!')
    .replace(/Welcome to Joplin/gi, 'Selamat Datang di Qalam Note')
    .replace(/Project Setup & Checklist/gi, 'Qalam Note: Menyiapkan Ruang Kerja')
    .replace(/Project Setup/gi, 'Menyiapkan Ruang Kerja')
    .replace(/Joplin\s*Web\s*Notes/gi, 'Qalam Note')
    .replace(/Joplin\s*Web\s*Note/gi, 'Qalam Note')
    .replace(/Joplin\s*Web/gi, 'Qalam Note')
    .replace(/Joplin\s*Cloud/gi, 'Qalam Cloud')
    .replace(/Joplin\s*Server/gi, 'Qalam Server')
    .replace(/Joplin\s*Web\s*Clipper/gi, 'Qalam Web Clipper')
    .replace(/Joplin\s*Desktop/gi, 'Qalam Note Desktop')
    .replace(/Joplin\s*Mobile/gi, 'Qalam Note Mobile')
    .replace(/Joplin\s*Notes/gi, 'Qalam Note')
    .replace(/Joplin\s*Note/gi, 'Qalam Note')
    .replace(/Joplin's/gi, "Qalam Note's")
    .replace(/joplin's/gi, "qalam's")
    .replace(/Joplin/gi, 'Qalam Note')
    .replace(/joplin/g, 'qalam')
    .replace(/JOPLIN/g, 'QALAM NOTE');
}

/**
 * Returns default folders localized to the user's selected language
 */
export function getDefaultFolders(lang: AppLanguage = 'id'): Folder[] {
  const now = Date.now();
  if (lang === 'en') {
    return [
      {
        id: 'folder-welcome-01',
        title: 'Welcome to Qalam Note',
        parent_id: '',
        created_time: now,
        updated_time: now,
        is_deleted: false,
        order: 1,
      },
    ];
  }

  // Indonesian
  return [
    {
      id: 'folder-welcome-01',
      title: 'Selamat Datang di Qalam Note',
      parent_id: '',
      created_time: now,
      updated_time: now,
      is_deleted: false,
      order: 1,
    },
  ];
}

/**
 * Returns default tags localized to the user's selected language
 */
export function getDefaultTags(lang: AppLanguage = 'id'): Tag[] {
  const now = Date.now();
  if (lang === 'en') {
    return [
      { id: 'tag-welcome', title: 'welcome', created_time: now, updated_time: now },
      { id: 'tag-sync', title: 'sync', created_time: now, updated_time: now },
      { id: 'tag-security', title: 'security', created_time: now, updated_time: now },
      { id: 'tag-publish', title: 'publish', created_time: now, updated_time: now },
      { id: 'tag-format', title: 'formatting', created_time: now, updated_time: now },
      { id: 'tag-multimedia', title: 'multimedia', created_time: now, updated_time: now },
      { id: 'tag-license', title: 'license', created_time: now, updated_time: now },
      { id: 'tag-todo', title: 'todo', created_time: now, updated_time: now },
    ];
  }

  return [
    { id: 'tag-welcome', title: 'welcome', created_time: now, updated_time: now },
    { id: 'tag-sync', title: 'sinkronisasi', created_time: now, updated_time: now },
    { id: 'tag-security', title: 'keamanan', created_time: now, updated_time: now },
    { id: 'tag-publish', title: 'publikasi', created_time: now, updated_time: now },
    { id: 'tag-format', title: 'format', created_time: now, updated_time: now },
    { id: 'tag-multimedia', title: 'multimedia', created_time: now, updated_time: now },
    { id: 'tag-license', title: 'lisensi', created_time: now, updated_time: now },
    { id: 'tag-todo', title: 'tugas', created_time: now, updated_time: now },
  ];
}

/**
 * Returns preset notes localized cleanly to the user's selected language
 */
export function getSampleNotes(lang: AppLanguage = 'id'): Note[] {
  const now = Date.now();

  if (lang === 'en') {
    return [
      {
        id: 'note-01-welcome',
        folder_id: 'folder-welcome-01',
        title: '👋 Welcome to Qalam Note',
        body: `# Welcome to Qalam Note!

**Qalam Note** is a world-class, local-first second-brain PKM application designed for writing in any world script (Latin & RTL), secured with client-side encryption, and connected with bidirectional WikiLinks.

### 📚 Getting Started Guides (Click Links to Open):
1. [[☁️ Cloud Sync & Cross-Device Pairing Code]] — Connect WebDAV/Dropbox & pair a 2nd phone with 1 click.
2. [[🔐 End-to-End Encryption (E2EE) & Vault Security]] — Protect confidential notes with AES-GCM 256-bit encryption.
3. [[🌐 Publish Notes to the Web via Google Sheets (GAS)]] — Publish articles to the web like Simplenote using free Google Sheets.
4. [[📊 Advanced Formatting: Tables, Math KaTeX, Diagrams & RTL]] — Interactive tables, formulas, Mermaid diagrams, and Arabic script.
5. [[🎙️ Voice Memos, Freehand Sketches & Version History]] — Audio recording, drawing canvas, templates & time machine.
6. [[📜 GNU GPL v3 License, Privacy & Data Sovereignty]] — FOSS software freedoms, zero-telemetry & local-first pledge.
7. [[✅ Workspace Setup & Task List]] — Interactive checklist, due date alarms, and multi-format exports.

---

### 🧠 Core Second Brain Features:
- **Bidirectional WikiLinks**: Type \`[[\` anywhere to link related notes instantly.
- **Interactive Knowledge Graph (\`Ctrl+G\`)**: Explore interconnected thoughts in a 2D physics graph.
- **Universal Command Palette (\`Ctrl+K\`)**: Instant search and rapid keyboard actions.
- **Daily Notes (\`Alt+D\`) & Ready Templates (\`Ctrl+Shift+T\`)**: Daily planners, meeting minutes, and Cornell notes.
- **Revision History Time Machine (\`Ctrl+Shift+H\`)**: Restore past note snapshots anytime.
- **Voice Memos & Freehand Drawing**: Embed audio recordings or sketches directly in notes.
- **1-Click Export (\`Ctrl+P\`)**: Export clean Word documents (.docx), PDFs, or ZIP archives.

Create a new note or edit this one using the **+ New note** button above!`,
        is_todo: false,
        todo_completed: 0,
        todo_due: 0,
        tags: ['welcome'],
        is_favorite: true,
        is_pinned: true,
        is_deleted: false,
        is_encrypted: false,
        created_time: now - 3600000 * 5,
        updated_time: now - 3600000 * 5,
        sync_status: 'synced',
        order: 1,
      },
      {
        id: 'note-02-sync-pairing',
        folder_id: 'folder-welcome-01',
        title: '☁️ Cloud Sync & Cross-Device Pairing Code',
        body: `# Cloud Sync & Cross-Device Pairing Code

Qalam Note adheres to a strict **Local-First** philosophy: all your notes and attachments are stored locally on your device in browser IndexedDB, then synced securely to the cloud of your choice without third-party tracking servers.

### 1. Sync Storage Targets:
Open **Settings (\`Ctrl+,\`) > Synchronisation tab**:
- **WebDAV**: Connect your private Nextcloud, ownCloud, Synology NAS, or any standard WebDAV server.
- **Dropbox**: Connect directly using official Dropbox OAuth 2.0 PKCE. Your notes are stored in \`/Apps/QalamNote\`.

---

### 2. ⚡ Cross-Device Pairing Code (No Password Retyping!)
No need to re-type complex server URLs, credentials, or long access tokens when you want to use Qalam Note on a second phone, tablet, or laptop:

#### How to Pair Devices:
1. **On Device 1 (Already Connected):**
   - Open **Settings > Synchronisation**.
   - Scroll down to **"Cross-Device Pairing Code"**.
   - Click **"Generate Pairing Code"**. A compact encoded code starting with \`QLMSYNC1_...\` is generated and copied to your clipboard.
2. **On Device 2 (Phone / Tablet / Second Computer):**
   - Open Qalam Note on your second device.
   - Go to **Settings > Synchronisation**.
   - Paste the code into **"Connect via Pairing Code from Another Device"**.
   - Click **"Apply & Connect"**.
3. **Done!** The second device is instantly configured, saved permanently, and ready for automatic background sync.

---

### 3. Sync + E2EE Security
When **End-to-End Encryption (E2EE)** is enabled, your notes are encrypted locally before being transmitted to WebDAV or Dropbox. The cloud provider only stores encrypted ciphertext that cannot be read without your master password!`,
        is_todo: false,
        todo_completed: 0,
        todo_due: 0,
        tags: ['sync'],
        is_favorite: false,
        is_pinned: false,
        is_deleted: false,
        is_encrypted: false,
        created_time: now - 3600000 * 4,
        updated_time: now - 3600000 * 4,
        sync_status: 'synced',
        order: 2,
      },
      {
        id: 'note-03-e2ee',
        folder_id: 'folder-welcome-01',
        title: '🔐 End-to-End Encryption (E2EE) & Vault Security',
        body: `# End-to-End Encryption (E2EE) & Vault Security

Your privacy is our highest priority. Qalam Note provides client-side **AES-GCM 256-bit** encryption with PBKDF2 key derivation (100,000 iterations) using the modern Web Crypto API.

### Cryptographic Vault Architecture:
1. **Client-Side Key (Zero-Knowledge):** Encryption keys are derived directly from your master passphrase in your local browser memory. The key is **never** sent to any external server.
2. **Confidential Note Protection:** When the vault is locked, note content is scrambled into ciphertext that is impossible to decipher without your passphrase.
3. **Safe in the Cloud:** Synchronized notes on WebDAV or Dropbox remain encrypted with AES-256.

---

### How to Enable:
1. Open **Settings > Encryption tab** (or click the lock icon in the toolbar).
2. Enter your master passphrase (minimum 6 characters) and confirm it.
3. Click **"Enable End-to-End Encryption"**.
4. You can lock (*Lock Vault*) or unlock (*Unlock Vault*) your encrypted vault anytime.

> ⚠️ **IMPORTANT WARNING**: Because this encryption is *Zero-Knowledge*, there is no password recovery or reset mechanism. Please memorize and safeguard your master passphrase!`,
        is_todo: false,
        todo_completed: 0,
        todo_due: 0,
        tags: ['security'],
        is_favorite: false,
        is_pinned: false,
        is_deleted: false,
        is_encrypted: false,
        created_time: now - 3600000 * 3,
        updated_time: now - 3600000 * 3,
        sync_status: 'synced',
        order: 3,
      },
      {
        id: 'note-04-publish-gas',
        folder_id: 'folder-welcome-01',
        title: '🌐 Publish Notes to the Web via Google Sheets (GAS)',
        body: `# Publishing Notes to the Web (Simplenote Style)

Want to share an article, technical guide, meeting minutes, or public documentation without expensive hosting servers?

With **GAS (Google Apps Script)** publishing in Qalam Note:
- Your own free Google Sheet acts as a private, secure cloud database.
- A single Apps Script web app URL can host all your published notes.
- The script automatically partitions large notes across multiple cells without hitting length limits.

---

### How to Publish:
1. Click the **Publish to Web** (globe icon 🌐) button on the editor toolbar.
2. Enter your Google Apps Script Web App URL (a 1-click script template is available inside the setup guide).
3. Click **"Publish Note"**.
4. You will immediately receive a compact encrypted shareable link packed into a single parameter (**?k=&lt;encoded_cipher&gt;**) with a fast, mobile-friendly **Reader View**!
5. Readers can open the link directly in any browser without needing to configure Google Sheets or log in.

---

### Updating & Unpublishing:
- **Update Note:** Edit this note, re-open the publish modal, and click **"Update Note"**.
- **Unpublish:** Click **"Unpublish Note"** anytime to remove it from public access.`,
        is_todo: false,
        todo_completed: 0,
        todo_due: 0,
        tags: ['publish'],
        is_favorite: false,
        is_pinned: false,
        is_deleted: false,
        is_encrypted: false,
        created_time: now - 3600000 * 2,
        updated_time: now - 3600000 * 2,
        sync_status: 'synced',
        order: 4,
      },
      {
        id: 'note-05-formatting-tables',
        folder_id: 'folder-welcome-01',
        title: '📊 Advanced Formatting: Tables, Math KaTeX, Diagrams & RTL',
        body: `# Advanced Formatting: Tables, Math KaTeX, Diagrams & RTL

Qalam Note supports comprehensive rich formatting for academic, technical, business, and multilingual needs.

---

### 1. Interactive Table Engine
Create and format tables directly using the **Table** button on the editor toolbar:

| No | Feature Module | Offline Ready | Security / Encryption | Status |
| :---: | :--- | :---: | :---: | :---: |
| 1 | Dexie.js Storage | Yes (PWA) | AES-GCM 256-bit | Active |
| 2 | Dropbox Sync | Yes (Queue) | PKCE Token / Pairing | Active |
| 3 | GAS Web Publishing | Yes (Preview) | Google Sheets DB | Active |
| 4 | PDF & DOCX Export | Yes (Local) | Zero Server Transmission | Active |

*Tip: In Rich Text (WYSIWYG) mode, right-click or use the table popover menu to add/remove rows, columns, change text alignment, or export to CSV.*

---

### 2. Mathematical Formulas (KaTeX / LaTeX)
Write scientific notations effortlessly:
- **Inline Math:** Mass-energy equivalence is $E = mc^2$ and the quadratic formula is $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$.
- **Block Math:**
$$
\\int_{-\\infty}^{\\infty} e^{-x^2} \\, dx = \\sqrt{\\pi}
$$

---

### 3. Flowcharts & Diagrams (Mermaid.js)
Generate flowcharts from clean plain-text syntax:

\`\`\`mermaid
graph TD
    A[New Note] --> B{Select Script Direction}
    B -->|Latin Script| C[LTR Mode]
    B -->|Arabic Script| D[RTL Mode]
    C --> E[Local IndexedDB Save]
    D --> E
    E --> F[Cloud Sync / Pairing Code]
    E --> G[Publish to Web via GAS]
\`\`\`

---

### 4. Bidirectional Writing (Bidi LTR & RTL)
Qalam Note natively supports Arabic, Hebrew, and mixed multilingual texts:

<div dir="rtl">

> **العِلْمُ صَيْدٌ وَالكِتَابَةُ قَيْدُهُ**

</div>

> *(Knowledge is prey, and writing is its bond)*

Use the **LTR** and **RTL** buttons on the toolbar to control direction per paragraph cleanly without disturbing surrounding layouts.`,
        is_todo: false,
        todo_completed: 0,
        todo_due: 0,
        tags: ['formatting'],
        is_favorite: false,
        is_pinned: false,
        is_deleted: false,
        is_encrypted: false,
        created_time: now - 3600000,
        updated_time: now - 3600000,
        sync_status: 'synced',
        order: 5,
      },
      {
        id: 'note-07-multimedia-productivity',
        folder_id: 'folder-welcome-01',
        title: '🎙️ Voice Memos, Freehand Sketches & Version History',
        body: `# Voice Memos, Freehand Sketches & Version History

Qalam Note is more than a standard text editor—it is a creative multimedia workstation that operates directly within your browser!

---

### 1. 🎙️ Voice Memo Recorder
Need to capture quick thoughts, lectures, or meetings without typing?
- **How to Record:** Click the **Microphone** icon on the editor toolbar.
- **Recorder Controls:** Features live duration timer, real-time waveform visualization, pause/resume, and instant save.
- **Safe Local Storage:** Audio recordings are stored directly in your device IndexedDB (high-fidelity WebM/OGG audio).
- **Interactive Audio Player:** Notes embed a native audio player that can be replayed instantly offline.

---

### 2. 🎨 Freehand Drawing & Sketch Canvas
Need to sketch a diagram, brainstorm an architecture plan, write formulas by hand, or sign a note?
- **How to Open:** Click the **Brush / Drawing Canvas** icon on the editor toolbar.
- **Creative Tools:** Customizable brush stroke widths, curated color palettes, eraser, and canvas clear button.
- **1-Click Insert:** Once finished, click **"Insert into Note"** to place a crisp transparent PNG sketch right inside your document.

---

### 3. ⏳ Version History Time Machine
Accidentally deleted a paragraph or need to review what you wrote yesterday?
- **Shortcut:** Press \`Ctrl+Shift+H\` (or go to **Tools > Revision History**).
- **Automatic Snapshots:** Qalam Note silently saves historical revisions in the background while you write.
- **Diff Comparison & Restore:** Inspect revision timestamps, compare differences, and restore past versions with 1 click!

---

### 4. 📋 Pre-built Note Templates
Save time with structured productivity frameworks:
- **Shortcut:** Press \`Ctrl+Shift+T\` (or click the **Templates** icon on the toolbar).
- **Included Templates:**
  - **Daily Planner:** Priorities, time blocks, and evening reflections.
  - **Meeting Minutes:** Objectives, attendees, discussion highlights, and action items.
  - **Book Summary:** Core premise, key quotes, and actionable takeaways.
  - **Cornell Note-Taking:** Cue keywords, notes column, and bottom summary.
- **Instant Daily Note:** Press \`Alt+D\` anytime to create or open today's journal note!`,
        is_todo: false,
        todo_completed: 0,
        todo_due: 0,
        tags: ['multimedia'],
        is_favorite: false,
        is_pinned: false,
        is_deleted: false,
        is_encrypted: false,
        created_time: now - 1800000,
        updated_time: now - 1800000,
        sync_status: 'synced',
        order: 6,
      },
      {
        id: 'note-08-license-sovereignty',
        folder_id: 'folder-welcome-01',
        title: '📜 GNU GPL v3 License, Privacy & Data Sovereignty',
        body: `# GNU GPL v3 License, Privacy & Data Sovereignty

Qalam Note is built upon an unwavering foundation of **Free and Open Source Software (FOSS)**, user data sovereignty, and uncompromising privacy.

---

### 1. Official License: GNU General Public License v3.0 (GNU GPL v3)
Qalam Note is licensed under the **GNU General Public License version 3.0 (GNU GPL v3)** published by the *Free Software Foundation (FSF)*.

#### 🌟 4 Essential User Freedoms:
1. **Freedom 0:** The freedom to run the program as you wish, for any purpose without commercial restrictions.
2. **Freedom 1:** The freedom to study how the program works and adapt it to your specific needs.
3. **Freedom 2:** The freedom to redistribute copies of the program to help your neighbor and community.
4. **Freedom 3:** The freedom to distribute copies of your modified versions under the same GNU GPL v3 terms (*Copyleft principle*).

Read the complete official license text at: [gnu.org/licenses/gpl-3.0.html](https://www.gnu.org/licenses/gpl-3.0.html).

---

### 2. Guaranteed Data Sovereignty & Zero Telemetry
- **Zero Telemetry:** Qalam Note contains zero tracking scripts, zero Google Analytics, and zero third-party reporting.
- **True Local-First:** Your notes, attachments, and settings are 100% stored on your machine using Dexie.js (IndexedDB).
- **Open Cryptographic Standards:** Client-side E2EE uses W3C standard Web Crypto API (AES-GCM 256-bit with PBKDF2). Master keys never leave your browser memory.
- **Zero Vendor Lock-in:** Export your notes anytime to Markdown (.md), PDF, Microsoft Word (.docx), HTML, or standard JSON backups.

---

### 3. Semantic Versioning (SemVer)
This application adheres to **Semantic Versioning 2.0.0 (MAJOR.MINOR.PATCH)**:
- **MAJOR (1.x.x):** Foundational architecture or database schema migrations.
- **MINOR (x.2.x):** Backwards-compatible features (e.g. Device Pairing Code, WebDAV/Dropbox sync, Voice Memos, Drawing Canvas).
- **PATCH (x.x.1):** Bug fixes, performance optimizations, and polish.

Check current version details, release dates, local storage usage, and changelogs under **Settings (Ctrl+,) > About tab**!`,
        is_todo: false,
        todo_completed: 0,
        todo_due: 0,
        tags: ['license'],
        is_favorite: false,
        is_pinned: false,
        is_deleted: false,
        is_encrypted: false,
        created_time: now - 1200000,
        updated_time: now - 1200000,
        sync_status: 'synced',
        order: 7,
      },
      {
        id: 'note-06-todo-workspace',
        folder_id: 'folder-welcome-01',
        title: '✅ Workspace Setup & Task List',
        body: `# Workspace Setup & Task List

Notes in **Qalam Note** support an integrated To-Do checklist mode with due date reminders!

### Today's Getting Started Checklist:
- [x] Explore the 3-panel Qalam Note workspace
- [x] Review the welcome guide and WikiLinks
- [ ] Create your first notebook in the left sidebar
- [ ] Toggle editor modes: Rich Text (WYSIWYG), Pure Markdown, or Split View
- [ ] Try \`Ctrl+K\` to open the Universal Command Palette
- [ ] View note relationship connections by pressing \`Ctrl+G\`
- [ ] Set up WebDAV or Dropbox sync and try the Device Pairing Code
- [ ] Test publishing this note to the web using the globe button
- [ ] Install the PWA to your device home screen or desktop

---

### Exporting & Backups:
You can export this note or your entire library anytime:
- **Ctrl+P**: Quick export to PDF or plain Markdown (.md).
- **Note Options**: Export to Microsoft Word (.docx) or standalone HTML.
- **Folder ZIP Export**: Right-click any notebook in the sidebar to export all notes to a structured ZIP archive.`,
        is_todo: true,
        todo_completed: 0,
        todo_due: now + 86400000 * 2, // due in 2 days
        tags: ['todo'],
        is_favorite: true,
        is_pinned: false,
        is_deleted: false,
        is_encrypted: false,
        created_time: now - 900000,
        updated_time: now - 900000,
        sync_status: 'synced',
        order: 8,
      },
    ];
  }

  // Indonesian default
  return [
    {
      id: 'note-01-welcome',
      folder_id: 'folder-welcome-01',
      title: '👋 Selamat Datang di Qalam Note',
      body: `# Selamat Datang di Qalam Note!

**Qalam Note** adalah aplikasi *Second Brain* dan PKM modern berbasis *Local-First* yang dirancang untuk kebebasan menulis aksara dunia (Latin & RTL), aman dengan enkripsi lokal, dan saling terhubung dengan WikiLinks dua arah.

### 📚 Panduan Lengkap Memulai (Klik Tautan untuk Membuka):
1. [[☁️ Sinkronisasi Cloud & Kode Pairing Antar-Perangkat]] — Hubungkan WebDAV/Dropbox & sambungkan HP kedua dengan 1 klik.
2. [[🔐 Enkripsi End-to-End (E2EE) & Keamanan Brankas]] — Amankan catatan rahasia dengan AES-GCM 256-bit berbasis Web Crypto.
3. [[🌐 Publikasi Catatan ke Web via Google Sheets (GAS)]] — Terbitkan artikel ke web gratis layaknya Simplenote.
4. [[📊 Format Lanjut: Tabel, Rumus KaTeX, Diagram & Aksara RTL]] — Contoh tabel interaktif, matematika, Mermaid, dan Arab.
5. [[🎙️ Memo Suara, Sketsa Gambar & Riwayat Versi]] — Panduan audio memo, kanvas coretan, templat & time machine.
6. [[📜 Lisensi GNU GPL v3, Privasi & Kedaulatan Data]] — Panduan lisensi FOSS, 4 kebebasan software & zero-telemetry.
7. [[✅ Rencana Memulai & Daftar Tugas]] — Coba checklist To-Do dan ekspor multi-format (DOCX, PDF, ZIP).

---

### 🧠 Fitur Produktivitas Utama:
- **Tautan Dua Arah (WikiLinks)**: Cukup ketik \`[[\` di mana saja untuk menautkan catatan secara instan.
- **Grafik Pengetahuan Interaktif (\`Ctrl+G\`)**: Visualisasikan hubungan antar ide dalam grafik fisika 2D.
- **Universal Command Palette (\`Ctrl+K\`)**: Akses seluruh perintah dan cari catatan layaknya Spotlight.
- **Catatan Harian (\`Alt+D\`) & Templat Siap Pakai (\`Ctrl+Shift+T\`)**: Rencana harian, notula rapat, ringkasan buku, dan metode Cornell.
- **Riwayat Versi / Time Machine (\`Ctrl+Shift+H\`)**: Pulihkan snapshot catatan lampau kapan saja.
- **Rekam Suara & Sketsa Tangan**: Sisipkan memo audio atau coretan diagram langsung ke dalam catatan.
- **Cetak & Ekspor Dokumen (\`Ctrl+P\`)**: Unduh ke Word (.docx), PDF berformat rapi, atau arsip ZIP.

Silakan buat catatan baru atau sunting catatan ini dengan tombol **+ Catatan baru** di bilah atas!`,
      is_todo: false,
      todo_completed: 0,
      todo_due: 0,
      tags: ['welcome'],
      is_favorite: true,
      is_pinned: true,
      is_deleted: false,
      is_encrypted: false,
      created_time: now - 3600000 * 5,
      updated_time: now - 3600000 * 5,
      sync_status: 'synced',
      order: 1,
    },
    {
      id: 'note-02-sync-pairing',
      folder_id: 'folder-welcome-01',
      title: '☁️ Sinkronisasi Cloud & Kode Pairing Antar-Perangkat',
      body: `# Sinkronisasi Cloud & Kode Pairing Antar-Perangkat

Qalam Note menerapkan arsitektur **Local-First**: catatan Anda disimpan terlebih dahulu di browser perangkat Anda menggunakan IndexedDB, lalu disinkronkan secara aman ke cloud pilihan Anda tanpa server pihak ketiga.

### 1. Pilihan Target Sinkronisasi:
Buka **Pengaturan (\`Ctrl+,\`) > Tab Sinkronisasi**:
- **WebDAV**: Kompatibel dengan Nextcloud, ownCloud, Synology NAS, Koofr, atau server WebDAV pribadi. Cukup masukkan URL server, nama pengguna, dan kata sandi.
- **Dropbox**: Terhubung langsung menggunakan alur otorisasi resmi Dropbox (OAuth 2.0 PKCE) atau token akses pribadi. Catatan Anda disimpan aman di folder \`/Apps/QalamNote\`.

---

### 2. ⚡ Fitur Unggulan: Kode Pairing Antar-Perangkat (Device Pairing)
Tidak perlu mengetik ulang server, token panjang, atau kata sandi saat Anda ingin menggunakan Qalam Note di HP, tablet, atau laptop kedua!

#### Cara Menggunakan Kode Pairing:
1. **Di Perangkat Pertama (yang sudah terhubung sync):**
   - Buka **Pengaturan > Sinkronisasi**.
   - Gulir ke bagian **"Kode Pairing Antar-Perangkat"**.
   - Klik tombol **"Buat Kode Pairing"**. Kode ringkas terenkripsi berawalan \`QLMSYNC1_...\` akan disalin ke clipboard Anda.
2. **Di Perangkat Kedua (HP / Tablet / Laptop Lain):**
   - Buka Qalam Note di perangkat kedua.
   - Buka **Pengaturan > Sinkronisasi**.
   - Tempelkan kode pairing tersebut ke kolom **"Sambungkan dari Kode Pairing Perangkat Lain"**.
   - Klik **"Terapkan & Sambungkan"**.
3. **Selesai!** Perangkat kedua langsung terhubung, tersimpan permanen, dan siap melakukan sinkronisasi otomatis.

---

### 3. Keamanan Sinkronisasi + E2EE
Jika Anda mengaktifkan **Enkripsi End-to-End (E2EE)**, catatan Anda dienkripsi secara lokal di perangkat sebelum dikirim ke WebDAV atau Dropbox. Pihak penyedia cloud hanya menyimpan data terenkripsi yang tidak dapat dibaca oleh siapa pun tanpa kata sandi utama Anda!`,
      is_todo: false,
      todo_completed: 0,
      todo_due: 0,
      tags: ['sinkronisasi'],
      is_favorite: false,
      is_pinned: false,
      is_deleted: false,
      is_encrypted: false,
      created_time: now - 3600000 * 4,
      updated_time: now - 3600000 * 4,
      sync_status: 'synced',
      order: 2,
    },
    {
      id: 'note-03-e2ee',
      folder_id: 'folder-welcome-01',
      title: '🔐 Enkripsi End-to-End (E2EE) & Keamanan Brankas',
      body: `# Enkripsi End-to-End (E2EE) & Keamanan Brankas

Privasi Anda adalah prioritas utama kami. Qalam Note menghadirkan enkripsi sisi-klien **AES-GCM 256-bit** dengan derivasi kunci PBKDF2 (100.000 putaran) berbasis Web Crypto API standar industri perbankan.

### Cara Kerja Brankas Kriptografi:
1. **Kunci Sisi-Klien (Zero-Knowledge):** Kunci enkripsi dibentuk langsung dari kata sandi utama (*master passphrase*) di memori perangkat Anda. Kunci ini **tidak pernah** dikirimkan ke server atau jaringan mana pun.
2. **Perlindungan Dokumen Rahasia:** Saat brankas dikunci, teks catatan diacak menjadi ciphertext yang mustahil diuraikan tanpa kata sandi.
3. **Aman di Cloud:** Berkas yang disinkronkan ke WebDAV atau Dropbox tetap dalam kondisi terenkripsi AES-256.

---

### Langkah Mengaktifkan:
1. Buka **Pengaturan > Tab Enkripsi** (atau klik ikon gembok di bilah alat).
2. Masukkan kata sandi utama Anda (minimal 6 karakter) dan lakukan konfirmasi.
3. Klik tombol **"Aktifkan Enkripsi End-to-End"**.
4. Anda dapat mengunci (*Lock Vault*) atau membuka (*Unlock Vault*) brankas catatan kapan pun.

> ⚠️ **PERINGATAN PENTING**: Karena enkripsi ini menerapkan prinsip *Zero-Knowledge*, tidak ada sistem pemulihan atau *reset password*. Harap simpan dan ingat kata sandi utama Anda dengan baik!`,
      is_todo: false,
      todo_completed: 0,
      todo_due: 0,
      tags: ['keamanan'],
      is_favorite: false,
      is_pinned: false,
      is_deleted: false,
      is_encrypted: false,
      created_time: now - 3600000 * 3,
      updated_time: now - 3600000 * 3,
      sync_status: 'synced',
      order: 3,
    },
    {
      id: 'note-04-publish-gas',
      folder_id: 'folder-welcome-01',
      title: '🌐 Publikasi Catatan ke Web via Google Sheets (GAS)',
      body: `# Publikasi Catatan ke Web (Gaya Simplenote)

Ingin membagikan artikel, materi presentasi, risalah rapat, atau dokumentasi publik kepada rekan atau audiens tanpa biaya sewa server?

Qalam Note menghadirkan metode publikasi unik berbasis **Google Apps Script (GAS)** dan **Google Sheets**:
- Dokumen Google Spreadsheet gratis milik Anda sendiri bertindak sebagai basis data cloud yang aman dan permanen.
- Satu tautan Web App GAS dapat menampung seluruh catatan yang Anda publikasikan.
- Skrip mendukung catatan berukuran besar dengan sistem partisi multi-sel otomatis.

---

### Cara Menerbitkan Catatan:
1. Klik tombol **Publikasikan ke Web** (ikon bola dunia 🌐) pada bilah alat editor di atas.
2. Masukkan URL Google Apps Script Anda (tersedia panduan setup & template kode 1-klik di dalam modal).
3. Klik tombol **"Publikasikan Catatan"**.
4. Anda akan langsung menerima tautan web ringkas terenkripsi dengan parameter tunggal (**?k=&lt;encoded_cipher&gt;**) yang rapi dan aman untuk dibagikan ke mana saja.
5. Halaman web publik dilengkapi dengan tampilan baca (*Reader View*) yang cepat, bersih, ramah ponsel, dan bebas iklan! Pembaca dapat langsung membuka tautan tanpa perlu konfigurasi apa pun.

---

### Memperbarui atau Mencabut Publikasi:
- **Perbarui Catatan:** Jika Anda mengedit catatan ini, buka kembali modal publikasi dan klik **"Perbarui Catatan"**.
- **Cabut Publikasi:** Klik **"Cabut Publikasi"** sewaktu-waktu untuk menghapus artikel dari akses publik.`,
      is_todo: false,
      todo_completed: 0,
      todo_due: 0,
      tags: ['publikasi'],
      is_favorite: false,
      is_pinned: false,
      is_deleted: false,
      is_encrypted: false,
      created_time: now - 3600000 * 2,
      updated_time: now - 3600000 * 2,
      sync_status: 'synced',
      order: 4,
    },
    {
      id: 'note-05-formatting-tables',
      folder_id: 'folder-welcome-01',
      title: '📊 Format Lanjut: Tabel, Rumus KaTeX, Diagram & Aksara RTL',
      body: `# Format Lanjut: Tabel, Rumus KaTeX, Diagram & Aksara RTL

Qalam Note mendukung berbagai format penulisan kaya untuk kebutuhan akademis, teknis, bisnis, hingga sastra dwibahasa.

---

### 1. Mesin Tabel Interaktif
Anda dapat membuat dan mengedit tabel langsung dengan tombol **Tabel** di bilah alat:

| No | Modul Fitur | Dukungan Offline | Keamanan / Enkripsi | Status |
| :---: | :--- | :---: | :---: | :---: |
| 1 | Dexie.js Storage | Ya (PWA) | AES-GCM 256-bit | Aktif |
| 2 | Sinkronisasi Dropbox | Ya (Antrean) | Token PKCE / Pairing | Aktif |
| 3 | Publikasi GAS Web | Ya (Pratinjau) | Google Sheets DB | Aktif |
| 4 | Ekspor PDF & DOCX | Ya (Lokal) | Tanpa Kirim Server | Aktif |

*Tips: Di mode Rich Text (WYSIWYG), Anda dapat klik kanan atau klik ikon opsi tabel untuk menambah baris, kolom, mengatur perataan sel, atau mengekspor ke format CSV.*

---

### 2. Notasi Matematika (KaTeX / LaTeX)
Tulis rumus ilmiah dengan tanda dolar:
- **Rumus Sebaris (Inline):** Rumus kesetaraan massa-energi adalah $E = mc^2$ dan rumus kuadratik $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$.
- **Rumus Blok (Display Math):**
$$
\\int_{-\\infty}^{\\infty} e^{-x^2} \\, dx = \\sqrt{\\pi}
$$

---

### 3. Diagram Alur & Grafik (Mermaid.js)
Gambarkan diagram alur proses secara otomatis menggunakan sintaks teks murni:

\`\`\`mermaid
graph TD
    A[Catatan Baru] --> B{Pilih Arah Tulisan}
    B -->|Aksara Latin| C[Mode LTR]
    B -->|Aksara Arab/RTL| D[Mode RTL]
    C --> E[Simpan Lokal Dexie.js]
    D --> E
    E --> F[Sinkron Cloud / Pairing Code]
    E --> G[Publikasikan ke Web GAS]
\`\`\`

---

### 4. Penulisan Dua Arah (Bidi LTR & RTL)
Qalam Note dirancang khusus untuk kenyamanan penulisan aksara Arab, Ibrani, maupun campuran Latin-Arab:

<div dir="rtl">

> **العِلْمُ صَيْدٌ وَالكِتَابَةُ قَيْدُهُ**

</div>

> *(Ilmu ibarat hewan buruan, dan tulisan adalah tali pengikatnya)*

Gunakan tombol **LTR** dan **RTL** di bilah alat untuk mengatur arah baca per paragraf dengan rapi tanpa merusak tata letak tulisan lainnya.`,
      is_todo: false,
      todo_completed: 0,
      todo_due: 0,
      tags: ['format'],
      is_favorite: false,
      is_pinned: false,
      is_deleted: false,
      is_encrypted: false,
      created_time: now - 3600000,
      updated_time: now - 3600000,
      sync_status: 'synced',
      order: 5,
    },
    {
      id: 'note-07-multimedia-productivity',
      folder_id: 'folder-welcome-01',
      title: '🎙️ Memo Suara, Sketsa Gambar & Riwayat Versi',
      body: `# Memo Suara, Sketsa Gambar & Riwayat Versi

Qalam Note bukan sekadar editor teks biasa—aplikasi ini dilengkapi dengan studio multimedia dan produktivitas kreatif langsung di peramban Anda!

---

### 1. 🎙️ Perekam Memo Suara (Voice Memo)
Ingin merekam ide cepat, kuliah, atau risalah rapat tanpa harus mengetik?
- **Cara Merekam:** Klik ikon **Mikrofon** di bilah alat editor.
- **Fitur Perekam:** Dilengkapi penghitung waktu (*live timer*), visualisasi gelombang audio, tombol jeda (*pause*), dan tombol simpan.
- **Penyimpanan Aman:** Rekaman suara disimpan langsung ke dalam basis data lokal IndexedDB perangkat Anda (format WebM/OGG audio beresolusi tinggi).
- **Pemutar Interaktif:** Catatan akan memuat pemutar audio bawaan yang dapat diputar ulang kapan saja secara instan.

---

### 2. 🎨 Kanvas Gambar Bebas & Sketsa Tangan (Freehand Drawing)
Perlu menggambar diagram alur, sketsa ide arsitektur, rumus corat-coret, atau tanda tangan?
- **Cara Membuka:** Klik ikon **Kuas / Kanvas Gambar** di bilah alat editor.
- **Alat Lengkap:** Pilihan ketebalan kuas, palet warna elegan, penghapus (*eraser*), dan tombol bersihkan kanvas (*clear*).
- **Penyisipan Cepat:** Begitu selesai, klik **"Sisipkan ke Catatan"**. Gambar akan langsung tertanam ke dalam catatan Anda dalam format PNG transparan berkualitas tajam.

---

### 3. ⏳ Mesin Waktu & Riwayat Versi (Revision History)
Pernah tidak sengaja menghapus paragraf penting atau ingin membandingkan draf catatan kemarin?
- **Pintasan:** Tekan \`Ctrl+Shift+H\` (atau buka menu **Alat > Riwayat Versi**).
- **Snapshot Otomatis:** Setiap kali Anda menyunting catatan, Qalam Note menyimpan snapshot versi secara berkala di latar belakang.
- **Pratinjau & Pemulihan:** Anda dapat melihat tanggal/jam versi sebelumnya, melihat perbandingan teks, dan memulihkan (*restore*) versi lampau dengan satu klik!

---

### 4. 📋 Templat Catatan Siap Pakai (Templates)
Hemat waktu dengan templat terstruktur untuk berbagai kebutuhan:
- **Pintasan:** Tekan \`Ctrl+Shift+T\` (atau klik ikon **Templat** di bilah alat).
- **Koleksi Bawaan:**
  - **Perencana Harian (Daily Planner):** Prioritas harian, jadwal blok waktu, dan refleksi sore.
  - **Notula Rapat (Meeting Minutes):** Agenda, peserta, catatan diskusi, dan daftar *Action Items*.
  - **Ringkasan Buku (Book Summary):** Pokok gagasan, kutipan kunci, dan wawasan utama.
  - **Metode Catatan Cornell (Cornell Note-Taking):** Isyarat kata kunci, catatan utama, dan rangkuman intisari.
- **Catatan Harian Instan:** Tekan \`Alt+D\` kapan saja untuk otomatis membuat atau membuka catatan harian hari ini!`,
      is_todo: false,
      todo_completed: 0,
      todo_due: 0,
      tags: ['multimedia'],
      is_favorite: false,
      is_pinned: false,
      is_deleted: false,
      is_encrypted: false,
      created_time: now - 1800000,
      updated_time: now - 1800000,
      sync_status: 'synced',
      order: 6,
    },
    {
      id: 'note-08-license-sovereignty',
      folder_id: 'folder-welcome-01',
      title: '📜 Lisensi GNU GPL v3, Privasi & Kedaulatan Data',
      body: `# Lisensi GNU GPL v3, Privasi & Kedaulatan Data

Qalam Note dibangun atas komitmen mendalam terhadap **Perangkat Lunak Bebas (Free and Open Source Software)**, kedaulatan data pengguna, dan privasi tanpa kompromi.

---

### 1. Lisensi Resmi: GNU General Public License v3.0 (GNU GPL v3)
Qalam Note dilindungi oleh lisensi **GNU General Public License versi 3.0 (GNU GPL v3)** yang diterbitkan oleh *Free Software Foundation (FSF)*.

#### 🌟 4 Kebebasan Mutlak yang Dimiliki Pengguna:
1. **Kebebasan 0:** Kebebasan untuk menjalankan aplikasi untuk tujuan apa pun tanpa batasan lisensi komersial.
2. **Kebebasan 1:** Kebebasan untuk mempelajari cara kerja kode sumber aplikasi dan menyesuaikannya sesuai kebutuhan pribadi atau organisasi.
3. **Kebebasan 2:** Kebebasan untuk menyebarluaskan dan membagikan salinan aplikasi kepada rekan atau siapa pun.
4. **Kebebasan 3:** Kebebasan untuk memodifikasi dan mendistribusikan karya turunan Anda—dengan syarat karya turunan tersebut tetap menggunakan lisensi GNU GPL v3 yang sama (*prinsip Copyleft*).

Teks resmi lisensi dapat dibaca di: [gnu.org/licenses/gpl-3.0.html](https://www.gnu.org/licenses/gpl-3.0.html).

---

### 2. Kedaulatan Data & Jaminan Privasi (Data Sovereignty)
- **Zero Telemetry:** Qalam Note tidak memuat pelacak analitik, tidak ada Google Analytics, tidak ada telemetry data, dan tidak ada pengiriman data ke server mana pun secara diam-diam.
- **Local-First Asli:** Catatan, lampiran, dan pengaturan Anda 100% tersimpan di mesin lokal peramban Anda menggunakan Dexie.js (IndexedDB).
- **Kriptografi Standar Terbuka:** Enkripsi E2EE menggunakan Web Crypto API standar W3C (AES-GCM 256-bit dan PBKDF2). Kunci enkripsi tidak pernah meninggalkan memori perangkat Anda.
- **Tanpa Keterikatan Vendor (No Vendor Lock-in):** Anda bebas mengekspor catatan Anda kapan saja ke format Markdown (.md), PDF, Microsoft Word (.docx), HTML, atau arsip cadangan JSON standar.

---

### 3. Pemversian Aplikasi SemVer (Semantic Versioning)
Aplikasi ini mengikuti standar **Semantic Versioning 2.0.0 (MAJOR.MINOR.PATCH)**:
- **MAJOR (1.x.x):** Perubahan arsitektur besar atau perombakan skema penyimpanan.
- **MINOR (x.2.x):** Penambahan fitur baru yang kompatibel ke belakang (seperti Kode Pairing, WebDAV/Dropbox sync, Perekam Audio, Kanvas Gambar).
- **PATCH (x.x.1):** Perbaikan bug, peningkatan kinerja, dan penyempurnaan tampilan.

Anda dapat memeriksa versi terkini, tanggal rilis, kuota penyimpanan lokal, dan riwayat changelog lengkap di menu **Pengaturan (Ctrl+,) > Tab Tentang Aplikasi**!`,
      is_todo: false,
      todo_completed: 0,
      todo_due: 0,
      tags: ['lisensi'],
      is_favorite: false,
      is_pinned: false,
      is_deleted: false,
      is_encrypted: false,
      created_time: now - 1200000,
      updated_time: now - 1200000,
      sync_status: 'synced',
      order: 7,
    },
    {
      id: 'note-06-todo-workspace',
      folder_id: 'folder-welcome-01',
      title: '✅ Rencana Memulai & Daftar Tugas',
      body: `# Rencana Memulai & Daftar Tugas

Catatan di **Qalam Note** memiliki mode To-Do terintegrasi dengan kotak centang dan batas waktu jatuh tempo (*due date*)!

### Daftar Tugas Hari Ini:
- [x] Eksplorasi tampilan 3-panel Qalam Note
- [x] Membaca panduan selamat datang dan WikiLinks
- [ ] Buat buku catatan (notebook) pertama Anda di bilah kiri
- [ ] Beralih mode editor: Rich Text (WYSIWYG), Markdown Murni, atau Split View
- [ ] Coba pintasan \`Ctrl+K\` untuk membuka Universal Command Palette
- [ ] Uji grafik keterhubungan catatan dengan menekan \`Ctrl+G\`
- [ ] Hubungkan sinkronisasi WebDAV / Dropbox dan coba Kode Pairing
- [ ] Coba publikasi catatan ini ke web dengan tombol bola dunia
- [ ] Pasang aplikasi ke layar utama (PWA) agar dapat dibuka seperti aplikasi desktop/mobile

---

### Ekspor & Cadangan Data:
Anda dapat mengekspor catatan ini sewaktu-waktu:
- **Ctrl+P**: Ekspor cepat ke PDF atau berkas Markdown (.md).
- **Menu Opsi Catatan**: Ekspor ke dokumen Microsoft Word (.docx) atau berkas HTML mandiri.
- **Ekspor Folder (ZIP)**: Klik kanan pada folder di bilah sisi untuk mengunduh seluruh buku catatan ke arsip ZIP.`,
      is_todo: true,
      todo_completed: 0,
      todo_due: now + 86400000 * 2, // due in 2 days
      tags: ['tugas'],
      is_favorite: true,
      is_pinned: false,
      is_deleted: false,
      is_encrypted: false,
      created_time: now - 900000,
      updated_time: now - 900000,
      sync_status: 'synced',
      order: 8,
    },
  ];
}

export const SAMPLE_NOTES = getSampleNotes('id');

/**
 * Deduplicates and aligns all 8 preset sample notes into the single welcome folder (folder-welcome-01),
 * deletes the 2 redundant pre-folders (folder-personal-02, folder-work-03), and moves any orphan notes to folder-welcome-01.
 */
export async function alignAndDeduplicatePresetNotes(
  sampleNotes: Note[],
  defaultFolders: Folder[],
  defaultTags: Tag[]
): Promise<void> {
  const allNotes = await db.notes.toArray();
  const sampleMap = new Map<string, Note>();
  for (const s of sampleNotes) {
    sampleMap.set(s.id, s);
  }

  // Helper to match a note against one of the 8 canonical sample note IDs
  const matchSampleId = (note: Note): string | null => {
    if (sampleMap.has(note.id)) return note.id;

    const t = note.title.toLowerCase();
    const b = (note.body_html || note.body || '').toLowerCase();

    if (t.includes('selamat datang') || t.includes('welcome to')) {
      return 'note-01-welcome';
    }
    if (t.includes('sinkronisasi') || t.includes('cloud sync')) {
      return 'note-02-sync-pairing';
    }
    if (t.includes('enkripsi') || t.includes('encryption') || t.includes('e2ee')) {
      return 'note-03-e2ee';
    }
    if (t.includes('publikasi') || t.includes('publish') || b.includes('simplenote style')) {
      return 'note-04-publish-gas';
    }
    if (t.includes('format') || t.includes('tabel') || t.includes('katex') || t.includes('diagram')) {
      return 'note-05-formatting-tables';
    }
    if (
      t.includes('rencana memulai') ||
      t.includes('daftar tugas') ||
      t.includes('workspace setup') ||
      t.includes('checklist') ||
      b.includes("today's getting started checklist") ||
      b.includes('daftar tugas hari ini')
    ) {
      return 'note-06-todo-workspace';
    }
    if (t.includes('memo suara') || t.includes('sketsa') || t.includes('voice memo') || t.includes('sketch')) {
      return 'note-07-multimedia-productivity';
    }
    if (t.includes('lisensi') || t.includes('license') || t.includes('gpl')) {
      return 'note-08-license-sovereignty';
    }
    return null;
  };

  const processedSampleIds = new Set<string>();

  // Process all canonical sample notes
  for (const sample of sampleNotes) {
    processedSampleIds.add(sample.id);

    // Find ALL notes in the DB matching this sample note (by ID or pattern)
    const matches = allNotes.filter((n) => matchSampleId(n) === sample.id);

    if (matches.length > 0) {
      // Pick keeper: prefer note that already has canonical sample.id, otherwise the first match
      const keeper = matches.find((n) => n.id === sample.id) || matches[0];

      // Update keeper with current localized sample data & ensure folder_id is folder-welcome-01
      await db.notes.put({
        ...keeper,
        id: sample.id, // Guarantee canonical ID
        folder_id: 'folder-welcome-01', // ALL prenotes belong in folder-welcome-01
        title: sample.title,
        body: sample.body,
        body_html: undefined, // Clear stale HTML cache
        tags: sample.tags,
        is_todo: sample.is_todo,
        todo_completed: sample.todo_completed,
        todo_due: sample.todo_due,
        is_favorite: sample.is_favorite,
        is_pinned: sample.is_pinned,
        is_deleted: false,
        is_encrypted: false,
        sync_status: 'synced',
        order: sample.order,
        updated_time: keeper.updated_time || keeper.created_time || sample.updated_time,
      });

      // If keeper previously had a non-canonical ID, delete the old ID record to avoid duplication
      if (keeper.id !== sample.id) {
        await db.notes.delete(keeper.id);
      }

      // DELETE ALL OTHER DUPLICATES of this sample note
      for (const dup of matches) {
        if (dup.id !== keeper.id && dup.id !== sample.id) {
          await db.notes.delete(dup.id);
        }
      }
    } else {
      // Note does not exist at all, add canonical sample note
      await db.notes.put({
        ...sample,
        folder_id: 'folder-welcome-01',
      });
    }
  }

  // Move ANY notes residing in deleted pre-folders (folder-personal-02, folder-work-03) to folder-welcome-01
  const remainingNotes = await db.notes.toArray();
  for (const n of remainingNotes) {
    if (n.folder_id === 'folder-personal-02' || n.folder_id === 'folder-work-03') {
      await db.notes.update(n.id, { folder_id: 'folder-welcome-01' });
    } else {
      const matchId = matchSampleId(n);
      if (matchId && n.id !== matchId) {
        // Extra cleanup: delete any rogue duplicate matching a preset note
        await db.notes.delete(n.id);
      }
    }
  }

  // Ensure folder-welcome-01 exists, and DELETE folder-personal-02 & folder-work-03
  const existingFolders = await db.folders.toArray();
  const welcomeFolder = defaultFolders[0];

  const hasWelcomeFolder = existingFolders.some((f) => f.id === welcomeFolder.id);
  if (!hasWelcomeFolder) {
    await db.folders.put(welcomeFolder);
  } else {
    await db.folders.update(welcomeFolder.id, {
      title: welcomeFolder.title,
      is_deleted: false,
    });
  }

  // Delete the 2 other pre-folders
  await db.folders.delete('folder-personal-02');
  await db.folders.delete('folder-work-03');

  // Also clean up any legacy empty folders matching 'Pribadi'/'Personal' or 'Proyek & Tugas'/'Projects & Tasks'
  for (const f of existingFolders) {
    if (f.id === 'folder-personal-02' || f.id === 'folder-work-03') {
      await db.folders.delete(f.id);
    } else if (
      /^(?:personal|pribadi)$/i.test(f.title.trim()) ||
      /^(?:projects & tasks|proyek & tugas)$/i.test(f.title.trim())
    ) {
      const count = await db.notes.where('folder_id').equals(f.id).count();
      if (count === 0) {
        await db.folders.delete(f.id);
      }
    }
  }

  // Update localized tags
  for (const tag of defaultTags) {
    const existing = await db.tags.get(tag.id);
    if (existing) {
      await db.tags.put({
        ...tag,
        title: tag.title,
      });
    } else {
      await db.tags.put(tag);
    }
  }
}

/**
 * Updates preset sample notes and default folders when user changes language
 */
export async function updatePresetNotesLanguage(targetLang: AppLanguage): Promise<void> {
  const sampleNotes = getSampleNotes(targetLang);
  const defaultFolders = getDefaultFolders(targetLang);
  const defaultTags = getDefaultTags(targetLang);
  await alignAndDeduplicatePresetNotes(sampleNotes, defaultFolders, defaultTags);
}

/**
 * Initialize default settings & sample data if database is empty,
 * deduplicates preset notes, removes deleted pre-folders, and aligns localized content.
 */
export async function initDatabase(): Promise<void> {
  // 1. Determine active language from settings or default 'id'
  let currentLang: AppLanguage = 'id';
  try {
    const savedSettingRow = await db.settings.get('app_settings');
    if (savedSettingRow?.value?.language) {
      currentLang = savedSettingRow.value.language;
    }
    if (
      savedSettingRow?.value?.gas?.author_name === 'Joplin User' ||
      (typeof savedSettingRow?.value?.sync?.dropbox?.path === 'string' &&
        savedSettingRow.value.sync.dropbox.path.toLowerCase().includes('joplin'))
    ) {
      currentLang = 'id';
    }
  } catch {}

  const sampleNotes = getSampleNotes(currentLang);
  const defaultFolders = getDefaultFolders(currentLang);
  const defaultTags = getDefaultTags(currentLang);

  const foldersCount = await db.folders.count();
  if (foldersCount === 0) {
    try {
      if (await Dexie.exists('JoplinNotesDB')) {
        const legacyDb = new Dexie('JoplinNotesDB');
        legacyDb.version(1).stores({
          notes: 'id, folder_id, is_todo, todo_completed, is_favorite, is_pinned, is_deleted, is_encrypted, updated_time, created_time, *tags',
          folders: 'id, parent_id, is_deleted, order',
          tags: 'id, title',
          attachments: 'id, name, created_time',
          settings: 'key',
          sync_logs: 'id, timestamp, type',
        });
        await legacyDb.open();
        const legacyFolders = await legacyDb.table('folders').toArray();
        const legacyNotes = await legacyDb.table('notes').toArray();
        const legacyTags = await legacyDb.table('tags').toArray();
        const legacyAttachments = await legacyDb.table('attachments').toArray();
        const legacySettings = await legacyDb.table('settings').toArray();
        if (legacyFolders.length > 0) {
          const sanitizedFolders = legacyFolders.map((f: any) => ({
            ...f,
            title: sanitizeJoplinText(f.title),
          }));
          const sanitizedNotes = legacyNotes.map((n: any) => ({
            ...n,
            title: sanitizeJoplinText(n.title),
            body: sanitizeJoplinText(n.body),
          }));
          await db.folders.bulkAdd(sanitizedFolders);
          if (sanitizedNotes.length > 0) await db.notes.bulkAdd(sanitizedNotes);
          if (legacyTags.length > 0) await db.tags.bulkAdd(legacyTags);
          if (legacyAttachments.length > 0) await db.attachments.bulkAdd(legacyAttachments);
          if (legacySettings.length > 0) await db.settings.bulkAdd(legacySettings);
        }
        legacyDb.close();
        try {
          await Dexie.delete('JoplinNotesDB');
        } catch {}
      }
    } catch {
      // Proceed to default seed
    }

    const currentCount = await db.folders.count();
    if (currentCount === 0) {
      await db.folders.bulkAdd(defaultFolders);
      await db.tags.bulkAdd(defaultTags);
      await db.notes.bulkAdd(sampleNotes);
    }
  }

  // Active deduplication, migration, and folder cleanup pass
  try {
    await alignAndDeduplicatePresetNotes(sampleNotes, defaultFolders, defaultTags);

    // Sanitize any residual "Joplin" occurrences in general user notes
    const allNotes = await db.notes.toArray();
    for (const note of allNotes) {
      let needsUpdate = false;
      let newTitle = note.title;
      let newBody = note.body;
      let clearBodyHtml = false;

      if (/joplin/i.test(note.title)) {
        newTitle = sanitizeJoplinText(note.title);
        needsUpdate = true;
      }
      if (/joplin/i.test(note.body)) {
        newBody = sanitizeJoplinText(note.body);
        needsUpdate = true;
      }
      if (note.body_html && /joplin/i.test(note.body_html)) {
        clearBodyHtml = true;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await db.notes.update(note.id, {
          title: newTitle,
          body: newBody,
          body_html: clearBodyHtml ? undefined : note.body_html,
        });
      }
    }

    // Sanitize tags
    const existingTags = await db.tags.toArray();
    for (const tag of existingTags) {
      if (/joplin/i.test(tag.title)) {
        await db.tags.put({
          ...tag,
          title: tag.title.replace(/joplin/gi, 'qalam'),
          updated_time: Date.now(),
        });
      }
    }
  } catch (err) {
    console.error('Error during data sanitation and deduplication:', err);
  }

  // Ensure default settings exist and sanitize any legacy Joplin values
  const existingSettings = await db.settings.get('app_settings');
  if (!existingSettings) {
    await db.settings.put({ key: 'app_settings', value: DEFAULT_SETTINGS });
  } else {
    let settingsUpdated = false;
    const val = { ...existingSettings.value };
    if (val.theme && typeof val.theme === 'string' && val.theme.startsWith('joplin-')) {
      val.theme = val.theme.replace('joplin-', 'qalam-');
      settingsUpdated = true;
    }
    if (val.gas?.author_name === 'Joplin User') {
      val.gas.author_name = 'Qalam User';
      settingsUpdated = true;
    }
    if (val.sync?.dropbox?.path && /joplin/i.test(val.sync.dropbox.path)) {
      val.sync.dropbox.path = '/QalamNote';
      settingsUpdated = true;
    }
    if (val.sync?.webdav?.path && /joplin/i.test(val.sync.webdav.path)) {
      val.sync.webdav.path = '/qalam';
      settingsUpdated = true;
    }
    if (val.sync?.webdav?.url && /joplin/i.test(val.sync.webdav.url)) {
      val.sync.webdav.url = val.sync.webdav.url.replace(/joplin/gi, 'qalam');
      settingsUpdated = true;
    }
    if (settingsUpdated) {
      await db.settings.put({ key: 'app_settings', value: val });
    }
  }
}

export async function getSettings(): Promise<AppSettings> {
  const row = await db.settings.get('app_settings');
  return row ? { ...DEFAULT_SETTINGS, ...row.value } : DEFAULT_SETTINGS;
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const updated: AppSettings = {
    ...current,
    ...settings,
    sync: { ...current.sync, ...(settings.sync || {}) },
    e2ee: { ...current.e2ee, ...(settings.e2ee || {}) },
    gas: { ...current.gas, ...(settings.gas || {}) },
  };
  await db.settings.put({ key: 'app_settings', value: updated });
  return updated;
}
