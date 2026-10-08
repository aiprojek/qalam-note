import React, { useState, useEffect } from 'react';
import {
  Plus,
  CheckSquare,
  FilePlus,
  RefreshCw,
  Columns,
  Eye,
  Edit3,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Wifi,
  WifiOff,
  Lock,
  Unlock,
  ShieldCheck,
  Globe,
  Share2,
  BookOpen,
  Calculator,
  Search,
  Calendar,
  Sparkles,
  FileDown,
} from 'lucide-react';

import type { AppLanguage } from '../types';
import { getT } from '../utils/i18n';

interface TopMenuBarProps {
  onNewNote: () => void;
  onNewTodo: () => void;
  onNewFolder: () => void;
  onSync: () => void;
  isSyncing: boolean;
  onOpenSettings: (tab?: string) => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  isNoteListOpen: boolean;
  onToggleNoteList: () => void;
  editorMode: 'wysiwyg' | 'markdown';
  markdownViewMode: 'raw' | 'split';
  onMarkdownViewModeChange: (view: 'raw' | 'split') => void;
  isE2EEEnabled: boolean;
  isVaultUnlocked: boolean;
  onToggleVaultLock: () => void;
  onExportBackup: () => void;
  onImportBackup: () => void;
  onOpenGASHelp: () => void;
  onOpenCheatSheet?: (mathOnly?: boolean) => void;
  onOpenCommandPalette?: () => void;
  onOpenDailyNote?: () => void;
  onOpenGraphView?: () => void;
  onOpenTemplates?: () => void;
  onOpenExportModal?: () => void;
  language?: AppLanguage;
  theme?: string;
}

