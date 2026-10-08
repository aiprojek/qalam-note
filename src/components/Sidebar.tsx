import React, { useState } from 'react';
import {
  Folder as FolderIcon,
  ChevronRight,
  ChevronDown,
  Plus,
  Tag as TagIcon,
  Trash2,
  Settings,
  RefreshCw,
  FolderPlus,
  Star,
  FileText,
  Lock,
  ShieldCheck,
  Edit2,
  Trash,
  MoreHorizontal,
  CornerDownRight,
  ArrowUp,
  FolderTree,
  FolderArchive,
  CheckCircle2,
  Circle,
  Pin,
  Share2,
} from 'lucide-react';
import type { Folder, Tag, AppLanguage, Note } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { getT } from '../utils/i18n';
import { QalamIcon } from './icons/QalamIcon';

interface SidebarProps {
  folders: Folder[];
  tags: Tag[];
  notes?: Note[];
  selectedNoteId?: string | null;
  onSelectNote?: (noteId: string) => void;
  onDeleteNote?: (noteId: string) => void;
  noteCountsByFolder: Record<string, number>;
  noteCountsByTag: Record<string, number>;
  totalNotesCount: number;
  starredCount: number;
  trashCount: number;
  selectedFolderId: string | null;
  selectedTagId: string | null;
  selectedSpecialView: 'all' | 'starred' | 'trash' | null;
  onSelectFolder: (folderId: string) => void;
  onSelectTag: (tagTitle: string) => void;
  onSelectSpecialView: (view: 'all' | 'starred' | 'trash') => void;
  onCreateFolder: (parentId?: string) => void;
  onRenameFolder: (folder: Folder) => void;
  onDeleteFolder: (folderId: string) => void;
  onMoveFolder: (folderId: string, newParentId: string) => void;
  onMoveNoteToFolder: (noteId: string, targetFolderId: string) => void;
  onCreateTag: () => void;
  onDeleteTag?: (tagId: string, tagTitle: string) => void;
  onOpenSettings: () => void;
  onSync: () => void;
  isSyncing: boolean;
  lastSyncTime: number;
  isE2EEEnabled: boolean;
  isVaultUnlocked: boolean;
  onToggleVaultLock: () => void;
  onEmptyTrash: () => void;
  onOpenGraphView?: () => void;
  onOpenExportFolderModal?: (folder: Folder) => void;
  language?: AppLanguage;
}

interface FolderTreeItemProps {
  folder: Folder;
  level: number;
  folders: Folder[];
  notes: Note[];
  selectedNoteId: string | null;
  selectedFolderId: string | null;
  selectedSpecialView: 'all' | 'starred' | 'trash' | null;
  selectedTagId: string | null;
  noteCountsByFolder: Record<string, number>;
  collapsedFolders: Record<string, boolean>;
  toggleFolderCollapse: (id: string, e: React.MouseEvent) => void;
  expandFolder: (id: string) => void;
  onSelectFolder: (folderId: string) => void;
  onSelectNote?: (noteId: string) => void;
  onCreateFolder: (parentId?: string) => void;
  onRenameFolder: (folder: Folder) => void;
  onDeleteFolder: (folderId: string) => void;
  onDeleteNote?: (noteId: string) => void;
  onMoveFolder: (folderId: string, newParentId: string) => void;
  onMoveNoteToFolder: (noteId: string, targetFolderId: string) => void;
  onOpenExportFolderModal?: (folder: Folder) => void;
  activeFolderMenuId: string | null;
  setActiveFolderMenuId: (id: string | null) => void;
  draggedFolderId: string | null;
  setDraggedFolderId: (id: string | null) => void;
  draggedNoteId: string | null;
  setDraggedNoteId: (id: string | null) => void;
  t: any;
  language: AppLanguage;
}

