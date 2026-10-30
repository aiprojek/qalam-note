import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Kanban,
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Calendar,
  MoreVertical,
  Trash2,
  Share2,
  ExternalLink,
  Copy,
  Check,
  Globe,
  Tag,
  ListTodo,
  FileText,
  Filter,
  Search,
  X,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Download,
  Flame,
  Eye,
} from 'lucide-react';
import type {
  Note,
  KanbanBoardData,
  KanbanBoardColumn,
  KanbanCardItem,
  KanbanStatus,
  KanbanPriority,
  KanbanChecklistItem,
  AppLanguage,
} from '../../types';
import {
  createInitialKanbanData,
  calculateKanbanStats,
  kanbanDataToMarkdown,
  markdownToKanbanData,
} from '../../utils/kanbanSerializer';

interface ProjectKanbanEditorProps {
  note: Note;
  onUpdateNote: (updated: Partial<Note>) => void;
  onOpenPublish: () => void;
  onCopyMarkdown?: () => void;
  onExportPdf?: () => void;
  language?: AppLanguage;
  theme?: string;
  isMobile?: boolean;
  isReadOnly?: boolean;
}

interface ColumnMeta {
  id: KanbanStatus;
  titleId: string;
  titleEn: string;
  badgeBgDark: string;
  badgeBgLight: string;
  headerBgDark: string;
  headerBgLight: string;
  borderColDark: string;
  borderColLight: string;
  icon: string;
}

const COLUMN_METAS: ColumnMeta[] = [
  {
    id: 'backlog',
    titleId: 'Rencana & Ide',
    titleEn: 'Backlog & Ideas',
    badgeBgDark: 'bg-purple-950/70 border-purple-800/60 text-purple-300',
    badgeBgLight: 'bg-purple-100 border-purple-300 text-purple-900 font-bold',
    headerBgDark: 'bg-purple-950/20 border-slate-700/60 text-slate-100',
    headerBgLight: 'bg-purple-50/90 border-purple-200 text-purple-950',
    borderColDark: 'border-purple-600/60',
    borderColLight: 'border-purple-300',
    icon: '📥',
  },
  {
    id: 'todo',
    titleId: 'Akan Dikerjakan',
    titleEn: 'To Do',
    badgeBgDark: 'bg-blue-950/70 border-blue-800/60 text-blue-300',
    badgeBgLight: 'bg-blue-100 border-blue-300 text-blue-900 font-bold',
    headerBgDark: 'bg-blue-950/20 border-slate-700/60 text-slate-100',
    headerBgLight: 'bg-blue-50/90 border-blue-200 text-blue-950',
    borderColDark: 'border-blue-600/60',
    borderColLight: 'border-blue-300',
    icon: '🔵',
  },
  {
    id: 'in_progress',
    titleId: 'Sedang Dikerjakan',
    titleEn: 'In Progress',
    badgeBgDark: 'bg-amber-950/70 border-amber-800/60 text-amber-300',
    badgeBgLight: 'bg-amber-100 border-amber-300 text-amber-900 font-bold',
    headerBgDark: 'bg-amber-950/20 border-slate-700/60 text-slate-100',
    headerBgLight: 'bg-amber-50/90 border-amber-200 text-amber-950',
    borderColDark: 'border-amber-600/60',
    borderColLight: 'border-amber-300',
    icon: '🟡',
  },
  {
    id: 'done',
    titleId: 'Selesai',
    titleEn: 'Done',
    badgeBgDark: 'bg-emerald-950/70 border-emerald-800/60 text-emerald-300',
    badgeBgLight: 'bg-emerald-100 border-emerald-300 text-emerald-900 font-bold',
    headerBgDark: 'bg-emerald-950/20 border-slate-700/60 text-slate-100',
    headerBgLight: 'bg-emerald-50/90 border-emerald-200 text-emerald-900',
    borderColDark: 'border-emerald-600/60',
    borderColLight: 'border-emerald-300',
    icon: '🟢',
  },
];

