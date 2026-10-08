import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  FileText,
  CheckSquare,
  Calendar,
  Share2,
  Lock,
  RefreshCw,
  Settings,
  Download,
  Printer,
  Mic,
  PenTool,
  History,
  Eye,
  SunMoon,
  Sparkles,
  ArrowRight,
  X,
  Hash,
} from 'lucide-react';
import type { Note, Folder, AppLanguage } from '../../types';

export interface CommandAction {
  id: string;
  title: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  folders: Folder[];
  activeNote: Note | null;
  onSelectNote: (noteId: string) => void;
  onNewNote: () => void;
  onNewTodo: () => void;
  onOpenDailyNote: () => void;
  onOpenGraphView: () => void;
  onOpenTemplates: () => void;
  onExportPdf: () => void;
  onExportMarkdown: () => void;
  onOpenVoiceRecorder: () => void;
  onOpenDrawingCanvas: () => void;
  onOpenRevisionHistory: () => void;
  onToggleVaultLock: () => void;
  onSync: () => void;
  onToggleTheme: () => void;
  onToggleReadingMode: () => void;
  onOpenSettings: () => void;
  language?: AppLanguage;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  notes,
  folders,
  activeNote,
  onSelectNote,
  onNewNote,
  onNewTodo,
  onOpenDailyNote,
  onOpenGraphView,
  onOpenTemplates,
  onExportPdf,
  onExportMarkdown,
  onOpenVoiceRecorder,
  onOpenDrawingCanvas,
  onOpenRevisionHistory,
  onToggleVaultLock,
  onSync,
  onToggleTheme,
  onToggleReadingMode,
  onOpenSettings,
  language = 'id',
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const isId = language === 'id';

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const actions: CommandAction[] = useMemo(() => [
    {
      id: 'daily_note',
      title: isId ? 'Buka / Buat Catatan Harian Hari Ini' : "Open / Create Today's Daily Note",
      category: isId ? 'Aksi Cepat' : 'Quick Actions',
      icon: Calendar,
      shortcut: 'Alt+D',
      action: () => { onClose(); onOpenDailyNote(); },
    },
    {
      id: 'new_note',
      title: isId ? 'Buat Catatan Baru' : 'Create New Note',
      category: isId ? 'Aksi Cepat' : 'Quick Actions',
      icon: FileText,
      shortcut: 'Ctrl+N',
      action: () => { onClose(); onNewNote(); },
    },
    {
      id: 'new_todo',
      title: isId ? 'Buat Tugas To-Do Baru' : 'Create New To-Do',
      category: isId ? 'Aksi Cepat' : 'Quick Actions',
      icon: CheckSquare,
      shortcut: 'Ctrl+T',
      action: () => { onClose(); onNewTodo(); },
    },
    {
      id: 'graph_view',
      title: isId ? 'Buka Grafik Pengetahuan (Knowledge Graph)' : 'Open Knowledge Graph View',
      category: isId ? 'Navigasi & Visual' : 'Navigation & Views',
      icon: Share2,
      shortcut: 'Ctrl+G',
      action: () => { onClose(); onOpenGraphView(); },
    },
    {
      id: 'insert_template',
      title: isId ? 'Sisipkan Templat Catatan' : 'Insert Note Template',
      category: isId ? 'Editor' : 'Editor',
      icon: Sparkles,
      action: () => { onClose(); onOpenTemplates(); },
    },
    {
      id: 'export_pdf',
      title: isId ? 'Cetak / Ekspor Catatan Aktif ke PDF' : 'Print / Export Active Note to PDF',
      category: isId ? 'Ekspor' : 'Export',
      icon: Printer,
      action: () => { onClose(); onExportPdf(); },
    },
    {
      id: 'export_md',
      title: isId ? 'Unduh Catatan sebagai Berkas Markdown (.md)' : 'Download Note as Markdown (.md)',
      category: isId ? 'Ekspor' : 'Export',
      icon: Download,
      action: () => { onClose(); onExportMarkdown(); },
    },
    {
      id: 'voice_memo',
      title: isId ? 'Rekam Memo Suara (Voice Memo)' : 'Record Voice Memo',
      category: isId ? 'Multimedia' : 'Multimedia',
      icon: Mic,
      action: () => { onClose(); onOpenVoiceRecorder(); },
    },
    {
      id: 'drawing_canvas',
      title: isId ? 'Buka Kanvas Coretan / Sketsa Tangan' : 'Open Sketch / Drawing Canvas',
      category: isId ? 'Multimedia' : 'Multimedia',
      icon: PenTool,
      action: () => { onClose(); onOpenDrawingCanvas(); },
    },
    {
      id: 'revision_history',
      title: isId ? 'Lihat Riwayat Versi Catatan (Time Machine)' : 'View Note Revision History',
      category: isId ? 'Riwayat' : 'History',
      icon: History,
      action: () => { onClose(); onOpenRevisionHistory(); },
    },
    {
      id: 'toggle_reading',
      title: isId ? 'Beralih Mode Baca / Edit (Reading Mode)' : 'Toggle Reading / Edit Mode',
      category: isId ? 'Tampilan' : 'View',
      icon: Eye,
      shortcut: 'Ctrl+E',
      action: () => { onClose(); onToggleReadingMode(); },
    },
    {
      id: 'toggle_theme',
      title: isId ? 'Ganti Tema Tampilan (Terang / Gelap / Nord)' : 'Toggle Theme (Light / Dark / Nord)',
      category: isId ? 'Tampilan' : 'View',
      icon: SunMoon,
      action: () => { onClose(); onToggleTheme(); },
    },
    {
      id: 'sync_now',
      title: isId ? 'Sinkronkan Sekarang (WebDAV / Dropbox)' : 'Sync Now (WebDAV / Dropbox)',
      category: isId ? 'Sinkronisasi' : 'Sync',
      icon: RefreshCw,
      action: () => { onClose(); onSync(); },
    },
    {
      id: 'vault_lock',
      title: isId ? 'Kunci / Buka Brankas Terenkripsi (E2EE)' : 'Lock / Unlock E2EE Vault',
      category: isId ? 'Keamanan' : 'Security',
      icon: Lock,
      action: () => { onClose(); onToggleVaultLock(); },
    },
    {
      id: 'settings',
      title: isId ? 'Buka Setelan Aplikasi' : 'Open Application Settings',
      category: isId ? 'Pengaturan' : 'Settings',
      icon: Settings,
      shortcut: 'Ctrl+,',
      action: () => { onClose(); onOpenSettings(); },
    },
  ], [isId, onClose, onNewNote, onNewTodo, onOpenDailyNote, onOpenGraphView, onOpenTemplates, onExportPdf, onExportMarkdown, onOpenVoiceRecorder, onOpenDrawingCanvas, onOpenRevisionHistory, onToggleReadingMode, onToggleTheme, onSync, onToggleVaultLock, onOpenSettings]);

