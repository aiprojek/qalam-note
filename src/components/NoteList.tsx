import React, { useState, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Search,
  ArrowUpDown,
  Circle,
  CheckCircle2,
  Lock,
  Globe,
  Star,
  Pin,
  MoreVertical,
  Trash2,
  Copy,
  Calendar,
  Filter,
  CheckSquare,
  FileText,
  X,
  ArrowLeft,
  Plus,
  FileDown,
  Columns2,
  Kanban,
  Sparkles,
} from 'lucide-react';
import type { Note, Folder, NoteSortField, NoteSortOrder, ViewFilter, DateFormatOption, TimeFormatOption, AppLanguage } from '../types';
import { getT, formatNoteListDate, formatDate as formatGeneralDate } from '../utils/i18n';
import { parseAdvancedSearchQuery } from '../utils/searchFilter';
import { calculateKanbanStats } from '../utils/kanbanSerializer';
import { NoteContextMenu } from './ContextMenu/NoteContextMenu';

interface NoteListProps {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  onToggleTodo: (noteId: string, currentCompleted: number) => void;
  onToggleStar: (noteId: string, currentStar: boolean) => void;
  onTogglePin: (noteId: string, currentPin: boolean) => void;
  onDuplicateNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  sortField: NoteSortField;
  sortOrder: NoteSortOrder;
  onSortChange: (field: NoteSortField, order: NoteSortOrder) => void;
  filter: ViewFilter;
  onFilterChange: (filter: ViewFilter) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  folderTitle?: string;
  selectedFolderId?: string | null;
  onMoveNoteToFolder?: (noteId: string, targetFolderId: string) => void;
  tagTitle?: string;
  isTrashView?: boolean;
  onRestoreNote?: (noteId: string) => void;
  onPermanentDeleteNote?: (noteId: string) => void;
  dateFormat?: DateFormatOption;
  timeFormat?: TimeFormatOption;
  language?: AppLanguage;
  onBackToSidebar?: () => void;
  isMobile?: boolean;
  onNewNote?: () => void;
  onNewTodo?: () => void;
  onNewKanban?: () => void;
  onOpenDailyNote?: () => void;
  onOpenTemplates?: () => void;
  onOpenExportNoteModal?: (note: Note) => void;
  onOpenInSplitScreen?: (noteId: string) => void;
  onCopyNoteMarkdown?: (note: Note) => void;
  folders?: Folder[];
  theme?: string;
}

