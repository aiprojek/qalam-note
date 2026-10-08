import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  ArrowUpDown,
  Plus,
  MoreVertical,
  Eye,
  Edit3,
  RefreshCw,
  Settings,
  FolderPlus,
  Info,
  Lock,
  Unlock,
  Share2,
  Trash2,
  Copy,
  Calculator,
  CheckSquare,
  FileText,
  Search,
  Calendar,
  Sparkles,
  Mic,
  PenTool,
  History,
  Printer,
  Download,
  FileDown,
} from 'lucide-react';
import type { Note, AppLanguage, NoteSortField, NoteSortOrder } from '../types';
import { QalamIcon } from './icons/QalamIcon';
import { getT } from '../utils/i18n';

interface MobileTopBarProps {
  view: 'sidebar' | 'notes' | 'editor';
  onNavigate: (view: 'sidebar' | 'notes' | 'editor') => void;
  folderTitle?: string;
  tagTitle?: string | null;
  isTrashView?: boolean;
  notesCount: number;
  activeNote: Note | null;
  // Sort
  sortField: NoteSortField;
  sortOrder: NoteSortOrder;
  onSortChange: (field: NoteSortField, order: NoteSortOrder) => void;
  // Actions
  onNewNote: () => void;
  onNewTodo: () => void;
  onCreateFolder: () => void;
  onSync: () => void;
  isSyncing: boolean;
  onOpenSettings: () => void;
  // New productivity actions
  onOpenCommandPalette?: () => void;
  onOpenDailyNote?: () => void;
  onOpenGraphView?: () => void;
  onOpenTemplates?: () => void;
  onOpenVoiceRecorder?: () => void;
  onOpenDrawingCanvas?: () => void;
  onOpenRevisionHistory?: () => void;
  onExportPdf?: () => void;
  onExportMarkdown?: () => void;
  onOpenExportModal?: () => void;
  // Editor-specific
  mobileReadingMode: boolean;
  onToggleReadingMode: () => void;
  isVaultUnlocked: boolean;
  onToggleEncrypt: () => void;
  onOpenPublish: () => void;
  onOpenInfo: () => void;
  onOpenCheatSheet: () => void;
  onDuplicateNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  language?: AppLanguage;
}

