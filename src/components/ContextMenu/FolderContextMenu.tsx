import React from 'react';
import {
  Folder,
  FolderPlus,
  FilePlus,
  CheckSquare,
  Edit2,
  Trash2,
  ArrowUp,
  Download,
  FolderTree,
  Kanban,
} from 'lucide-react';
import { useContextMenuPosition } from './useContextMenuPosition';
import type { Folder as FolderType, AppLanguage } from '../../types';

export interface FolderContextMenuProps {
  folder: FolderType;
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onSelectFolder: (id: string) => void;
  onCreateNoteInFolder?: (folderId: string, isTodo?: boolean) => void;
  onCreateKanbanInFolder?: (folderId: string) => void;
  onCreateSubFolder: (parentId: string) => void;
  onRenameFolder: (folder: FolderType) => void;
  onDeleteFolder: (folderId: string) => void;
  onMoveToRoot?: (folderId: string) => void;
  onOpenExportFolderModal?: (folder: FolderType) => void;
  language?: AppLanguage;
  theme?: string;
}

export const FolderContextMenu: React.FC<FolderContextMenuProps> = ({
  folder,
  isOpen,
  position,
  onClose,
  onSelectFolder,
  onCreateNoteInFolder,
  onCreateKanbanInFolder,
  onCreateSubFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveToRoot,
  onOpenExportFolderModal,
  language = 'id',
  theme,
}) => {
  const { menuRef, coords } = useContextMenuPosition({
    isOpen,
    position,
    onClose,
    menuWidth: 230,
    menuHeight: 300,
  });

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
      className={`w-56 rounded-xl shadow-2xl border text-xs overflow-y-auto custom-scrollbar select-none py-1.5 animate-in fade-in zoom-in-95 duration-100 ${
        isLight
          ? 'bg-white/95 backdrop-blur-md border-slate-200 text-slate-800 shadow-slate-900/15'
          : 'bg-[#1b2434]/95 backdrop-blur-md border-slate-700/80 text-slate-200 shadow-black/40'
      }`}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Folder Header */}
      <div
        className={`px-3 py-1.5 mb-1 border-b flex items-center gap-2 ${
          isLight ? 'bg-slate-50 text-slate-700 border-slate-100' : 'bg-slate-800/40 text-slate-300 border-slate-800'
        }`}
      >
        <Folder className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        <span className="font-semibold truncate text-[11px]">{folder.title}</span>
      </div>

      <div className="px-1 space-y-0.5">
        {/* Open Folder */}
        <button
          type="button"
          onClick={() => handleAction(() => onSelectFolder(folder.id))}
          className={`w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2.5 transition ${
            isLight ? 'hover:bg-slate-100 hover:text-slate-900' : 'hover:bg-slate-800/80 hover:text-white'
          }`}
        >
          <FolderTree className="w-3.5 h-3.5 text-blue-400" />
          <span>{isId ? 'Buka Buku Catatan' : 'Open Notebook'}</span>
        </button>

        {/* Quick create note inside this folder */}
        {onCreateNoteInFolder && (
          <>
            <button
              type="button"
              onClick={() => handleAction(() => onCreateNoteInFolder(folder.id, false))}
              className={`w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2.5 transition ${
                isLight ? 'hover:bg-slate-100 hover:text-slate-900' : 'hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <FilePlus className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isId ? 'Catatan Baru di Sini' : 'New Note Here'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleAction(() => onCreateNoteInFolder(folder.id, true))}
              className={`w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2.5 transition ${
                isLight ? 'hover:bg-slate-100 hover:text-slate-900' : 'hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
              <span>{isId ? 'To-Do Baru di Sini' : 'New To-Do Here'}</span>
            </button>

            {onCreateKanbanInFolder && (
              <button
                type="button"
                onClick={() => handleAction(() => onCreateKanbanInFolder(folder.id))}
                className={`w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2.5 transition ${
                  isLight ? 'hover:bg-slate-100 hover:text-slate-900' : 'hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <Kanban className="w-3.5 h-3.5 text-indigo-400" />
                <span>{isId ? 'Papan Kanban Baru di Sini' : 'New Kanban Board Here'}</span>
              </button>
            )}
          </>
        )}

        {/* Create sub-notebook */}
        <button
          type="button"
          onClick={() => handleAction(() => onCreateSubFolder(folder.id))}
          className={`w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2.5 transition ${
            isLight ? 'hover:bg-slate-100 hover:text-slate-900' : 'hover:bg-slate-800/80 hover:text-white'
          }`}
        >
          <FolderPlus className="w-3.5 h-3.5 text-blue-400" />
          <span>{isId ? 'Buat Sub-Buku Catatan' : 'New Sub-Notebook'}</span>
        </button>
      </div>

      <div className={`my-1 border-t ${isLight ? 'border-slate-200' : 'border-slate-700/60'}`} />

      <div className="px-1 space-y-0.5">
        {/* Rename Folder */}
        <button
          type="button"
          onClick={() => handleAction(() => onRenameFolder(folder))}
          className={`w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2.5 transition ${
            isLight ? 'hover:bg-slate-100 hover:text-slate-900' : 'hover:bg-slate-800/80 hover:text-white'
          }`}
        >
          <Edit2 className="w-3.5 h-3.5 text-slate-400" />
          <span>{isId ? 'Ganti Nama Buku Catatan' : 'Rename Notebook'}</span>
        </button>

        {/* Move to Root if nested */}
        {folder.parent_id && onMoveToRoot && (
          <button
            type="button"
            onClick={() => handleAction(() => onMoveToRoot(folder.id))}
            className={`w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2.5 transition ${
              isLight ? 'hover:bg-slate-100 text-blue-600' : 'hover:bg-slate-800/80 text-blue-300'
            }`}
          >
            <ArrowUp className="w-3.5 h-3.5 text-blue-400" />
            <span>{isId ? 'Pindahkan ke Induk Utama' : 'Move to Root'}</span>
          </button>
        )}

        {/* Export Folder as ZIP */}
        {onOpenExportFolderModal && (
          <button
            type="button"
            onClick={() => handleAction(() => onOpenExportFolderModal(folder))}
            className={`w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2.5 transition ${
              isLight ? 'hover:bg-slate-100 hover:text-slate-900' : 'hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isId ? 'Ekspor Buku Catatan (ZIP)...' : 'Export Notebook (ZIP)...'}</span>
          </button>
        )}
      </div>

      <div className={`my-1 border-t ${isLight ? 'border-slate-200' : 'border-slate-700/60'}`} />

      {/* Delete Folder */}
      <div className="px-1">
        <button
          type="button"
          onClick={() => handleAction(() => onDeleteFolder(folder.id))}
          className={`w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2.5 transition ${
            isLight ? 'hover:bg-rose-50 text-rose-600' : 'hover:bg-rose-950/40 text-rose-400'
          }`}
        >
          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
          <span>{isId ? 'Hapus Buku Catatan' : 'Delete Notebook'}</span>
        </button>
      </div>
    </div>
  );
};
