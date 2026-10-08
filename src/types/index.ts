/**
 * Qalam Note - Data Models & Types
 */

export interface Note {
  id: string;
  folder_id: string;
  title: string;
  body: string;
  body_html?: string;
  is_todo: boolean;
  todo_completed: number; // timestamp or 0
  todo_due: number; // timestamp or 0
  tags: string[]; // tag names
  is_favorite: boolean;
  is_pinned: boolean;
  is_rtl?: boolean; // Right-to-Left writing direction
  text_direction?: 'ltr' | 'rtl'; // Explicit writing direction (LTR or RTL)
  is_deleted: boolean; // soft deleted (in trash)
  is_encrypted: boolean;
  encrypted_data?: {
    ciphertext: string;
    iv: string;
    salt: string;
  };
  published_info?: {
    is_published: boolean;
    published_at: number;
    public_url: string;
    gas_url: string;
    slug?: string;
  };
  attachments?: Attachment[];
  created_time: number;
  updated_time: number;
  sync_time?: number;
  sync_status: 'synced' | 'pending' | 'conflict';
  order: number;
}

export interface Folder {
  id: string;
  title: string;
  parent_id: string; // empty string for root
  created_time: number;
  updated_time: number;
  is_deleted: boolean;
  order: number;
}

export interface Tag {
  id: string;
  title: string;
  created_time: number;
  updated_time: number;
}

export interface Attachment {
  id: string;
  name: string;
  mime: string;
  size: number;
  dataUrl: string;
  created_time: number;
}

export interface SyncConfig {
  target: 'disabled' | 'webdav' | 'dropbox';
  auto_sync_interval: number; // minutes (0 = manual only)
  last_sync_time: number;
  webdav: {
    url: string;
    username: string;
    password: string;
    path: string;
    cors_proxy: boolean;
  };
  dropbox: {
    app_key?: string;
    access_token: string;
    refresh_token?: string;
    token_expires_at?: number;
    account_email?: string;
    account_name?: string;
    path: string;
  };
}

export interface E2EEConfig {
  enabled: boolean;
  is_unlocked: boolean;
  salt: string;
  verifier_hash: string; // hash of master key to verify password
}

export interface GASConfig {
  web_app_url: string;
  author_name: string;
  auto_update_on_edit: boolean;
}

export type DateFormatOption = 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'D MMMM YYYY';
export type TimeFormatOption = '24h' | '12h';
export type AppLanguage = 'id' | 'en';

export interface AppSettings {
  theme: 'qalam-dark' | 'qalam-light' | 'qalam-nord';
  editor_mode: 'wysiwyg' | 'markdown';
  markdown_view_mode?: 'raw' | 'split';
  font_size: number;
  date_format: DateFormatOption;
  time_format: TimeFormatOption;
  language: AppLanguage;
  sync: SyncConfig;
  e2ee: E2EEConfig;
  gas: GASConfig;
}

export type NoteSortField = 'updated_time' | 'created_time' | 'title' | 'order';
export type NoteSortOrder = 'asc' | 'desc';
export type ViewFilter = 'all' | 'notes_only' | 'todos_only' | 'todos_incomplete';

export interface NoteRevision {
  id: string;
  note_id: string;
  title: string;
  body: string;
  created_time: number;
  word_count?: number;
}

export interface NoteTemplate {
  id: string;
  title: string;
  description: string;
  content: string;
  icon?: string;
  category?: 'journal' | 'meeting' | 'study' | 'project' | 'general';
}