export const MobileTopBar: React.FC<MobileTopBarProps> = ({
  view,
  onNavigate,
  folderTitle,
  tagTitle,
  isTrashView = false,
  notesCount,
  activeNote,
  sortField,
  sortOrder,
  onSortChange,
  onNewNote,
  onNewTodo,
  onCreateFolder,
  onSync,
  isSyncing,
  onOpenSettings,
  onOpenCommandPalette,
  onOpenDailyNote,
  onOpenGraphView,
  onOpenTemplates,
  onOpenVoiceRecorder,
  onOpenDrawingCanvas,
  onOpenRevisionHistory,
  onExportPdf,
  onExportMarkdown,
  onOpenExportModal,
  mobileReadingMode,
  onToggleReadingMode,
  isVaultUnlocked,
  onToggleEncrypt,
  onOpenPublish,
  onOpenInfo,
  onOpenCheatSheet,
  onDuplicateNote,
  onDeleteNote,
  language = 'id',
}) => {
  const t = getT(language);
  const isId = language === 'id';

  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showEditorMenu, setShowEditorMenu] = useState(false);
  const [showComposeMenu, setShowComposeMenu] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
        setShowEditorMenu(false);
        setShowComposeMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute display title for notes view
  const getNotesViewTitle = () => {
    if (isTrashView) return t.trash;
    if (tagTitle) return `#${tagTitle}`;
    if (folderTitle) return folderTitle;
    return t.all_notes;
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-[50px] px-2.5 bg-[#141b27] border-b border-slate-800 text-slate-200 select-none shrink-0 transition-colors shadow-xs">
      {/* VIEW: SIDEBAR (Notebooks / Folders) */}
      {view === 'sidebar' && (
        <>
          <div className="flex items-center gap-2">
            <QalamIcon className="w-5 h-5 shadow-xs" />
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-sm tracking-tight text-slate-100">Qalam</span>
              <span className="text-xs font-semibold text-blue-400">Note</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {onOpenCommandPalette && (
              <button
                type="button"
                onClick={onOpenCommandPalette}
                title="Command Palette (Ctrl+K)"
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 active:scale-95 transition"
              >
                <Search className="w-4 h-4 text-blue-400" />
              </button>
            )}

            <button
              type="button"
              onClick={onCreateFolder}
              title={isId ? 'Tambah Folder Baru' : 'New Folder'}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 active:scale-95 transition"
            >
              <FolderPlus className="w-4 h-4 text-blue-400" />
            </button>

            <button
              type="button"
              onClick={onSync}
              disabled={isSyncing}
              title={isId ? 'Sinkronisasi Cloud' : 'Sync'}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 active:scale-95 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-slate-300 ${isSyncing ? 'animate-spin text-blue-400' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onOpenSettings}
              title={isId ? 'Setelan' : 'Settings'}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 active:scale-95 transition"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </>
      )}

      {/* VIEW: NOTES LIST */}
      {view === 'notes' && (
        <>
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => onNavigate('sidebar')}
              className="flex items-center gap-1 -ml-1 py-1 px-2 min-h-[44px] rounded-lg text-blue-400 hover:text-blue-300 hover:bg-slate-800/60 active:scale-95 transition font-medium text-xs shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="max-w-[80px] truncate">{isId ? 'Folder' : 'Notebooks'}</span>
            </button>

            <div className="flex items-baseline gap-1.5 min-w-0 pr-1">
              <h2 className="text-sm font-semibold text-slate-100 truncate tracking-tight">
                {getNotesViewTitle()}
              </h2>
              <span className="text-[11px] text-slate-500 font-mono shrink-0">
                · {notesCount}
              </span>
            </div>
          </div>

          <div ref={menuRef} className="flex items-center gap-1 shrink-0 relative">
            {/* Spotlight / Command Palette Button */}
            {onOpenCommandPalette && (
              <button
                type="button"
                onClick={onOpenCommandPalette}
                title="Command Palette (Ctrl+K)"
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 active:scale-95 transition"
              >
                <Search className="w-4 h-4 text-blue-400" />
              </button>
            )}

            {/* Sort Menu Button */}
            <button
              type="button"
              onClick={() => {
                setShowSortMenu(!showSortMenu);
                setShowComposeMenu(false);
              }}
              title={isId ? 'Urutkan Catatan' : 'Sort notes'}
              className={`p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition ${
                showSortMenu ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>

            {/* Sort Dropdown Menu */}
            {showSortMenu && (
              <div className="absolute right-0 top-12 z-50 w-48 rounded-xl bg-[#1e2739] border border-slate-700/80 py-1.5 shadow-2xl text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  {t.sort_by}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onSortChange('updated_time', sortField === 'updated_time' && sortOrder === 'desc' ? 'asc' : 'desc');
                    setShowSortMenu(false);
                  }}
                  className={`w-full px-3 py-2 text-left hover:bg-blue-600 hover:text-white transition flex items-center justify-between ${
                    sortField === 'updated_time' ? 'text-blue-400 font-semibold' : ''
                  }`}
                >
                  <span>{t.sort_updated}</span>
                  {sortField === 'updated_time' && (
                    <span className="text-[10px] text-slate-400 font-mono">{sortOrder.toUpperCase()}</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSortChange('created_time', sortField === 'created_time' && sortOrder === 'desc' ? 'asc' : 'desc');
                    setShowSortMenu(false);
                  }}
                  className={`w-full px-3 py-2 text-left hover:bg-blue-600 hover:text-white transition flex items-center justify-between ${
                    sortField === 'created_time' ? 'text-blue-400 font-semibold' : ''
                  }`}
                >
                  <span>{t.sort_created}</span>
                  {sortField === 'created_time' && (
                    <span className="text-[10px] text-slate-400 font-mono">{sortOrder.toUpperCase()}</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSortChange('title', sortField === 'title' && sortOrder === 'asc' ? 'desc' : 'asc');
                    setShowSortMenu(false);
                  }}
                  className={`w-full px-3 py-2 text-left hover:bg-blue-600 hover:text-white transition flex items-center justify-between ${
                    sortField === 'title' ? 'text-blue-400 font-semibold' : ''
                  }`}
                >
                  <span>{t.sort_title}</span>
                  {sortField === 'title' && (
                    <span className="text-[10px] text-slate-400 font-mono">{sortOrder.toUpperCase()}</span>
                  )}
                </button>
              </div>
            )}

            {/* Quick Knowledge Graph Button */}
            {onOpenGraphView && (
              <button
                type="button"
                onClick={onOpenGraphView}
                title={isId ? 'Grafik Pengetahuan (Ctrl+G)' : 'Knowledge Graph (Ctrl+G)'}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-slate-800/80 transition active:scale-95 border border-emerald-500/20"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}

            {/* Quick Compose Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowComposeMenu(!showComposeMenu);
                  setShowSortMenu(false);
                }}
                title={isId ? 'Buat Baru' : 'Create New'}
                className="flex items-center gap-1 px-2.5 py-1.5 min-h-[44px] rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs active:scale-95 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isId ? 'Baru' : 'New'}</span>
              </button>

              {showComposeMenu && (
                <div className="absolute right-0 top-12 z-50 w-52 rounded-xl bg-[#1e2739] border border-slate-700/80 py-1.5 shadow-2xl text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      onNewNote();
                      setShowComposeMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-blue-600 hover:text-white transition flex items-center gap-2.5"
                  >
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span>{t.new_note}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onNewTodo();
                      setShowComposeMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-blue-600 hover:text-white transition flex items-center gap-2.5"
                  >
                    <CheckSquare className="w-4 h-4 text-amber-400" />
                    <span>{t.new_todo}</span>
                  </button>
                  {onOpenDailyNote && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenDailyNote();
                        setShowComposeMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-blue-600 hover:text-white transition flex items-center gap-2.5 text-amber-300"
                    >
                      <Calendar className="w-4 h-4 text-amber-400" />
                      <span>{isId ? 'Catatan Harian Hari Ini' : "Today's Daily Note"}</span>
                    </button>
                  )}
                  {onOpenTemplates && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenTemplates();
                        setShowComposeMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-blue-600 hover:text-white transition flex items-center gap-2.5 text-purple-300"
                    >
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span>{isId ? 'Galeri Templat' : 'Templates Gallery'}</span>
                    </button>
                  )}
                  {onOpenGraphView && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenGraphView();
                        setShowComposeMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-blue-600 hover:text-white transition flex items-center gap-2.5 text-emerald-300"
                    >
                      <Share2 className="w-4 h-4 text-emerald-400" />
                      <span>{isId ? 'Grafik Pengetahuan' : 'Knowledge Graph'}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* VIEW: NOTE EDITOR */}
      {view === 'editor' && (
        <>
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => onNavigate('notes')}
              className="flex items-center gap-1 -ml-1 py-1 px-2 min-h-[44px] rounded-lg text-blue-400 hover:text-blue-300 hover:bg-slate-800/60 active:scale-95 transition font-medium text-xs shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="max-w-[70px] truncate">{isId ? 'Catatan' : 'Notes'}</span>
            </button>

            <h2 className="text-xs sm:text-sm font-semibold text-slate-100 truncate tracking-tight pr-1">
              {activeNote?.title || (isId ? 'Catatan tanpa judul' : 'Untitled Note')}
            </h2>
          </div>

          <div ref={menuRef} className="flex items-center gap-0.5 shrink-0 relative">
            {/* Obsidian/Joplin Mode Toggle: Preview (Reading) vs Edit */}
            <button
              type="button"
              onClick={onToggleReadingMode}
              title={
                mobileReadingMode
                  ? isId ? 'Beralih ke Mode Edit (Pencil)' : 'Switch to Edit Mode'
                  : isId ? 'Beralih ke Mode Pratinjau Membaca (Glasses)' : 'Switch to Reading Preview'
              }
              className={`p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition active:scale-95 ${
                mobileReadingMode
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              {mobileReadingMode ? (
                <Edit3 className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>

            {/* Ellipsis / More Actions Menu */}
            <button
              type="button"
              onClick={() => setShowEditorMenu(!showEditorMenu)}
              title={isId ? 'Opsi Catatan' : 'Note Options'}
              className={`p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition ${
                showEditorMenu ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Editor Actions Dropdown */}
            {showEditorMenu && (
              <div className="absolute right-0 top-12 z-50 w-52 rounded-xl bg-[#1e2739] border border-slate-700/80 py-1.5 shadow-2xl text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => {
                    onOpenInfo();
                    setShowEditorMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-blue-600 hover:text-white transition flex items-center gap-2.5"
                >
                  <Info className="w-4 h-4 text-blue-400" />
                  <span>{t.tb_note_properties}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onToggleEncrypt();
                    setShowEditorMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-blue-600 hover:text-white transition flex items-center gap-2.5"
                >
                  {activeNote?.is_encrypted ? (
                    isVaultUnlocked ? (
                      <>
                        <Unlock className="w-4 h-4 text-emerald-400" />
                        <span>{isId ? 'Kunci Brankas E2EE' : 'Lock E2EE Vault'}</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 text-amber-400" />
                        <span>{isId ? 'Buka Kunci Brankas' : 'Unlock E2EE Vault'}</span>
                      </>
                    )
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-slate-400" />
                      <span>{isId ? 'Enkripsikan E2EE' : 'Encrypt with E2EE'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onOpenPublish();
                    setShowEditorMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-blue-600 hover:text-white transition flex items-center gap-2.5"
                >
                  <Share2 className="w-4 h-4 text-emerald-400" />
                  <span>
                    {activeNote?.published_info?.is_published
                      ? isId ? 'Kelola Publikasi Web' : 'Manage Web Publish'
                      : isId ? 'Publikasikan ke Web (GAS)' : 'Publish to Web (GAS)'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onOpenCheatSheet();
                    setShowEditorMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-blue-600 hover:text-white transition flex items-center gap-2.5"
                >
                  <Calculator className="w-4 h-4 text-purple-400" />
                  <span>{isId ? 'Rumus Matematika & Hint' : 'Math Formulas & Hints'}</span>
                </button>

                {activeNote && (
                  <button
                    type="button"
                    onClick={() => {
                      onDuplicateNote(activeNote);
                      setShowEditorMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-blue-600 hover:text-white transition flex items-center gap-2.5"
                  >
                    <Copy className="w-4 h-4 text-slate-400" />
                    <span>{t.duplicate}</span>
                  </button>
                )}

                {/* Additional Productivity & Document Options */}
                <div className="border-t border-slate-700/80 my-1" />

                {onOpenRevisionHistory && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenRevisionHistory();
                      setShowEditorMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-blue-600 hover:text-white transition flex items-center gap-2.5 text-blue-300"
                  >
                    <History className="w-4 h-4 text-blue-400" />
                    <span>{isId ? 'Riwayat Versi Catatan' : 'Revision History'}</span>
                  </button>
                )}

                {onOpenTemplates && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenTemplates();
                      setShowEditorMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-blue-600 hover:text-white transition flex items-center gap-2.5 text-purple-300"
                  >
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>{isId ? 'Sisipkan Templat...' : 'Insert Template...'}</span>
                  </button>
                )}

                {onOpenVoiceRecorder && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenVoiceRecorder();
                      setShowEditorMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-blue-600 hover:text-white transition flex items-center gap-2.5 text-red-300"
                  >
                    <Mic className="w-4 h-4 text-red-400" />
                    <span>{isId ? 'Rekam Memo Suara' : 'Voice Memo'}</span>
                  </button>
                )}

                {onOpenDrawingCanvas && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenDrawingCanvas();
                      setShowEditorMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-blue-600 hover:text-white transition flex items-center gap-2.5 text-amber-300"
                  >
                    <PenTool className="w-4 h-4 text-amber-400" />
                    <span>{isId ? 'Kanvas Sketsa Tangan' : 'Handwriting Sketch'}</span>
                  </button>
                )}

                {onOpenExportModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenExportModal();
                      setShowEditorMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-blue-600 hover:text-white transition flex items-center gap-2.5 text-blue-300"
                  >
                    <FileDown className="w-4 h-4 text-blue-400" />
                    <span>{isId ? 'Ekspor Catatan (PDF, DOCX, MD...)' : 'Export Note (PDF, DOCX, MD...)'}</span>
                  </button>
                )}

                {onExportPdf && (
                  <button
                    type="button"
                    onClick={() => {
                      onExportPdf();
                      setShowEditorMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-blue-600 hover:text-white transition flex items-center gap-2.5 text-emerald-300"
                  >
                    <Printer className="w-4 h-4 text-emerald-400" />
                    <span>{isId ? 'Cetak / Ekspor ke PDF' : 'Print / Export to PDF'}</span>
                  </button>
                )}

                {onExportMarkdown && (
                  <button
                    type="button"
                    onClick={() => {
                      onExportMarkdown();
                      setShowEditorMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-blue-600 hover:text-white transition flex items-center gap-2.5 text-slate-300"
                  >
                    <Download className="w-4 h-4 text-slate-400" />
                    <span>{isId ? 'Unduh Markdown (.md)' : 'Download Markdown (.md)'}</span>
                  </button>
                )}

                {onOpenGraphView && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenGraphView();
                      setShowEditorMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-blue-600 hover:text-white transition flex items-center gap-2.5 text-emerald-300"
                  >
                    <Share2 className="w-4 h-4 text-emerald-400" />
                    <span>{isId ? 'Grafik Pengetahuan (Ctrl+G)' : 'Knowledge Graph (Ctrl+G)'}</span>
                  </button>
                )}

                <div className="border-t border-slate-700/80 my-1" />

                {activeNote && (
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteNote(activeNote.id);
                      setShowEditorMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-red-400 hover:bg-red-600 hover:text-white transition flex items-center gap-2.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{t.move_to_trash}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </header>
  );
};