export const ProjectKanbanEditor: React.FC<ProjectKanbanEditorProps> = ({
  note,
  onUpdateNote,
  onOpenPublish,
  onCopyMarkdown,
  onExportPdf,
  language = 'id',
  theme,
  isMobile = false,
  isReadOnly = false,
}) => {
  const isId = language === 'id';
  const isLight = theme === 'qalam-light';

  // Active board state initialized from note.kanban_data or parsed from note.body
  const boardData: KanbanBoardData = useMemo(() => {
    if (note.kanban_data && Array.isArray(note.kanban_data.columns) && note.kanban_data.columns.length > 0) {
      return note.kanban_data;
    }
    if (note.body && note.body.trim()) {
      return markdownToKanbanData(note.body);
    }
    return createInitialKanbanData(note.title, isId);
  }, [note.kanban_data, note.body, note.title, isId]);

  // Search & Filter within this project board
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  // Drag & drop state
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [draggedSourceCol, setDraggedSourceCol] = useState<KanbanStatus | null>(null);
  const [dragOverCol, setDragOverCol] = useState<KanbanStatus | null>(null);

  // Quick card add input per column
  const [addingInCol, setAddingInCol] = useState<KanbanStatus | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');

  // Editing Card Modal State
  const [editingCard, setEditingCard] = useState<{
    card: KanbanCardItem;
    columnId: KanbanStatus;
  } | null>(null);

  // New sub-task checklist input in modal
  const [newChecklistText, setNewChecklistText] = useState('');

  // Link copied toast
  const [copiedLink, setCopiedLink] = useState(false);

  // Calculate statistics
  const stats = useMemo(() => calculateKanbanStats(boardData), [boardData]);

  // Persist updated board data and synchronize markdown body
  const commitBoardChanges = (newBoard: KanbanBoardData) => {
    const newMarkdown = kanbanDataToMarkdown(newBoard, note.title);
    const newStats = calculateKanbanStats(newBoard);

    onUpdateNote({
      kanban_data: newBoard,
      body: newMarkdown,
      todo_completed: newStats.totalCards > 0 && newStats.totalCards === newStats.completedCards ? Date.now() : 0,
      updated_time: Date.now(),
      sync_status: 'pending',
    });
  };

  // Add Card in a Column
  const handleAddCard = (columnId: KanbanStatus) => {
    if (!newCardTitle.trim()) {
      setAddingInCol(null);
      return;
    }

    const now = Date.now();
    const newCard: KanbanCardItem = {
      id: `card-${now}-${Math.random().toString(36).substring(2, 7)}`,
      title: newCardTitle.trim(),
      description: '',
      priority: 'medium',
      created_at: now,
    };

    const nextColumns = boardData.columns.map((col) => {
      if (col.id === columnId) {
        return {
          ...col,
          cards: [...col.cards, newCard],
        };
      }
      return col;
    });

    commitBoardChanges({ ...boardData, columns: nextColumns });
    setNewCardTitle('');
    setAddingInCol(null);
  };

  // Move Card between Columns
  const handleMoveCard = (cardId: string, targetColId: KanbanStatus) => {
    if (isReadOnly) return;
    let cardToMove: KanbanCardItem | null = null;

    // Remove from existing
    const columnsWithoutCard = boardData.columns.map((col) => {
      const found = col.cards.find((c) => c.id === cardId);
      if (found) {
        cardToMove = found;
        return {
          ...col,
          cards: col.cards.filter((c) => c.id !== cardId),
        };
      }
      return col;
    });

    if (!cardToMove) return;

    // Add to target column
    const nextColumns = columnsWithoutCard.map((col) => {
      if (col.id === targetColId) {
        return {
          ...col,
          cards: [cardToMove!, ...col.cards],
        };
      }
      return col;
    });

    commitBoardChanges({ ...boardData, columns: nextColumns });
  };

  // Delete Card
  const handleDeleteCard = (cardId: string) => {
    if (isReadOnly) return;
    const nextColumns = boardData.columns.map((col) => ({
      ...col,
      cards: col.cards.filter((c) => c.id !== cardId),
    }));
    commitBoardChanges({ ...boardData, columns: nextColumns });
    if (editingCard?.card.id === cardId) {
      setEditingCard(null);
    }
  };

  // Save Card from Modal
  const handleSaveCardModal = (updatedCard: KanbanCardItem, targetColId?: KanbanStatus) => {
    if (isReadOnly) {
      setEditingCard(null);
      return;
    }
    const finalColId = targetColId || editingCard?.columnId || 'todo';
    const oldColId = editingCard?.columnId;

    if (oldColId && oldColId !== finalColId) {
      // Remove from old column, add to new column
      const columnsWithout = boardData.columns.map((col) => {
        if (col.id === oldColId) {
          return { ...col, cards: col.cards.filter((c) => c.id !== updatedCard.id) };
        }
        return col;
      });
      const nextColumns = columnsWithout.map((col) => {
        if (col.id === finalColId) {
          return { ...col, cards: [updatedCard, ...col.cards] };
        }
        return col;
      });
      commitBoardChanges({ ...boardData, columns: nextColumns });
    } else {
      // Update in place
      const nextColumns = boardData.columns.map((col) => {
        if (col.id === finalColId) {
          return {
            ...col,
            cards: col.cards.map((c) => (c.id === updatedCard.id ? updatedCard : c)),
          };
        }
        return col;
      });
      commitBoardChanges({ ...boardData, columns: nextColumns });
    }

    setEditingCard(null);
  };

  // Copy Client Share Link
  const handleCopyClientLink = () => {
    if (!note.published_info?.public_url) {
      onOpenPublish();
      return;
    }
    navigator.clipboard.writeText(note.published_info.public_url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Drag & drop handlers
  const handleDragStart = (e: React.DragEvent, cardId: string, colId: KanbanStatus) => {
    if (isReadOnly) {
      e.preventDefault();
      return;
    }
    setDraggedCardId(cardId);
    setDraggedSourceCol(colId);
    e.dataTransfer.setData('text/plain', cardId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, colId: KanbanStatus) => {
    if (isReadOnly) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCol !== colId) {
      setDragOverCol(colId);
    }
  };

  const handleDrop = (e: React.DragEvent, targetColId: KanbanStatus) => {
    if (isReadOnly) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    setDragOverCol(null);
    if (!draggedCardId) return;

    if (draggedSourceCol !== targetColId) {
      handleMoveCard(draggedCardId, targetColId);
    }
    setDraggedCardId(null);
    setDraggedSourceCol(null);
  };

  const isPublished = Boolean(note.published_info?.is_published);

  return (
    <div className={`flex flex-col h-full w-full select-none transition-colors ${
      isLight ? 'bg-slate-100 text-slate-800' : 'bg-[#151c28] text-slate-100'
    }`}>
      {/* Top Project Dashboard Strip (Compact for tablet and mobile) */}
      <div className={`px-3 sm:px-4 py-2 border-b shrink-0 transition-colors ${
        isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-[#1a2334] border-slate-700/80'
      }`}>
        {/* Row 1: Title, Badge, & Publish Actions */}
        <div className="flex items-center justify-between gap-2 flex-nowrap">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-blue-600/15 text-blue-400 border border-blue-500/30 shrink-0">
              <Kanban className="w-4 h-4 text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-nowrap">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
                  isLight ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-blue-950/60 text-blue-400 border border-blue-800/60'
                }`}>
                  Kanban
                </span>
                {isPublished && (
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0 ${
                    isLight ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                  }`}>
                    <Globe className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span>Live</span>
                  </span>
                )}
                {isReadOnly && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0 ${
                    isLight ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                  }`}>
                    <Eye className="w-3 h-3 text-amber-500 shrink-0" />
                    <span>{isId ? 'Lihat Saja' : 'Read Only'}</span>
                  </span>
                )}
              </div>
              <h2 className={`text-xs sm:text-sm font-bold truncate mt-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {note.title || (isId ? 'Papan Proyek Tanpa Judul' : 'Untitled Project Board')}
              </h2>
            </div>
          </div>

          {/* Action Buttons: Publish, Copy Link, Toggle Mode */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 flex-nowrap">
            {/* Publish / Client Sharing Button */}
            <button
              type="button"
              onClick={onOpenPublish}
              title={isPublished ? (isId ? 'Kelola Publikasi Klien' : 'Manage Client Access') : (isId ? 'Publikasikan ke Klien' : 'Publish to Client')}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold shadow-xs transition active:scale-95 shrink-0 whitespace-nowrap ${
                isPublished
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5 shrink-0" />
              <span>{isPublished ? (isId ? 'Kelola' : 'Manage') : (isId ? 'Publikasi' : 'Publish')}</span>
            </button>

            {/* If published, quick Copy Client Link button */}
            {isPublished && (
              <button
                type="button"
                onClick={handleCopyClientLink}
                title={isId ? 'Salin tautan langsung untuk klien' : 'Copy live client link'}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium transition active:scale-95 shrink-0 whitespace-nowrap ${
                  isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-600 font-semibold">{isId ? 'Tersalin' : 'Copied'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-blue-500" />
                    <span>{isId ? 'Salin' : 'Copy'}</span>
                  </>
                )}
              </button>
            )}

            {/* Convert to standard note toggle (only in edit mode) */}
            {!isReadOnly && (
              <button
                type="button"
                onClick={() => onUpdateNote({ is_kanban: false })}
                title={isId ? 'Beralih ke format catatan biasa' : 'Switch to standard note view'}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs transition shrink-0 whitespace-nowrap ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>{isId ? 'Teks' : 'Text'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Live Progress Meter & Search (Compact, single-row on mobile and tablet) */}
        <div className={`mt-2 flex items-center justify-between gap-2 pt-1.5 border-t flex-nowrap overflow-x-auto custom-scrollbar ${
          isLight ? 'border-slate-200' : 'border-slate-700/50'
        }`}>
          {/* Progress bar */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0 shrink-0">
            <div className={`w-16 sm:w-28 rounded-full h-2 p-0.5 border overflow-hidden shrink-0 ${
              isLight ? 'bg-slate-200 border-slate-300' : 'bg-slate-800/80 border-slate-700/80'
            }`}>
              <div
                className="bg-linear-to-r from-blue-500 via-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${stats.percentage}%` }}
              />
            </div>
            <span className={`text-xs font-bold shrink-0 font-mono ${
              isLight ? 'text-emerald-700' : 'text-emerald-400'
            }`}>
              {stats.percentage}%
            </span>
            <span className={`text-[11px] shrink-0 font-medium ${
              isLight ? 'text-slate-600' : 'text-slate-400'
            }`}>
              ({stats.completedCards}/{stats.totalCards})
            </span>
          </div>

          {/* Quick Filter & Search */}
          <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
            <div className="relative flex items-center">
              <Search className="w-3 h-3 absolute left-2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isId ? 'Cari...' : 'Filter...'}
                className={`text-xs pl-6 pr-5 py-1 rounded-lg border outline-none transition w-24 sm:w-32 ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 placeholder-slate-400'
                    : 'bg-slate-900 border-slate-700 text-slate-100 focus:border-blue-500 placeholder-slate-500'
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1.5 p-0.5 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className={`text-xs py-1 px-1.5 rounded-lg border outline-none transition cursor-pointer shrink-0 max-w-[125px] ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-800'
                  : 'bg-slate-900 border-slate-700 text-slate-200'
              }`}
            >
              <option value="all">{isId ? 'Semua Prioritas' : 'All Priority'}</option>
              <option value="urgent">🔴 {isId ? 'Mendesak' : 'Urgent'}</option>
              <option value="high">🟠 {isId ? 'Tinggi' : 'High'}</option>
              <option value="medium">🟡 {isId ? 'Sedang' : 'Medium'}</option>
              <option value="low">🟢 {isId ? 'Rendah' : 'Low'}</option>
            </select>
          </div>
        </div>

        {/* Read-Only Notice Banner when in Preview Mode */}
        {isReadOnly && (
          <div className={`mt-2 px-3 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 shrink-0 ${
            isLight
              ? 'bg-blue-50 text-blue-800 border-blue-200'
              : 'bg-blue-950/40 text-blue-300 border-blue-800/60'
          }`}>
            <Eye className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>{isId ? 'Mode Pratinjau (Hanya Lihat): Tugas dan kartu tidak dapat diedit atau digeser.' : 'Preview Mode (Read-Only): Tasks and cards cannot be edited or moved.'}</span>
          </div>
        )}
      </div>

      {/* Kanban Multi-Column Grid (Non-overlapping with snap-x on tablet and mobile) */}
      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden p-3 sm:p-5 custom-scrollbar">
        <div className="flex items-start gap-3.5 sm:gap-4 h-full pb-2 snap-x">
          {COLUMN_METAS.map((colMeta) => {
            const currentColumn = boardData.columns.find((c) => c.id === colMeta.id) || {
              id: colMeta.id,
              title: isId ? colMeta.titleId : colMeta.titleEn,
              cards: [],
            };

            // Filter cards inside this column
            const filteredCards = currentColumn.cards.filter((card) => {
              if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchTitle = card.title.toLowerCase().includes(q);
                const matchDesc = (card.description || '').toLowerCase().includes(q);
                const matchTag = (card.tags || []).some((t) => t.toLowerCase().includes(q));
                if (!matchTitle && !matchDesc && !matchTag) return false;
              }
              if (filterPriority !== 'all') {
                if (card.priority !== filterPriority) return false;
              }
              return true;
            });

            const isDropping = dragOverCol === colMeta.id;

            return (
              <div
                key={colMeta.id}
                onDragOver={(e) => handleDragOver(e, colMeta.id)}
                onDrop={(e) => handleDrop(e, colMeta.id)}
                className={`w-[280px] sm:w-[300px] shrink-0 snap-start flex flex-col h-full rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isDropping
                    ? `ring-2 ring-blue-500 border-blue-400 ${isLight ? 'bg-blue-50/70' : 'bg-blue-950/30'} shadow-xl`
                    : isLight
                    ? 'bg-white border-slate-200 shadow-xs'
                    : 'bg-[#182130] border-slate-700/80 shadow-md'
                }`}
              >
                {/* Column Header */}
                <div className={`p-3 border-b flex items-center justify-between shrink-0 ${
                  isLight ? colMeta.headerBgLight : colMeta.headerBgDark
                } ${isLight ? colMeta.borderColLight : 'border-slate-700/60'}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base select-none">{colMeta.icon}</span>
                    <h3 className={`text-xs font-bold truncate ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                      {isId ? colMeta.titleId : colMeta.titleEn}
                    </h3>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                      isLight ? colMeta.badgeBgLight : colMeta.badgeBgDark
                    }`}>
                      {filteredCards.length}
                    </span>
                  </div>

                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        setAddingInCol(colMeta.id);
                        setNewCardTitle('');
                      }}
                      title={isId ? `Tambah kartu di ${colMeta.titleId}` : `Add card to ${colMeta.titleEn}`}
                      className={`p-1 rounded-lg transition ${
                        isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Inline Card Input */}
                {!isReadOnly && addingInCol === colMeta.id && (
                  <div className={`p-2.5 border-b animate-in fade-in duration-100 ${
                    isLight ? 'border-blue-300 bg-blue-50/70' : 'border-blue-500/40 bg-blue-950/20'
                  }`}>
                    <input
                      type="text"
                      autoFocus
                      value={newCardTitle}
                      onChange={(e) => setNewCardTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCard(colMeta.id);
                        } else if (e.key === 'Escape') {
                          setAddingInCol(null);
                        }
                      }}
                      placeholder={isId ? 'Ketik judul tugas, tekan Enter...' : 'Enter task title, press Enter...'}
                      className={`w-full text-xs p-2 rounded-lg border outline-none ${
                        isLight
                          ? 'bg-white border-blue-400 text-slate-900 placeholder:text-slate-400'
                          : 'bg-slate-900 border-blue-500 text-white placeholder:text-slate-500'
                      }`}
                    />
                    <div className="flex items-center justify-end gap-1.5 mt-2">
                      <button
                        type="button"
                        onClick={() => setAddingInCol(null)}
                        className={`px-2.5 py-1 rounded text-[11px] ${
                          isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {isId ? 'Batal' : 'Cancel'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddCard(colMeta.id)}
                        className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold shadow-xs"
                      >
                        {isId ? 'Tambah Kartu' : 'Add Card'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Cards List in this Column */}
                <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 custom-scrollbar min-h-0">
                  {filteredCards.length === 0 ? (
                    <div className={`h-28 flex flex-col items-center justify-center text-center p-3 rounded-xl border border-dashed ${
                      isLight ? 'border-slate-300 bg-slate-50/60 text-slate-500' : 'border-slate-700/50 text-slate-500'
                    }`}>
                      <span className="text-xs italic">
                        {isId ? 'Belum ada kartu' : 'No cards yet'}
                      </span>
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => {
                            setAddingInCol(colMeta.id);
                            setNewCardTitle('');
                          }}
                          className="mt-1.5 text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-medium"
                        >
                          <Plus className="w-3 h-3" />
                          <span>{isId ? 'Tambah tugas' : 'Add task'}</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredCards.map((card) => {
                      const isBeingDragged = draggedCardId === card.id;

                      // Checklist progress
                      const totalChecklist = card.checklist ? card.checklist.length : 0;
                      const doneChecklist = card.checklist ? card.checklist.filter((c) => c.completed).length : 0;

                      // Due date warning
                      const isOverdue = card.due_date && card.due_date > 0 && card.due_date < Date.now() && colMeta.id !== 'done';

                      return (
                        <div
                          key={card.id}
                          draggable={!isReadOnly}
                          onDragStart={(e) => !isReadOnly && handleDragStart(e, card.id, colMeta.id)}
                          onClick={() => setEditingCard({ card, columnId: colMeta.id })}
                          className={`group relative p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer shadow-xs select-none ${
                            isBeingDragged
                              ? 'opacity-30 border-dashed border-slate-500 scale-95'
                              : isLight
                              ? 'bg-white hover:bg-slate-50/90 border-slate-200 hover:border-blue-400 hover:shadow-md'
                              : 'bg-[#202b3d] hover:bg-[#253247] border-slate-700/70 hover:border-blue-500/60 hover:shadow-lg'
                          }`}
                        >
                          {/* Card Priority Tag & Quick Move */}
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            {card.priority === 'urgent' && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                                isLight
                                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                                  : 'bg-rose-950/70 text-rose-300 border-rose-800/60'
                              }`}>
                                <Flame className="w-3 h-3 text-rose-500 shrink-0" />
                                <span>{isId ? 'Mendesak' : 'Urgent'}</span>
                              </span>
                            )}
                            {card.priority === 'high' && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                isLight
                                  ? 'bg-orange-100 text-orange-800 border-orange-300'
                                  : 'bg-orange-950/70 text-orange-300 border-orange-800/60'
                              }`}>
                                {isId ? 'Prioritas Tinggi' : 'High Priority'}
                              </span>
                            )}
                            {card.priority === 'medium' && (
                              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                                isLight
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : 'bg-slate-800 text-slate-300 border-slate-700/80'
                              }`}>
                                {isId ? 'Prioritas Sedang' : 'Medium Priority'}
                              </span>
                            )}
                            {card.priority === 'low' && (
                              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                                isLight
                                  ? 'bg-slate-100 text-slate-700 border-slate-300'
                                  : 'bg-slate-800/50 text-slate-400 border-transparent'
                              }`}>
                                {isId ? 'Prioritas Rendah' : 'Low Priority'}
                              </span>
                            )}

                            {/* Dropdown Quick Move button */}
                            {!isReadOnly && (
                              <div className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteCard(card.id);
                                  }}
                                  title={isId ? 'Hapus kartu' : 'Delete card'}
                                  className={`p-1 rounded transition ${
                                    isLight ? 'text-slate-400 hover:text-red-600 hover:bg-slate-100' : 'text-slate-500 hover:text-red-400 hover:bg-slate-700/60'
                                  }`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Card Title */}
                          <h4 className={`text-xs leading-snug ${
                            colMeta.id === 'done'
                              ? 'line-through text-slate-400'
                              : isLight
                              ? 'text-slate-900 font-bold'
                              : 'text-slate-100 font-semibold'
                          }`}>
                            {card.title}
                          </h4>

                          {/* Card Description preview */}
                          {card.description && (
                            <p className={`text-[11px] line-clamp-2 mt-1 leading-relaxed ${
                              isLight ? 'text-slate-600 font-normal' : 'text-slate-400'
                            }`}>
                              {card.description}
                            </p>
                          )}

                          {/* Card Meta Badges: Checklist progress & Due Date */}
                          <div className={`flex items-center gap-2 mt-2.5 pt-2 border-t flex-wrap text-[11px] ${
                            isLight ? 'border-slate-200' : 'border-slate-800/50'
                          }`}>
                            {/* Checklist count */}
                            {totalChecklist > 0 && (
                              <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                isLight
                                  ? doneChecklist === totalChecklist
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-slate-100 text-slate-700 border border-slate-300'
                                  : doneChecklist === totalChecklist
                                  ? 'bg-emerald-950/60 text-emerald-300'
                                  : 'bg-slate-800 text-slate-300'
                              }`}>
                                <ListTodo className="w-3 h-3 shrink-0" />
                                <span>{doneChecklist}/{totalChecklist}</span>
                              </div>
                            )}

                            {/* Due date */}
                            {card.due_date && card.due_date > 0 && (
                              <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                isLight
                                  ? isOverdue
                                    ? 'bg-rose-100 text-rose-800 border border-rose-300 font-bold'
                                    : 'bg-slate-100 text-slate-700 border border-slate-300'
                                  : isOverdue
                                  ? 'bg-rose-950/70 text-rose-300 border border-rose-800/60'
                                  : 'bg-slate-800 text-slate-300'
                              }`}>
                                <Clock className={`w-3 h-3 ${isOverdue ? 'text-rose-500' : 'text-slate-400'}`} />
                                <span>{new Date(card.due_date).toLocaleDateString(isId ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short' })}</span>
                              </div>
                            )}

                            {/* Tags */}
                            {card.tags && card.tags.map((tg) => (
                              <span key={tg} className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                isLight
                                  ? 'text-indigo-800 bg-indigo-50 border border-indigo-200 font-medium'
                                  : 'text-blue-400 bg-blue-950/40'
                              }`}>
                                #{tg}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Bottom "+ Tambah Kartu" button */}
                <div className={`p-2 border-t shrink-0 ${isLight ? 'border-slate-200' : 'border-slate-700/50'}`}>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        setAddingInCol(colMeta.id);
                        setNewCardTitle('');
                      }}
                      className={`w-full py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                        isLight
                          ? 'hover:bg-slate-100 text-slate-700'
                          : 'hover:bg-slate-750 text-slate-300'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5 text-blue-500" />
                      <span>{isId ? 'Tambah Kartu' : 'Add Card'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Card Details / Editing Modal */}
      {editingCard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setEditingCard(null)}
        >
          <div
            className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150 ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#1b2434] border-slate-700 text-slate-100'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`p-4 border-b flex items-center justify-between shrink-0 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#172030] border-slate-700'
            }`}>
              <div className="flex items-center gap-2">
                <Kanban className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-sm">
                  {isReadOnly
                    ? isId
                      ? 'Detail Kartu Tugas (Hanya Lihat)'
                      : 'Task Card Details (Read-Only)'
                    : isId
                    ? 'Rincian Kartu Tugas'
                    : 'Task Card Details'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingCard(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
              {/* Title input / read-only display */}
              <div>
                <label className={`block text-[11px] font-semibold mb-1 ${
                  isLight ? 'text-slate-700' : 'text-slate-400'
                }`}>
                  {isId ? 'Judul Tugas' : 'Task Title'}
                </label>
                {isReadOnly ? (
                  <div className={`w-full p-2.5 rounded-xl border text-xs font-bold ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
                  }`}>
                    {editingCard.card.title}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={editingCard.card.title}
                    onChange={(e) => {
                      setEditingCard({
                        ...editingCard,
                        card: { ...editingCard.card, title: e.target.value },
                      });
                    }}
                    className={`w-full p-2.5 rounded-xl border text-xs font-semibold outline-none ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
                    }`}
                  />
                )}
              </div>

              {/* Column Status & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${
                    isLight ? 'text-slate-700' : 'text-slate-400'
                  }`}>
                    {isId ? 'Kolom Status' : 'Column Status'}
                  </label>
                  {isReadOnly ? (
                    <div className={`p-2 rounded-xl border text-xs font-medium ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-700 text-white'
                    }`}>
                      {COLUMN_METAS.find((c) => c.id === editingCard.columnId)?.icon}{' '}
                      {isId
                        ? COLUMN_METAS.find((c) => c.id === editingCard.columnId)?.titleId
                        : COLUMN_METAS.find((c) => c.id === editingCard.columnId)?.titleEn}
                    </div>
                  ) : (
                    <select
                      value={editingCard.columnId}
                      onChange={(e) => {
                        setEditingCard({
                          ...editingCard,
                          columnId: e.target.value as KanbanStatus,
                        });
                      }}
                      className={`w-full p-2 rounded-xl border text-xs outline-none cursor-pointer ${
                        isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
                      }`}
                    >
                      <option value="backlog">📥 {isId ? 'Rencana & Ide (Backlog)' : 'Backlog'}</option>
                      <option value="todo">🔵 {isId ? 'Akan Dikerjakan (To Do)' : 'To Do'}</option>
                      <option value="in_progress">🟡 {isId ? 'Sedang Dikerjakan (In Progress)' : 'In Progress'}</option>
                      <option value="done">🟢 {isId ? 'Selesai (Done)' : 'Done'}</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${
                    isLight ? 'text-slate-700' : 'text-slate-400'
                  }`}>
                    {isId ? 'Tingkat Prioritas' : 'Priority Level'}
                  </label>
                  {isReadOnly ? (
                    <div className={`p-2 rounded-xl border text-xs font-medium ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-700 text-white'
                    }`}>
                      {editingCard.card.priority === 'urgent' && `🔴 ${isId ? 'Mendesak' : 'Urgent'}`}
                      {editingCard.card.priority === 'high' && `🟠 ${isId ? 'Tinggi' : 'High'}`}
                      {editingCard.card.priority === 'medium' && `🟡 ${isId ? 'Sedang' : 'Medium'}`}
                      {editingCard.card.priority === 'low' && `🟢 ${isId ? 'Rendah' : 'Low'}`}
                      {!editingCard.card.priority && `🟡 ${isId ? 'Sedang' : 'Medium'}`}
                    </div>
                  ) : (
                    <select
                      value={editingCard.card.priority || 'medium'}
                      onChange={(e) => {
                        setEditingCard({
                          ...editingCard,
                          card: { ...editingCard.card, priority: e.target.value as KanbanPriority },
                        });
                      }}
                      className={`w-full p-2 rounded-xl border text-xs outline-none cursor-pointer ${
                        isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
                      }`}
                    >
                      <option value="urgent">🔴 {isId ? 'Mendesak (Urgent)' : 'Urgent'}</option>
                      <option value="high">🟠 {isId ? 'Tinggi (High)' : 'High'}</option>
                      <option value="medium">🟡 {isId ? 'Sedang (Medium)' : 'Medium'}</option>
                      <option value="low">🟢 {isId ? 'Rendah (Low)' : 'Low'}</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Due date picker / display */}
              <div>
                <label className={`block text-[11px] font-semibold mb-1 ${
                  isLight ? 'text-slate-700' : 'text-slate-400'
                }`}>
                  {isId ? 'Tenggat Waktu (Due Date)' : 'Due Date'}
                </label>
                {isReadOnly ? (
                  <div className={`p-2 rounded-xl border text-xs font-medium ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-700 text-slate-200'
                  }`}>
                    {editingCard.card.due_date
                      ? `📅 ${new Date(editingCard.card.due_date).toLocaleDateString(isId ? 'id-ID' : 'en-US')}`
                      : isId
                      ? 'Tidak ada tenggat waktu'
                      : 'No due date'}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={
                        editingCard.card.due_date
                          ? new Date(editingCard.card.due_date).toISOString().split('T')[0]
                          : ''
                      }
                      onChange={(e) => {
                        const val = e.target.value ? Date.parse(e.target.value) : 0;
                        setEditingCard({
                          ...editingCard,
                          card: { ...editingCard.card, due_date: val || undefined },
                        });
                      }}
                      className={`flex-1 p-2 rounded-xl border text-xs outline-none ${
                        isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
                      }`}
                    />
                    {editingCard.card.due_date && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCard({
                            ...editingCard,
                            card: { ...editingCard.card, due_date: undefined },
                          });
                        }}
                        className="px-2 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                      >
                        {isId ? 'Hapus' : 'Clear'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Description / Notes */}
              <div>
                <label className={`block text-[11px] font-semibold mb-1 ${
                  isLight ? 'text-slate-700' : 'text-slate-400'
                }`}>
                  {isId ? 'Deskripsi & Catatan Tambahan' : 'Description & Details'}
                </label>
                {isReadOnly ? (
                  <div className={`w-full p-2.5 rounded-xl border text-xs leading-relaxed whitespace-pre-wrap ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-700 text-slate-200'
                  }`}>
                    {editingCard.card.description || (
                      <span className="italic text-slate-500">
                        {isId ? 'Tidak ada catatan deskripsi.' : 'No description provided.'}
                      </span>
                    )}
                  </div>
                ) : (
                  <textarea
                    rows={3}
                    value={editingCard.card.description || ''}
                    onChange={(e) => {
                      setEditingCard({
                        ...editingCard,
                        card: { ...editingCard.card, description: e.target.value },
                      });
                    }}
                    placeholder={isId ? 'Tuliskan catatan atau instruksi pengerjaan...' : 'Write notes or execution specs...'}
                    className={`w-full p-2.5 rounded-xl border text-xs outline-none custom-scrollbar leading-relaxed ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400' : 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-500'
                    }`}
                  />
                )}
              </div>

              {/* Sub-tasks / Checklist */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`text-[11px] font-semibold ${
                    isLight ? 'text-slate-700' : 'text-slate-400'
                  }`}>
                    {isId ? 'Sub-Tugas / Checklist' : 'Sub-Tasks & Checklist'}
                  </label>
                  <span className={`text-[10px] font-mono ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>
                    {(editingCard.card.checklist || []).filter((c) => c.completed).length}/{(editingCard.card.checklist || []).length}
                  </span>
                </div>

                {/* Checklist items list */}
                <div className="space-y-1.5 mb-2">
                  {(editingCard.card.checklist || []).map((item, idx) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between gap-2 p-2 rounded-lg border text-xs ${
                        isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-900/60 border-slate-800 text-slate-200'
                      }`}
                    >
                      {isReadOnly ? (
                        <div className="flex items-center gap-2 flex-1 text-left min-w-0">
                          {item.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <span className={`truncate ${item.completed ? 'line-through text-slate-400' : isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                            {item.text}
                          </span>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              const nextChk = (editingCard.card.checklist || []).map((c, i) =>
                                i === idx ? { ...c, completed: !c.completed } : c
                              );
                              setEditingCard({
                                ...editingCard,
                                card: { ...editingCard.card, checklist: nextChk },
                              });
                            }}
                            className="flex items-center gap-2 flex-1 text-left min-w-0"
                          >
                            {item.completed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-slate-400 shrink-0" />
                            )}
                            <span className={`truncate ${item.completed ? 'line-through text-slate-400' : isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                              {item.text}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const nextChk = (editingCard.card.checklist || []).filter((_, i) => i !== idx);
                              setEditingCard({
                                ...editingCard,
                                card: { ...editingCard.card, checklist: nextChk },
                              });
                            }}
                            className="p-0.5 text-slate-500 hover:text-red-400 rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add new subtask input (only in edit mode) */}
                {!isReadOnly && (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newChecklistText}
                      onChange={(e) => setNewChecklistText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newChecklistText.trim()) {
                          e.preventDefault();
                          const nextItem: KanbanChecklistItem = {
                            id: `chk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                            text: newChecklistText.trim(),
                            completed: false,
                          };
                          setEditingCard({
                            ...editingCard,
                            card: {
                              ...editingCard.card,
                              checklist: [...(editingCard.card.checklist || []), nextItem],
                            },
                          });
                          setNewChecklistText('');
                        }
                      }}
                      placeholder={isId ? 'Tambah sub-tugas baru...' : 'Add new sub-task...'}
                      className={`flex-1 p-2 rounded-xl border text-xs outline-none ${
                        isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newChecklistText.trim()) return;
                        const nextItem: KanbanChecklistItem = {
                          id: `chk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                          text: newChecklistText.trim(),
                          completed: false,
                        };
                        setEditingCard({
                          ...editingCard,
                          card: {
                            ...editingCard.card,
                            checklist: [...(editingCard.card.checklist || []), nextItem],
                          },
                        });
                        setNewChecklistText('');
                      }}
                      className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className={`p-4 border-t flex items-center ${isReadOnly ? 'justify-end' : 'justify-between'} shrink-0 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#172030] border-slate-700'
            }`}>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => handleDeleteCard(editingCard.card.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-950/40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isId ? 'Hapus Kartu' : 'Delete'}</span>
                </button>
              )}

              <div className="flex items-center gap-2">
                {!isReadOnly ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditingCard(null)}
                      className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                    >
                      {isId ? 'Batal' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveCardModal(editingCard.card, editingCard.columnId)}
                      className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md"
                    >
                      {isId ? 'Simpan Perubahan' : 'Save Changes'}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingCard(null)}
                    className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md"
                  >
                    {isId ? 'Tutup' : 'Close'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