export const TopMenuBar: React.FC<TopMenuBarProps> = ({
  onNewNote,
  onNewTodo,
  onNewFolder,
  onSync,
  isSyncing,
  onOpenSettings,
  isSidebarOpen,
  onToggleSidebar,
  isNoteListOpen,
  onToggleNoteList,
  editorMode,
  markdownViewMode,
  onMarkdownViewModeChange,
  isE2EEEnabled,
  isVaultUnlocked,
  onToggleVaultLock,
  onExportBackup,
  onImportBackup,
  onOpenGASHelp,
  onOpenCheatSheet,
  onOpenCommandPalette,
  onOpenDailyNote,
  onOpenGraphView,
  onOpenTemplates,
  onOpenExportModal,
  language = 'id',
  theme = 'qalam-dark',
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const t = getT(language);
  const isLight =
    theme === 'qalam-light' ||
    theme === 'light' ||
    (typeof document !== 'undefined' && document.documentElement.classList.contains('light'));

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    if (activeMenu) {
      window.addEventListener('click', handleClickOutside);
    }
    return () => window.removeEventListener('click', handleClickOutside);
  }, [activeMenu]);

  return (
    <div className={`flex flex-col border-b text-xs select-none transition-colors ${
      isLight ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-[#141b27] border-slate-800 text-slate-300'
    }`}>
      {/* Row 1: Qalam Desktop Menu (File, Edit, View, Note, Tools, Help) */}
      <div className={`flex items-center justify-between px-3 py-1 border-b text-[11px] transition-colors ${
        isLight ? 'bg-slate-200/70 border-slate-300 text-slate-700' : 'border-slate-800/60 bg-[#121722] text-slate-300'
      }`}>
        <div className="flex items-center gap-1">
          {/* File Menu */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenu(activeMenu === 'file' ? null : 'file');
              }}
              className={`px-2 py-0.5 rounded hover:bg-slate-700/60 transition ${
                activeMenu === 'file' ? 'bg-blue-600 text-white' : ''
              }`}
            >
              {t.menu_file}
            </button>
            {activeMenu === 'file' && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 top-6 z-50 w-52 rounded bg-[#1e2739] border border-slate-700 py-1 shadow-2xl text-slate-200"
              >
                <button
                  onClick={() => {
                    onNewNote();
                    setActiveMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white flex items-center justify-between"
                >
                  <span>{t.new_note}</span>
                  <span className="text-[10px] text-slate-400">Ctrl+N</span>
                </button>
                <button
                  onClick={() => {
                    onNewTodo();
                    setActiveMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white flex items-center justify-between"
                >
                  <span>{t.new_todo}</span>
                  <span className="text-[10px] text-slate-400">Ctrl+T</span>
                </button>
                <button
                  onClick={() => {
                    onNewFolder();
                    setActiveMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white"
                >
                  {t.new_notebook}
                </button>
                {onOpenExportModal && (
                  <button
                    onClick={() => {
                      onOpenExportModal();
                      setActiveMenu(null);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white flex items-center justify-between text-blue-300"
                  >
                    <div className="flex items-center gap-2">
                      <FileDown className="w-3.5 h-3.5 text-blue-400" />
                      <span>{language === 'id' ? 'Ekspor Catatan...' : 'Export Note...'}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Ctrl+P</span>
                  </button>
                )}
                <div className="border-t border-slate-700 my-1" />
                <button
                  onClick={() => {
                    onExportBackup();
                    setActiveMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white"
                >
                  {t.export_backup}
                </button>
                <button
                  onClick={() => {
                    onImportBackup();
                    setActiveMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white"
                >
                  {t.import_backup}
                </button>
              </div>
            )}
          </div>

          {/* View Menu */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenu(activeMenu === 'view' ? null : 'view');
              }}
              className={`px-2 py-0.5 rounded hover:bg-slate-700/60 transition ${
                activeMenu === 'view' ? 'bg-blue-600 text-white' : ''
              }`}
            >
              {t.menu_view}
            </button>
            {activeMenu === 'view' && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 top-6 z-50 w-52 rounded bg-[#1e2739] border border-slate-700 py-1 shadow-2xl text-slate-200"
              >
                <button
                  onClick={() => {
                    onToggleSidebar();
                    setActiveMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white flex items-center justify-between"
                >
                  <span>{t.toggle_sidebar}</span>
                  <span className="text-[10px] text-slate-400">F10</span>
                </button>
                <button
                  onClick={() => {
                    onToggleNoteList();
                    setActiveMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white flex items-center justify-between"
                >
                  <span>{t.toggle_note_list}</span>
                  <span className="text-[10px] text-slate-400">F11</span>
                </button>
                <div className="border-t border-slate-700 my-1" />
                {editorMode === 'wysiwyg' ? (
                  <div className="px-3 py-1.5 text-xs text-slate-300 flex items-center justify-between">
                    <span className="text-white font-medium">{t.wysiwyg_editor}</span>
                    <span className="text-blue-400 font-semibold text-[11px]">✓ Aktif</span>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        onMarkdownViewModeChange('split');
                        setActiveMenu(null);
                      }}
                      className={`w-full px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white flex items-center justify-between ${
                        markdownViewMode === 'split' ? 'text-blue-400 font-semibold' : ''
                      }`}
                    >
                      <span>{t.split_view}</span>
                      {markdownViewMode === 'split' && <span>✓</span>}
                    </button>
                    <button
                      onClick={() => {
                        onMarkdownViewModeChange('raw');
                        setActiveMenu(null);
                      }}
                      className={`w-full px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white flex items-center justify-between ${
                        markdownViewMode === 'raw' ? 'text-blue-400 font-semibold' : ''
                      }`}
                    >
                      <span>{t.markdown_view}</span>
                      {markdownViewMode === 'raw' && <span>✓</span>}
                    </button>
                  </>
                )}
                {onOpenGraphView && (
                  <>
                    <div className="border-t border-slate-700 my-1" />
                    <button
                      onClick={() => {
                        onOpenGraphView();
                        setActiveMenu(null);
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white flex items-center justify-between text-emerald-400"
                    >
                      <div className="flex items-center gap-2">
                        <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{language === 'id' ? 'Grafik Pengetahuan' : 'Knowledge Graph'}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">Ctrl+G</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Tools Menu */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenu(activeMenu === 'tools' ? null : 'tools');
              }}
              className={`px-2 py-0.5 rounded hover:bg-slate-700/60 transition ${
                activeMenu === 'tools' ? 'bg-blue-600 text-white' : ''
              }`}
            >
              {t.menu_tools}
            </button>
            {activeMenu === 'tools' && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 top-6 z-50 w-56 rounded bg-[#1e2739] border border-slate-700 py-1 shadow-2xl text-slate-200"
              >
                <button
                  onClick={() => {
                    onSync();
                    setActiveMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white flex items-center justify-between"
                >
                  <span>{t.synchronise}</span>
                  <span className="text-[10px] text-slate-400">Ctrl+S</span>
                </button>
                <button
                  onClick={() => {
                    onOpenSettings('encryption');
                    setActiveMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white"
                >
                  {t.encryption_config}
                </button>
                <button
                  onClick={() => {
                    onOpenSettings('gas');
                    setActiveMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white"
                >
                  {t.gas_publishing}
                </button>
                {onOpenGraphView && (
                  <button
                    onClick={() => {
                      onOpenGraphView();
                      setActiveMenu(null);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white flex items-center justify-between text-emerald-400"
                  >
                    <div className="flex items-center gap-1.5">
                      <Share2 className="w-3.5 h-3.5" />
                      <span>{language === 'id' ? 'Grafik Pengetahuan' : 'Knowledge Graph'}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">Ctrl+G</span>
                  </button>
                )}
                <div className="border-t border-slate-700 my-1" />
                <button
                  onClick={() => {
                    onOpenSettings();
                    setActiveMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white"
                >
                  {t.options}
                </button>
              </div>
            )}
          </div>

          {/* Help Menu */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenu(activeMenu === 'help' ? null : 'help');
              }}
              className={`px-2 py-0.5 rounded hover:bg-slate-700/60 transition ${
                activeMenu === 'help' ? 'bg-blue-600 text-white' : ''
              }`}
            >
              {t.menu_help}
            </button>
            {activeMenu === 'help' && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 top-6 z-50 w-64 rounded bg-[#1e2739] border border-slate-700 py-1 shadow-2xl text-slate-200"
              >
                <button
                  onClick={() => {
                    onOpenGASHelp();
                    setActiveMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white flex items-center gap-2"
                >
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  <span>{t.gas_setup_guide}</span>
                </button>
                {onOpenCheatSheet && (
                  <button
                    onClick={() => {
                      onOpenCheatSheet(editorMode === 'wysiwyg');
                      setActiveMenu(null);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white flex items-center gap-2"
                  >
                    {editorMode === 'wysiwyg' ? (
                      <>
                        <Calculator className="w-3.5 h-3.5 text-blue-400" />
                        <span>{language === 'id' ? 'Panduan Rumus Matematika (KaTeX / LaTeX)' : 'Math Formula & LaTeX Guide'}</span>
                      </>
                    ) : (
                      <>
                        <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                        <span>{language === 'id' ? 'Panduan & Cheatsheet Markdown' : 'Markdown Cheatsheet & Guide'}</span>
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={() => {
                    onOpenSettings('about');
                    setActiveMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-600 hover:text-white"
                >
                  {t.about_qalam}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Status Indicators: Online / Offline, E2EE status */}
        <div className="flex items-center gap-2.5 text-[10px]">
          {isE2EEEnabled ? (
            <div
              onClick={onToggleVaultLock}
              className={`flex items-center gap-1 cursor-pointer px-1.5 py-0.5 rounded ${
                isVaultUnlocked
                  ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-800/40'
                  : 'text-amber-400 bg-amber-950/40 border border-amber-800/40'
              }`}
            >
              {isVaultUnlocked ? (
                <>
                  <ShieldCheck className="w-2.5 h-2.5" />
                  <span>{t.e2ee_unlocked}</span>
                </>
              ) : (
                <>
                  <Lock className="w-2.5 h-2.5" />
                  <span>{t.e2ee_locked}</span>
                </>
              )}
            </div>
          ) : (
            <span className="text-slate-500">{t.e2ee_disabled}</span>
          )}

          <div
            className={`flex items-center gap-1 ${
              isOnline ? 'text-slate-400' : 'text-amber-400'
            }`}
          >
            {isOnline ? <Wifi className="w-3 h-3 text-emerald-400" /> : <WifiOff className="w-3 h-3 text-amber-400" />}
            <span>{isOnline ? t.online_status : t.offline_status}</span>
          </div>
        </div>
      </div>

      {/* Row 2: Qalam Quick Action Bar (+ Note, + To-do, Panel toggles, Sync) */}
      <div className={`flex items-center justify-between px-3 py-1.5 transition-colors ${
        isLight ? 'bg-slate-50 border-b border-slate-200 text-slate-800' : 'bg-[#171f2d] text-slate-200'
      }`}>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onNewNote}
            title={`${t.new_note} (Ctrl+N)`}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.new_note}</span>
          </button>
          <button
            onClick={onNewTodo}
            title={`${t.new_todo} (Ctrl+T)`}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border font-medium transition ${
              isLight
                ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
            <span>{t.new_todo}</span>
          </button>

          {onOpenDailyNote && (
            <button
              onClick={onOpenDailyNote}
              title={language === 'id' ? 'Catatan Harian Hari Ini (Alt+D)' : "Today's Daily Note (Alt+D)"}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded border font-medium transition ${
                isLight
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <span>{language === 'id' ? 'Harian' : 'Daily'}</span>
            </button>
          )}

          {onOpenGraphView && (
            <button
              onClick={onOpenGraphView}
              title={language === 'id' ? 'Grafik Pengetahuan (Ctrl+G)' : 'Knowledge Graph (Ctrl+G)'}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded border font-medium transition ${
                isLight
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 shadow-xs'
                  : 'bg-slate-800 hover:bg-slate-700 text-emerald-300 border-slate-700'
              }`}
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="inline font-medium">{language === 'id' ? 'Grafik' : 'Graph'}</span>
            </button>
          )}

          {onOpenTemplates && (
            <button
              onClick={onOpenTemplates}
              title={language === 'id' ? 'Galeri Templat Catatan' : 'Note Templates'}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded border transition ${
                isLight
                  ? 'bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-300'
                  : 'hover:bg-slate-800 text-purple-300 border-transparent hover:border-slate-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              <span className="hidden sm:inline">{language === 'id' ? 'Templat' : 'Templates'}</span>
            </button>
          )}

          <span className={`w-px h-4 mx-1 ${isLight ? 'bg-slate-300' : 'bg-slate-800'}`} />

          {/* Toggle Panels */}
          <button
            onClick={onToggleSidebar}
            title={isSidebarOpen ? `${t.toggle_sidebar} (F10)` : `${t.toggle_sidebar} (F10)`}
            className={`p-1.5 rounded transition ${
              isSidebarOpen ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-800'
            }`}
          >
            {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Spotlight / Command Palette trigger */}
          {onOpenCommandPalette && (
            <button
              onClick={onOpenCommandPalette}
              title="Command Palette (Ctrl+K)"
              className="flex items-center gap-2 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/80 text-xs transition"
            >
              <Search className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden md:inline">{language === 'id' ? 'Cari / Perintah...' : 'Search or command...'}</span>
              <span className="text-[10px] font-mono bg-slate-900 px-1 py-0.2 rounded text-slate-400 border border-slate-700">
                Ctrl K
              </span>
            </button>
          )}

          {/* Synchronise button */}
          <button
            onClick={onSync}
            disabled={isSyncing}
            title={t.synchronise}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded hover:bg-slate-800 text-slate-300 transition text-xs border border-transparent hover:border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-400' : ''}`} />
            <span>{isSyncing ? t.syncing : t.synchronise}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