export const NoteList: React.FC<NoteListProps> = ({
  notes,
  selectedNoteId,
  onSelectNote,
  onToggleTodo,
  onToggleStar,
  onTogglePin,
  onDuplicateNote,
  onDeleteNote,
  sortField,
  sortOrder,
  onSortChange,
  filter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  folderTitle,
  selectedFolderId,
  onMoveNoteToFolder,
  tagTitle,
  isTrashView = false,
  onRestoreNote,
  onPermanentDeleteNote,
  dateFormat = 'DD/MM/YYYY',
  timeFormat = '24h',
  language = 'id',
  onBackToSidebar,
  isMobile = false,
  onNewNote,
  onNewTodo,
  onNewKanban,
  onOpenDailyNote,
  onOpenTemplates,
  onOpenExportNoteModal,
  onOpenInSplitScreen,
  onCopyNoteMarkdown,
  folders = [],
  theme = 'qalam-dark',
}) => {
  const isLight = theme === 'qalam-light' || theme === 'light';
  const [activeMenuNoteId, setActiveMenuNoteId] = useState<string | null>(null);
  const [contextMenuNote, setContextMenuNote] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    note: Note | null;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    note: null,
  });
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showFilterHelper, setShowFilterHelper] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [isListDragOver, setIsListDragOver] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);

  // Parse active search operators
  const parsedSearch = React.useMemo(() => parseAdvancedSearchQuery(searchQuery), [searchQuery]);
  const hasActiveOperators =
    parsedSearch.tags.length > 0 ||
    parsedSearch.folders.length > 0 ||
    parsedSearch.isTodo !== null ||
    parsedSearch.isDone !== null ||
    parsedSearch.isPending !== null ||
    parsedSearch.hasAudio !== null ||
    parsedSearch.isLocked !== null;

  const handleToggleFilterChip = (opText: string) => {
    if (searchQuery.includes(opText)) {
      // Remove it
      const updated = searchQuery.replace(opText, '').replace(/\s{2,}/g, ' ').trim();
      onSearchChange(updated);
    } else {
      // Append it
      const updated = (searchQuery.trim() + ' ' + opText).trim();
      onSearchChange(updated);
    }
  };

  // High performance virtual list rendering for 1,000+ notes
  const rowVirtualizer = useVirtualizer({
    count: notes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 78,
    getItemKey: (index) => notes[index]?.id ?? index,
    overscan: 8,
  });

  // Ensure selected note remains visible in the virtual viewport
  useEffect(() => {
    if (selectedNoteId && notes.length > 0) {
      const index = notes.findIndex((n) => n.id === selectedNoteId);
      if (index !== -1) {
        const virtualItems = rowVirtualizer.getVirtualItems();
        if (virtualItems.length > 0) {
          const first = virtualItems[0].index;
          const last = virtualItems[virtualItems.length - 1].index;
          if (index < first || index > last) {
            rowVirtualizer.scrollToIndex(index, { align: 'auto' });
          }
        }
      }
    }
  }, [selectedNoteId, notes, rowVirtualizer]);

  // Close note context menu when clicking outside or pressing Escape
  useEffect(() => {
    if (!activeMenuNoteId) return;
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-note-action-menu="true"]')) return;
      setActiveMenuNoteId(null);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveMenuNoteId(null);
    };
    window.addEventListener('click', handleDocumentClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleDocumentClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeMenuNoteId]);

  const t = getT(language);

  // Format date helper according to user settings
  const formatNoteDate = (timestamp: number) => {
    return formatNoteListDate(timestamp, dateFormat, timeFormat, language);
  };

  // Strip markdown tags for clean snippet preview
  const getCleanSnippet = (body: string) => {
    if (!body) return t.no_additional_text;
    return body
      .replace(/#+\s+/g, '')
      .replace(/[*_~`#\[\]\(\)>]/g, '')
      .replace(/\n+/g, ' ')
      .trim()
      .substring(0, 85);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#1b2434] border-r border-slate-700/80 select-none">
      {/* Search Header */}
      <div className="p-3 bg-[#1e2739] border-b border-slate-700/80">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={
              language === 'id'
                ? 'Cari catatan atau operator (tag:, is:todo)...'
                : 'Search notes or operators (tag:, is:todo)...'
            }
            className="w-full bg-[#141b27] text-xs text-slate-200 pl-8 pr-14 py-1.5 rounded border border-slate-700/90 focus:border-blue-500 focus:outline-none placeholder:text-slate-500 transition"
          />
          <div className="absolute right-1.5 flex items-center gap-1">
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="text-slate-400 hover:text-slate-200 p-0.5"
                title={language === 'id' ? 'Hapus pencarian' : 'Clear search'}
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowFilterHelper((prev) => !prev)}
              title={language === 'id' ? 'Filter Operator Pencarian (tag:, folder:, is:todo, has:audio...)' : 'Advanced Search Filters'}
              className={`p-1 rounded transition text-xs flex items-center ${
                showFilterHelper || hasActiveOperators
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Filter className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Advanced Search Operators Helper Popover */}
        {showFilterHelper && (
          <div className={`mt-2 p-2.5 rounded-lg border text-xs shadow-xl animate-in fade-in duration-150 ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-700 text-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-slate-800/60">
              <span className="font-semibold text-[11px] text-slate-400">
                {language === 'id' ? 'Sintaks Filter & Operator:' : 'Search Operators & Syntax:'}
              </span>
              <button
                type="button"
                onClick={() => setShowFilterHelper(false)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1">
              {[
                { label: 'tag:belajar', op: 'tag:belajar' },
                { label: 'folder:projek', op: 'folder:projek' },
                { label: 'is:todo', op: 'is:todo' },
                { label: 'is:done', op: 'is:done' },
                { label: 'has:audio', op: 'has:audio' },
                { label: 'is:locked', op: 'is:locked' },
              ].map((chip) => {
                const isActive = searchQuery.includes(chip.op);
                return (
                  <button
                    key={chip.op}
                    type="button"
                    onClick={() => handleToggleFilterChip(chip.op)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition border ${
                      isActive
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : isLight
                        ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                        : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>

            <p className="mt-2 text-[10px] text-slate-500 leading-tight">
              {language === 'id'
                ? 'Tip: Gabungkan operator dengan kata kunci, contoh: "tag:belajar is:todo"'
                : 'Tip: Combine operators with search keywords, e.g. "tag:study is:todo"'}
            </p>
          </div>
        )}

        {/* Active Operator Badges */}
        {hasActiveOperators && !showFilterHelper && (
          <div className="flex flex-wrap items-center gap-1 mt-1.5 pt-0.5">
            {parsedSearch.tags.map((t) => (
              <span
                key={t}
                onClick={() => handleToggleFilterChip(`tag:${t}`)}
                className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono bg-blue-950/80 text-blue-300 border border-blue-800/60 cursor-pointer hover:bg-red-950 hover:text-red-300 hover:border-red-800 transition"
                title={language === 'id' ? 'Klik untuk hapus filter' : 'Click to remove filter'}
              >
                tag:{t} <X className="w-2.5 h-2.5" />
              </span>
            ))}
            {parsedSearch.folders.map((f) => (
              <span
                key={f}
                onClick={() => handleToggleFilterChip(`folder:${f}`)}
                className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 cursor-pointer hover:bg-red-950 hover:text-red-300 hover:border-red-800 transition"
                title={language === 'id' ? 'Klik untuk hapus filter' : 'Click to remove filter'}
              >
                folder:{f} <X className="w-2.5 h-2.5" />
              </span>
            ))}
            {parsedSearch.isTodo && (
              <span
                onClick={() => handleToggleFilterChip('is:todo')}
                className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono bg-amber-950/80 text-amber-300 border border-amber-800/60 cursor-pointer hover:bg-red-950 hover:text-red-300 hover:border-red-800 transition"
              >
                is:todo <X className="w-2.5 h-2.5" />
              </span>
            )}
            {parsedSearch.isDone && (
              <span
                onClick={() => handleToggleFilterChip('is:done')}
                className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 cursor-pointer hover:bg-red-950 hover:text-red-300 hover:border-red-800 transition"
              >
                is:done <X className="w-2.5 h-2.5" />
              </span>
            )}
            {parsedSearch.hasAudio && (
              <span
                onClick={() => handleToggleFilterChip('has:audio')}
                className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 cursor-pointer hover:bg-red-950 hover:text-red-300 hover:border-red-800 transition"
              >
                has:audio <X className="w-2.5 h-2.5" />
              </span>
            )}
            {parsedSearch.isLocked && (
              <span
                onClick={() => handleToggleFilterChip('is:locked')}
                className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono bg-rose-950/80 text-rose-300 border border-rose-800/60 cursor-pointer hover:bg-red-950 hover:text-red-300 hover:border-red-800 transition"
              >
                is:locked <X className="w-2.5 h-2.5" />
              </span>
            )}
          </div>
        )}

        {/* View title & Filter tabs (Desktop/Tablet only - on Mobile, MobileTopBar handles title and sort) */}
        {!isMobile && (
          <div className="flex items-center justify-between mt-2.5 pt-1">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 truncate max-w-[200px]">
              {onBackToSidebar && (
                <button
                  type="button"
                  onClick={onBackToSidebar}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition text-[11px] font-medium border border-slate-700/80 shrink-0"
                  title={language === 'id' ? 'Buka Buku Catatan & Folder' : 'Open Notebooks & Folders'}
                >
                  <ArrowLeft className="w-3 h-3 text-blue-400" />
                  <span>{language === 'id' ? 'Folder' : 'Folders'}</span>
                </button>
              )}
              {isTrashView ? (
                <span className="text-red-400 flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> {t.trash} ({notes.length})
                </span>
              ) : tagTitle ? (
                <span>Tag: #{tagTitle} ({notes.length})</span>
              ) : folderTitle ? (
                <span>{folderTitle} ({notes.length})</span>
              ) : (
                <span>{t.all_notes} ({notes.length})</span>
              )}
            </div>

            {/* Sort Menu Button */}
            <div className="relative">
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                title={language === 'id' ? 'Ubah urutan pengurutan' : 'Change sort order'}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700/50 transition flex items-center gap-1 text-[11px]"
              >
                <ArrowUpDown className="w-3 h-3" />
              </button>

              {showSortDropdown && (
                <div className="absolute right-0 top-6 z-30 w-44 rounded bg-[#202b3e] border border-slate-700 py-1 shadow-xl text-xs text-slate-200">
                  <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    {t.sort_by}
                  </div>
                  <button
                    onClick={() => {
                      onSortChange('updated_time', sortField === 'updated_time' && sortOrder === 'desc' ? 'asc' : 'desc');
                      setShowSortDropdown(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white transition flex items-center justify-between ${
                      sortField === 'updated_time' ? 'text-blue-400 font-semibold' : ''
                    }`}
                  >
                    <span>{t.sort_updated}</span>
                    {sortField === 'updated_time' && (
                      <span className="text-[10px] text-slate-400">{sortOrder.toUpperCase()}</span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      onSortChange('created_time', sortField === 'created_time' && sortOrder === 'desc' ? 'asc' : 'desc');
                      setShowSortDropdown(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white transition flex items-center justify-between ${
                      sortField === 'created_time' ? 'text-blue-400 font-semibold' : ''
                    }`}
                  >
                    <span>{t.sort_created}</span>
                    {sortField === 'created_time' && (
                      <span className="text-[10px] text-slate-400">{sortOrder.toUpperCase()}</span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      onSortChange('title', sortField === 'title' && sortOrder === 'asc' ? 'desc' : 'asc');
                      setShowSortDropdown(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white transition flex items-center justify-between ${
                      sortField === 'title' ? 'text-blue-400 font-semibold' : ''
                    }`}
                  >
                    <span>{t.sort_title}</span>
                    {sortField === 'title' && (
                      <span className="text-[10px] text-slate-400">{sortOrder.toUpperCase()}</span>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Filter Pills (All / Notes / To-Dos / Kanban - Compact & Non-wrapping) */}
        {!isTrashView && (
          <div className={`flex items-center gap-0.5 mt-2 p-0.5 rounded-lg border flex-nowrap text-[11px] ${
            isLight ? 'bg-slate-200/80 border-slate-300' : 'bg-slate-900/80 border-slate-800'
          }`}>
            <button
              type="button"
              onClick={() => onFilterChange('all')}
              title={t.filter_all}
              className={`flex-1 min-w-0 py-1 px-1 rounded-md transition font-medium whitespace-nowrap shrink flex items-center justify-center gap-1 text-[11px] ${
                filter === 'all'
                  ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/60'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="truncate">{t.filter_all}</span>
            </button>
            <button
              type="button"
              onClick={() => onFilterChange('notes_only')}
              title={t.filter_notes}
              className={`flex-1 min-w-0 py-1 px-1 rounded-md transition font-medium whitespace-nowrap shrink flex items-center justify-center gap-1 text-[11px] ${
                filter === 'notes_only'
                  ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/60'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <FileText className="w-3 h-3 shrink-0" />
              <span className="truncate">{t.filter_notes}</span>
            </button>
            <button
              type="button"
              onClick={() => onFilterChange('todos_only')}
              title={t.filter_todos}
              className={`flex-1 min-w-0 py-1 px-1 rounded-md transition font-medium whitespace-nowrap shrink flex items-center justify-center gap-1 text-[11px] ${
                filter === 'todos_only'
                  ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/60'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <CheckSquare className="w-3 h-3 shrink-0" />
              <span className="truncate">{t.filter_todos}</span>
            </button>
            <button
              type="button"
              onClick={() => onFilterChange('kanban_only')}
              title="Kanban"
              className={`flex-1 min-w-0 py-1 px-1 rounded-md transition font-medium whitespace-nowrap shrink flex items-center justify-center gap-1 text-[11px] ${
                filter === 'kanban_only'
                  ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/60'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Kanban className={`w-3 h-3 shrink-0 ${filter === 'kanban_only' ? 'text-white' : 'text-indigo-500'}`} />
              <span className="truncate">Kanban</span>
            </button>
          </div>
        )}
      </div>

      {/* Notes List */}
      <div
        onDragOver={(e) => {
          if (selectedFolderId && onMoveNoteToFolder && !isTrashView) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (!isListDragOver) setIsListDragOver(true);
          }
        }}
        onDragLeave={() => {
          setIsListDragOver(false);
        }}
        onDrop={(e) => {
          if (selectedFolderId && onMoveNoteToFolder && !isTrashView) {
            e.preventDefault();
            setIsListDragOver(false);
            try {
              const dataStr = e.dataTransfer.getData('application/json');
              if (!dataStr) return;
              const data = JSON.parse(dataStr);
              if (data.type === 'qalam-note' && data.noteId) {
                onMoveNoteToFolder(data.noteId, selectedFolderId);
              }
            } catch (err) {
              console.error('Drop note list error:', err);
            }
          }
        }}
        ref={parentRef}
        className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar transition ${
          isListDragOver ? 'ring-2 ring-blue-500 bg-blue-950/20' : ''
        }`}
      >
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-4 text-slate-500">
            <FileText className="w-8 h-8 mb-2 opacity-40" />
            <span className="text-xs">{t.no_notes_found}</span>
            {searchQuery && (
              <span className="text-[11px] text-slate-600 mt-1">{t.try_another_search}</span>
            )}
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const note = notes[virtualRow.index];
              const isSelected = selectedNoteId === note.id;

              return (
                <div
                  key={note.id}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                    zIndex: activeMenuNoteId === note.id ? 50 : 1,
                  }}
                  onClick={() => onSelectNote(note.id)}
                  onContextMenu={(e) => {
                    if (e.shiftKey) return;
                    e.preventDefault();
                    e.stopPropagation();
                    onSelectNote(note.id);
                    setActiveMenuNoteId(null);
                    setContextMenuNote({
                      isOpen: true,
                      x: e.clientX,
                      y: e.clientY,
                      note,
                    });
                  }}
                  draggable={!isTrashView}
                onDragStart={(e) => {
                  e.dataTransfer.setData(
                    'application/json',
                    JSON.stringify({ type: 'qalam-note', noteId: note.id, title: note.title })
                  );
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', note.title || 'Note');
                }}
                title={
                  !isTrashView
                    ? language === 'id'
                      ? 'Tahan dan geser (drag) ke folder di panel kiri untuk memindahkan'
                      : 'Drag onto a notebook in the sidebar to move'
                    : undefined
                }
                className={`group relative p-3 text-left border-l-4 transition-colors duration-150 select-none ${
                  !isTrashView ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                } ${
                  isSelected
                    ? 'bg-[#283852] border-blue-500 text-white shadow-xs'
                    : 'border-transparent hover:bg-[#202b3d] text-slate-300'
                }`}
              >
                {/* Note Header: Checkbox (if todo), Title, Icons */}
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    {/* To-Do interactive checkbox */}
                    {note.is_todo && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleTodo(note.id, note.todo_completed);
                        }}
                        className="mt-0.5 text-slate-400 hover:text-blue-400 transition shrink-0"
                      >
                        {note.todo_completed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-500" />
                        )}
                      </button>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {note.is_pinned && (
                          <Pin className="w-3 h-3 text-blue-400 shrink-0 fill-blue-400" />
                        )}
                        {note.is_kanban && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shrink-0 flex items-center gap-0.5">
                            <Kanban className="w-2.5 h-2.5" />
                            <span>KANBAN</span>
                          </span>
                        )}
                        <h4
                          dir="auto"
                          className={`text-xs font-semibold truncate ${
                            note.todo_completed
                              ? 'line-through text-slate-500'
                              : isSelected
                              ? 'text-white'
                              : 'text-slate-100'
                          }`}
                        >
                          {note.title || t.untitled_note}
                        </h4>
                      </div>

                      {/* Excerpt Snippet */}
                      {note.is_kanban ? (
                        (() => {
                          const kStats = calculateKanbanStats(note.kanban_data);
                          return (
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-indigo-300/80">
                              <span>
                                {kStats.totalCards > 0
                                  ? `${kStats.completedCards}/${kStats.totalCards} tugas selesai (${kStats.percentage}%)`
                                  : (language === 'id' ? 'Papan Proyek Kanban' : 'Kanban Project Board')}
                              </span>
                              {kStats.totalCards > 0 && (
                                <div className="w-12 bg-slate-800 h-1 rounded-full overflow-hidden shrink-0">
                                  <div
                                    className="bg-indigo-400 h-full rounded-full"
                                    style={{ width: `${kStats.percentage}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        <p dir="auto" className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 leading-snug">
                          {getCleanSnippet(note.body)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Kebab Action Menu Trigger */}
                  <div className="relative shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuNoteId(activeMenuNoteId === note.id ? null : note.id);
                      }}
                      className="opacity-75 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-slate-700/60 transition"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    {/* Context Action Menu */}
                    {activeMenuNoteId === note.id && (
                      <>
                        <div
                          className="fixed inset-0 z-40 cursor-default"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuNoteId(null);
                          }}
                        />
                        <div
                          data-note-action-menu="true"
                          onClick={(e) => e.stopPropagation()}
                          className={`absolute right-0 top-6 z-50 w-44 rounded-lg shadow-2xl py-1 text-xs border ${
                            isLight
                              ? 'bg-white border-slate-300 text-slate-800'
                              : 'bg-[#1e2739] border-slate-700 text-slate-200'
                          }`}
                        >
                        {!isTrashView ? (
                          <>
                            <button
                              onClick={() => {
                                onToggleStar(note.id, note.is_favorite);
                                setActiveMenuNoteId(null);
                              }}
                              className={`w-full px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white flex items-center gap-2 ${
                                isLight ? 'text-slate-700' : 'text-slate-200'
                              }`}
                            >
                              <Star className="w-3.5 h-3.5 text-amber-400" />
                              <span>{note.is_favorite ? t.unstar : t.star}</span>
                            </button>
                            <button
                              onClick={() => {
                                onTogglePin(note.id, note.is_pinned);
                                setActiveMenuNoteId(null);
                              }}
                              className={`w-full px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white flex items-center gap-2 ${
                                isLight ? 'text-slate-700' : 'text-slate-200'
                              }`}
                            >
                              <Pin className="w-3.5 h-3.5 text-blue-400" />
                              <span>{note.is_pinned ? t.unpin : t.pin}</span>
                            </button>
                            <button
                              onClick={() => {
                                onDuplicateNote(note);
                                setActiveMenuNoteId(null);
                              }}
                              className={`w-full px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white flex items-center gap-2 ${
                                isLight ? 'text-slate-700' : 'text-slate-200'
                              }`}
                            >
                              <Copy className="w-3.5 h-3.5 text-slate-400" />
                              <span>{t.duplicate}</span>
                            </button>
                            {onCopyNoteMarkdown && (
                              <button
                                onClick={() => {
                                  onCopyNoteMarkdown(note);
                                  setActiveMenuNoteId(null);
                                }}
                                className={`w-full px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white flex items-center gap-2 ${
                                  isLight ? 'text-cyan-700 font-medium' : 'text-cyan-300'
                                }`}
                              >
                                <Copy className="w-3.5 h-3.5 text-cyan-400" />
                                <span>{language === 'id' ? 'Salin Teks (Markdown)' : 'Copy Text (Markdown)'}</span>
                              </button>
                            )}
                            {onOpenExportNoteModal && (
                              <button
                                onClick={() => {
                                  onOpenExportNoteModal(note);
                                  setActiveMenuNoteId(null);
                                }}
                                className={`w-full px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white flex items-center gap-2 ${
                                  isLight ? 'text-blue-700 font-medium' : 'text-blue-300'
                                }`}
                              >
                                <FileDown className="w-3.5 h-3.5 text-blue-500" />
                                <span>{language === 'id' ? 'Ekspor Catatan...' : 'Export Note...'}</span>
                              </button>
                            )}
                            {onOpenInSplitScreen && (
                              <button
                                onClick={() => {
                                  onOpenInSplitScreen(note.id);
                                  setActiveMenuNoteId(null);
                                }}
                                className={`w-full px-3 py-1.5 text-left hover:bg-purple-600 hover:text-white flex items-center gap-2 ${
                                  isLight ? 'text-purple-700 font-medium' : 'text-purple-300'
                                }`}
                              >
                                <Columns2 className="w-3.5 h-3.5 text-purple-400" />
                                <span>{language === 'id' ? 'Buka Berdampingan' : 'Open Side-by-Side'}</span>
                              </button>
                            )}
                            <div className={`border-t my-1 ${isLight ? 'border-slate-200' : 'border-slate-700'}`} />
                            <button
                              onClick={() => {
                                onDeleteNote(note.id);
                                setActiveMenuNoteId(null);
                              }}
                              className="w-full px-3 py-1.5 text-left text-red-500 hover:bg-red-600 hover:text-white flex items-center gap-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>{t.move_to_trash}</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                if (onRestoreNote) onRestoreNote(note.id);
                                setActiveMenuNoteId(null);
                              }}
                              className="w-full px-3 py-1.5 text-left text-emerald-500 hover:bg-emerald-600 hover:text-white flex items-center gap-2"
                            >
                              <span>{t.restore_note}</span>
                            </button>
                            <button
                              onClick={() => {
                                if (onPermanentDeleteNote) onPermanentDeleteNote(note.id);
                                setActiveMenuNoteId(null);
                              }}
                              className="w-full px-3 py-1.5 text-left text-red-500 hover:bg-red-600 hover:text-white flex items-center gap-2"
                            >
                              <span>{t.delete_forever}</span>
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                  </div>
                </div>

                {/* Footer of note item: Date, Tags, Badges */}
                <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500">
                  <div className="flex items-center gap-2">
                    <span>{formatNoteDate(note.updated_time)}</span>
                    {note.is_todo && note.todo_due > 0 && (
                      <span className="flex items-center gap-0.5 text-amber-400">
                        <Calendar className="w-2.5 h-2.5" />
                        {formatGeneralDate(note.todo_due, dateFormat, language)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* E2EE badge */}
                    {note.is_encrypted && (
                      <span title={language === 'id' ? 'Terenkripsi E2EE' : 'E2EE Encrypted'}>
                        <Lock className="w-2.5 h-2.5 text-amber-400" />
                      </span>
                    )}

                    {/* Published to Web (GAS) badge */}
                    {note.published_info?.is_published && (
                      <span title={language === 'id' ? 'Dipublikasikan ke Web' : 'Published to Web'}>
                        <Globe className="w-2.5 h-2.5 text-emerald-400" />
                      </span>
                    )}

                    {/* Star badge */}
                    {note.is_favorite && (
                      <Star className="w-2.5 h-2.5 text-amber-300 fill-amber-300" />
                    )}

                    {/* Tags (Unboxed zero-pill text) */}
                    {note.tags && note.tags.length > 0 && (
                      <span className="text-slate-400 font-mono truncate max-w-[85px]">
                        #{note.tags[0]}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>

      {/* Mobile Floating Action Button (FAB) - Central hub for all creation actions */}
      {isMobile && onNewNote && !isTrashView && (
        <>
          {showFabMenu && (
            <div
              className="fixed inset-0 z-15 bg-black/30 backdrop-blur-[1px] animate-in fade-in duration-150"
              onClick={() => setShowFabMenu(false)}
              aria-hidden="true"
            />
          )}
          <div className="fixed bottom-16 right-4 z-20 flex flex-col items-end gap-2">
            {showFabMenu && (
              <div className="flex flex-col items-end gap-2 mb-1 animate-in fade-in slide-in-from-bottom-2 duration-150">
                {onOpenTemplates && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowFabMenu(false);
                      onOpenTemplates();
                    }}
                    className={`flex items-center gap-2.5 px-3.5 py-2 rounded-full shadow-xl text-xs font-medium active:scale-95 transition ${
                      isLight
                        ? 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-50 shadow-slate-300/60'
                        : 'bg-[#1e2739] text-purple-300 border border-slate-700 shadow-xl hover:bg-[#253248]'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
                    <span>{language === 'id' ? 'Galeri Templat' : 'Templates Gallery'}</span>
                  </button>
                )}
                {onOpenDailyNote && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowFabMenu(false);
                      onOpenDailyNote();
                    }}
                    className={`flex items-center gap-2.5 px-3.5 py-2 rounded-full shadow-xl text-xs font-medium active:scale-95 transition ${
                      isLight
                        ? 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50 shadow-slate-300/60'
                        : 'bg-[#1e2739] text-emerald-300 border border-slate-700 shadow-xl hover:bg-[#253248]'
                    }`}
                  >
                    <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{language === 'id' ? 'Catatan Harian Hari Ini' : "Today's Daily Note"}</span>
                  </button>
                )}
                {onNewKanban && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowFabMenu(false);
                      onNewKanban();
                    }}
                    className={`flex items-center gap-2.5 px-3.5 py-2 rounded-full shadow-xl text-xs font-medium active:scale-95 transition ${
                      isLight
                        ? 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50 shadow-slate-300/60'
                        : 'bg-[#1e2739] text-indigo-300 border border-slate-700 shadow-xl hover:bg-[#253248]'
                    }`}
                  >
                    <Kanban className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>{language === 'id' ? 'Papan Kanban Baru' : 'New Kanban Board'}</span>
                  </button>
                )}
                {onNewTodo && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowFabMenu(false);
                      onNewTodo();
                    }}
                    className={`flex items-center gap-2.5 px-3.5 py-2 rounded-full shadow-xl text-xs font-medium active:scale-95 transition ${
                      isLight
                        ? 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50 shadow-slate-300/60'
                        : 'bg-[#1e2739] text-amber-300 border border-slate-700 shadow-xl hover:bg-[#253248]'
                    }`}
                  >
                    <CheckSquare className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>{t.new_todo}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowFabMenu(false);
                    onNewNote();
                  }}
                  className={`flex items-center gap-2.5 px-3.5 py-2 rounded-full shadow-xl text-xs font-medium active:scale-95 transition ${
                    isLight
                      ? 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50 shadow-slate-300/60'
                      : 'bg-[#1e2739] text-blue-300 border border-slate-700 shadow-xl hover:bg-[#253248]'
                  }`}
                >
                  <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>{t.new_note}</span>
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                if (onNewTodo || onNewKanban || onOpenDailyNote || onOpenTemplates) {
                  setShowFabMenu(!showFabMenu);
                } else {
                  onNewNote();
                }
              }}
              aria-label={t.new_note}
              className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-500 active:scale-90 text-white shadow-xl shadow-blue-900/40 flex items-center justify-center transition-transform"
            >
              <Plus className={`w-5 h-5 transition-transform duration-200 ${showFabMenu ? 'rotate-45' : ''}`} />
            </button>
          </div>
        </>
      )}

      {/* Note Right-Click Context Menu */}
      {contextMenuNote.isOpen && contextMenuNote.note && (
        <NoteContextMenu
          note={contextMenuNote.note}
          isOpen={contextMenuNote.isOpen}
          position={{ x: contextMenuNote.x, y: contextMenuNote.y }}
          onClose={() => setContextMenuNote((prev) => ({ ...prev, isOpen: false, note: null }))}
          onSelectNote={onSelectNote}
          onToggleStar={onToggleStar}
          onTogglePin={onTogglePin}
          onToggleTodo={onToggleTodo}
          onDuplicateNote={onDuplicateNote}
          onDeleteNote={onDeleteNote}
          onRestoreNote={onRestoreNote}
          onPermanentDeleteNote={onPermanentDeleteNote}
          onOpenInSplitScreen={onOpenInSplitScreen}
          onOpenExportNoteModal={onOpenExportNoteModal}
          onCopyNoteMarkdown={onCopyNoteMarkdown}
          onMoveNoteToFolder={onMoveNoteToFolder}
          folders={folders}
          isTrashView={isTrashView}
          language={language}
          theme={theme}
        />
      )}
    </div>
  );
};
