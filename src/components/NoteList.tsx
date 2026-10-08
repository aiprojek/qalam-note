import React, { useState } from 'react';
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
} from 'lucide-react';
import type { Note, NoteSortField, NoteSortOrder, ViewFilter, DateFormatOption, TimeFormatOption, AppLanguage } from '../types';
import { getT, formatNoteListDate, formatDate as formatGeneralDate } from '../utils/i18n';

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
  onOpenExportNoteModal?: (note: Note) => void;
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
  onOpenExportNoteModal,
  theme = 'qalam-dark',
}) => {
  const isLight = theme === 'qalam-light' || theme === 'light' || theme === 'joplin-light';
  const [activeMenuNoteId, setActiveMenuNoteId] = useState<string | null>(null);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [isListDragOver, setIsListDragOver] = useState(false);
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
            placeholder={t.search_notes}
            className="w-full bg-[#141b27] text-xs text-slate-200 pl-8 pr-7 py-1.5 rounded border border-slate-700/90 focus:border-blue-500 focus:outline-none placeholder:text-slate-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

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

        {/* Filter Pills (All / Notes / To-Dos) */}
        {!isTrashView && (
          <div className="flex items-center gap-1 mt-2 text-[11px] bg-slate-900/60 p-0.5 rounded border border-slate-800">
            <button
              onClick={() => onFilterChange('all')}
              className={`flex-1 py-0.5 text-center rounded transition font-medium ${
                filter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.filter_all}
            </button>
            <button
              onClick={() => onFilterChange('notes_only')}
              className={`flex-1 py-0.5 text-center rounded transition font-medium flex items-center justify-center gap-1 ${
                filter === 'notes_only' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-2.5 h-2.5" />
              {t.filter_notes}
            </button>
            <button
              onClick={() => onFilterChange('todos_only')}
              className={`flex-1 py-0.5 text-center rounded transition font-medium flex items-center justify-center gap-1 ${
                filter === 'todos_only' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <CheckSquare className="w-2.5 h-2.5" />
              {t.filter_todos}
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
              if ((data.type === 'qalam-note' || data.type === 'joplin-note') && data.noteId) {
                onMoveNoteToFolder(data.noteId, selectedFolderId);
              }
            } catch (err) {
              console.error('Drop note list error:', err);
            }
          }
        }}
        className={`flex-1 overflow-y-auto divide-y divide-slate-800/80 custom-scrollbar transition ${
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
          notes.map((note) => {
            const isSelected = selectedNoteId === note.id;

            return (
              <div
                key={note.id}
                onClick={() => onSelectNote(note.id)}
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
                      <p dir="auto" className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 leading-snug">
                        {getCleanSnippet(note.body)}
                      </p>
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
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className={`absolute right-0 top-6 z-40 w-44 rounded shadow-2xl py-1 text-xs border ${
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
          })
        )}
      </div>

      {/* Mobile Floating Action Button (FAB) for fast one-thumb note/todo creation */}
      {isMobile && onNewNote && !isTrashView && (
        <div className="fixed bottom-16 right-4 z-20 flex flex-col items-end gap-2">
          {showFabMenu && (
            <div className="flex flex-col items-end gap-2 mb-1 animate-in fade-in slide-in-from-bottom-2 duration-150">
              {onNewTodo && (
                <button
                  type="button"
                  onClick={() => {
                    setShowFabMenu(false);
                    onNewTodo();
                  }}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#1e2739] text-amber-300 border border-slate-700 shadow-xl text-xs font-medium active:scale-95 transition"
                >
                  <CheckSquare className="w-4 h-4 text-amber-400" />
                  <span>{t.new_todo}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowFabMenu(false);
                  onNewNote();
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#1e2739] text-blue-300 border border-slate-700 shadow-xl text-xs font-medium active:scale-95 transition"
              >
                <FileText className="w-4 h-4 text-blue-400" />
                <span>{t.new_note}</span>
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              if (onNewTodo) {
                setShowFabMenu(!showFabMenu);
              } else {
                onNewNote();
              }
            }}
            aria-label={t.new_note}
            className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-500 active:scale-90 text-white shadow-xl shadow-blue-900/40 flex items-center justify-center transition-transform"
          >
            <Plus className={`w-5 h-5 transition-transform ${showFabMenu ? 'rotate-45' : ''}`} />
          </button>
        </div>
      )}
    </div>
  );
};