  // Filter actions and notes based on search query
  const filteredActions = useMemo(() => {
    if (!query.trim()) return actions;
    const q = query.toLowerCase();
    return actions.filter(
      (a) => a.title.toLowerCase().includes(q) || a.category.toLowerCase().includes(q)
    );
  }, [actions, query]);

  const filteredNotes = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return notes
      .filter((n) => !n.is_deleted)
      .filter(
        (n) =>
          (n.title && n.title.toLowerCase().includes(q)) ||
          (n.body && n.body.toLowerCase().includes(q)) ||
          (n.tags && n.tags.some((t) => t.toLowerCase().includes(q)))
      )
      .slice(0, 10);
  }, [notes, query]);

  // Combined selectable items
  const allSelectableItems = useMemo(() => {
    const list: Array<{ type: 'action' | 'note'; data: any }> = [];
    filteredActions.forEach((a) => list.push({ type: 'action', data: a }));
    filteredNotes.forEach((n) => list.push({ type: 'note', data: n }));
    return list;
  }, [filteredActions, filteredNotes]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, allSelectableItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allSelectableItems.length) % Math.max(1, allSelectableItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = allSelectableItems[selectedIndex];
      if (selected) {
        if (selected.type === 'action') {
          (selected.data as CommandAction).action();
        } else {
          onSelectNote((selected.data as Note).id);
          onClose();
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center pt-10 sm:pt-20 px-3 sm:px-4 bg-black/70 backdrop-blur-xs select-none animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-2xl bg-[#1e2739] border border-slate-700 shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[80vh] animate-in zoom-in-95 duration-150"
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-700/80 bg-[#161d2b]">
          <Search className="w-5 h-5 text-blue-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              isId
                ? 'Ketik perintah atau cari catatan... (misal: "harian", "pdf", "brankas")'
                : 'Type a command or search notes... (e.g. "daily", "pdf", "vault")'
            }
            className="flex-1 bg-transparent text-sm sm:text-base text-white placeholder:text-slate-500 outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4 custom-scrollbar">
          {/* Notes Section (if search matches notes) */}
          {filteredNotes.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {isId ? 'Catatan Terkait' : 'Matching Notes'} ({filteredNotes.length})
              </div>
              <div className="space-y-0.5 mt-1">
                {filteredNotes.map((note) => {
                  const globalIdx = filteredActions.length + filteredNotes.indexOf(note);
                  const isSelected = selectedIndex === globalIdx;
                  const folder = folders.find((f) => f.id === note.folder_id);

                  return (
                    <button
                      key={note.id}
                      onClick={() => {
                        onSelectNote(note.id);
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition ${
                        isSelected ? 'bg-blue-600 text-white' : 'text-slate-200 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {note.is_todo ? (
                          <CheckSquare className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-amber-400'}`} />
                        ) : (
                          <FileText className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-blue-400'}`} />
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-medium truncate">
                            {note.title || (isId ? 'Catatan Tanpa Judul' : 'Untitled Note')}
                          </div>
                          <div className={`text-[10px] truncate ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                            {folder ? `📁 ${folder.title}` : ''}
                            {note.tags && note.tags.length > 0 ? ` • #${note.tags[0]}` : ''}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className={`w-3.5 h-3.5 shrink-0 opacity-0 transition-opacity ${isSelected ? 'opacity-100' : ''}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Actions Section */}
          {filteredActions.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {isId ? 'Aksi & Perintah Cepat' : 'Actions & Commands'} ({filteredActions.length})
              </div>
              <div className="space-y-0.5 mt-1">
                {filteredActions.map((action, idx) => {
                  const isSelected = selectedIndex === idx;
                  const Icon = action.icon;

                  return (
                    <button
                      key={action.id}
                      onClick={action.action}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition ${
                        isSelected ? 'bg-blue-600 text-white' : 'text-slate-200 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                        <span className="text-xs font-medium truncate">{action.title}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {action.shortcut && (
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                              isSelected
                                ? 'bg-blue-700/60 text-blue-100 border-blue-400/40'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {action.shortcut}
                          </span>
                        )}
                        <ArrowRight className={`w-3.5 h-3.5 opacity-0 transition-opacity ${isSelected ? 'opacity-100' : ''}`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {allSelectableItems.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs">
              {isId ? 'Tidak ada perintah atau catatan yang cocok.' : 'No commands or notes found.'}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-slate-700/60 bg-[#161d2b] flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <div className="flex items-center gap-3">
            <span>↑↓ <span className="text-slate-500">{isId ? 'Navigasi' : 'Navigate'}</span></span>
            <span>↵ <span className="text-slate-500">{isId ? 'Jalankan' : 'Select'}</span></span>
            <span>ESC <span className="text-slate-500">{isId ? 'Tutup' : 'Close'}</span></span>
          </div>
          <span className="text-[10px] text-blue-400 font-medium">Qalam Command Palette</span>
        </div>
      </div>
    </div>
  );
};
