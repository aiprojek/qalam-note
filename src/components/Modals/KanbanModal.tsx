import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Kanban,
  X,
  Plus,
  CheckSquare,
  CheckCircle2,
  Clock,
  AlertCircle,
  Folder as FolderIcon,
  Tag as TagIcon,
  Search,
  Filter,
  Calendar,
  MoreVertical,
  ExternalLink,
  Trash2,
  ArrowRight,
  MoveRight,
  Sparkles,
  Layers,
  ChevronDown,
  Check,
  Star,
  Pin,
  ListTodo,
} from 'lucide-react';
import type { Note, Folder, Tag, AppLanguage, KanbanStatus } from '../../types';
import { formatDate } from '../../utils/i18n';

interface KanbanModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  folders: Folder[];
  tags: Tag[];
  activeFolderId: string | null;
  onSelectNote: (noteId: string) => void;
  onUpdateNote: (noteId: string, updates: Partial<Note>) => void;
  onCreateNoteInKanban: (title: string, folderId: string, status: KanbanStatus) => Promise<void>;
  onDeleteNote?: (noteId: string) => void;
  onShowToast?: (message: string, type?: 'success' | 'info' | 'warning') => void;
  language?: AppLanguage;
  theme?: string;
}

interface ColumnConfig {
  id: KanbanStatus;
  titleId: string;
  titleEn: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  headerBg: string;
  borderColor: string;
  badgeBg: string;
  badgeText: string;
  accentBg: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    id: 'backlog',
    titleId: 'Daftar Ide / Backlog',
    titleEn: 'Idea Backlog',
    icon: Layers,
    color: 'text-purple-400',
    headerBg: 'bg-purple-950/20',
    borderColor: 'border-purple-800/40',
    badgeBg: 'bg-purple-900/50',
    badgeText: 'text-purple-300',
    accentBg: 'hover:border-purple-500/70',
  },
  {
    id: 'todo',
    titleId: 'Akan Dikerjakan (To Do)',
    titleEn: 'To Do',
    icon: ListTodo,
    color: 'text-blue-400',
    headerBg: 'bg-blue-950/20',
    borderColor: 'border-blue-800/40',
    badgeBg: 'bg-blue-900/50',
    badgeText: 'text-blue-300',
    accentBg: 'hover:border-blue-500/70',
  },
  {
    id: 'in_progress',
    titleId: 'Sedang Dikerjakan (WIP)',
    titleEn: 'In Progress',
    icon: Clock,
    color: 'text-amber-400',
    headerBg: 'bg-amber-950/20',
    borderColor: 'border-amber-800/40',
    badgeBg: 'bg-amber-900/50',
    badgeText: 'text-amber-300',
    accentBg: 'hover:border-amber-500/70',
  },
  {
    id: 'done',
    titleId: 'Selesai (Done)',
    titleEn: 'Done',
    icon: CheckCircle2,
    color: 'text-emerald-400',
    headerBg: 'bg-emerald-950/20',
    borderColor: 'border-emerald-800/40',
    badgeBg: 'bg-emerald-900/50',
    badgeText: 'text-emerald-300',
    accentBg: 'hover:border-emerald-500/70',
  },
];

// Helper to extract checklist progress from Markdown bodies
function extractChecklistProgress(body: string) {
  if (!body) return { total: 0, done: 0, percent: 0 };
  const totalMatches = body.match(/^[ \t]*[-*+][ \t]+\[[ xX]\]/gm) || [];
  const doneMatches = body.match(/^[ \t]*[-*+][ \t]+\[[xX]\]/gm) || [];
  const total = totalMatches.length;
  const done = doneMatches.length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  return { total, done, percent };
}

// Map note to an effective Kanban status
function getNoteKanbanStatus(note: Note): KanbanStatus {
  if (note.kanban_status) {
    return note.kanban_status;
  }
  // Smart fallback if status hasn't been set yet
  if (note.is_todo && note.todo_completed > 0) {
    return 'done';
  }
  const tagsLower = (note.tags || []).map((t) => t.toLowerCase());
  if (tagsLower.includes('in-progress') || tagsLower.includes('wip') || tagsLower.includes('sedang')) {
    return 'in_progress';
  }
  if (tagsLower.includes('backlog') || tagsLower.includes('ide') || tagsLower.includes('idea')) {
    return 'backlog';
  }
  return 'todo';
}

