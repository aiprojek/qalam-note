/**
 * Qalam Note - Main Application
 * Local-First with Dexie.js, PWA, WebDAV/Dropbox Sync, WYSIWYG Editor,
 * End-to-End Encryption (E2EE), and Google Apps Script (GAS) Publishing.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  db,
  initDatabase,
  getSettings,
  saveSettings,
  updatePresetNotesLanguage,
  DEFAULT_SETTINGS,
} from './db';
import type {
  Note,
  Folder,
  Tag,
  Attachment,
  AppSettings,
  NoteSortField,
  NoteSortOrder,
  ViewFilter,
} from './types';
import { Sidebar } from './components/Sidebar';
import { NoteList } from './components/NoteList';
import { NoteEditor } from './components/Editor/NoteEditor';
import { TopMenuBar } from './components/TopMenuBar';
import { StatusBar } from './components/StatusBar';
import { MobileTopBar } from './components/MobileTopBar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { SettingsModal } from './components/Modals/SettingsModal';
import { PublishModal } from './components/Modals/PublishModal';
import { NewFolderModal } from './components/Modals/NewFolderModal';
import { NoteInfoModal } from './components/Modals/NoteInfoModal';
import { UnlockVaultModal } from './components/Modals/UnlockVaultModal';
import { GASSetupHelpModal } from './components/Modals/GASSetupHelpModal';
import { ConfirmDialogModal } from './components/Modals/ConfirmDialogModal';
import { NewTagModal } from './components/Modals/NewTagModal';
import { MarkdownCheatSheetModal } from './components/Modals/MarkdownCheatSheetModal';
import { CommandPaletteModal } from './components/Modals/CommandPaletteModal';
import { GraphViewModal } from './components/Modals/GraphViewModal';
import { TemplatesModal } from './components/Modals/TemplatesModal';
import { RevisionHistoryModal } from './components/Modals/RevisionHistoryModal';
import { AudioRecordModal } from './components/Modals/AudioRecordModal';
import { DrawingModal } from './components/Modals/DrawingModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PublicReaderView } from './components/PublicReaderView';
import type { RemotePublishedNote } from './components/PublicReaderView';
import { decodePublishCipher } from './services/publishCipher';
import { fetchPublishedNoteFromGAS } from './services/gas';
import { executeSync, exportAllData, importData } from './services/sync';
import { isVaultUnlocked, lockVault } from './services/crypto';
import {
  exportNoteToMarkdown,
  exportNoteToPdf,
  exportNoteToPdfDirect,
  exportNoteToDocx,
  exportNoteToHtml,
  exportNoteToPrint,
  exportFolderToZip,
} from './utils/export';
import { ExportNoteModal } from './components/Modals/ExportNoteModal';
import { ExportFolderModal } from './components/Modals/ExportFolderModal';
import { markdownToHtml } from './utils/markdown';
import { normalizeTitle } from './utils/wikilinks';
import { getTemplates, renderTemplateContent } from './services/templates';
import { QalamIcon } from './components/icons/QalamIcon';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Selection & Navigation
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [selectedSpecialView, setSelectedSpecialView] = useState<'all' | 'starred' | 'trash' | null>('all');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<NoteSortField>('updated_time');
  const [sortOrder, setSortOrder] = useState<NoteSortOrder>('desc');
  const [filter, setFilter] = useState<ViewFilter>('all');

  // UI Panels & Responsive Layout
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );
  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = viewportWidth < 768;
  const isTablet = viewportWidth >= 768 && viewportWidth < 1024;
  const isDesktop = viewportWidth >= 1024;

  const [mobileActiveView, setMobileActiveView] = useState<'sidebar' | 'notes' | 'editor'>('notes');
  const [mobileReadingMode, setMobileReadingMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isNoteListOpen, setIsNoteListOpen] = useState(true);
  const [editorMode, setEditorMode] = useState<'wysiwyg' | 'markdown'>('wysiwyg');
  const [markdownViewMode, setMarkdownViewMode] = useState<'raw' | 'split'>('split');
  const [isCheatSheetOpen, setIsCheatSheetOpen] = useState(false);
  const [isCheatSheetMathOnly, setIsCheatSheetMathOnly] = useState(false);

  // Synchronisation
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string>('');

  // E2EE
  const [vaultUnlocked, setVaultUnlocked] = useState(false);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState('general');
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<Folder | undefined>(undefined);
  const [folderParentId, setFolderParentId] = useState<string>('');
  const [isNoteInfoOpen, setIsNoteInfoOpen] = useState(false);
  const [isUnlockVaultOpen, setIsUnlockVaultOpen] = useState(false);
  const [isGASHelpOpen, setIsGASHelpOpen] = useState(false);
  const [isNewTagOpen, setIsNewTagOpen] = useState(false);

  // New Productivity & Knowledge Modals
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isGraphViewOpen, setIsGraphViewOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isRevisionHistoryOpen, setIsRevisionHistoryOpen] = useState(false);
  const [isAudioRecordOpen, setIsAudioRecordOpen] = useState(false);
  const [isDrawingModalOpen, setIsDrawingModalOpen] = useState(false);
  const [exportNoteModalTarget, setExportNoteModalTarget] = useState<Note | null>(null);
  const [exportFolderModalTarget, setExportFolderModalTarget] = useState<Folder | null>(null);

  // In-app Action & Delete Confirmation Dialog State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    subMessage?: string;
    confirmLabel: string;
    cancelLabel: string;
    isDanger: boolean;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Hapus',
    cancelLabel: 'Batal',
    isDanger: true,
    onConfirm: () => {},
  });

  // Public Reader Mode (via ?k=<cipher>, #k=<cipher>, or #public-preview-<id>)
  const [publicReaderState, setPublicReaderState] = useState<{
    active: boolean;
    noteId: string | null;
    gasUrl?: string;
    title?: string;
    author?: string;
    remoteNote: RemotePublishedNote | null;
    isLoadingRemote: boolean;
    errorMessage: string | null;
  }>({
    active: false,
    noteId: null,
    remoteNote: null,
    isLoadingRemote: false,
    errorMessage: null,
  });

  // Check URL query parameters and hash for public reader mode (?k=<cipher>)
  useEffect(() => {
    let isCancelled = false;

    const checkUrlForReader = async () => {
      let cipher: string | null = null;
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        cipher = searchParams.get('k');

        if (!cipher && window.location.hash) {
          const hash = window.location.hash;
          if (hash.includes('k=')) {
            const match = hash.match(/k=([^&]+)/);
            if (match && match[1]) {
              cipher = match[1];
            }
          } else if (hash.startsWith('#public-preview-')) {
            const id = hash.replace('#public-preview-', '');
            setPublicReaderState({
              active: true,
              noteId: id,
              remoteNote: null,
              isLoadingRemote: false,
              errorMessage: null,
            });
            return;
          }
        }
      }

      if (cipher) {
        const decoded = decodePublishCipher(cipher);
        if (decoded && decoded.id) {
          if (!isCancelled) {
            setPublicReaderState({
              active: true,
              noteId: decoded.id,
              gasUrl: decoded.gasUrl,
              title: decoded.title,
              author: decoded.author,
              remoteNote: null,
              isLoadingRemote: !!decoded.gasUrl,
              errorMessage: null,
            });
          }

          if (decoded.gasUrl) {
            try {
              const remote = await fetchPublishedNoteFromGAS(decoded.gasUrl, decoded.id);
              if (isCancelled) return;
              if (remote) {
                setPublicReaderState((prev) => ({
                  ...prev,
                  isLoadingRemote: false,
                  remoteNote: {
                    id: decoded.id,
                    title: remote.title,
                    html: remote.html,
                    author: remote.author || decoded.author,
                    tags: remote.tags,
                    gasUrl: decoded.gasUrl,
                  },
                }));
              } else {
                setPublicReaderState((prev) => ({
                  ...prev,
                  isLoadingRemote: false,
                  errorMessage:
                    settings.language === 'id'
                      ? 'Catatan tidak ditemukan di Google Sheets atau publikasi telah dicabut oleh penulis.'
                      : 'Note not found in Google Sheets or has been unpublished by the author.',
                }));
              }
            } catch (err) {
              if (isCancelled) return;
              setPublicReaderState((prev) => ({
                ...prev,
                isLoadingRemote: false,
                errorMessage:
                  settings.language === 'id'
                    ? 'Gagal memuat catatan dari Google Apps Script. Periksa koneksi internet Anda.'
                    : 'Failed to fetch note from Google Apps Script. Please check your internet connection.',
              }));
            }
          }
          return;
        }
      }

      // No reader param present
      if (!isCancelled) {
        setPublicReaderState((prev) =>
          prev.active
            ? {
                active: false,
                noteId: null,
                remoteNote: null,
                isLoadingRemote: false,
                errorMessage: null,
              }
            : prev
        );
      }
    };

    checkUrlForReader();
    window.addEventListener('hashchange', checkUrlForReader);
    window.addEventListener('popstate', checkUrlForReader);
    return () => {
      isCancelled = true;
      window.removeEventListener('hashchange', checkUrlForReader);
      window.removeEventListener('popstate', checkUrlForReader);
    };
  }, [settings.language]);

  // Initial Load from Dexie.js
  const loadData = useCallback(async () => {
    try {
      await initDatabase();
      const loadedSettings = await getSettings();
      setSettings(loadedSettings);
      const rawMode = (loadedSettings.editor_mode as string) === 'split' ? 'markdown' : loadedSettings.editor_mode;
      setEditorMode(rawMode === 'markdown' ? 'markdown' : 'wysiwyg');
      if (loadedSettings.markdown_view_mode === 'raw') {
        setMarkdownViewMode('raw');
      } else {
        setMarkdownViewMode('split');
      }
      setVaultUnlocked(isVaultUnlocked());

      let allFolders = await db.folders.toArray();
      let loadedFolders = allFolders.filter((f) => !f.is_deleted);
      if (loadedFolders.length === 0) {
        await initDatabase();
        allFolders = await db.folders.toArray();
        loadedFolders = allFolders.filter((f) => !f.is_deleted);
      }
      const loadedNotes = await db.notes.toArray();
      const loadedTags = await db.tags.toArray();

      setFolders(loadedFolders);
      setNotes(loadedNotes);
      setTags(loadedTags);

      // Select first folder if none selected or if previous selectedFolderId was deleted
      setSelectedFolderId((prev) => {
        if (prev && loadedFolders.some((f) => f.id === prev)) {
          return prev;
        }
        return loadedFolders.length > 0 ? loadedFolders[0].id : null;
      });

      // Select first note if none selected or if previous selectedNoteId was deleted
      const activeNotes = loadedNotes.filter((n) => !n.is_deleted);
      setSelectedNoteId((prev) => {
        if (prev && activeNotes.some((n) => n.id === prev)) {
          return prev;
        }
        return activeNotes.length > 0 ? activeNotes[0].id : null;
      });
    } catch (err) {
      console.error('Failed to initialize database:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Synchronize document root theme and light/dark mode classes for accessibility and Tailwind
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('qalam-dark', 'qalam-light', 'qalam-nord', 'light', 'dark');
    root.classList.add(settings.theme);
    if (settings.theme === 'qalam-light') {
      root.classList.add('light');
    } else {
      root.classList.add('dark');
    }
  }, [settings.theme]);

  // Handle Note Update in Dexie & State
  const handleUpdateNote = async (updatedFields: Partial<Note>) => {
    if (!selectedNoteId) return;

    const currentNote = notes.find((n) => n.id === selectedNoteId);
    if (!currentNote) return;

    const updatedNote: Note = {
      ...currentNote,
      ...updatedFields,
      updated_time: Date.now(),
      sync_status: 'pending',
    };

    setNotes((prev) => prev.map((n) => (n.id === selectedNoteId ? updatedNote : n)));
    await db.notes.put(updatedNote);
  };

  // Create New Note
  const handleCreateNote = async (isTodo: boolean = false) => {
    const targetFolderId =
      selectedFolderId || (folders.length > 0 ? folders[0].id : 'folder-default');

    const newNoteId = 'note-' + Date.now();
    const now = Date.now();

    const newNote: Note = {
      id: newNoteId,
      folder_id: targetFolderId,
      title: isTodo ? 'New To-do' : 'New Note',
      body: isTodo ? '- [ ] First task' : '',
      is_todo: isTodo,
      todo_completed: 0,
      todo_due: isTodo ? now + 86400000 : 0,
      tags: selectedTagId ? [selectedTagId] : [],
      is_favorite: false,
      is_pinned: false,
      is_deleted: false,
      is_encrypted: false,
      created_time: now,
      updated_time: now,
      sync_status: 'pending',
      order: notes.length + 1,
    };

    await db.notes.add(newNote);
    setNotes((prev) => [newNote, ...prev]);
    setSelectedNoteId(newNoteId);
    setSelectedSpecialView(null);
  };

  // Toggle To-do Completion
  const handleToggleTodo = async (noteId: string, currentCompleted: number) => {
    const nextCompleted = currentCompleted ? 0 : Date.now();
    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId ? { ...n, todo_completed: nextCompleted, updated_time: Date.now() } : n
      )
    );
    await db.notes.update(noteId, { todo_completed: nextCompleted, updated_time: Date.now() });
  };

  // Toggle Star / Favorite
  const handleToggleStar = async (noteId: string, currentStar: boolean) => {
    const nextStar = !currentStar;
    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId ? { ...n, is_favorite: nextStar, updated_time: Date.now() } : n
      )
    );
    await db.notes.update(noteId, { is_favorite: nextStar, updated_time: Date.now() });
  };

  // Toggle Pin
  const handleTogglePin = async (noteId: string, currentPin: boolean) => {
    const nextPin = !currentPin;
    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId ? { ...n, is_pinned: nextPin, updated_time: Date.now() } : n
      )
    );
    await db.notes.update(noteId, { is_pinned: nextPin, updated_time: Date.now() });
  };

  // Duplicate Note
  const handleDuplicateNote = async (note: Note) => {
    const dupId = 'note-' + Date.now();
    const dupNote: Note = {
      ...note,
      id: dupId,
      title: `${note.title} (Copy)`,
      created_time: Date.now(),
      updated_time: Date.now(),
      sync_status: 'pending',
    };
    await db.notes.add(dupNote);
    setNotes((prev) => [dupNote, ...prev]);
    setSelectedNoteId(dupId);
  };

  // Soft Delete Note (Move to Trash) with Confirmation
  const requestDeleteNote = (noteId: string) => {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;

    const isId = settings.language === 'id';
    const noteTitle = note.title || (isId ? 'Catatan tanpa judul' : 'Untitled note');

    setConfirmState({
      isOpen: true,
      title: isId ? 'Pindahkan Catatan ke Sampah?' : 'Move Note to Trash?',
      message: isId
        ? `Apakah Anda yakin ingin memindahkan "${noteTitle}" ke Keranjang Sampah?`
        : `Are you sure you want to move "${noteTitle}" to the Trash?`,
      subMessage: isId
        ? 'Catatan dapat dipulihkan kapan saja dari menu Keranjang Sampah.'
        : 'Notes can be restored at any time from the Trash folder.',
      confirmLabel: isId ? 'Pindahkan ke Sampah' : 'Move to Trash',
      cancelLabel: isId ? 'Batal' : 'Cancel',
      isDanger: true,
      onConfirm: async () => {
        const now = Date.now();
        setNotes((prev) =>
          prev.map((n) => (n.id === noteId ? { ...n, is_deleted: true, updated_time: now } : n))
        );
        await db.notes.update(noteId, { is_deleted: true, updated_time: now });

        // Pick next active note
        const remaining = notes.filter((n) => n.id !== noteId && !n.is_deleted);
        if (remaining.length > 0) {
          setSelectedNoteId(remaining[0].id);
        } else {
          setSelectedNoteId(null);
        }
      },
    });
  };

  // Restore Note from Trash
  const handleRestoreNote = async (noteId: string) => {
    const now = Date.now();
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, is_deleted: false, updated_time: now } : n))
    );
    await db.notes.update(noteId, { is_deleted: false, updated_time: now });
  };

  // Permanent Delete Note with Confirmation
  const requestPermanentDeleteNote = (noteId: string) => {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;

    const isId = settings.language === 'id';
    const noteTitle = note.title || (isId ? 'Catatan tanpa judul' : 'Untitled note');

    setConfirmState({
      isOpen: true,
      title: isId ? 'Hapus Catatan Secara Permanen?' : 'Permanently Delete Note?',
      message: isId
        ? `Catatan "${noteTitle}" akan dihapus selamanya.`
        : `Note "${noteTitle}" will be permanently deleted.`,
      subMessage: isId
        ? 'Peringatan: Tindakan ini tidak dapat dibatalkan.'
        : 'Warning: This action cannot be undone.',
      confirmLabel: isId ? 'Hapus Permanen' : 'Delete Permanently',
      cancelLabel: isId ? 'Batal' : 'Cancel',
      isDanger: true,
      onConfirm: async () => {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
        await db.notes.delete(noteId);

        if (selectedNoteId === noteId) {
          const remainingTrash = notes.filter((n) => n.id !== noteId && n.is_deleted);
          if (remainingTrash.length > 0) {
            setSelectedNoteId(remainingTrash[0].id);
          } else {
            setSelectedNoteId(null);
          }
        }
      },
    });
  };

  // Empty Trash with Confirmation
  const requestEmptyTrash = () => {
    const trashed = notes.filter((n) => n.is_deleted);
    const isId = settings.language === 'id';

    if (trashed.length === 0) return;

    setConfirmState({
      isOpen: true,
      title: isId ? 'Kosongkan Keranjang Sampah?' : 'Empty Trash?',
      message: isId
        ? `Semua ${trashed.length} catatan di keranjang sampah akan dihapus secara permanen.`
        : `All ${trashed.length} note(s) in the trash will be permanently deleted.`,
      subMessage: isId
        ? 'Peringatan: Tindakan ini tidak dapat dibatalkan.'
        : 'Warning: This action cannot be undone.',
      confirmLabel: isId ? 'Kosongkan Sampah' : 'Empty Trash',
      cancelLabel: isId ? 'Batal' : 'Cancel',
      isDanger: true,
      onConfirm: async () => {
        for (const n of trashed) {
          await db.notes.delete(n.id);
        }
        setNotes((prev) => prev.filter((n) => !n.is_deleted));
        if (selectedSpecialView === 'trash') {
          setSelectedNoteId(null);
        }
      },
    });
  };

  // Folder Operations
  const handleSaveFolder = async (title: string, parentId: string) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const now = Date.now();
    const sanitizedParentId = parentId || '';

    try {
      if (folderToEdit) {
        // Rename or re-parent existing notebook
        const updated: Folder = {
          ...folderToEdit,
          title: trimmedTitle,
          parent_id: sanitizedParentId,
          updated_time: now,
          is_deleted: false,
        };
        await db.folders.put(updated);
        setFolders((prev) => prev.map((f) => (f.id === folderToEdit.id ? updated : f)));
      } else {
        // Create new notebook
        const uniqueId = 'folder-' + now + '-' + Math.random().toString(36).substring(2, 8);
        const newFolder: Folder = {
          id: uniqueId,
          title: trimmedTitle,
          parent_id: sanitizedParentId,
          created_time: now,
          updated_time: now,
          is_deleted: false,
          order: folders.length + 1,
        };
        await db.folders.put(newFolder);
        setFolders((prev) => [...prev, newFolder]);
        setSelectedFolderId(newFolder.id);
        setSelectedSpecialView(null);
        setSelectedTagId(null);
      }
    } catch (err) {
      console.error('Failed to save notebook to database:', err);
      throw err;
    } finally {
      setFolderToEdit(undefined);
    }
  };

  // Delete Folder with Confirmation Dialog
  const requestDeleteFolder = (folderId: string) => {
    const targetFolder = folders.find((f) => f.id === folderId);
    if (!targetFolder) return;

    const isId = settings.language === 'id';

    // Collect all descendant folder IDs (recursive)
    const getDescendantFolderIds = (pId: string): string[] => {
      const children = folders.filter((f) => f.parent_id === pId);
      let ids: string[] = [];
      for (const c of children) {
        ids.push(c.id);
        ids = ids.concat(getDescendantFolderIds(c.id));
      }
      return ids;
    };

    const allFolderIdsToDelete = [folderId, ...getDescendantFolderIds(folderId)];
    const notesInside = notes.filter(
      (n) => allFolderIdsToDelete.includes(n.folder_id) && !n.is_deleted
    );
    const subCount = allFolderIdsToDelete.length - 1;

    setConfirmState({
      isOpen: true,
      title: isId
        ? `Hapus Buku Catatan "${targetFolder.title}"?`
        : `Delete Notebook "${targetFolder.title}"?`,
      message: isId
        ? `Buku catatan "${targetFolder.title}" akan dihapus.${
            subCount > 0 ? ` Termasuk ${subCount} sub-buku catatan di dalamnya.` : ''
          }`
        : `Notebook "${targetFolder.title}" will be deleted.${
            subCount > 0 ? ` Including ${subCount} nested sub-notebook(s).` : ''
          }`,
      subMessage: isId
        ? notesInside.length > 0
          ? `${notesInside.length} catatan di dalamnya akan dipindahkan ke Keranjang Sampah.`
          : 'Tidak ada catatan aktif di dalam buku catatan ini.'
        : notesInside.length > 0
        ? `${notesInside.length} note(s) inside will be moved to Trash.`
        : 'There are no active notes inside.',
      confirmLabel: isId ? 'Hapus Buku Catatan' : 'Delete Notebook',
      cancelLabel: isId ? 'Batal' : 'Cancel',
      isDanger: true,
      onConfirm: async () => {
        // 1. Delete folders from IndexedDB
        for (const fId of allFolderIdsToDelete) {
          await db.folders.delete(fId);
        }
        setFolders((prev) => prev.filter((f) => !allFolderIdsToDelete.includes(f.id)));

        // 2. Soft delete associated notes
        const now = Date.now();
        for (const n of notesInside) {
          await db.notes.update(n.id, { is_deleted: true, updated_time: now });
        }
        setNotes((prev) =>
          prev.map((n) =>
            allFolderIdsToDelete.includes(n.folder_id)
              ? { ...n, is_deleted: true, updated_time: now }
              : n
          )
        );

        // 3. Switch selected folder if deleted
        if (selectedFolderId && allFolderIdsToDelete.includes(selectedFolderId)) {
          const remainingFolders = folders.filter((f) => !allFolderIdsToDelete.includes(f.id));
          if (remainingFolders.length > 0) {
            setSelectedFolderId(remainingFolders[0].id);
          } else {
            setSelectedFolderId(null);
            setSelectedSpecialView('all');
          }
        }
      },
    });
  };

  // Move Note to Folder (Drag and drop)
  const handleMoveNoteToFolder = async (noteId: string, targetFolderId: string) => {
    const note = notes.find((n) => n.id === noteId);
    if (!note || note.folder_id === targetFolderId) return;

    const updatedTime = Date.now();
    const updatedNote: Note = {
      ...note,
      folder_id: targetFolderId,
      updated_time: updatedTime,
      sync_status: 'pending',
    };

    setNotes((prev) => prev.map((n) => (n.id === noteId ? updatedNote : n)));
    await db.notes.put(updatedNote);
  };

  // Move Folder / Sub-folder (Drag and drop or context menu)
  const handleMoveFolder = async (folderId: string, newParentId: string) => {
    if (folderId === newParentId) return;

    // Check if newParentId is descendant of folderId to prevent circular dependency
    const isDescendant = (parentId: string, targetId: string): boolean => {
      const children = folders.filter((f) => f.parent_id === parentId);
      for (const child of children) {
        if (child.id === targetId) return true;
        if (isDescendant(child.id, targetId)) return true;
      }
      return false;
    };

    const isId = settings.language === 'id';

    if (newParentId && isDescendant(folderId, newParentId)) {
      setConfirmState({
        isOpen: true,
        title: isId ? 'Peringatan Pemindahan Folder' : 'Folder Move Warning',
        message: isId
          ? 'Tidak dapat memindahkan buku catatan ke dalam sub-folder miliknya sendiri!'
          : 'Cannot move a notebook into its own sub-notebook!',
        confirmLabel: 'OK',
        cancelLabel: isId ? 'Tutup' : 'Close',
        isDanger: false,
        onConfirm: () => {},
      });
      return;
    }

    const updatedTime = Date.now();
    const sanitizedParentId = newParentId || '';

    setFolders((prev) =>
      prev.map((f) =>
        f.id === folderId ? { ...f, parent_id: sanitizedParentId, updated_time: updatedTime } : f
      )
    );

    const folderToUpdate = folders.find((f) => f.id === folderId);
    if (folderToUpdate) {
      await db.folders.put({
        ...folderToUpdate,
        parent_id: sanitizedParentId,
        updated_time: updatedTime,
      });
    }
  };

  // Create Tag
  const handleSaveNewTag = async (cleanTitle: string) => {
    const exists = tags.find((t) => t.title === cleanTitle);
    if (!exists) {
      const newTag: Tag = {
        id: 'tag-' + Date.now(),
        title: cleanTitle,
        created_time: Date.now(),
        updated_time: Date.now(),
      };
      await db.tags.add(newTag);
      setTags((prev) => [...prev, newTag]);
    }
  };

  // Delete Tag with Confirmation Dialog
  const requestDeleteTag = (tagId: string, tagTitle: string) => {
    const isId = settings.language === 'id';

    setConfirmState({
      isOpen: true,
      title: isId ? `Hapus Tag "${tagTitle}"?` : `Delete Tag "${tagTitle}"?`,
      message: isId
        ? `Apakah Anda yakin ingin menghapus tag "${tagTitle}"?`
        : `Are you sure you want to delete tag "${tagTitle}"?`,
      subMessage: isId
        ? 'Tag ini akan dilepaskan dari semua catatan yang menggunakannya.'
        : 'This tag will be removed from all notes that use it.',
      confirmLabel: isId ? 'Hapus Tag' : 'Delete Tag',
      cancelLabel: isId ? 'Batal' : 'Cancel',
      isDanger: true,
      onConfirm: async () => {
        await db.tags.delete(tagId);
        setTags((prev) => prev.filter((t) => t.id !== tagId));

        const updatedTime = Date.now();
        const notesWithTag = notes.filter((n) => (n.tags || []).includes(tagTitle));
        for (const n of notesWithTag) {
          const nextTags = (n.tags || []).filter((t) => t !== tagTitle);
          await db.notes.update(n.id, { tags: nextTags, updated_time: updatedTime });
        }
        setNotes((prev) =>
          prev.map((n) =>
            (n.tags || []).includes(tagTitle)
              ? { ...n, tags: (n.tags || []).filter((t) => t !== tagTitle), updated_time: updatedTime }
              : n
          )
        );

        if (selectedTagId === tagTitle) {
          setSelectedTagId(null);
          setSelectedSpecialView('all');
        }
      },
    });
  };

  // Save Settings
  const handleSaveSettings = async (newSettings: Partial<AppSettings>) => {
    const prevLanguage = settings.language;
    const updated = await saveSettings(newSettings);
    setSettings(updated);
    const newEditorMode = (updated.editor_mode as string) === 'split' ? 'markdown' : updated.editor_mode;
    setEditorMode(newEditorMode === 'markdown' ? 'markdown' : 'wysiwyg');
    if (updated.markdown_view_mode) {
      setMarkdownViewMode(updated.markdown_view_mode);
    }
    setVaultUnlocked(isVaultUnlocked());

    if (newSettings.language && newSettings.language !== prevLanguage) {
      await updatePresetNotesLanguage(newSettings.language);
    }
    const refreshedNotes = await db.notes.toArray();
    const allFolders = await db.folders.toArray();
    setNotes(refreshedNotes);
    setFolders(allFolders.filter((f) => !f.is_deleted));
  };

  // Synchronisation
  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncMessage('Synchronising...');

    try {
      const status = await executeSync(settings.sync, (s) => {
        setSyncMessage(s.message);
      });
      setSyncMessage(status.message);
      // Reload updated notes from Dexie
      const refreshedNotes = await db.notes.toArray();
      setNotes(refreshedNotes);
    } catch (e: any) {
      setSyncMessage(`Sync failed: ${e.message}`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(''), 4000);
    }
  };

  // Export Data
  const handleExportData = async () => {
    const jsonStr = await exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qalam-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import Data
  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const res = await importData(content);
        setConfirmState({
          isOpen: true,
          title: settings.language === 'id' ? 'Impor Berhasil' : 'Import Successful',
          message: settings.language === 'id'
            ? `Berhasil mengimpor ${res.notesImported} catatan dan ${res.foldersImported} buku catatan!`
            : `Successfully imported ${res.notesImported} notes and ${res.foldersImported} notebooks!`,
          confirmLabel: 'OK',
          cancelLabel: settings.language === 'id' ? 'Tutup' : 'Close',
          isDanger: false,
          onConfirm: () => {},
        });
        loadData();
      } catch (err: any) {
        setConfirmState({
          isOpen: true,
          title: settings.language === 'id' ? 'Kesalahan Impor' : 'Import Error',
          message: `${err.message}`,
          confirmLabel: 'OK',
          cancelLabel: settings.language === 'id' ? 'Tutup' : 'Close',
          isDanger: true,
          onConfirm: () => {},
        });
      }
    };
    reader.readAsText(file);
  };

  // Toggle Vault Lock
  const handleToggleVaultLock = () => {
    if (vaultUnlocked) {
      lockVault();
      setVaultUnlocked(false);
    } else {
      setIsUnlockVaultOpen(true);
    }
  };

  // Toggle encryption on active note
  const handleToggleEncryptNote = () => {
    if (!settings.e2ee.enabled) {
      setIsSettingsOpen(true);
      setSettingsInitialTab('encryption');
      return;
    }
    if (!vaultUnlocked) {
      setIsUnlockVaultOpen(true);
      return;
    }
    const current = notes.find((n) => n.id === selectedNoteId);
    if (!current) return;
    handleUpdateNote({ is_encrypted: !current.is_encrypted });
  };

  // Open / Follow WikiLink: Search existing note or create a new note with target title!
  const handleOpenWikiLink = async (targetTitle: string) => {
    if (!targetTitle) return;
    const norm = normalizeTitle(targetTitle);
    const existing = notes.find((n) => !n.is_deleted && normalizeTitle(n.title) === norm);
    if (existing) {
      setSelectedNoteId(existing.id);
      if (isMobile) setMobileActiveView('editor');
    } else {
      // Create new note with this title (Obsidian / Zettelkasten style)
      const targetFolderId = selectedFolderId || (folders.length > 0 ? folders[0].id : 'folder-default');
      const newNoteId = 'note-' + Date.now();
      const now = Date.now();
      const newNote: Note = {
        id: newNoteId,
        folder_id: targetFolderId,
        title: targetTitle.trim(),
        body: '',
        is_todo: false,
        todo_completed: 0,
        todo_due: 0,
        tags: [],
        is_favorite: false,
        is_pinned: false,
        is_deleted: false,
        is_encrypted: false,
        created_time: now,
        updated_time: now,
        sync_status: 'pending',
        order: notes.length + 1,
      };
      await db.notes.add(newNote);
      setNotes((prev) => [newNote, ...prev]);
      setSelectedNoteId(newNoteId);
      if (isMobile) setMobileActiveView('editor');
    }
  };

  // Open or Create Today's Daily Note
  const handleOpenDailyNote = async () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const dailyTitle = settings.language === 'id' ? `Catatan Harian ${dateStr}` : `Daily Note ${dateStr}`;

    const existing = notes.find(
      (n) =>
        !n.is_deleted &&
        (normalizeTitle(n.title).includes(dateStr) ||
          normalizeTitle(n.title) === normalizeTitle(dailyTitle))
    );

    if (existing) {
      setSelectedNoteId(existing.id);
      if (isMobile) setMobileActiveView('editor');
    } else {
      const templates = getTemplates(settings.language);
      const dailyTemplate = templates.find((t) => t.id === 'daily_planner') || templates[0];
      const initialContent = dailyTemplate
        ? renderTemplateContent(dailyTemplate.content, dailyTitle)
        : `# 📅 ${dailyTitle}\n\n`;

      const targetFolderId = selectedFolderId || (folders.length > 0 ? folders[0].id : 'folder-default');
      const newNoteId = 'note-' + Date.now();
      const now = Date.now();
      const newNote: Note = {
        id: newNoteId,
        folder_id: targetFolderId,
        title: dailyTitle,
        body: initialContent,
        is_todo: false,
        todo_completed: 0,
        todo_due: 0,
        tags: ['harian'],
        is_favorite: false,
        is_pinned: false,
        is_deleted: false,
        is_encrypted: false,
        created_time: now,
        updated_time: now,
        sync_status: 'pending',
        order: notes.length + 1,
      };
      await db.notes.add(newNote);
      setNotes((prev) => [newNote, ...prev]);
      setSelectedNoteId(newNoteId);
      if (isMobile) setMobileActiveView('editor');
    }
  };

  // Export Note to PDF (Direct download without print dialog)
  const handleExportPdf = () => {
    const note = notes.find((n) => n.id === selectedNoteId);
    if (!note) return;
    const folder = folders.find((f) => f.id === note.folder_id);
    exportNoteToPdfDirect(note, folder?.title || 'Qalam Note');
  };

  // Export Note to Markdown (.md)
  const handleExportMarkdown = () => {
    const note = notes.find((n) => n.id === selectedNoteId);
    if (!note) return;
    exportNoteToMarkdown(note);
  };

  // Apply Template
  const handleApplyTemplate = async (
    content: string,
    mode: 'replace' | 'append' | 'new_note',
    templateTitle: string
  ) => {
    const current = notes.find((n) => n.id === selectedNoteId);
    if (mode === 'new_note') {
      const targetFolderId = selectedFolderId || (folders.length > 0 ? folders[0].id : 'folder-default');
      const newNoteId = 'note-' + Date.now();
      const now = Date.now();
      const newNote: Note = {
        id: newNoteId,
        folder_id: targetFolderId,
        title: templateTitle,
        body: content,
        is_todo: false,
        todo_completed: 0,
        todo_due: 0,
        tags: [],
        is_favorite: false,
        is_pinned: false,
        is_deleted: false,
        is_encrypted: false,
        created_time: now,
        updated_time: now,
        sync_status: 'pending',
        order: notes.length + 1,
      };
      await db.notes.add(newNote);
      setNotes((prev) => [newNote, ...prev]);
      setSelectedNoteId(newNoteId);
      if (isMobile) setMobileActiveView('editor');
    } else if (current) {
      if (mode === 'replace') {
        handleUpdateNote({ body: content });
      } else {
        handleUpdateNote({ body: (current.body ? current.body + '\n\n' : '') + content });
      }
    }
    setIsTemplatesOpen(false);
  };

  // Insert Voice Memo into Active Note
  const handleInsertAudioMemo = (audioDataUrl: string, audioTitle?: string) => {
    const current = notes.find((n) => n.id === selectedNoteId);
    if (!current) return;
    const title = audioTitle || (settings.language === 'id' ? 'Memo Suara' : 'Voice Memo');
    const snippet = `\n\n### 🎙️ ${title}\n<audio controls src="${audioDataUrl}" style="width: 100%; max-width: 420px; margin: 8px 0;"></audio>\n`;
    const newBody = current.body ? current.body + snippet : snippet.trimStart();
    const isLight = settings.theme === 'qalam-light';
    const newHtml = markdownToHtml(newBody, isLight ? 'light' : 'dark');
    const newAtt: Attachment = {
      id: 'att-voice-' + Date.now(),
      name: `${title}.webm`,
      size: Math.round((audioDataUrl.length * 3) / 4),
      mime: 'audio/webm',
      dataUrl: audioDataUrl,
      created_time: Date.now(),
    };
    handleUpdateNote({
      body: newBody,
      body_html: newHtml,
      attachments: [...(current.attachments || []), newAtt],
      updated_time: Date.now(),
    });
    setIsAudioRecordOpen(false);
  };

  // Insert Handwriting / Drawing Canvas Image into Active Note
  const handleInsertDrawing = (
    drawingDataUrl: string,
    options?: { displayWidth?: string; width?: number; height?: number }
  ) => {
    const current = notes.find((n) => n.id === selectedNoteId);
    if (!current) return;
    const label = settings.language === 'id' ? 'Sketsa Tangan' : 'Handwriting Sketch';
    let snippet = '';
    if (options?.displayWidth && options.displayWidth !== '100%') {
      const widthVal =
        options.displayWidth.endsWith('%') || options.displayWidth.endsWith('px')
          ? options.displayWidth
          : `${options.displayWidth}px`;
      snippet = `\n\n### ✍️ ${label}\n<img src="${drawingDataUrl}" alt="${label}" width="${widthVal}" style="max-width: 100%; height: auto; border-radius: 8px;" />\n`;
    } else {
      snippet = `\n\n### ✍️ ${label}\n![${label}](${drawingDataUrl})\n`;
    }
    const newBody = current.body ? current.body + snippet : snippet.trimStart();
    const isLight = settings.theme === 'qalam-light';
    const newHtml = markdownToHtml(newBody, isLight ? 'light' : 'dark');
    const newAtt: Attachment = {
      id: 'att-draw-' + Date.now(),
      name: `${label}.png`,
      size: Math.round((drawingDataUrl.length * 3) / 4),
      mime: 'image/png',
      dataUrl: drawingDataUrl,
      created_time: Date.now(),
    };
    handleUpdateNote({
      body: newBody,
      body_html: newHtml,
      attachments: [...(current.attachments || []), newAtt],
      updated_time: Date.now(),
    });
    setIsDrawingModalOpen(false);
  };

  // Restore Note Revision Snapshot
  const handleRestoreRevision = (body: string, title?: string) => {
    const current = notes.find((n) => n.id === selectedNoteId);
    if (!current) return;
    const isLight = settings.theme === 'qalam-light';
    const newHtml = markdownToHtml(body, isLight ? 'light' : 'dark');
    handleUpdateNote({
      body,
      body_html: newHtml,
      ...(title ? { title } : {}),
      updated_time: Date.now(),
    });
    setIsRevisionHistoryOpen(false);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Universal Command Palette (Ctrl+K / Cmd+K) - Prevent propagation to any child modal
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        e.stopPropagation();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
        // Knowledge Graph View (Ctrl+G / Cmd+G)
        e.preventDefault();
        setIsGraphViewOpen((prev) => !prev);
      } else if (e.altKey && e.key.toLowerCase() === 'd') {
        // Daily Note (Alt+D)
        e.preventDefault();
        handleOpenDailyNote();
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'h') {
        // Revision History (Ctrl+Shift+H)
        e.preventDefault();
        if (selectedNoteId) setIsRevisionHistoryOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 't') {
        // Templates Gallery (Ctrl+Shift+T)
        e.preventDefault();
        setIsTemplatesOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        // Export Modal (Ctrl+P)
        if (selectedNoteId) {
          e.preventDefault();
          const curNote = notes.find((n) => n.id === selectedNoteId);
          if (curNote) setExportNoteModalTarget(curNote);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleCreateNote(false);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't') {
        e.preventDefault();
        handleCreateNote(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSync();
      } else if (e.key === 'F10') {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
      } else if (e.key === 'F11') {
        e.preventDefault();
        setIsNoteListOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [notes, selectedNoteId, selectedFolderId, settings.language]);

  // Derived filtered & sorted notes
  const filteredNotes = useMemo(() => {
    return notes
      .filter((note) => {
        // Trash View Filter
        if (selectedSpecialView === 'trash') {
          return note.is_deleted;
        }
        if (note.is_deleted) return false;

        // Special Views
        if (selectedSpecialView === 'starred') {
          if (!note.is_favorite) return false;
        } else if (selectedSpecialView === 'all') {
          // all active notes
        } else if (selectedTagId) {
          if (!note.tags || !note.tags.includes(selectedTagId)) return false;
        } else if (selectedFolderId) {
          if (note.folder_id !== selectedFolderId) return false;
        }

        // View Type Filter (Notes / Todos)
        if (filter === 'notes_only' && note.is_todo) return false;
        if (filter === 'todos_only' && !note.is_todo) return false;
        if (filter === 'todos_incomplete' && (!note.is_todo || note.todo_completed > 0)) return false;

        // Search Query
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matchTitle = note.title.toLowerCase().includes(query);
          const matchBody = note.body.toLowerCase().includes(query);
          const matchTag = note.tags?.some((t) => t.toLowerCase().includes(query));
          if (!matchTitle && !matchBody && !matchTag) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Pinned notes always on top (unless trash)
        if (selectedSpecialView !== 'trash') {
          if (a.is_pinned && !b.is_pinned) return -1;
          if (!a.is_pinned && b.is_pinned) return 1;
        }

        let valA = a[sortField];
        let valB = b[sortField];

        if (sortField === 'title') {
          return sortOrder === 'asc'
            ? (valA as string).localeCompare(valB as string)
            : (valB as string).localeCompare(valA as string);
        }

        return sortOrder === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
      });
  }, [
    notes,
    selectedSpecialView,
    selectedTagId,
    selectedFolderId,
    filter,
    searchQuery,
    sortField,
    sortOrder,
  ]);

  // Selected Note Object
  const activeNote = useMemo(() => {
    return notes.find((n) => n.id === selectedNoteId) || null;
  }, [notes, selectedNoteId]);

  // Note counts
  const noteCountsByFolder = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const n of notes) {
      if (!n.is_deleted) {
        counts[n.folder_id] = (counts[n.folder_id] || 0) + 1;
      }
    }
    return counts;
  }, [notes]);

  const noteCountsByTag = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const n of notes) {
      if (!n.is_deleted && n.tags) {
        for (const t of n.tags) {
          counts[t] = (counts[t] || 0) + 1;
        }
      }
    }
    return counts;
  }, [notes]);

  const activeNotesCount = notes.filter((n) => !n.is_deleted).length;
  const starredNotesCount = notes.filter((n) => !n.is_deleted && n.is_favorite).length;
  const trashNotesCount = notes.filter((n) => n.is_deleted).length;

  // Selected folder and tag titles for note list header
  const currentFolderTitle = folders.find((f) => f.id === selectedFolderId)?.title;

  // If in public reader mode (?k=... or #public-preview-...)
  if (publicReaderState.active) {
    const localNote = publicReaderState.noteId
      ? notes.find((n) => n.id === publicReaderState.noteId)
      : null;

    const handleBackToApp = () => {
      if (typeof window !== 'undefined') {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        window.location.hash = '';
      }
      setPublicReaderState({
        active: false,
        noteId: null,
        remoteNote: null,
        isLoadingRemote: false,
        errorMessage: null,
      });
    };

    return (
      <PublicReaderView
        note={localNote}
        remoteNote={publicReaderState.remoteNote}
        authorName={publicReaderState.author || settings.gas.author_name || 'Anonymous'}
        gasUrl={publicReaderState.gasUrl}
        noteId={publicReaderState.noteId || undefined}
        isLoadingRemote={publicReaderState.isLoadingRemote && !localNote}
        errorMessage={
          !localNote && !publicReaderState.remoteNote && !publicReaderState.isLoadingRemote
            ? publicReaderState.errorMessage
            : null
        }
        onBackToApp={handleBackToApp}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#1d273b] text-slate-200">
        <div className="flex flex-col items-center gap-3">
          <QalamIcon className="w-12 h-12 shadow-xl animate-pulse" />
          <span className="text-xs font-medium text-slate-400">Memuat Qalam Note...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden ${settings.theme}`}>
      {/* Qalam Top Menu & Quick Action Bar (Desktop / Tablet only) */}
      {!isMobile && (
        <TopMenuBar
          onNewNote={() => handleCreateNote(false)}
          onNewTodo={() => handleCreateNote(true)}
          onNewFolder={() => {
            setFolderToEdit(undefined);
            setFolderParentId('');
            setIsNewFolderOpen(true);
          }}
          onSync={handleSync}
          isSyncing={isSyncing}
          onOpenSettings={(tab?: string) => {
            setSettingsInitialTab(tab || 'general');
            setIsSettingsOpen(true);
          }}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isNoteListOpen={isNoteListOpen}
          onToggleNoteList={() => setIsNoteListOpen(!isNoteListOpen)}
          editorMode={editorMode}
          markdownViewMode={markdownViewMode}
          onMarkdownViewModeChange={(v) => {
            setMarkdownViewMode(v);
            handleSaveSettings({ markdown_view_mode: v });
          }}
          onOpenCheatSheet={(mathOnly) => {
            setIsCheatSheetMathOnly(editorMode === 'wysiwyg' || !!mathOnly);
            setIsCheatSheetOpen(true);
          }}
          isE2EEEnabled={settings.e2ee.enabled}
          isVaultUnlocked={vaultUnlocked}
          onToggleVaultLock={handleToggleVaultLock}
          onExportBackup={handleExportData}
          onImportBackup={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e: any) => handleImportData(e);
            input.click();
          }}
          onOpenGASHelp={() => setIsGASHelpOpen(true)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenDailyNote={handleOpenDailyNote}
          onOpenGraphView={() => setIsGraphViewOpen(true)}
          onOpenTemplates={() => setIsTemplatesOpen(true)}
          onOpenExportModal={() => activeNote && setExportNoteModalTarget(activeNote)}
          language={settings.language}
          theme={settings.theme}
        />
      )}

      {/* Obsidian / Joplin Style Mobile Top Bar (Phone only) */}
      {isMobile && (
        <MobileTopBar
          view={mobileActiveView}
          onNavigate={(v) => {
            if (v === 'editor' && !activeNote && filteredNotes.length > 0) {
              setSelectedNoteId(filteredNotes[0].id);
            }
            setMobileActiveView(v);
          }}
          folderTitle={currentFolderTitle}
          tagTitle={selectedTagId}
          isTrashView={selectedSpecialView === 'trash'}
          notesCount={filteredNotes.length}
          activeNote={activeNote}
          sortField={sortField}
          sortOrder={sortOrder}
          onSortChange={(field, order) => {
            setSortField(field);
            setSortOrder(order);
          }}
          onNewNote={() => handleCreateNote(false)}
          onNewTodo={() => handleCreateNote(true)}
          onCreateFolder={() => {
            setFolderToEdit(undefined);
            setFolderParentId('');
            setIsNewFolderOpen(true);
          }}
          onSync={handleSync}
          isSyncing={isSyncing}
          onOpenSettings={(tab?: string) => {
            setSettingsInitialTab(tab || 'general');
            setIsSettingsOpen(true);
          }}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenDailyNote={handleOpenDailyNote}
          onOpenGraphView={() => setIsGraphViewOpen(true)}
          onOpenTemplates={() => setIsTemplatesOpen(true)}
          onOpenVoiceRecorder={() => setIsAudioRecordOpen(true)}
          onOpenDrawingCanvas={() => setIsDrawingModalOpen(true)}
          onOpenRevisionHistory={() => setIsRevisionHistoryOpen(true)}
          onExportPdf={handleExportPdf}
          onExportMarkdown={handleExportMarkdown}
          onOpenExportModal={() => activeNote && setExportNoteModalTarget(activeNote)}
          mobileReadingMode={mobileReadingMode}
          onToggleReadingMode={() => setMobileReadingMode((prev) => !prev)}
          isVaultUnlocked={vaultUnlocked}
          onToggleEncrypt={handleToggleEncryptNote}
          onOpenPublish={() => setIsPublishOpen(true)}
          onOpenInfo={() => setIsNoteInfoOpen(true)}
          onOpenCheatSheet={() => {
            setIsCheatSheetMathOnly(false);
            setIsCheatSheetOpen(true);
          }}
          onDuplicateNote={handleDuplicateNote}
          onDeleteNote={requestDeleteNote}
          language={settings.language}
        />
      )}

      {/* Main 3-Column / Responsive Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* On Mobile (< 768px): Show either Sidebar, NoteList, or NoteEditor depending on mobileActiveView */}
        {isMobile ? (
          <>
            {mobileActiveView === 'sidebar' && (
              <div className="w-full h-full flex-1 overflow-hidden">
                <Sidebar
                  folders={folders}
                  tags={tags}
                  noteCountsByFolder={noteCountsByFolder}
                  noteCountsByTag={noteCountsByTag}
                  totalNotesCount={activeNotesCount}
                  starredCount={starredNotesCount}
                  trashCount={trashNotesCount}
                  notes={notes}
                  selectedNoteId={selectedNoteId}
                  onSelectNote={(id) => {
                    setSelectedNoteId(id);
                    setMobileActiveView('editor');
                  }}
                  onDeleteNote={requestDeleteNote}
                  selectedFolderId={selectedFolderId}
                  selectedTagId={selectedTagId}
                  selectedSpecialView={selectedSpecialView}
                  onSelectFolder={(id) => {
                    setSelectedFolderId(id);
                    setSelectedSpecialView(null);
                    setSelectedTagId(null);
                    const folderNotes = notes.filter((n) => n.folder_id === id && !n.is_deleted);
                    if (folderNotes.length > 0) {
                      if (!selectedNoteId || !folderNotes.some((n) => n.id === selectedNoteId)) {
                        setSelectedNoteId(folderNotes[0].id);
                      }
                    } else {
                      setSelectedNoteId(null);
                    }
                    setMobileActiveView('notes');
                  }}
                  onSelectTag={(tagTitle) => {
                    setSelectedTagId(tagTitle);
                    setSelectedSpecialView(null);
                    setSelectedFolderId(null);
                    setMobileActiveView('notes');
                  }}
                  onSelectSpecialView={(view) => {
                    setSelectedSpecialView(view);
                    setSelectedTagId(null);
                    setMobileActiveView('notes');
                  }}
                  onCreateFolder={(parentId) => {
                    setFolderToEdit(undefined);
                    setFolderParentId(parentId || '');
                    setIsNewFolderOpen(true);
                  }}
                  onRenameFolder={(folder) => {
                    setFolderToEdit(folder);
                    setIsNewFolderOpen(true);
                  }}
                  onDeleteFolder={requestDeleteFolder}
                  onCreateTag={() => setIsNewTagOpen(true)}
                  onDeleteTag={requestDeleteTag}
                  onOpenSettings={() => {
                    setSettingsInitialTab('general');
                    setIsSettingsOpen(true);
                  }}
                  onSync={handleSync}
                  isSyncing={isSyncing}
                  lastSyncTime={settings.sync.last_sync_time}
                  isE2EEEnabled={settings.e2ee.enabled}
                  isVaultUnlocked={vaultUnlocked}
                  onToggleVaultLock={handleToggleVaultLock}
                  onEmptyTrash={requestEmptyTrash}
                  onMoveFolder={handleMoveFolder}
                  onMoveNoteToFolder={handleMoveNoteToFolder}
                  onOpenGraphView={() => setIsGraphViewOpen(true)}
                  onOpenExportFolderModal={(folder) => setExportFolderModalTarget(folder)}
                  language={settings.language}
                />
              </div>
            )}

            {mobileActiveView === 'notes' && (
              <div className="w-full h-full flex-1 overflow-hidden">
                <NoteList
                  notes={filteredNotes}
                  selectedNoteId={selectedNoteId}
                  onSelectNote={(id) => {
                    setSelectedNoteId(id);
                    setMobileReadingMode(false);
                    setMobileActiveView('editor');
                  }}
                  onToggleTodo={handleToggleTodo}
                  onToggleStar={handleToggleStar}
                  onTogglePin={handleTogglePin}
                  onDuplicateNote={handleDuplicateNote}
                  onDeleteNote={requestDeleteNote}
                  sortField={sortField}
                  sortOrder={sortOrder}
                  onSortChange={(field, order) => {
                    setSortField(field);
                    setSortOrder(order);
                  }}
                  filter={filter}
                  onFilterChange={setFilter}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  folderTitle={currentFolderTitle}
                  selectedFolderId={selectedFolderId}
                  onMoveNoteToFolder={handleMoveNoteToFolder}
                  tagTitle={selectedTagId || undefined}
                  isTrashView={selectedSpecialView === 'trash'}
                  onRestoreNote={handleRestoreNote}
                  onPermanentDeleteNote={requestPermanentDeleteNote}
                  dateFormat={settings.date_format}
                  timeFormat={settings.time_format}
                  language={settings.language}
                  theme={settings.theme}
                  onBackToSidebar={() => setMobileActiveView('sidebar')}
                  isMobile={true}
                  onNewNote={() => handleCreateNote(false)}
                  onNewTodo={() => handleCreateNote(true)}
                  onOpenExportNoteModal={(note) => setExportNoteModalTarget(note)}
                />
              </div>
            )}

            {mobileActiveView === 'editor' && (
              <div className="w-full h-full flex-1 min-w-0 overflow-hidden">
                {activeNote ? (
                  <NoteEditor
                    note={activeNote}
                    folders={folders}
                    availableTags={tags.map((t) => t.title)}
                    allNotes={notes}
                    settingsEditorMode={editorMode}
                    markdownViewMode={markdownViewMode}
                    isVaultUnlocked={vaultUnlocked}
                    onUpdateNote={handleUpdateNote}
                    onMarkdownViewModeChange={(v) => {
                      setMarkdownViewMode(v);
                      handleSaveSettings({ markdown_view_mode: v });
                    }}
                    onOpenPublish={() => setIsPublishOpen(true)}
                    onOpenInfo={() => setIsNoteInfoOpen(true)}
                    onToggleEncrypt={handleToggleEncryptNote}
                    onRequestUnlock={() => setIsUnlockVaultOpen(true)}
                    onBackToNotes={() => setMobileActiveView('notes')}
                    onOpenWikiLink={handleOpenWikiLink}
                    onOpenTemplates={() => setIsTemplatesOpen(true)}
                    onOpenGraphView={() => setIsGraphViewOpen(true)}
                    onOpenRevisionHistory={() => setIsRevisionHistoryOpen(true)}
                    onOpenVoiceRecorder={() => setIsAudioRecordOpen(true)}
                    onOpenDrawingCanvas={() => setIsDrawingModalOpen(true)}
                    onExportPdf={handleExportPdf}
                    onExportMarkdown={handleExportMarkdown}
                    onOpenExportModal={() => setExportNoteModalTarget(activeNote)}
                    language={settings.language}
                    theme={settings.theme}
                    isMobile={true}
                    mobileReadingMode={mobileReadingMode}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full bg-[#1b2434] text-slate-400 p-6 text-center">
                    <span className="text-sm">
                      {settings.language === 'id' ? 'Tidak ada catatan dipilih' : 'No note selected'}
                    </span>
                    <button
                      onClick={() => handleCreateNote(false)}
                      className="mt-3 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition shadow-md"
                    >
                      {settings.language === 'id' ? 'Buat Catatan Baru' : 'Create a Note'}
                    </button>
                    <button
                      onClick={() => setMobileActiveView('notes')}
                      className="mt-2 text-xs text-blue-400 hover:underline"
                    >
                      {settings.language === 'id' ? '← Lihat Daftar Catatan' : '← View Notes List'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          /* Desktop (>= 1024px) & Tablet (768px - 1023px) */
          <>
            {/* Tablet Mode: Sidebar as slide-over drawer with backdrop */}
            {isTablet ? (
              <>
                {isSidebarOpen && (
                  <>
                    <div
                      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity"
                      onClick={() => setIsSidebarOpen(false)}
                    />
                    <div className="fixed inset-y-0 left-0 z-50 w-72 h-full bg-[#18202e] shadow-2xl animate-in slide-in-from-left duration-200">
                      <Sidebar
                        folders={folders}
                        tags={tags}
                        noteCountsByFolder={noteCountsByFolder}
                        noteCountsByTag={noteCountsByTag}
                        totalNotesCount={activeNotesCount}
                        starredCount={starredNotesCount}
                        trashCount={trashNotesCount}
                        notes={notes}
                        selectedNoteId={selectedNoteId}
                        onSelectNote={(id) => {
                          setSelectedNoteId(id);
                          setIsSidebarOpen(false);
                        }}
                        onDeleteNote={requestDeleteNote}
                        selectedFolderId={selectedFolderId}
                        selectedTagId={selectedTagId}
                        selectedSpecialView={selectedSpecialView}
                        onSelectFolder={(id) => {
                          setSelectedFolderId(id);
                          setSelectedSpecialView(null);
                          setSelectedTagId(null);
                          const folderNotes = notes.filter((n) => n.folder_id === id && !n.is_deleted);
                          if (folderNotes.length > 0) {
                            if (!selectedNoteId || !folderNotes.some((n) => n.id === selectedNoteId)) {
                              setSelectedNoteId(folderNotes[0].id);
                            }
                          } else {
                            setSelectedNoteId(null);
                          }
                          setIsSidebarOpen(false);
                        }}
                        onSelectTag={(tagTitle) => {
                          setSelectedTagId(tagTitle);
                          setSelectedSpecialView(null);
                          setSelectedFolderId(null);
                          setIsSidebarOpen(false);
                        }}
                        onSelectSpecialView={(view) => {
                          setSelectedSpecialView(view);
                          setSelectedTagId(null);
                          setIsSidebarOpen(false);
                        }}
                        onCreateFolder={(parentId) => {
                          setFolderToEdit(undefined);
                          setFolderParentId(parentId || '');
                          setIsNewFolderOpen(true);
                        }}
                        onRenameFolder={(folder) => {
                          setFolderToEdit(folder);
                          setIsNewFolderOpen(true);
                        }}
                        onDeleteFolder={requestDeleteFolder}
                        onCreateTag={() => setIsNewTagOpen(true)}
                        onDeleteTag={requestDeleteTag}
                        onOpenSettings={() => {
                          setSettingsInitialTab('general');
                          setIsSettingsOpen(true);
                        }}
                        onSync={handleSync}
                        isSyncing={isSyncing}
                        lastSyncTime={settings.sync.last_sync_time}
                        isE2EEEnabled={settings.e2ee.enabled}
                        isVaultUnlocked={vaultUnlocked}
                        onToggleVaultLock={handleToggleVaultLock}
                        onEmptyTrash={requestEmptyTrash}
                        onMoveFolder={handleMoveFolder}
                        onMoveNoteToFolder={handleMoveNoteToFolder}
                        onOpenExportFolderModal={(folder) => setExportFolderModalTarget(folder)}
                        language={settings.language}
                      />
                    </div>
                  </>
                )}

                {/* Column 2 on Tablet: Note List */}
                {isNoteListOpen && (
                  <div className="w-72 md:w-80 shrink-0 h-full border-r border-slate-700/80">
                    <NoteList
                      notes={filteredNotes}
                      selectedNoteId={selectedNoteId}
                      onSelectNote={(id) => setSelectedNoteId(id)}
                      onToggleTodo={handleToggleTodo}
                      onToggleStar={handleToggleStar}
                      onTogglePin={handleTogglePin}
                      onDuplicateNote={handleDuplicateNote}
                      onDeleteNote={requestDeleteNote}
                      sortField={sortField}
                      sortOrder={sortOrder}
                      onSortChange={(field, order) => {
                        setSortField(field);
                        setSortOrder(order);
                      }}
                      filter={filter}
                      onFilterChange={setFilter}
                      searchQuery={searchQuery}
                      onSearchChange={setSearchQuery}
                      folderTitle={currentFolderTitle}
                      selectedFolderId={selectedFolderId}
                      onMoveNoteToFolder={handleMoveNoteToFolder}
                      tagTitle={selectedTagId || undefined}
                      isTrashView={selectedSpecialView === 'trash'}
                      onRestoreNote={handleRestoreNote}
                      onPermanentDeleteNote={requestPermanentDeleteNote}
                      dateFormat={settings.date_format}
                      timeFormat={settings.time_format}
                      language={settings.language}
                      theme={settings.theme}
                      onBackToSidebar={() => setIsSidebarOpen(true)}
                      onOpenExportNoteModal={(note) => setExportNoteModalTarget(note)}
                    />
                  </div>
                )}

                {/* Column 3 on Tablet: Note Editor */}
                <div className="flex-1 h-full min-w-0">
                  {activeNote ? (
                    <NoteEditor
                      note={activeNote}
                      folders={folders}
                      availableTags={tags.map((t) => t.title)}
                      allNotes={notes}
                      settingsEditorMode={editorMode}
                      markdownViewMode={markdownViewMode}
                      isVaultUnlocked={vaultUnlocked}
                      onUpdateNote={handleUpdateNote}
                      onMarkdownViewModeChange={(v) => {
                        setMarkdownViewMode(v);
                        handleSaveSettings({ markdown_view_mode: v });
                      }}
                      onOpenPublish={() => setIsPublishOpen(true)}
                      onOpenInfo={() => setIsNoteInfoOpen(true)}
                      onToggleEncrypt={handleToggleEncryptNote}
                      onRequestUnlock={() => setIsUnlockVaultOpen(true)}
                      onOpenWikiLink={handleOpenWikiLink}
                      onOpenTemplates={() => setIsTemplatesOpen(true)}
                      onOpenGraphView={() => setIsGraphViewOpen(true)}
                      onOpenRevisionHistory={() => setIsRevisionHistoryOpen(true)}
                      onOpenVoiceRecorder={() => setIsAudioRecordOpen(true)}
                      onOpenDrawingCanvas={() => setIsDrawingModalOpen(true)}
                      onExportPdf={handleExportPdf}
                      onExportMarkdown={handleExportMarkdown}
                      onOpenExportModal={() => setExportNoteModalTarget(activeNote)}
                      language={settings.language}
                      theme={settings.theme}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full bg-[#1b2434] text-slate-500">
                      <span className="text-sm">
                        {settings.language === 'id' ? 'Tidak ada catatan dipilih' : 'No note selected'}
                      </span>
                      <button
                        onClick={() => handleCreateNote(false)}
                        className="mt-3 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition"
                      >
                        {settings.language === 'id' ? 'Buat Catatan Baru' : 'Create a Note'}
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Desktop Mode: Standard 3 columns side-by-side */
              <>
                {/* Column 1: Sidebar (Notebooks, Tags, Views) */}
                {isSidebarOpen && (
                  <div className="w-56 lg:w-64 shrink-0 h-full">
                    <Sidebar
                      folders={folders}
                      tags={tags}
                      noteCountsByFolder={noteCountsByFolder}
                      noteCountsByTag={noteCountsByTag}
                      totalNotesCount={activeNotesCount}
                      starredCount={starredNotesCount}
                      trashCount={trashNotesCount}
                      notes={notes}
                      selectedNoteId={selectedNoteId}
                      onSelectNote={(id) => setSelectedNoteId(id)}
                      onDeleteNote={requestDeleteNote}
                      selectedFolderId={selectedFolderId}
                      selectedTagId={selectedTagId}
                      selectedSpecialView={selectedSpecialView}
                      onSelectFolder={(id) => {
                        setSelectedFolderId(id);
                        setSelectedSpecialView(null);
                        setSelectedTagId(null);
                        const folderNotes = notes.filter((n) => n.folder_id === id && !n.is_deleted);
                        if (folderNotes.length > 0) {
                          if (!selectedNoteId || !folderNotes.some((n) => n.id === selectedNoteId)) {
                            setSelectedNoteId(folderNotes[0].id);
                          }
                        } else {
                          setSelectedNoteId(null);
                        }
                      }}
                      onSelectTag={(tagTitle) => {
                        setSelectedTagId(tagTitle);
                        setSelectedSpecialView(null);
                        setSelectedFolderId(null);
                      }}
                      onSelectSpecialView={(view) => {
                        setSelectedSpecialView(view);
                        setSelectedTagId(null);
                      }}
                      onCreateFolder={(parentId) => {
                        setFolderToEdit(undefined);
                        setFolderParentId(parentId || '');
                        setIsNewFolderOpen(true);
                      }}
                      onRenameFolder={(folder) => {
                        setFolderToEdit(folder);
                        setIsNewFolderOpen(true);
                      }}
                      onDeleteFolder={requestDeleteFolder}
                      onCreateTag={() => setIsNewTagOpen(true)}
                      onDeleteTag={requestDeleteTag}
                      onOpenSettings={() => {
                        setSettingsInitialTab('general');
                        setIsSettingsOpen(true);
                      }}
                      onSync={handleSync}
                      isSyncing={isSyncing}
                      lastSyncTime={settings.sync.last_sync_time}
                      isE2EEEnabled={settings.e2ee.enabled}
                      isVaultUnlocked={vaultUnlocked}
                      onToggleVaultLock={handleToggleVaultLock}
                      onEmptyTrash={requestEmptyTrash}
                      onMoveFolder={handleMoveFolder}
                      onMoveNoteToFolder={handleMoveNoteToFolder}
                      onOpenGraphView={() => setIsGraphViewOpen(true)}
                      onOpenExportFolderModal={(folder) => setExportFolderModalTarget(folder)}
                      language={settings.language}
                    />
                  </div>
                )}

                {/* Column 2: Note List */}
                {isNoteListOpen && (
                  <div className="w-72 lg:w-80 shrink-0 h-full">
                    <NoteList
                      notes={filteredNotes}
                      selectedNoteId={selectedNoteId}
                      onSelectNote={(id) => setSelectedNoteId(id)}
                      onToggleTodo={handleToggleTodo}
                      onToggleStar={handleToggleStar}
                      onTogglePin={handleTogglePin}
                      onDuplicateNote={handleDuplicateNote}
                      onDeleteNote={requestDeleteNote}
                      sortField={sortField}
                      sortOrder={sortOrder}
                      onSortChange={(field, order) => {
                        setSortField(field);
                        setSortOrder(order);
                      }}
                      filter={filter}
                      onFilterChange={setFilter}
                      searchQuery={searchQuery}
                      onSearchChange={setSearchQuery}
                      folderTitle={currentFolderTitle}
                      selectedFolderId={selectedFolderId}
                      onMoveNoteToFolder={handleMoveNoteToFolder}
                      tagTitle={selectedTagId || undefined}
                      isTrashView={selectedSpecialView === 'trash'}
                      onRestoreNote={handleRestoreNote}
                      onPermanentDeleteNote={requestPermanentDeleteNote}
                      dateFormat={settings.date_format}
                      timeFormat={settings.time_format}
                      language={settings.language}
                      theme={settings.theme}
                      onOpenExportNoteModal={(note) => setExportNoteModalTarget(note)}
                    />
                  </div>
                )}

                {/* Column 3: Note Editor */}
                <div className="flex-1 h-full min-w-0">
                  {activeNote ? (
                    <NoteEditor
                      note={activeNote}
                      folders={folders}
                      availableTags={tags.map((t) => t.title)}
                      allNotes={notes}
                      settingsEditorMode={editorMode}
                      markdownViewMode={markdownViewMode}
                      isVaultUnlocked={vaultUnlocked}
                      onUpdateNote={handleUpdateNote}
                      onMarkdownViewModeChange={(v) => {
                        setMarkdownViewMode(v);
                        handleSaveSettings({ markdown_view_mode: v });
                      }}
                      onOpenPublish={() => setIsPublishOpen(true)}
                      onOpenInfo={() => setIsNoteInfoOpen(true)}
                      onToggleEncrypt={handleToggleEncryptNote}
                      onRequestUnlock={() => setIsUnlockVaultOpen(true)}
                      onOpenWikiLink={handleOpenWikiLink}
                      onOpenTemplates={() => setIsTemplatesOpen(true)}
                      onOpenGraphView={() => setIsGraphViewOpen(true)}
                      onOpenRevisionHistory={() => setIsRevisionHistoryOpen(true)}
                      onOpenVoiceRecorder={() => setIsAudioRecordOpen(true)}
                      onOpenDrawingCanvas={() => setIsDrawingModalOpen(true)}
                      onExportPdf={handleExportPdf}
                      onExportMarkdown={handleExportMarkdown}
                      onOpenExportModal={() => setExportNoteModalTarget(activeNote)}
                      language={settings.language}
                      theme={settings.theme}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full bg-[#1b2434] text-slate-500">
                      <span className="text-sm">
                        {settings.language === 'id' ? 'Tidak ada catatan dipilih' : 'No note selected'}
                      </span>
                      <button
                        onClick={() => handleCreateNote(false)}
                        className="mt-3 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition"
                      >
                        {settings.language === 'id' ? 'Buat Catatan Baru' : 'Create a Note'}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Mobile Bottom Navigation Bar (Phone only) */}
      {isMobile && (
        <MobileBottomNav
          activeView={mobileActiveView}
          onSelectView={(view) => {
            if (view === 'editor' && !activeNote && filteredNotes.length > 0) {
              setSelectedNoteId(filteredNotes[0].id);
            }
            setMobileActiveView(view);
          }}
          notesCount={filteredNotes.length}
          onOpenSettings={() => {
            setSettingsInitialTab('general');
            setIsSettingsOpen(true);
          }}
          language={settings.language}
        />
      )}

      {/* Bottom Status Bar (Desktop/Tablet only) */}
      {!isMobile && (
        <StatusBar
          note={activeNote}
          isSyncing={isSyncing}
          syncMessage={syncMessage}
          isVaultUnlocked={vaultUnlocked}
          isE2EEEnabled={settings.e2ee.enabled}
          language={settings.language}
        />
      )}

      {/* Modals */}
      {isSettingsOpen && (
        <SettingsModal
          initialTab={settingsInitialTab}
          settings={settings}
          isVaultUnlocked={vaultUnlocked}
          onSaveSettings={handleSaveSettings}
          onExportData={handleExportData}
          onImportData={handleImportData}
          onOpenGASHelp={() => {
            setIsSettingsOpen(false);
            setIsGASHelpOpen(true);
          }}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {isPublishOpen && activeNote && (
        <PublishModal
          note={activeNote}
          gasConfig={settings.gas}
          onUpdateNote={handleUpdateNote}
          onUpdateGASConfig={(cfg) => handleSaveSettings({ gas: { ...settings.gas, ...cfg } })}
          onOpenGASHelp={() => setIsGASHelpOpen(true)}
          onClose={() => setIsPublishOpen(false)}
          language={settings.language}
          theme={settings.theme}
        />
      )}

      {isNewFolderOpen && (
        <NewFolderModal
          parentId={folderParentId}
          existingFolder={folderToEdit}
          folders={folders}
          onSave={handleSaveFolder}
          onClose={() => setIsNewFolderOpen(false)}
          language={settings.language}
        />
      )}

      {isNoteInfoOpen && activeNote && (
        <NoteInfoModal
          note={activeNote}
          folder={folders.find((f) => f.id === activeNote.folder_id)}
          allNotes={notes}
          onSelectNote={(targetId) => {
            setSelectedNoteId(targetId);
            if (isMobile) setMobileActiveView('editor');
          }}
          onClose={() => setIsNoteInfoOpen(false)}
          dateFormat={settings.date_format}
          timeFormat={settings.time_format}
          language={settings.language}
        />
      )}

      {isUnlockVaultOpen && (
        <UnlockVaultModal
          e2eeConfig={settings.e2ee}
          onSuccess={() => setVaultUnlocked(true)}
          onClose={() => setIsUnlockVaultOpen(false)}
          language={settings.language}
        />
      )}

      {isGASHelpOpen && (
        <GASSetupHelpModal
          onClose={() => setIsGASHelpOpen(false)}
          language={settings.language}
          theme={settings.theme}
        />
      )}

      {/* Reusable Action / Deletion Confirmation Modal */}
      <ConfirmDialogModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        subMessage={confirmState.subMessage}
        confirmLabel={confirmState.confirmLabel}
        cancelLabel={confirmState.cancelLabel}
        isDanger={confirmState.isDanger}
        language={settings.language}
        onConfirm={confirmState.onConfirm}
        onClose={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* In-app Tag Creation Modal */}
      <NewTagModal
        isOpen={isNewTagOpen}
        existingTags={tags.map((t) => t.title)}
        onSave={handleSaveNewTag}
        onClose={() => setIsNewTagOpen(false)}
        language={settings.language}
      />

      {/* Markdown Cheatsheet & Guide Modal */}
      <MarkdownCheatSheetModal
        isOpen={isCheatSheetOpen}
        onClose={() => setIsCheatSheetOpen(false)}
        onInsertSnippet={(snippet) => {
          if (activeNote) {
            handleUpdateNote({
              body: activeNote.body + '\n\n' + snippet,
              updated_time: Date.now(),
            });
          }
        }}
        language={settings.language}
        mathOnly={isCheatSheetMathOnly}
      />

      {/* Universal Command Palette Modal (Ctrl+K) */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        notes={notes}
        folders={folders}
        activeNote={activeNote}
        onSelectNote={(noteId) => {
          setSelectedNoteId(noteId);
          if (isMobile) setMobileActiveView('editor');
          setIsCommandPaletteOpen(false);
        }}
        onNewNote={() => {
          setIsCommandPaletteOpen(false);
          handleCreateNote(false);
        }}
        onNewTodo={() => {
          setIsCommandPaletteOpen(false);
          handleCreateNote(true);
        }}
        onOpenDailyNote={() => {
          setIsCommandPaletteOpen(false);
          handleOpenDailyNote();
        }}
        onOpenGraphView={() => {
          setIsCommandPaletteOpen(false);
          setIsGraphViewOpen(true);
        }}
        onOpenTemplates={() => {
          setIsCommandPaletteOpen(false);
          setIsTemplatesOpen(true);
        }}
        onExportPdf={() => {
          setIsCommandPaletteOpen(false);
          handleExportPdf();
        }}
        onExportMarkdown={() => {
          setIsCommandPaletteOpen(false);
          handleExportMarkdown();
        }}
        onOpenVoiceRecorder={() => {
          setIsCommandPaletteOpen(false);
          setIsAudioRecordOpen(true);
        }}
        onOpenDrawingCanvas={() => {
          setIsCommandPaletteOpen(false);
          setIsDrawingModalOpen(true);
        }}
        onOpenRevisionHistory={() => {
          setIsCommandPaletteOpen(false);
          setIsRevisionHistoryOpen(true);
        }}
        onToggleVaultLock={() => {
          setIsCommandPaletteOpen(false);
          handleToggleVaultLock();
        }}
        onSync={() => {
          setIsCommandPaletteOpen(false);
          handleSync();
        }}
        onToggleTheme={() => {
          const themes: AppSettings['theme'][] = [
            'qalam-dark',
            'qalam-nord',
            'qalam-light',
          ];
          const currIdx = themes.indexOf(settings.theme);
          const nextTheme = themes[(currIdx + 1) % themes.length];
          handleSaveSettings({ theme: nextTheme });
          setIsCommandPaletteOpen(false);
        }}
        onToggleReadingMode={() => {
          setMobileReadingMode((prev) => !prev);
          setIsCommandPaletteOpen(false);
        }}
        onOpenSettings={() => {
          setIsCommandPaletteOpen(false);
          setSettingsInitialTab('general');
          setIsSettingsOpen(true);
        }}
        language={settings.language}
      />

      {/* 2D Knowledge Graph View Modal */}
      <GraphViewModal
        isOpen={isGraphViewOpen}
        onClose={() => setIsGraphViewOpen(false)}
        notes={notes}
        folders={folders}
        activeNoteId={selectedNoteId}
        onSelectNote={(noteId) => {
          setSelectedNoteId(noteId);
          if (isMobile) setMobileActiveView('editor');
          setIsGraphViewOpen(false);
        }}
        language={settings.language}
        theme={settings.theme}
      />

      {/* Note Templates Gallery Modal */}
      <TemplatesModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        onApplyTemplate={handleApplyTemplate}
        language={settings.language}
        theme={settings.theme}
      />

      {/* Note Version / Revision History Time Machine Modal */}
      {activeNote && (
        <RevisionHistoryModal
          isOpen={isRevisionHistoryOpen}
          onClose={() => setIsRevisionHistoryOpen(false)}
          note={activeNote}
          onRestoreRevision={handleRestoreRevision}
          language={settings.language}
        />
      )}

      {/* Voice Memo Audio Recorder Modal */}
      <AudioRecordModal
        isOpen={isAudioRecordOpen}
        onClose={() => setIsAudioRecordOpen(false)}
        onInsertAudio={handleInsertAudioMemo}
        language={settings.language}
      />

      {/* Freehand Drawing & Handwriting Canvas Modal */}
      <DrawingModal
        isOpen={isDrawingModalOpen}
        onClose={() => setIsDrawingModalOpen(false)}
        onInsertDrawing={handleInsertDrawing}
        language={settings.language}
        theme={settings.theme}
      />

      {/* Export Note Modal (Direct PDF, Word DOCX, Markdown, HTML, Print) */}
      <ExportNoteModal
        isOpen={!!exportNoteModalTarget}
        onClose={() => setExportNoteModalTarget(null)}
        note={exportNoteModalTarget}
        folderTitle={folders.find((f) => f.id === exportNoteModalTarget?.folder_id)?.title || 'Qalam Note'}
        language={settings.language}
        theme={settings.theme}
        onExportPdfDirect={(note: Note) => {
          const folder = folders.find((f) => f.id === note.folder_id);
          return exportNoteToPdfDirect(note, folder?.title || 'Qalam Note');
        }}
        onExportDocx={(note: Note) => {
          const folder = folders.find((f) => f.id === note.folder_id);
          return exportNoteToDocx(note, folder?.title || 'Qalam Note');
        }}
        onExportMarkdown={(note: Note) => exportNoteToMarkdown(note)}
        onExportHtml={(note: Note) => {
          const folder = folders.find((f) => f.id === note.folder_id);
          exportNoteToHtml(note, folder?.title || 'Qalam Note');
        }}
        onExportPrint={(note: Note) => {
          const folder = folders.find((f) => f.id === note.folder_id);
          exportNoteToPrint(note, folder?.title || 'Qalam Note');
        }}
      />

      {/* Export Folder Modal (Joplin style ZIP archive export: all, docx, markdown, html, pdf) */}
      <ExportFolderModal
        isOpen={!!exportFolderModalTarget}
        onClose={() => setExportFolderModalTarget(null)}
        folder={exportFolderModalTarget}
        notes={notes.filter((n) => n.folder_id === exportFolderModalTarget?.id && !n.is_deleted)}
        language={settings.language}
        theme={settings.theme}
        onExportZip={(format: 'all' | 'markdown' | 'docx' | 'html' | 'pdf') => {
          if (!exportFolderModalTarget) return;
          const folderNotes = notes.filter(
            (n) => n.folder_id === exportFolderModalTarget.id && !n.is_deleted
          );
          return exportFolderToZip(exportFolderModalTarget.title, folderNotes, format);
        }}
      />

      {/* Real-time PWA Offline State Indicator */}
      <OfflineIndicator language={settings.language} />
    </div>
  );
}
