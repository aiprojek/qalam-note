import React, { useState } from 'react';
import {
  FileText,
  Star,
  Pin,
  Copy,
  FolderInput,
  Trash2,
  RotateCcw,
  Download,
  Columns2,
  CheckCircle2,
  Circle,
  ExternalLink,
  ChevronRight,
  Folder,
} from 'lucide-react';
import { useContextMenuPosition } from './useContextMenuPosition';
import type { Note, Folder as FolderType, AppLanguage } from '../../types';

export interface NoteContextMenuProps {
  note: Note;
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onSelectNote: (id: string) => void;
  onToggleStar: (id: string, current: boolean) => void;
  onTogglePin: (id: string, current: boolean) => void;
  onToggleTodo?: (id: string, completed: number) => void;
  onDuplicateNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
  onRestoreNote?: (id: string) => void;
  onPermanentDeleteNote?: (id: string) => void;
  onOpenInSplitScreen?: (id: string) => void;
  onOpenExportNoteModal?: (note: Note) => void;
  onCopyNoteMarkdown?: (note: Note) => void;
  onMoveNoteToFolder?: (noteId: string, folderId: string) => void;
  folders?: FolderType[];
  isTrashView?: boolean;
  language?: AppLanguage;
  theme?: string;
}

export const NoteContextMenu: React.FC<NoteContextMenuProps> = ({
  note,
  isOpen,
  position,
  onClose,
  onSelectNote,
  onToggleStar,
  onTogglePin,
  onToggleTodo,
  onDuplicateNote,
  onDeleteNote,
  onRestoreNote,
  onPermanentDeleteNote,
  onOpenInSplitScreen,
  onOpenExportNoteModal,
  onCopyNoteMarkdown,
  onMoveNoteToFolder,
  folders = [],
  isTrashView = false,
  language = 'id',
  theme,
}) => {
  const { menuRef, coords } = useContextMenuPosition({
    isOpen,
    position,
    onClose,
    menuWidth: 240,
    menuHeight: 380,
  });

  const [showFolderSubmenu, setShowFolderSubmenu] = useState(false);

  if (!isOpen) return null;

  const isLight = theme === 'qalam-light';
  const isId = language === 'id';

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      role="menu"
      style={{
        position: 'fixed',
        left: `${coords.left}px`,
        top: `${coords.top}px`,
        maxHeight: coords.maxHeight ? `${coords.maxHeight}px` : '85vh',
        zIndex: 9999,
      }}
      className={`w-60 rounded-xl shadow-2xl border text-xs overflow-y-auto custom-scrollbar select-none py-1.5 animate-in fade-in zoom-in-95 duration-100 ${
        isLight
          ? 'bg-white/95 backdrop-blur-md border-slate-200 text-slate-800 shadow-slate-900/15'
          : 'bg-[#1b2434]/95 backdrop-blur-md border-slate-700/80 text-slate-200 shadow-black/40'
      }`}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Note preview header */}
      <div
        className={`px-3 py-1.5 mb-1 border-b flex items-center gap-2 ${
          isLight ? 'bg-slate-50 text-slate-700 border-slate-100' : 'bg-slate-800/40 text-slate-300 border-slate-800'
        }`}
      >
        <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        <span className="font-semibold truncate text-[11px]">{note.title || (isId ? 'Catatan Tanpa Judul' : 'Untitled Note')}</span>
      </div>

      <div className="px-1 space-y-0.5">
        {/* Open Note */}
        <button
          type="button"
          onClick={() => handleAction(() => onSelectNote(note.id))}
          className={`w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2.5 transition ${
            isLight ? 'hover:bg-slate-100 hover:text-slate-900' : 'hover:bg-slate-800/80 hover:text-white'
          }`}
        >
          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          <span>{isId ? 'Buka Catatan' : 'Open Note'}</span>
        </button>

        {/* Open in Split Screen */}
        {!isTrashView && onOpenInSplitScreen && (
          <button
            type="button"
            onClick={() => handleAction(() => onOpenInSplitScreen(note.id))}
            className={`w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2.5 transition ${
              isLight ? 'hover:bg-slate-100 hover:text-slate-900' : 'hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <Columns2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>{isId ? 'Buka di Layar Belah' : 'Open in Split Screen'}</span>
          </button>
        )}

        {/* Toggle To-do Completion if it is a To-do */}
        {note.is_todo && onToggleTodo && !isTrashView && (
          <button
            type="button"
            onClick={() => handleAction(() => onToggleTodo(note.id, note.todo_completed))}
            className={`w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2.5 transition ${
              isLight ? 'hover:bg-slate-100 hover:text-slate-900' : 'hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            {note.todo_completed ? (
              <Circle className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>
              {note.todo_completed
                ? isId
                  ? 'Tandai Belum Selesai'
                  : 'Mark Incomplete'
                : isId
                ? 'Tandai Selesai'
                : 'Mark Complete'}
            </span>
          </button>
        )}
      </div>

      {!isTrashView ? (
        <>
          <div className={`my-1 border-t ${isLight ? 'border-slate-200' : 'border-slate-700/60'}`} />

          <div className="px-1 space-y-0.5">
            {/* Star / Unstar */}
            <button
              type="button"
              onClick={() => handleAction(() => onToggleStar(note.id, note.is_favorite))}
              className={`w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2.5 transition ${
                isLight ? 'hover:bg-slate-100 hover:text-slate-900' : 'hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <Star
                className={`w-3.5 h-3.5 ${
                  note.is_favorite ? 'text-amber-400 fill-amber-400' : 'text-amber-400'
                }`}
              />
              <span>
                {note.is_favorite
                  ? isId
                    ? 'Hapus dari Bintang'
                    : 'Remove Star'
                  : isId
                  ? 'Beri Bintang'
                  : 'Add Star'}
              </span>
            </button>

            {/* Pin / Unpin */}
            <button
              type="button"
              onClick={() => handleAction(() => onTogglePin(note.id, note.is_pinned))}
              className={`w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2.5 transition ${
                isLight ? 'hover:bg-slate-100 hover:text-slate-900' : 'hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <Pin
                className={`w-3.5 h-3.5 ${
                  note.is_pinned ? 'text-blue-400 fill-blue-400' : 'text-blue-400'
                }`}
              />
              <span>
                {note.is_pinned
                  ? isId
                    ? 'Lepas Sematan (Unpin)'
                    : 'Unpin Note'
                  : isId
                  ? 'Sematkan di Atas (Pin)'
                  : 'Pin to Top'}
              </span>
            </button>

            {/* Copy Note Markdown */}
            {onCopyNoteMarkdown && (
              <button
                type="button"
                onClick={() => handleAction(() => onCopyNoteMarkdown(note))}
                className={`w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2.5 transition font-medium ${
                  isLight
                    ? 'hover:bg-cyan-50 text-cyan-700 hover:text-cyan-800'
                    : 'hover:bg-cyan-950/40 text-cyan-300 hover:text-cyan-200'
                }`}
              >
                <Copy className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isId ? 'Salin Format Markdown (Sosmed)' : 'Copy Markdown (Social)'}</span>
              </button>
            )}

            {/* Duplicate */}
            <button
              type="button"
              onClick={() => handleAction(() => onDuplicateNote(note))}
              className={`w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2.5 transition ${
                isLight ? 'hover:bg-slate-100 hover:text-slate-900' : 'hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>{isId ? 'Duplikasi Catatan' : 'Duplicate Note'}</span>
            </button>
          </div>

          <div className={`my-1 border-t ${isLight ? 'border-slate-200' : 'border-slate-700/60'}`} />

          <div className="px-1 space-y-0.5">
            {/* Move to Folder Submenu */}
            {onMoveNoteToFolder && folders.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowFolderSubmenu((prev) => !prev)}
                  className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between transition ${
                    showFolderSubmenu
                      ? isLight
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-slate-800 text-blue-300'
                      : isLight
                      ? 'hover:bg-slate-100 hover:text-slate-900'
                      : 'hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <FolderInput className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isId ? 'Pindahkan ke Folder' : 'Move to Notebook'}</span>
                  </div>
                  <ChevronRight className={`w-3 h-3 text-slate-400 transition-transform ${showFolderSubmenu ? 'rotate-90' : ''}`} />
                </button>

                {showFolderSubmenu && (
                  <div
                    className={`mt-1 pl-3 pr-1 py-1 rounded-lg border max-h-40 overflow-y-auto custom-scrollbar space-y-0.5 ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/90 border-slate-800'
                    }`}
                  >
                    {folders.map((f) => {
                      const isCurrent = f.id === note.folder_id;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          disabled={isCurrent}
                          onClick={() => handleAction(() => onMoveNoteToFolder(note.id, f.id))}
                          className={`w-full px-2 py-1 rounded text-left flex items-center justify-between transition text-[11px] ${
                            isCurrent
                              ? 'opacity-40 cursor-default text-blue-400'
                              : isLight
                              ? 'hover:bg-blue-100/70 text-slate-700'
                              : 'hover:bg-slate-800 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <Folder className="w-3 h-3 text-blue-400 shrink-0" />
                            <span className="truncate">{f.title}</span>
                          </div>
                          {isCurrent && <span className="text-[9px] shrink-0 font-medium">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Export Note Modal */}
            {onOpenExportNoteModal && (
              <button
                type="button"
                onClick={() => handleAction(() => onOpenExportNoteModal(note))}
                className={`w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2.5 transition ${
                  isLight ? 'hover:bg-slate-100 hover:text-slate-900' : 'hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>{isId ? 'Ekspor Catatan...' : 'Export Note...'}</span>
              </button>
            )}
          </div>

          <div className={`my-1 border-t ${isLight ? 'border-slate-200' : 'border-slate-700/60'}`} />

          {/* Delete to Trash */}
          <div className="px-1">
            <button
              type="button"
              onClick={() => handleAction(() => onDeleteNote(note.id))}
              className={`w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2.5 transition ${
                isLight ? 'hover:bg-rose-50 text-rose-600' : 'hover:bg-rose-950/40 text-rose-400'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>{isId ? 'Pindahkan ke Sampah' : 'Move to Trash'}</span>
            </button>
          </div>
        </>
      ) : (
        /* Trash View Actions */
        <>
          <div className={`my-1 border-t ${isLight ? 'border-slate-200' : 'border-slate-700/60'}`} />
          <div className="px-1 space-y-0.5">
            {onRestoreNote && (
              <button
                type="button"
                onClick={() => handleAction(() => onRestoreNote(note.id))}
                className={`w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2.5 transition ${
                  isLight ? 'hover:bg-emerald-50 text-emerald-700' : 'hover:bg-emerald-950/40 text-emerald-400'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-500" />
                <span>{isId ? 'Pulihkan Catatan' : 'Restore Note'}</span>
              </button>
            )}

            {onPermanentDeleteNote && (
              <button
                type="button"
                onClick={() => handleAction(() => onPermanentDeleteNote(note.id))}
                className={`w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2.5 transition ${
                  isLight ? 'hover:bg-rose-50 text-rose-600' : 'hover:bg-rose-950/40 text-rose-400'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>{isId ? 'Hapus Permanen' : 'Delete Permanently'}</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};