export const KanbanModal: React.FC<KanbanModalProps> = ({
  isOpen,
  onClose,
  notes,
  folders,
  tags,
  activeFolderId,
  onSelectNote,
  onUpdateNote,
  onCreateNoteInKanban,
  onDeleteNote,
  onShowToast,
  language = 'id',
  theme = 'qalam-dark',
}) => {
  const isId = language === 'id';
  const isLight =
    theme === 'qalam-light' ||
    theme === 'light' ||
    (typeof document !== 'undefined' && document.documentElement.classList.contains('light'));

  // Filtering states
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'todo' | 'notes'>('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Drag and drop states
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<KanbanStatus | null>(null);

  // Quick task creation per column
  const [activeNewTaskCol, setActiveNewTaskCol] = useState<KanbanStatus | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Card menu popover state
  const [activeMenuNoteId, setActiveMenuNoteId] = useState<string | null>(null);

  // Set default folder filter to activeFolderId if available
  useEffect(() => {
    if (activeFolderId && folders.some((f) => f.id === activeFolderId)) {
      setSelectedFolderFilter(activeFolderId);
    } else {
      setSelectedFolderFilter('all');
    }
  }, [activeFolderId, folders]);

  // Close menus on click outside
  useEffect(() => {
    const handleWindowClick = () => setActiveMenuNoteId(null);
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  // Keyboard escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeNewTaskCol) {
          setActiveNewTaskCol(null);
          setNewTaskTitle('');
        } else if (activeMenuNoteId) {
          setActiveMenuNoteId(null);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeNewTaskCol, activeMenuNoteId, onClose]);

  // Filter notes
  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      if (note.is_deleted) return false;

      // Folder filter
      if (selectedFolderFilter !== 'all' && note.folder_id !== selectedFolderFilter) {
        return false;
      }

      // Type filter
      if (typeFilter === 'todo' && !note.is_todo) return false;
      if (typeFilter === 'notes' && note.is_todo) return false;

      // Tag filter
      if (selectedTagFilter !== 'all' && !(note.tags || []).includes(selectedTagFilter)) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (note.title || '').toLowerCase().includes(q);
        const matchesBody = (note.body || '').toLowerCase().includes(q);
        const matchesTag = (note.tags || []).some((t) => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesBody && !matchesTag) {
          return false;
        }
      }

      return true;
    });
  }, [notes, selectedFolderFilter, typeFilter, selectedTagFilter, searchQuery]);

  // Group notes into Kanban columns
  const columnItems = useMemo(() => {
    const groups: Record<KanbanStatus, Note[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      done: [],
    };

    filteredNotes.forEach((note) => {
      const status = getNoteKanbanStatus(note);
      groups[status].push(note);
    });

    return groups;
  }, [filteredNotes]);

  // Overall metrics
  const totalCount = filteredNotes.length;
  const doneCount = columnItems.done.length;
  const inProgressCount = columnItems.in_progress.length;
  const todoCount = columnItems.todo.length;
  const backlogCount = columnItems.backlog.length;
  const completionPercentage = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  // Move note to another column
  const handleMoveNote = (noteId: string, targetStatus: KanbanStatus) => {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;

    const currentStatus = getNoteKanbanStatus(note);
    if (currentStatus === targetStatus) return;

    const updates: Partial<Note> = {
      kanban_status: targetStatus,
      updated_time: Date.now(),
    };

    // If moving to 'done', mark completed
    if (targetStatus === 'done') {
      if (note.is_todo && !note.todo_completed) {
        updates.todo_completed = Date.now();
      }
    } else if (currentStatus === 'done') {
      // Moving out of 'done', uncheck completed
      if (note.is_todo && note.todo_completed > 0) {
        updates.todo_completed = 0;
      }
    }

    onUpdateNote(noteId, updates);
    setActiveMenuNoteId(null);

    const colName =
      targetStatus === 'done'
        ? isId ? 'Selesai' : 'Done'
        : targetStatus === 'in_progress'
        ? isId ? 'Sedang Dikerjakan' : 'In Progress'
        : targetStatus === 'todo'
        ? isId ? 'Akan Dikerjakan' : 'To Do'
        : isId ? 'Daftar Ide' : 'Backlog';

    if (onShowToast) {
      onShowToast(
        isId
          ? `Catatan dipindahkan ke "${colName}"`
          : `Note moved to "${colName}"`,
        'success'
      );
    }
  };

  // Toggle todo completion checkbox directly
  const handleToggleTodoCheckbox = (e: React.MouseEvent, note: Note) => {
    e.stopPropagation();
    const isCurrentlyDone = (note.is_todo && note.todo_completed > 0) || getNoteKanbanStatus(note) === 'done';
    const nextStatus: KanbanStatus = isCurrentlyDone ? 'todo' : 'done';
    handleMoveNote(note.id, nextStatus);
  };

  // Add new card into a column
  const handleCreateCardSubmit = async (colId: KanbanStatus) => {
    if (!newTaskTitle.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const targetFolder =
        selectedFolderFilter !== 'all'
          ? selectedFolderFilter
          : activeFolderId || (folders.length > 0 ? folders[0].id : 'folder-welcome-01');

      await onCreateNoteInKanban(newTaskTitle.trim(), targetFolder, colId);
      setNewTaskTitle('');
      setActiveNewTaskCol(null);
      if (onShowToast) {
        onShowToast(isId ? 'Kartu baru berhasil ditambahkan!' : 'New card created successfully!', 'success');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, noteId: string) => {
    e.dataTransfer.setData('text/plain', noteId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedNoteId(noteId);
  };

  const handleDragEnd = () => {
    setDraggedNoteId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, colId: KanbanStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== colId) {
      setDragOverColumn(colId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, colId: KanbanStatus) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (dragOverColumn === colId) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e: React.DragEvent, colId: KanbanStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const noteId = e.dataTransfer.getData('text/plain') || draggedNoteId;
    if (noteId) {
      handleMoveNote(noteId, colId);
    }
    setDraggedNoteId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150 select-none">
      <div
        className={`flex flex-col w-full h-[96vh] max-w-[1500px] rounded-2xl shadow-2xl overflow-hidden border transition-colors ${
          isLight
            ? 'bg-slate-100 border-slate-300 text-slate-800'
            : 'bg-[#121824] border-slate-800 text-slate-200'
        }`}
      >
        {/* TOP BAR / HEADER */}
        <div
          className={`flex flex-col gap-3 px-4 sm:px-6 py-3.5 border-b shrink-0 ${
            isLight ? 'bg-white border-slate-200' : 'bg-[#151c2a] border-slate-800'
          }`}
        >
          {/* Row 1: Title, Progress stats, Close button */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-xs">
                <Kanban className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2">
                    <span className={isLight ? 'text-slate-900' : 'text-slate-100'}>
                      {isId ? 'Papan Kanban' : 'Kanban Board'}
                    </span>
                    <span className={`text-xs font-normal select-none ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      · {totalCount} {isId ? 'item' : 'items'}
                    </span>
                  </h2>
                </div>
                <p className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {isId
                    ? 'Manajemen visual alur kerja catatan & tugas (Tarik & lepas antar-kolom)'
                    : 'Visual workflow management for notes & tasks (Drag and drop between columns)'}
                </p>
              </div>
            </div>

            {/* Quick Metrics / Progress Bar & Close */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className={`hidden lg:flex items-center gap-3 px-3 py-1.5 rounded-xl border text-xs ${
                isLight ? 'bg-slate-100 border-slate-300' : 'bg-slate-900/60 border-slate-800'
              }`}>
                <div className="flex items-center gap-2">
                  <span className={isLight ? 'text-slate-700 font-semibold' : 'text-slate-400'}>{isId ? 'Kemajuan:' : 'Progress:'}</span>
                  <strong className={`font-mono ${isLight ? 'text-indigo-700' : 'text-indigo-400'}`}>{completionPercentage}%</strong>
                </div>
                <div className={`w-24 h-2 rounded-full overflow-hidden border ${
                  isLight ? 'bg-slate-200 border-slate-300' : 'bg-slate-800 border-slate-700/60'
                }`}>
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
                <span className={`text-[11px] font-mono ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>
                  ({doneCount}/{totalCount})
                </span>
              </div>

              <button
                type="button"
                onClick={onClose}
                title={isId ? 'Tutup Papan Kanban (Esc)' : 'Close Kanban Board (Esc)'}
                className={`p-2 rounded-xl transition active:scale-95 ${
                  isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Row 2: Filters and Search */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1 text-xs">
            {/* Sub-row 1: Folder/Notebook Selector & Tag Filter side-by-side on mobile */}
            <div className={`grid ${tags.length > 0 ? 'grid-cols-2' : 'grid-cols-1'} sm:flex sm:items-center gap-2 w-full sm:w-auto`}>
              {/* Folder Selector */}
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-0 min-w-0 transition-colors ${
                isLight ? 'bg-slate-100 hover:bg-slate-200/70 text-slate-800' : 'bg-slate-900/80 hover:bg-slate-800 text-slate-200'
              }`}>
                <FolderIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <select
                  value={selectedFolderFilter}
                  onChange={(e) => setSelectedFolderFilter(e.target.value)}
                  className={`bg-transparent border-0 outline-none text-xs font-medium cursor-pointer w-full sm:max-w-[150px] truncate ${
                    isLight ? 'text-slate-800' : 'text-slate-200'
                  }`}
                >
                  <option value="all" className={isLight ? 'bg-white text-slate-800' : 'bg-[#1e2739] text-slate-200'}>
                    {isId ? 'Semua Folder' : 'All Notebooks'}
                  </option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id} className={isLight ? 'bg-white text-slate-800' : 'bg-[#1e2739] text-slate-200'}>
                      {f.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tag Filter */}
              {tags.length > 0 ? (
                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-0 min-w-0 transition-colors ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200/70 text-slate-800' : 'bg-slate-900/80 hover:bg-slate-800 text-slate-200'
                }`}>
                  <TagIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <select
                    value={selectedTagFilter}
                    onChange={(e) => setSelectedTagFilter(e.target.value)}
                    className={`bg-transparent border-0 outline-none text-xs font-medium cursor-pointer w-full sm:max-w-[120px] truncate ${
                      isLight ? 'text-slate-800' : 'text-slate-200'
                    }`}
                  >
                    <option value="all" className={isLight ? 'bg-white text-slate-800' : 'bg-[#1e2739] text-slate-200'}>
                      {isId ? 'Semua Tag' : 'All Tags'}
                    </option>
                    {tags.map((t) => (
                      <option key={t.id} value={t.title} className={isLight ? 'bg-white text-slate-800' : 'bg-[#1e2739] text-slate-200'}>
                        #{t.title}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>

            {/* Sub-row 2: Navigation filter tabs & search input side-by-side on mobile */}
            <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-1 sm:justify-end">
              {/* Type Filter Buttons */}
              <div className={`flex items-center rounded-lg p-0.5 border shrink-0 ${
                isLight ? 'bg-slate-200/80 border-slate-300' : 'bg-slate-900/80 border-slate-700/80'
              }`}>
                <button
                  type="button"
                  onClick={() => setTypeFilter('all')}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition ${
                    typeFilter === 'all'
                      ? 'bg-blue-600 text-white shadow-xs font-semibold'
                      : isLight
                      ? 'text-slate-600 hover:text-slate-900'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {isId ? 'Semua' : 'All'}
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('todo')}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition flex items-center gap-1 ${
                    typeFilter === 'todo'
                      ? 'bg-blue-600 text-white shadow-xs font-semibold'
                      : isLight
                      ? 'text-slate-600 hover:text-slate-900'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <CheckSquare className="w-3 h-3 text-blue-400" />
                  <span>To-Do</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('notes')}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition ${
                    typeFilter === 'notes'
                      ? 'bg-blue-600 text-white shadow-xs font-semibold'
                      : isLight
                      ? 'text-slate-600 hover:text-slate-900'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {isId ? 'Catatan' : 'Notes'}
                </button>
              </div>

              {/* Search Input */}
              <div className="relative flex-1 min-w-0 sm:min-w-[180px] sm:max-w-[240px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isId ? 'Cari kartu...' : 'Filter cards...'}
                  className={`w-full pl-8 pr-7 py-1.5 rounded-lg border text-xs outline-none focus:border-indigo-500 transition ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                      : 'bg-slate-900/90 border-slate-700/80 text-slate-200 placeholder-slate-500'
                  }`}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* KANBAN BOARD COLUMNS CONTAINER */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-3 sm:p-5 custom-scrollbar">
          <div className="flex gap-4 h-full pb-2 snap-x">
            {COLUMNS.map((column) => {
              const ColumnIcon = column.icon;
              const cards = columnItems[column.id] || [];
              const isOver = dragOverColumn === column.id;
              const isAddingHere = activeNewTaskCol === column.id;

              return (
                <div
                  key={column.id}
                  onDragOver={(e) => handleDragOver(e, column.id)}
                  onDragLeave={(e) => handleDragLeave(e, column.id)}
                  onDrop={(e) => handleDrop(e, column.id)}
                  className={`flex flex-col w-[280px] sm:w-[310px] shrink-0 snap-start rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isOver
                      ? `ring-2 ring-indigo-500/80 bg-indigo-950/20 ${column.borderColor}`
                      : isLight
                      ? 'bg-slate-200/60 border-slate-300'
                      : 'bg-[#151c2a]/90 border-slate-800'
                  }`}
                >
                  {/* COLUMN HEADER */}
                  <div
                    className={`flex items-center justify-between px-3.5 py-3 border-b shrink-0 ${column.headerBg} ${column.borderColor}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <ColumnIcon className={`w-4 h-4 ${column.color} shrink-0`} />
                      <h3 className={`font-bold text-xs tracking-tight truncate ${
                        isLight ? 'text-slate-900' : 'text-slate-100'
                      }`}>
                        {isId ? column.titleId : column.titleEn}
                      </h3>
                      <span className={`text-xs font-mono font-medium shrink-0 ${
                        isLight ? 'text-slate-600' : 'text-slate-400'
                      }`}>
                        ({cards.length})
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveNewTaskCol(isAddingHere ? null : column.id);
                        setNewTaskTitle('');
                      }}
                      title={isId ? 'Tambah kartu di kolom ini' : 'Add card in this column'}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* QUICK CARD CREATOR (Inline Add) */}
                  {isAddingHere && (
                    <div className={`p-2.5 border-b animate-in fade-in duration-150 ${
                      isLight
                        ? 'bg-white border-slate-200 shadow-xs'
                        : 'bg-slate-900/90 border-slate-800'
                    }`}>
                      <input
                        type="text"
                        autoFocus
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCreateCardSubmit(column.id);
                          }
                        }}
                        placeholder={isId ? 'Judul tugas / kartu baru...' : 'New task title...'}
                        className={`w-full px-2.5 py-1.5 text-xs rounded-lg outline-none mb-2 transition-colors ${
                          isLight
                            ? 'bg-slate-50 border border-indigo-400 focus:border-indigo-600 focus:bg-white text-slate-900 placeholder:text-slate-500'
                            : 'bg-[#18202e] border border-indigo-500/60 text-slate-200 placeholder-slate-500'
                        }`}
                      />
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveNewTaskCol(null);
                            setNewTaskTitle('');
                          }}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                            isLight
                              ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                              : 'text-slate-400 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          {isId ? 'Batal' : 'Cancel'}
                        </button>
                        <button
                          type="button"
                          disabled={!newTaskTitle.trim() || isSubmitting}
                          onClick={() => handleCreateCardSubmit(column.id)}
                          className="px-3.5 py-1.5 rounded-md text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition disabled:opacity-50 active:scale-95"
                        >
                          {isSubmitting ? (isId ? 'Menyimpan...' : 'Saving...') : isId ? 'Tambah' : 'Add'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* COLUMN CARDS SCROLLABLE LIST */}
                  <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 custom-scrollbar">
                    {cards.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-36 text-center text-slate-500 p-4 border border-dashed border-slate-800/80 rounded-xl my-2">
                        <ColumnIcon className="w-6 h-6 opacity-30 mb-1" />
                        <span className="text-[11px]">
                          {isId ? 'Belum ada kartu' : 'No cards here'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveNewTaskCol(column.id);
                            setNewTaskTitle('');
                          }}
                          className="mt-2 text-[10px] text-indigo-400 hover:text-indigo-300 font-medium underline"
                        >
                          + {isId ? 'Tambah kartu' : 'Add card'}
                        </button>
                      </div>
                    ) : (
                      cards.map((note) => {
                        const isDragging = draggedNoteId === note.id;
                        const isCompleted = (note.is_todo && note.todo_completed > 0) || column.id === 'done';
                        const checklist = extractChecklistProgress(note.body);
                        const folder = folders.find((f) => f.id === note.folder_id);

                        // Check due date
                        const hasDue = note.todo_due && note.todo_due > 0;
                        const isOverdue = hasDue && note.todo_due < Date.now() && !isCompleted;
                        const isToday =
                          hasDue &&
                          new Date(note.todo_due).toDateString() === new Date().toDateString() &&
                          !isCompleted;

                        return (
                          <div
                            key={note.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, note.id)}
                            onDragEnd={handleDragEnd}
                            onClick={() => onSelectNote(note.id)}
                            className={`group relative flex flex-col p-3 rounded-xl border transition-all duration-150 cursor-pointer shadow-xs select-none ${
                              isDragging
                                ? 'opacity-40 scale-95 border-indigo-500'
                                : isLight
                                ? 'bg-white hover:border-slate-400 border-slate-200 text-slate-800 shadow-2xs hover:shadow-xs'
                                : 'bg-[#182130] hover:bg-[#1a2436] hover:border-slate-700/80 border-slate-800/80 text-slate-200'
                            }`}
                          >
                            {/* Card Top Row: Checkbox, Title, Pin/Star, Actions menu */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2 flex-1 min-w-0">
                                {note.is_todo && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleToggleTodoCheckbox(e, note)}
                                    title={
                                      isCompleted
                                        ? isId ? 'Tandai belum selesai' : 'Mark incomplete'
                                        : isId ? 'Tandai selesai' : 'Mark completed'
                                    }
                                    className="mt-0.5 text-slate-400 hover:text-emerald-400 transition shrink-0"
                                  >
                                    {isCompleted ? (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    ) : (
                                      <div className="w-4 h-4 rounded-md border border-slate-600 hover:border-blue-400" />
                                    )}
                                  </button>
                                )}

                                <span
                                  className={`text-xs leading-snug line-clamp-2 ${
                                    isCompleted
                                      ? 'line-through text-slate-400'
                                      : isLight
                                      ? 'text-slate-900 font-bold'
                                      : 'text-slate-100 font-semibold'
                                  }`}
                                >
                                  {note.title || (isId ? 'Catatan tanpa judul' : 'Untitled note')}
                                </span>
                              </div>

                              {/* Card Action Menu Toggle */}
                              <div className="relative shrink-0 flex items-center gap-1">
                                {note.is_pinned && (
                                  <Pin className="w-3 h-3 text-blue-400 rotate-45 shrink-0" />
                                )}
                                {note.is_favorite && (
                                  <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuNoteId(activeMenuNoteId === note.id ? null : note.id);
                                  }}
                                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700/60 opacity-60 group-hover:opacity-100 transition"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>

                                {/* Dropdown menu for moving to other columns or viewing note */}
                                {activeMenuNoteId === note.id && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute right-0 top-7 z-30 w-44 rounded-xl bg-[#1e2739] border border-slate-700/80 py-1 shadow-2xl text-xs text-slate-200 animate-in fade-in duration-100"
                                  >
                                    <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                      {isId ? 'Pindahkan Ke:' : 'Move To:'}
                                    </div>
                                    {COLUMNS.map((c) => (
                                      <button
                                        key={c.id}
                                        type="button"
                                        disabled={c.id === column.id}
                                        onClick={() => handleMoveNote(note.id, c.id)}
                                        className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-blue-600 hover:text-white transition disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <c.icon className={`w-3.5 h-3.5 ${c.color}`} />
                                          <span className="truncate">
                                            {isId ? c.titleId : c.titleEn}
                                          </span>
                                        </div>
                                        {c.id === column.id && <Check className="w-3.5 h-3.5 text-blue-400" />}
                                      </button>
                                    ))}

                                    <div className="border-t border-slate-700 my-1" />

                                    <button
                                      type="button"
                                      onClick={() => {
                                        onSelectNote(note.id);
                                        onClose();
                                      }}
                                      className="w-full px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white transition flex items-center gap-2 text-blue-400"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                      <span>{isId ? 'Buka di Editor' : 'Open in Editor'}</span>
                                    </button>

                                    {onDeleteNote && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          onDeleteNote(note.id);
                                          setActiveMenuNoteId(null);
                                        }}
                                        className="w-full px-3 py-1.5 text-left hover:bg-red-600 hover:text-white transition flex items-center gap-2 text-red-400"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>{isId ? 'Pindahkan ke Sampah' : 'Move to Trash'}</span>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Card Excerpt / Snippet */}
                            {note.body && (
                              <p className={`mt-1 text-[11px] line-clamp-2 leading-relaxed ${
                                isLight ? 'text-slate-600 font-normal' : 'text-slate-400'
                              }`}>
                                {note.body.replace(/^[#-]+\s+/gm, '').replace(/\[[ xX]\]/g, '')}
                              </p>
                            )}

                            {/* Subtasks / Checklist progress bar */}
                            {checklist.total > 0 && (
                              <div className={`mt-2.5 pt-2 border-t ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
                                <div className="flex items-center justify-between text-[10px] mb-1">
                                  <span className={`flex items-center gap-1 font-medium ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
                                    <CheckSquare className="w-3 h-3 text-indigo-500" />
                                    <span>
                                      {checklist.done}/{checklist.total} {isId ? 'tugas' : 'tasks'}
                                    </span>
                                  </span>
                                  <span className={`font-mono font-semibold ${isLight ? 'text-indigo-700' : 'text-indigo-400'}`}>
                                    {checklist.percent}%
                                  </span>
                                </div>
                                <div className={`w-full h-1.5 rounded-full overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}>
                                  <div
                                    className={`h-full transition-all duration-300 ${
                                      checklist.percent === 100
                                        ? 'bg-emerald-500'
                                        : 'bg-indigo-500'
                                    }`}
                                    style={{ width: `${checklist.percent}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Card Footer: Folder, Tags, Due Date */}
                            <div className={`mt-2.5 pt-2 border-t flex items-center justify-between gap-1.5 text-[10px] flex-wrap ${
                              isLight ? 'border-slate-200' : 'border-slate-800/60'
                            }`}>
                              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                {folder && (
                                  <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded max-w-[110px] truncate ${
                                    isLight ? 'bg-slate-100 text-slate-700 border border-slate-200' : 'bg-slate-800/80 text-slate-400'
                                  }`}>
                                    <FolderIcon className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                                    <span className="truncate">{folder.title}</span>
                                  </span>
                                )}

                                {(note.tags || []).slice(0, 2).map((tag) => (
                                  <span
                                    key={tag}
                                    className={`px-1.5 py-0.5 rounded max-w-[80px] truncate ${
                                      isLight ? 'bg-indigo-50 text-indigo-800 border border-indigo-200' : 'bg-slate-800/60 text-slate-400'
                                    }`}
                                  >
                                    #{tag}
                                  </span>
                                ))}
                                {(note.tags || []).length > 2 && (
                                  <span className={`text-[9px] ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>
                                    +{(note.tags || []).length - 2}
                                  </span>
                                )}
                              </div>

                              {/* Due Date Indicator */}
                              {hasDue && (
                                <div
                                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded font-mono font-medium shrink-0 ${
                                    isOverdue
                                      ? 'bg-red-950/80 text-red-300 border border-red-800/60'
                                      : isToday
                                      ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                                      : 'bg-slate-800/60 text-slate-400'
                                  }`}
                                  title={
                                    isOverdue
                                      ? isId ? 'Terlambat!' : 'Overdue!'
                                      : isToday
                                      ? isId ? 'Jatuh tempo hari ini' : 'Due today'
                                      : isId ? 'Batas waktu' : 'Due date'
                                  }
                                >
                                  {isOverdue ? (
                                    <AlertCircle className="w-3 h-3 text-red-400" />
                                  ) : (
                                    <Calendar className="w-3 h-3 text-slate-400" />
                                  )}
                                  <span>{formatDate(note.todo_due, 'DD/MM/YYYY', language)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* BOTTOM FOOTER INFO */}
        <div
          className={`flex items-center justify-between px-4 sm:px-6 py-2.5 border-t text-[11px] text-slate-400 shrink-0 ${
            isLight ? 'bg-slate-200/50 border-slate-300' : 'bg-[#151c2a] border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <span>
              {isId ? '💡 Tips:' : '💡 Tip:'}{' '}
              <span className="text-slate-300">
                {isId
                  ? 'Tarik & lepas kartu untuk memindahkan status, atau klik titik tiga untuk opsi instan.'
                  : 'Drag & drop cards to change status, or click three dots for instant options.'}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[10px]">
            <span className="hidden sm:inline text-slate-500">
              Esc: {isId ? 'Tutup' : 'Close'}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition font-sans font-medium"
            >
              {isId ? 'Tutup' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