const FolderTreeItem: React.FC<FolderTreeItemProps> = ({
  folder,
  level,
  folders,
  notes,
  selectedNoteId,
  selectedFolderId,
  selectedSpecialView,
  selectedTagId,
  noteCountsByFolder,
  collapsedFolders,
  toggleFolderCollapse,
  expandFolder,
  onSelectFolder,
  onSelectNote,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onDeleteNote,
  onMoveFolder,
  onMoveNoteToFolder,
  onOpenExportFolderModal,
  activeFolderMenuId,
  setActiveFolderMenuId,
  draggedFolderId,
  setDraggedFolderId,
  draggedNoteId,
  setDraggedNoteId,
  t,
  language,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragItemType, setDragItemType] = useState<'note' | 'folder' | null>(null);

  const childFolders = folders.filter((f) => f.parent_id === folder.id);
  const folderNotes = notes.filter((n) => n.folder_id === folder.id && !n.is_deleted);
  const isCollapsed = collapsedFolders[folder.id];
  const isSelected = selectedFolderId === folder.id && !selectedSpecialView && !selectedTagId;
  const count = noteCountsByFolder[folder.id] ?? folderNotes.length;
  const isBeingDragged = draggedFolderId === folder.id;
  const hasChildren = childFolders.length > 0 || folderNotes.length > 0;

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    setDraggedFolderId(folder.id);
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({ type: 'qalam-folder', folderId: folder.id, title: folder.title })
    );
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', folder.title);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.stopPropagation();
    setDraggedFolderId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragItemType(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragItemType(null);

    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr) return;
      const data = JSON.parse(dataStr);

      if (data.type === 'qalam-note' || data.type === 'joplin-note') {
        if (data.noteId) {
          onMoveNoteToFolder(data.noteId, folder.id);
          expandFolder(folder.id);
        }
      } else if (data.type === 'qalam-folder' || data.type === 'joplin-folder') {
        if (data.folderId && data.folderId !== folder.id) {
          onMoveFolder(data.folderId, folder.id);
          expandFolder(folder.id);
        }
      }
    } catch (err) {
      console.error('Drop parsing error:', err);
    }
  };

  return (
    <div className="relative">
      <div
        draggable={true}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          onSelectFolder(folder.id);
          if (isCollapsed) {
            expandFolder(folder.id);
          }
        }}
        style={{ paddingLeft: `${Math.max(6, 6 + level * 14)}px` }}
        title={
          language === 'id'
            ? 'Klik untuk memilih. Tarik (drag) untuk mengatur folder atau jatuhkan catatan ke sini.'
            : 'Click to select. Drag to organize, or drop notes here.'
        }
        className={`group flex items-center justify-between pr-2 py-1.5 rounded transition select-none cursor-pointer ${
          isBeingDragged ? 'opacity-40 border border-slate-700 bg-slate-900/60' : ''
        } ${
          isDragOver
            ? 'bg-blue-600/30 border-2 border-dashed border-blue-400 text-white ring-1 ring-blue-500 shadow-md'
            : isSelected
            ? 'bg-blue-600/30 text-white font-medium border-l-2 border-blue-500'
            : 'text-slate-300 hover:bg-slate-800/60'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {/* Chevron expand/collapse toggle */}
          {hasChildren ? (
            <button
              onClick={(e) => toggleFolderCollapse(folder.id, e)}
              className="p-0.5 text-slate-400 hover:text-slate-100 rounded transition shrink-0"
              title={
                isCollapsed
                  ? language === 'id'
                    ? 'Buka hierarki folder'
                    : 'Expand'
                  : language === 'id'
                  ? 'Tutup hierarki folder'
                  : 'Collapse'
              }
            >
              {isCollapsed ? (
                <ChevronRight className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          ) : (
            <span className="w-3 h-3 shrink-0" />
          )}

          {/* Folder Icon */}
          <FolderIcon
            className={`w-3.5 h-3.5 shrink-0 transition ${
              isDragOver ? 'text-blue-300 scale-110' : level > 0 ? 'text-blue-400/80' : 'text-blue-400'
            }`}
          />

          {/* Folder Title */}
          <span className="truncate text-xs">{folder.title}</span>

          {/* Drop helper tag */}
          {isDragOver && (
            <span className="text-[10px] text-blue-300 font-normal shrink-0 bg-blue-900/60 px-1 py-0.2 rounded">
              ↳ {language === 'id' ? 'Jatuhkan ke sini' : 'Drop here'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Quick Create Sub-Folder "+" Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCreateFolder(folder.id);
            }}
            title={t.new_sub_notebook}
            className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded transition"
          >
            <Plus className="w-3 h-3" />
          </button>

          {/* Context Menu Button */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveFolderMenuId(activeFolderMenuId === folder.id ? null : folder.id);
              }}
              title={language === 'id' ? 'Opsi Folder' : 'Folder options'}
              className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-white rounded hover:bg-slate-700/60 transition"
            >
              <MoreHorizontal className="w-3 h-3" />
            </button>

            {/* Folder Context Dropdown Menu */}
            {activeFolderMenuId === folder.id && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-6 z-50 w-48 rounded bg-[#202b3e] border border-slate-700 py-1 shadow-2xl text-xs text-slate-200"
              >
                <button
                  onClick={() => {
                    onCreateFolder(folder.id);
                    setActiveFolderMenuId(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white flex items-center gap-2"
                >
                  <FolderPlus className="w-3 h-3 text-blue-400" />
                  <span>{t.new_sub_notebook}</span>
                </button>
                <button
                  onClick={() => {
                    onRenameFolder(folder);
                    setActiveFolderMenuId(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white flex items-center gap-2"
                >
                  <Edit2 className="w-3 h-3 text-slate-300" />
                  <span>{t.rename}</span>
                </button>
                {folder.parent_id && (
                  <button
                    onClick={() => {
                      onMoveFolder(folder.id, '');
                      setActiveFolderMenuId(null);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white flex items-center gap-2 text-blue-300"
                  >
                    <ArrowUp className="w-3 h-3 text-blue-400" />
                    <span>{t.move_to_root}</span>
                  </button>
                )}
                {onOpenExportFolderModal && (
                  <button
                    onClick={() => {
                      onOpenExportFolderModal(folder);
                      setActiveFolderMenuId(null);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white flex items-center gap-2 text-amber-300"
                  >
                    <FolderArchive className="w-3 h-3 text-amber-400" />
                    <span>{language === 'id' ? 'Ekspor Folder (ZIP)...' : 'Export Notebook (ZIP)...'}</span>
                  </button>
                )}
                <div className="border-t border-slate-700 my-1" />
                <button
                  onClick={() => {
                    onDeleteFolder(folder.id);
                    setActiveFolderMenuId(null);
                  }}
                  className="w-full px-3 py-1.5 text-left text-red-400 hover:bg-red-600 hover:text-white flex items-center gap-2"
                >
                  <Trash className="w-3 h-3" />
                  <span>{t.delete}</span>
                </button>
              </div>
            )}
          </div>

          {/* Note count */}
          <span className="text-[10px] text-slate-500 font-mono">{count}</span>
        </div>
      </div>

      {/* Recursive rendering of nested items: Sub-notebooks and notes inside this folder */}
      {!isCollapsed && hasChildren && (
        <div className="space-y-0.5 mt-0.5 border-l border-slate-800/80 ml-2.5 pl-0.5">
          {/* 1. Sub-notebooks */}
          {childFolders.map((child) => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              level={level + 1}
              folders={folders}
              notes={notes}
              selectedNoteId={selectedNoteId}
              selectedFolderId={selectedFolderId}
              selectedSpecialView={selectedSpecialView}
              selectedTagId={selectedTagId}
              noteCountsByFolder={noteCountsByFolder}
              collapsedFolders={collapsedFolders}
              toggleFolderCollapse={toggleFolderCollapse}
              expandFolder={expandFolder}
              onSelectFolder={onSelectFolder}
              onSelectNote={onSelectNote}
              onCreateFolder={onCreateFolder}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
              onDeleteNote={onDeleteNote}
              onMoveFolder={onMoveFolder}
              onMoveNoteToFolder={onMoveNoteToFolder}
              onOpenExportFolderModal={onOpenExportFolderModal}
              activeFolderMenuId={activeFolderMenuId}
              setActiveFolderMenuId={setActiveFolderMenuId}
              draggedFolderId={draggedFolderId}
              setDraggedFolderId={setDraggedFolderId}
              draggedNoteId={draggedNoteId}
              setDraggedNoteId={setDraggedNoteId}
              t={t}
              language={language}
            />
          ))}

          {/* 2. Notes inside this notebook (tree view) */}
          {folderNotes.map((note) => {
            const isNoteSelected = selectedNoteId === note.id && !selectedSpecialView;
            const isNoteDragged = draggedNoteId === note.id;

            return (
              <div
                key={note.id}
                draggable={true}
                onDragStart={(e) => {
                  e.stopPropagation();
                  setDraggedNoteId(note.id);
                  e.dataTransfer.setData(
                    'application/json',
                    JSON.stringify({ type: 'qalam-note', noteId: note.id, title: note.title, folderId: folder.id })
                  );
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', note.title || 'Note');
                }}
                onDragEnd={(e) => {
                  e.stopPropagation();
                  setDraggedNoteId(null);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  try {
                    const dataStr = e.dataTransfer.getData('application/json');
                    if (!dataStr) return;
                    const data = JSON.parse(dataStr);
                    if ((data.type === 'qalam-note' || data.type === 'joplin-note') && data.noteId && data.noteId !== note.id) {
                      onMoveNoteToFolder(data.noteId, folder.id);
                      expandFolder(folder.id);
                    }
                  } catch (err) {
                    console.error('Drop error on note in tree:', err);
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectFolder(folder.id);
                  if (onSelectNote) {
                    onSelectNote(note.id);
                  }
                }}
                style={{ paddingLeft: `${Math.max(6, 6 + (level + 1) * 10)}px` }}
                title={
                  language === 'id'
                    ? `${note.title || 'Catatan tanpa judul'} (Tarik/drag untuk memindahkan ke folder lain)`
                    : `${note.title || 'Untitled note'} (Drag to move to another notebook)`
                }
                className={`group flex items-center justify-between pr-2 py-1 rounded transition select-none cursor-pointer text-xs ${
                  isNoteDragged ? 'opacity-40 bg-slate-900/60' : ''
                } ${
                  isNoteSelected
                    ? 'bg-blue-600/30 text-white font-medium border-l-2 border-blue-400'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  {note.is_todo ? (
                    note.todo_completed ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    ) : (
                      <Circle className="w-3 h-3 text-slate-500 shrink-0" />
                    )
                  ) : (
                    <FileText className="w-3 h-3 text-slate-400 shrink-0 group-hover:text-blue-400 transition" />
                  )}

                  {note.is_pinned && <Pin className="w-2.5 h-2.5 text-blue-400 shrink-0 fill-blue-400" />}
                  {note.is_favorite && <Star className="w-2.5 h-2.5 text-amber-400 shrink-0 fill-amber-400" />}

                  <span className={`truncate ${note.todo_completed ? 'line-through text-slate-500' : ''}`}>
                    {note.title || (language === 'id' ? 'Catatan tanpa judul' : 'Untitled note')}
                  </span>
                </div>

                {onDeleteNote && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteNote(note.id);
                    }}
                    title={language === 'id' ? 'Pindahkan ke Sampah' : 'Move to Trash'}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-red-400 rounded hover:bg-slate-700/60 transition shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* If expanded and empty */}
      {!isCollapsed && childFolders.length === 0 && folderNotes.length === 0 && isSelected && (
        <div
          className="text-[10px] text-slate-500 italic py-1 border-l border-slate-800/80 ml-2.5"
          style={{ paddingLeft: `${Math.max(8, 8 + (level + 1) * 10)}px` }}
        >
          {language === 'id' ? '↳ (Belum ada catatan)' : '↳ (No notes yet)'}
        </div>
      )}
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  folders,
  tags,
  notes = [],
  selectedNoteId = null,
  onSelectNote,
  onDeleteNote,
  noteCountsByFolder,
  noteCountsByTag,
  totalNotesCount,
  starredCount,
  trashCount,
  selectedFolderId,
  selectedTagId,
  selectedSpecialView,
  onSelectFolder,
  onSelectTag,
  onSelectSpecialView,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveFolder,
  onMoveNoteToFolder,
  onCreateTag,
  onDeleteTag,
  onOpenSettings,
  onSync,
  isSyncing,
  lastSyncTime,
  isE2EEEnabled,
  isVaultUnlocked,
  onToggleVaultLock,
  onEmptyTrash,
  onOpenGraphView,
  onOpenExportFolderModal,
  language = 'id',
}) => {
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [activeFolderMenuId, setActiveFolderMenuId] = useState<string | null>(null);
  const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null);
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [isRootDragOver, setIsRootDragOver] = useState(false);
  const t = getT(language);

  const toggleFolderCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedFolders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandFolder = (id: string) => {
    setCollapsedFolders((prev) => ({ ...prev, [id]: false }));
  };

  // Root level folders (parent_id is empty or nonexistent)
  const rootFolders = folders.filter((f) => !f.parent_id);

  const formatLastSync = (time: number) => {
    if (!time) return t.never;
    const mins = Math.floor((Date.now() - time) / 60000);
    if (mins < 1) return t.just_now;
    if (mins < 60) return `${mins}m ${language === 'id' ? 'lalu' : 'ago'}`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${language === 'id' ? 'lalu' : 'ago'}`;
  };

  return (
    <div
      onClick={() => setActiveFolderMenuId(null)}
      className="flex flex-col h-full w-full bg-[#18202e] text-slate-300 border-r border-slate-800 select-none text-xs"
    >
      {/* App Branding Header (Desktop & Tablet only - on Mobile, MobileTopBar handles brand header) */}
      <div className="hidden md:flex p-3 border-b border-slate-800/80 items-center justify-between bg-[#151c28]">
        <div className="flex items-center gap-2.5">
          <QalamIcon className="w-6 h-6 shadow-sm" />
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-slate-100 tracking-tight text-[14px]">Qalam</span>
            <span className="text-[12px] font-semibold text-blue-400">Note</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* E2EE Vault Status Indicator */}
          {isE2EEEnabled && (
            <button
              onClick={onToggleVaultLock}
              title={isVaultUnlocked ? t.e2ee_unlocked : t.e2ee_locked}
              className={`p-1 rounded transition ${
                isVaultUnlocked ? 'text-emerald-400 hover:bg-emerald-950/30' : 'text-amber-400 hover:bg-amber-950/30'
              }`}
            >
              {isVaultUnlocked ? <ShieldCheck className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            </button>
          )}
          <button
            onClick={onOpenSettings}
            title={t.options}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700/50 transition"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Navigation Scrollable Body */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 custom-scrollbar">
        {/* Quick Views: All Notes, Starred */}
        <div className="space-y-0.5">
          <button
            onClick={() => onSelectSpecialView('all')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded transition ${
              selectedSpecialView === 'all'
                ? 'bg-blue-600/30 text-white font-medium border-l-2 border-blue-500'
                : 'text-slate-300 hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>{t.all_notes}</span>
            </div>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded-full">
              {totalNotesCount}
            </span>
          </button>

          <button
            onClick={() => onSelectSpecialView('starred')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded transition ${
              selectedSpecialView === 'starred'
                ? 'bg-blue-600/30 text-white font-medium border-l-2 border-blue-500'
                : 'text-slate-300 hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>{t.starred}</span>
            </div>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded-full">
              {starredCount}
            </span>
          </button>

          {onOpenGraphView && (
            <button
              onClick={onOpenGraphView}
              title={language === 'id' ? 'Buka Grafik Pengetahuan (Ctrl+G)' : 'Open Knowledge Graph (Ctrl+G)'}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded transition text-emerald-400 hover:bg-slate-800/60 group"
            >
              <div className="flex items-center gap-2">
                <Share2 className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="font-medium">{language === 'id' ? 'Grafik Pengetahuan' : 'Knowledge Graph'}</span>
              </div>
              <span className="text-[10px] font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 px-1.5 py-0.2 rounded">
                Ctrl+G
              </span>
            </button>
          )}
        </div>

        {/* Notebooks Section (Hierarchical & Drag-Drop Target) */}
        <div>
          <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <div className="flex items-center gap-1.5">
              <FolderTree className="w-3 h-3 text-slate-400" />
              <span>{t.notebooks}</span>
            </div>
            <button
              onClick={() => onCreateFolder()}
              title={t.new_notebook}
              className="p-0.5 hover:text-white hover:bg-slate-700/60 rounded transition"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Root Level Dropzone when moving a subfolder to root */}
          {draggedFolderId && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsRootDragOver(true);
              }}
              onDragLeave={() => setIsRootDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsRootDragOver(false);
                if (draggedFolderId) {
                  onMoveFolder(draggedFolderId, '');
                  setDraggedFolderId(null);
                }
              }}
              className={`my-1 mx-1 px-2.5 py-1.5 rounded-lg border-2 border-dashed text-center text-[10px] font-medium transition ${
                isRootDragOver
                  ? 'bg-blue-600/30 border-blue-400 text-white ring-2 ring-blue-500/50 scale-[1.02]'
                  : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              📂 {t.drop_here_for_root}
            </div>
          )}

          {/* Notebook Tree */}
          <div className="space-y-0.5 mt-1">
            {rootFolders.length === 0 ? (
              <div className="px-2 py-1 text-[11px] text-slate-500 italic">
                {language === 'id' ? 'Belum ada buku catatan' : 'No notebooks'}
              </div>
            ) : (
              rootFolders.map((folder) => (
                <FolderTreeItem
                  key={folder.id}
                  folder={folder}
                  level={0}
                  folders={folders}
                  notes={notes}
                  selectedNoteId={selectedNoteId}
                  selectedFolderId={selectedFolderId}
                  selectedSpecialView={selectedSpecialView}
                  selectedTagId={selectedTagId}
                  noteCountsByFolder={noteCountsByFolder}
                  collapsedFolders={collapsedFolders}
                  toggleFolderCollapse={toggleFolderCollapse}
                  expandFolder={expandFolder}
                  onSelectFolder={onSelectFolder}
                  onSelectNote={onSelectNote}
                  onCreateFolder={onCreateFolder}
                  onRenameFolder={onRenameFolder}
                  onDeleteFolder={onDeleteFolder}
                  onDeleteNote={onDeleteNote}
                  onMoveFolder={onMoveFolder}
                  onMoveNoteToFolder={onMoveNoteToFolder}
                  onOpenExportFolderModal={onOpenExportFolderModal}
                  activeFolderMenuId={activeFolderMenuId}
                  setActiveFolderMenuId={setActiveFolderMenuId}
                  draggedFolderId={draggedFolderId}
                  setDraggedFolderId={setDraggedFolderId}
                  draggedNoteId={draggedNoteId}
                  setDraggedNoteId={setDraggedNoteId}
                  t={t}
                  language={language}
                />
              ))
            )}
          </div>
        </div>

        {/* Tags Section */}
        <div>
          <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span>{t.tags}</span>
            <button
              onClick={onCreateTag}
              title={language === 'id' ? 'Buat Tag Baru' : 'New Tag'}
              className="p-0.5 hover:text-white hover:bg-slate-700/60 rounded transition"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-0.5 mt-1">
            {tags.length === 0 ? (
              <div className="px-2 py-1 text-[11px] text-slate-500 italic">{t.no_tags}</div>
            ) : (
              tags.map((tag) => {
                const isSelected = selectedTagId === tag.title;
                const count = noteCountsByTag[tag.title] || 0;
                return (
                  <div
                    key={tag.id}
                    onClick={() => onSelectTag(tag.title)}
                    className={`group w-full flex items-center justify-between px-2 py-1 rounded transition cursor-pointer select-none ${
                      isSelected
                        ? 'bg-blue-600/30 text-white font-medium border-l-2 border-blue-500'
                        : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                      <TagIcon className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{tag.title}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {onDeleteTag && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteTag(tag.id, tag.title);
                          }}
                          title={language === 'id' ? 'Hapus Tag' : 'Delete Tag'}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-red-400 rounded hover:bg-slate-700/60 transition"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                      <span className="text-[10px] text-slate-500 font-mono">{count}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Trash */}
        <div className="pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <button
              onClick={() => onSelectSpecialView('trash')}
              className={`flex-1 flex items-center justify-between px-2 py-1 rounded transition ${
                selectedSpecialView === 'trash'
                  ? 'bg-red-950/40 text-red-300 font-medium border-l-2 border-red-500'
                  : 'text-slate-400 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span>{t.trash}</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">{trashCount}</span>
            </button>
            {trashCount > 0 && (
              <button
                onClick={onEmptyTrash}
                title={t.empty_trash}
                className="p-1 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded transition ml-1"
              >
                {t.empty_trash}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar Footer: Synchronise button, Last sync time, PWA Install */}
      <div className="p-3 border-t border-slate-800/90 bg-[#151c28] space-y-2">
        <button
          onClick={onSync}
          disabled={isSyncing}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded bg-blue-600/90 hover:bg-blue-600 text-white font-medium text-xs shadow-xs transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? t.syncing : t.synchronise}</span>
        </button>

        <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
          <span>{t.last_sync}</span>
          <span className="text-slate-400">{formatLastSync(lastSyncTime)}</span>
        </div>

        {/* PWA Install Button */}
        <PWAInstallButton language={language} />
      </div>
    </div>
  );
};
