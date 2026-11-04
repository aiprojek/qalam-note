import type { KanbanBoardData } from './index';

export interface WikiFolderItem {
  id: string;
  title: string;
  parent_id: string; // '' for root of wiki
  order: number;
}

export interface WikiNoteItem {
  id: string;
  folder_id: string;
  title: string;
  slug: string;
  body: string;
  body_html?: string;
  html: string;
  tags: string[];
  is_todo?: boolean;
  todo_completed?: number;
  created_time: number;
  updated_time: number;
  is_kanban?: boolean;
  kanban_data?: KanbanBoardData;
}

export interface WikiBundle {
  version: 1;
  id: string; // Root folder ID
  title: string; // Wiki Title
  description?: string;
  author: string;
  published_at: number;
  landing_note_id: string; // Default home note ID
  is_encrypted?: boolean;
  salt?: string;
  encrypted_data?: {
    ciphertext: string;
    iv: string;
    salt: string;
  };
  folders: WikiFolderItem[];
  notes: WikiNoteItem[];
}
