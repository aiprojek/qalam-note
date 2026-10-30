import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Share2,
  Copy,
  Check,
  Sun,
  Moon,
  AlignLeft,
  AlignRight,
  AlertTriangle,
  Calendar,
  Kanban,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  FileText,
  ListTodo,
  Columns3,
  ExternalLink,
} from 'lucide-react';
import DOMPurify from 'dompurify';
import type { Note, KanbanBoardData, KanbanCardItem, KanbanPriority } from '../types';
import { markdownToHtml } from '../utils/markdown';
import { getNoteDirection } from '../utils/rtl';
import { calculateKanbanStats, markdownToKanbanData, kanbanDataToMarkdown } from '../utils/kanbanSerializer';
import { QalamIcon } from './icons/QalamIcon';

export interface RemotePublishedNote {
  id: string;
  title: string;
  html: string;
  author?: string;
  tags?: string[];
  updated_at?: number | string;
  published_at?: number | string;
  gasUrl?: string;
  is_kanban?: boolean;
  kanban_data?: KanbanBoardData;
}

interface PublicReaderViewProps {
  note?: Note | null;
  remoteNote?: RemotePublishedNote | null;
  authorName?: string;
  gasUrl?: string;
  noteId?: string;
  publishedAt?: number | string;
  isKanbanHint?: boolean;
  isLoadingRemote?: boolean;
  errorMessage?: string | null;
  onBackToApp: () => void;
}

export const PublicReaderView: React.FC<PublicReaderViewProps> = ({
  note,
  remoteNote,
  authorName = 'Anonymous',
  gasUrl,
  noteId,
  publishedAt,
  isKanbanHint = false,
  isLoadingRemote = false,
  errorMessage = null,
  onBackToApp,
}) => {
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Determine active note data
  const title = note?.title || remoteNote?.title || 'Catatan Publik';
  const tags = note?.tags || remoteNote?.tags || [];
  const displayAuthor = remoteNote?.author || authorName || 'Anonymous';

  const [isRtl, setIsRtl] = useState<boolean>(() => {
    if (note) return getNoteDirection(note) === 'rtl';
    const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u0590-\u05FF]/;
    return arabicRegex.test(title);
  });

  // Calculate formatted publication date (never show 'Tersimpan')
  const displayPublicationDate = useMemo(() => {
    const rawTime =
      publishedAt ||
      note?.published_info?.published_at ||
      remoteNote?.published_at ||
      remoteNote?.updated_at ||
      note?.updated_time ||
      Date.now();

    const timestamp =
      typeof rawTime === 'string'
        ? isNaN(Number(rawTime))
          ? Date.parse(rawTime)
          : Number(rawTime)
        : rawTime;
    const dateObj = isNaN(timestamp) ? new Date() : new Date(timestamp);

    return dateObj.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, [
    publishedAt,
    note?.published_info?.published_at,
    remoteNote?.published_at,
    remoteNote?.updated_at,
    note?.updated_time,
  ]);

  // Ensure body scroll is unlocked when reader view is mounted
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const hadOverflowHidden = document.body.classList.contains('overflow-hidden');
    document.body.classList.remove('overflow-hidden');
    document.body.style.overflow = 'auto';
    return () => {
      document.body.style.overflow = prevOverflow;
      if (hadOverflowHidden) {
        document.body.classList.add('overflow-hidden');
      }
    };
  }, []);

  useEffect(() => {
    if (note) {
      setIsRtl(getNoteDirection(note) === 'rtl');
    } else if (remoteNote) {
      const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u0590-\u05FF]/;
      setIsRtl(arabicRegex.test(remoteNote.title));
    }
  }, [note, remoteNote]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isLight = theme === 'light';

  // Determine if note is a Project Kanban Board
  const kanbanData: KanbanBoardData | null = useMemo(() => {
    // 1. Direct kanban_data on local note
    if (note?.kanban_data && Array.isArray(note.kanban_data.columns)) {
      return note.kanban_data;
    }
    // 2. Direct kanban_data on remote published note
    if (remoteNote?.kanban_data && Array.isArray(remoteNote.kanban_data.columns)) {
      return remoteNote.kanban_data;
    }
    // 3. Embedded lossless JSON in remoteNote HTML comment (<!--QALAM_KANBAN_DATA:...-->)
    if (remoteNote?.html) {
      const match = remoteNote.html.match(/<!--QALAM_KANBAN_DATA:(.*?)-->/);
      if (match && match[1]) {
        try {
          const parsed = JSON.parse(decodeURIComponent(match[1]));
          if (parsed && Array.isArray(parsed.columns)) {
            return parsed;
          }
        } catch (e) {
          console.warn('Failed parsing embedded kanban JSON in reader:', e);
        }
      }
    }
    // 4. Local note body parsed with markdownToKanbanData
    if (note?.body && (note.is_kanban || isKanbanHint)) {
      const parsed = markdownToKanbanData(note.body);
      return parsed;
    }
    // 5. Fallback markdown detection in raw body
    const rawContent = note?.body || '';
    if (
      rawContent.includes('## 📥') ||
      rawContent.includes('## 🔵') ||
      rawContent.includes('## 🟡') ||
      rawContent.includes('## 🟢') ||
      rawContent.includes('Backlog') ||
      rawContent.includes('(To Do)') ||
      rawContent.includes('(In Progress)')
    ) {
      const parsed = markdownToKanbanData(rawContent);
      const hasAnyCards = parsed.columns.some((c) => c.cards.length > 0);
      if (hasAnyCards || note?.is_kanban) {
        return parsed;
      }
    }
    // 6. If explicitly marked as Kanban (from cipher flag or note property), guarantee empty structure
    if (note?.is_kanban || remoteNote?.is_kanban || isKanbanHint) {
      return {
        version: 1,
        columns: [
          { id: 'backlog', title: 'Rencana & Ide', cards: [] },
          { id: 'todo', title: 'Akan Dikerjakan', cards: [] },
          { id: 'in_progress', title: 'Sedang Dikerjakan', cards: [] },
          { id: 'done', title: 'Selesai', cards: [] },
        ],
      };
    }
    return null;
  }, [
    note?.is_kanban,
    note?.kanban_data,
    note?.body,
    remoteNote?.kanban_data,
    remoteNote?.html,
    remoteNote?.is_kanban,
    isKanbanHint,
  ]);

  const isKanban = Boolean(kanbanData || note?.is_kanban || remoteNote?.is_kanban || isKanbanHint);
  const [kanbanViewMode, setKanbanViewMode] = useState<'board' | 'document'>('board');
  const [kanbanSearch, setKanbanSearch] = useState('');

  const stats = useMemo(() => calculateKanbanStats(kanbanData), [kanbanData]);

  // Priority color helper with light theme adaptive contrast
  const getPriorityBadge = (p?: KanbanPriority) => {
    switch (p) {
      case 'urgent':
        return {
          label: 'Mendesak',
          cls: isLight
            ? 'bg-rose-100 text-rose-800 border-rose-300 font-bold'
            : 'bg-rose-500/15 text-rose-400 border-rose-500/30',
        };
      case 'high':
        return {
          label: 'Tinggi',
          cls: isLight
            ? 'bg-orange-100 text-orange-800 border-orange-300 font-bold'
            : 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        };
      case 'low':
        return {
          label: 'Rendah',
          cls: isLight
            ? 'bg-slate-100 text-slate-700 border-slate-300 font-medium'
            : 'bg-slate-500/15 text-slate-400 border-slate-500/30',
        };
      default:
        return {
          label: 'Sedang',
          cls: isLight
            ? 'bg-blue-100 text-blue-800 border-blue-300 font-medium'
            : 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        };
    }
  };

  // Format and sanitize HTML/Markdown content with support for both editor modes
  const formattedHtml = useMemo(() => {
    // If it's a Kanban board viewed in document mode, render the formatted markdown report
    if (isKanban && kanbanData) {
      const md = kanbanDataToMarkdown(kanbanData, title);
      return markdownToHtml(md, { theme, direction: isRtl ? 'rtl' : 'ltr' });
    }

    // 1. Remote published HTML (from GAS)
    if (remoteNote?.html && remoteNote.html.trim()) {
      const content = remoteNote.html.trim();
      const hasBlockTags = /<(?:p|h[1-6]|ul|ol|li|table|div|blockquote|pre|span|b|strong|i|em)\b[^>]*>/i.test(content);
      if (hasBlockTags) {
        return DOMPurify.sanitize(content, {
          ADD_TAGS: [
            'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
            'blockquote', 'pre', 'code', 'hr', 'a', 'img', 'br',
            'details', 'summary', 'kbd', 'input', 'sup', 'sub', 'mark', 'del', 'ins',
            'audio', 'source', 'figure', 'figcaption', 'iframe', 'b', 'strong', 'i', 'em', 'u', 's'
          ],
          ADD_ATTR: [
            'target', 'disabled', 'checked', 'type', 'dir', 'style', 'class', 'id',
            'href', 'src', 'alt', 'controls', 'data-wikilink', 'title', 'width', 'height',
            'allow', 'allowfullscreen', 'align', 'valign'
          ],
          ADD_DATA_URI_TAGS: ['img', 'audio', 'source', 'video'],
        });
      }
      return markdownToHtml(content, { theme, direction: isRtl ? 'rtl' : 'ltr' });
    }

    // 2. Local note WYSIWYG HTML (note.body_html)
    if (note?.body_html && note.body_html.trim()) {
      return DOMPurify.sanitize(note.body_html.trim(), {
        ADD_TAGS: [
          'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
          'blockquote', 'pre', 'code', 'hr', 'a', 'img', 'br',
          'details', 'summary', 'kbd', 'input', 'sup', 'sub', 'mark', 'del', 'ins',
          'audio', 'source', 'figure', 'figcaption', 'iframe', 'b', 'strong', 'i', 'em', 'u', 's'
        ],
        ADD_ATTR: [
          'target', 'disabled', 'checked', 'type', 'dir', 'style', 'class', 'id',
          'href', 'src', 'alt', 'controls', 'data-wikilink', 'title', 'width', 'height',
          'allow', 'allowfullscreen', 'align', 'valign'
        ],
        ADD_DATA_URI_TAGS: ['img', 'audio', 'source', 'video'],
      });
    }

    // 3. Local note Markdown body (note.body)
    if (note?.body && note.body.trim()) {
      return markdownToHtml(note.body, { theme, direction: isRtl ? 'rtl' : 'ltr' });
    }

    return '';
  }, [isKanban, kanbanData, title, note?.body, note?.body_html, remoteNote?.html, theme, isRtl]);

  // Loading State
  if (isLoadingRemote) {
    return (
      <div
        className={`h-screen h-dvh w-full overflow-y-auto flex flex-col items-center justify-center p-6 transition-colors duration-200 select-none ${
          isLight ? 'bg-slate-100 text-slate-800' : 'bg-[#0a0f1d] text-slate-100'
        }`}
      >
        <div className="flex flex-col items-center gap-3 text-center max-w-sm">
          <QalamIcon className="w-14 h-14 shadow-2xl animate-pulse" />
          <h2 className="text-base font-bold">Memuat Catatan...</h2>
          <p className="text-xs text-slate-400">
            Mengambil isi dokumen yang dipublikasikan...
          </p>
        </div>
      </div>
    );
  }

  // Error State
  if (errorMessage && !note && !remoteNote) {
    return (
      <div
        className={`h-screen h-dvh w-full overflow-y-auto flex flex-col items-center justify-center p-6 text-center transition-colors duration-200 select-none ${
          isLight ? 'bg-slate-100 text-slate-800' : 'bg-[#0a0f1d] text-slate-100'
        }`}
      >
        <div className="flex flex-col items-center max-w-md space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold">Catatan Tidak Tersedia</h2>
          <p className="text-xs text-slate-400 leading-relaxed">{errorMessage}</p>

          <div className="flex items-center gap-2.5 pt-3 flex-wrap justify-center">
            <button
              onClick={onBackToApp}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-semibold shadow-md transition"
            >
              Buka Beranda Qalam Note
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 z-50 h-screen h-dvh w-full overflow-y-auto overflow-x-hidden flex flex-col font-sans select-text transition-colors duration-200 custom-scrollbar ${
        isLight ? 'qalam-light bg-slate-100 text-slate-900' : 'bg-[#0a0f1d] text-slate-100'
      }`}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {/* Top Banner Bar */}
      <header className="sticky top-0 z-40 bg-[#151f32] text-white px-4 sm:px-6 py-3 flex items-center justify-between shadow-md border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            onClick={onBackToApp}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition shrink-0 active:scale-95"
            title="Buka Aplikasi Lengkap"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kembali ke Aplikasi</span>
            <span className="sm:hidden">Aplikasi</span>
          </button>
          <div className="flex items-center gap-2 text-xs text-slate-300 min-w-0 truncate">
            <QalamIcon className="w-5 h-5 shadow-xs shrink-0" />
            <span className="font-bold text-white tracking-tight truncate">Qalam Note Reader</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Theme switcher */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
            <button
              onClick={() => setTheme('light')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition ${
                isLight ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Light Mode"
            >
              <Sun className="w-3 h-3" />
              <span className="hidden sm:inline">Light</span>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition ${
                !isLight ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Dark Mode"
            >
              <Moon className="w-3 h-3" />
              <span className="hidden sm:inline">Dark</span>
            </button>
          </div>

          {/* Direction switcher: LTR / RTL */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
            <button
              onClick={() => setIsRtl(false)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold transition ${
                !isRtl ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
              title="Left-to-Right (LTR)"
            >
              <AlignLeft className="w-3 h-3" />
              <span>LTR</span>
            </button>
            <button
              onClick={() => setIsRtl(true)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold transition ${
                isRtl ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
              title="Right-to-Left (RTL)"
            >
              <AlignRight className="w-3 h-3" />
              <span>RTL</span>
            </button>
          </div>

          {/* Share button */}
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 text-xs text-white font-semibold transition shadow-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-200" /> : <Share2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Tersalin!' : 'Bagikan Link'}</span>
            <span className="sm:hidden">{copied ? 'Tersalin' : 'Bagikan'}</span>
          </button>
        </div>
      </header>

      {/* Main Reading Container with generous bottom scroll padding */}
      <main
        className={`flex-1 w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 pb-36 sm:pb-48 transition-all ${
          isKanban && kanbanViewMode === 'board' ? 'max-w-7xl' : 'max-w-3xl'
        }`}
      >
        <article
          dir={isRtl ? 'rtl' : 'ltr'}
          className={`rounded-2xl border p-6 sm:p-8 md:p-10 transition-colors ${
            isLight
              ? 'bg-white text-slate-950 border-slate-200/90 shadow-md'
              : 'bg-[#11192a] text-slate-100 border-slate-800 shadow-xl'
          }`}
        >
          {/* Note Header */}
          <div
            className={`border-b pb-5 mb-6 ${
              isLight ? 'border-slate-200' : 'border-slate-800'
            }`}
          >
            {/* Tags and RTL pill */}
            <div className={`flex items-center gap-2 mb-3 flex-wrap justify-between`}>
              <div className="flex items-center gap-1.5 flex-wrap">
                {isKanban && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center gap-1">
                    <Kanban className="w-3 h-3" />
                    <span>Papan Proyek Klien</span>
                  </span>
                )}
                {isRtl && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                    Aksara RTL
                  </span>
                )}
                {tags && tags.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* View Switcher for Kanban Boards */}
              {isKanban && (
                <div
                  className={`flex items-center gap-1 p-0.5 rounded-lg border text-xs ${
                    isLight ? 'bg-slate-100 border-slate-300' : 'bg-slate-800/80 border-slate-700'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setKanbanViewMode('board')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition ${
                      kanbanViewMode === 'board'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : isLight
                        ? 'text-slate-600 hover:text-slate-900'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Columns3 className="w-3.5 h-3.5" />
                    <span>Papan Kanban</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setKanbanViewMode('document')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition ${
                      kanbanViewMode === 'document'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : isLight
                        ? 'text-slate-600 hover:text-slate-900'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Laporan Teks</span>
                  </button>
                </div>
              )}
            </div>

            <h1
              className={`text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight ${
                isRtl ? 'text-right' : 'text-left'
              } ${isLight ? 'text-slate-950' : 'text-white'}`}
            >
              {title}
            </h1>

            <div
              className={`flex items-center justify-between gap-3 mt-4 text-xs flex-wrap ${
                isRtl ? 'flex-row-reverse text-right' : 'text-left'
              } ${isLight ? 'text-slate-600' : 'text-slate-400'}`}
            >
              <div className="flex items-center gap-1.5">
                <span>Oleh:</span>
                <strong className={isLight ? 'text-slate-950 font-bold' : 'text-slate-200 font-bold'}>
                  {displayAuthor}
                </strong>
              </div>
              <div className="flex items-center gap-1.5 font-medium ml-auto">
                <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>
                  Tanggal Publikasi:{' '}
                  <strong className={isLight ? 'text-slate-900 font-bold' : 'text-slate-100 font-bold'}>
                    {displayPublicationDate}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* KANBAN BOARD VIEW (CLIENT LIVE PROJECT PROGRESS) */}
          {isKanban && kanbanData && kanbanViewMode === 'board' ? (
            <div className="space-y-6">
              {/* Project Progress Overview Header Bar */}
              <div
                className={`p-4 sm:p-5 rounded-xl border ${
                  isLight
                    ? 'bg-white border-slate-200 shadow-2xs'
                    : 'bg-[#151f33] border-slate-700/80 shadow-md'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div>
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${
                      isLight ? 'text-indigo-700' : 'text-indigo-400'
                    }`}>
                      Pantauan Progres Proyek
                    </span>
                    <h2 className={`text-base font-bold flex items-center gap-2 mt-0.5 ${
                      isLight ? 'text-slate-900' : 'text-white'
                    }`}>
                      <span>Tingkat Penyelesaian Keseluruhan</span>
                      <span className={`text-sm font-extrabold font-mono ${
                        isLight ? 'text-emerald-700' : 'text-emerald-400'
                      }`}>
                        {stats.percentage}%
                      </span>
                    </h2>
                  </div>

                  {/* Search deliverables input */}
                  <div className="relative min-w-[200px] sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={kanbanSearch}
                      onChange={(e) => setKanbanSearch(e.target.value)}
                      placeholder="Cari tugas / deliverable..."
                      className={`w-full pl-8 pr-3 py-1.5 rounded-lg text-xs transition border focus:outline-hidden focus:ring-1 focus:ring-indigo-500 ${
                        isLight
                          ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                          : 'bg-[#0f1624] border-slate-700 text-slate-200 placeholder-slate-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Progress bar */}
                <div className={`w-full h-2.5 rounded-full overflow-hidden border mb-3 ${
                  isLight ? 'bg-slate-200 border-slate-300' : 'bg-slate-800/80 border-slate-700/60'
                }`}>
                  <div
                    className="h-full bg-linear-to-r from-blue-500 via-indigo-500 to-emerald-400 transition-all duration-500 rounded-full"
                    style={{ width: `${Math.max(stats.percentage, 2)}%` }}
                  />
                </div>

                {/* Metrics Breakdown Chips */}
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-xs">
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${
                    isLight
                      ? 'bg-slate-100 border-slate-300 text-slate-700'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                  }`}>
                    <ListTodo className="w-3.5 h-3.5 text-blue-500" />
                    <span>Total: <strong className={isLight ? 'text-slate-900 font-bold' : 'text-white'}>{stats.totalCards}</strong> Tugas</span>
                  </div>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${
                    isLight
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
                  }`}>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Selesai: <strong className={isLight ? 'text-emerald-950 font-bold' : 'text-white'}>{stats.doneCount}</strong></span>
                  </div>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${
                    isLight
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : 'bg-amber-950/40 border-amber-800/50 text-amber-300'
                  }`}>
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Sedang Dikerjakan: <strong className={isLight ? 'text-amber-950 font-bold' : 'text-white'}>{stats.inProgressCount}</strong></span>
                  </div>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${
                    isLight
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-900'
                      : 'bg-indigo-950/40 border-indigo-800/50 text-indigo-300'
                  }`}>
                    <Columns3 className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Akan Dikerjakan: <strong className={isLight ? 'text-indigo-950 font-bold' : 'text-white'}>{stats.todoCount}</strong></span>
                  </div>
                  {stats.backlogCount > 0 && (
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${
                      isLight
                        ? 'bg-slate-100 border-slate-300 text-slate-700'
                        : 'bg-slate-800/40 border-slate-700/50 text-slate-400'
                    }`}>
                      <span>Rencana: <strong className={isLight ? 'text-slate-900 font-bold' : 'text-slate-300'}>{stats.backlogCount}</strong></span>
                    </div>
                  )}
                </div>
              </div>

              {/* 4 Kanban Columns (Horizontally scrollable with snap-x on tablet and mobile to prevent overlapping) */}
              <div className="flex gap-4 items-start overflow-x-auto pb-4 custom-scrollbar snap-x">
                {kanbanData.columns.map((column) => {
                  const filteredCards = (column.cards || []).filter((card) => {
                    if (!kanbanSearch.trim()) return true;
                    const q = kanbanSearch.toLowerCase();
                    return (
                      card.title.toLowerCase().includes(q) ||
                      (card.description && card.description.toLowerCase().includes(q)) ||
                      (card.tags && card.tags.some((t) => t.toLowerCase().includes(q)))
                    );
                  });

                  // Header color accent
                  const getColTheme = () => {
                    switch (column.id) {
                      case 'backlog':
                        return { dot: 'bg-slate-400', badge: 'text-slate-400', border: 'border-slate-700/60' };
                      case 'todo':
                        return { dot: 'bg-blue-400', badge: 'text-blue-400', border: 'border-blue-700/40' };
                      case 'in_progress':
                        return { dot: 'bg-amber-400', badge: 'text-amber-400', border: 'border-amber-700/40' };
                      case 'done':
                        return { dot: 'bg-emerald-400', badge: 'text-emerald-400', border: 'border-emerald-700/40' };
                    }
                  };
                  const colTheme = getColTheme();

                  return (
                    <div
                      key={column.id}
                      className={`w-[280px] sm:w-[300px] shrink-0 snap-start flex flex-col rounded-xl border p-3.5 transition ${
                        isLight
                          ? 'bg-slate-50/90 border-slate-200'
                          : 'bg-[#131b2c] border-slate-800'
                      }`}
                    >
                      {/* Column Header */}
                      <div className={`flex items-center justify-between pb-3 mb-3 border-b ${
                        isLight ? 'border-slate-200' : 'border-slate-700/50'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${colTheme.dot}`} />
                          <h3 className={`text-xs font-bold uppercase tracking-wider ${
                            isLight ? 'text-slate-900' : 'text-slate-200'
                          }`}>
                            {column.title}
                          </h3>
                        </div>
                        <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold ${
                          isLight
                            ? 'bg-slate-200 text-slate-800'
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          {filteredCards.length}
                        </span>
                      </div>

                      {/* Cards List */}
                      <div className="space-y-2.5">
                        {filteredCards.length === 0 ? (
                          <div className={`p-4 rounded-lg border border-dashed text-center text-xs ${
                            isLight
                              ? 'border-slate-300 text-slate-500 bg-white'
                              : 'border-slate-800 text-slate-500'
                          }`}>
                            {kanbanSearch ? 'Tidak ada kartu yang cocok' : 'Belum ada tugas'}
                          </div>
                        ) : (
                          filteredCards.map((card) => {
                            const prio = getPriorityBadge(card.priority);
                            const totalChecklist = card.checklist ? card.checklist.length : 0;
                            const doneChecklist = card.checklist
                              ? card.checklist.filter((i) => i.completed).length
                              : 0;

                            return (
                              <div
                                key={card.id}
                                className={`p-3 rounded-lg border text-xs shadow-xs transition hover:shadow-md ${
                                  column.id === 'done'
                                    ? isLight
                                      ? 'bg-emerald-50/60 border-emerald-300 text-slate-800'
                                      : 'bg-emerald-950/15 border-emerald-900/40 text-slate-300'
                                    : isLight
                                    ? 'bg-white border-slate-200 text-slate-900'
                                    : 'bg-[#182337] border-slate-700/80 text-slate-200'
                                }`}
                              >
                                {/* Priority & Due Date Header */}
                                <div className="flex items-center justify-between gap-1.5 mb-1.5 flex-wrap">
                                  {card.priority && (
                                    <span
                                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${prio.cls}`}
                                    >
                                      {prio.label}
                                    </span>
                                  )}
                                  {card.due_date && card.due_date > 0 && (
                                    <span className={`flex items-center gap-1 text-[10px] ml-auto font-mono ${
                                      isLight ? 'text-slate-600 font-semibold' : 'text-slate-400'
                                    }`}>
                                      <Calendar className="w-3 h-3 text-indigo-500 shrink-0" />
                                      {new Date(card.due_date).toLocaleDateString('id-ID', {
                                        day: 'numeric',
                                        month: 'short',
                                      })}
                                    </span>
                                  )}
                                </div>

                                {/* Title */}
                                <h4
                                  className={`font-bold text-xs leading-snug break-words ${
                                    column.id === 'done'
                                      ? 'line-through text-slate-400'
                                      : isLight
                                      ? 'text-slate-900'
                                      : 'text-white'
                                  }`}
                                >
                                  {card.title}
                                </h4>

                                {/* Description */}
                                {card.description && card.description.trim() && (
                                  <p className={`mt-1.5 text-[11px] leading-relaxed whitespace-pre-wrap break-words ${
                                    isLight ? 'text-slate-600' : 'text-slate-400'
                                  }`}>
                                    {card.description}
                                  </p>
                                )}

                                {/* Checklist items */}
                                {card.checklist && card.checklist.length > 0 && (
                                  <div className={`mt-2.5 pt-2 border-t space-y-1 ${
                                    isLight ? 'border-slate-200' : 'border-slate-700/50'
                                  }`}>
                                    <div className="flex items-center justify-between text-[10px] mb-1">
                                      <span className={isLight ? 'text-slate-700 font-semibold' : 'text-slate-400'}>Checklist Sub-Tugas</span>
                                      <span className={`font-mono font-bold ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                                        {doneChecklist}/{totalChecklist}
                                      </span>
                                    </div>
                                    <div className={`w-full h-1.5 rounded-full overflow-hidden mb-1.5 ${
                                      isLight ? 'bg-slate-200' : 'bg-slate-800'
                                    }`}>
                                      <div
                                        className="h-full bg-indigo-500 rounded-full"
                                        style={{
                                          width: `${Math.round((doneChecklist / totalChecklist) * 100)}%`,
                                        }}
                                      />
                                    </div>
                                    {card.checklist.map((chk) => (
                                      <div
                                        key={chk.id}
                                        className={`flex items-start gap-1.5 text-[11px] leading-tight ${
                                          isLight ? 'text-slate-800' : 'text-slate-300'
                                        }`}
                                      >
                                        <span className="mt-0.5 shrink-0">
                                          {chk.completed ? (
                                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                          ) : (
                                            <span className={`inline-block w-3 h-3 rounded-xs border ${
                                              isLight ? 'border-slate-400' : 'border-slate-600'
                                            }`} />
                                          )}
                                        </span>
                                        <span className={chk.completed ? 'line-through text-slate-400' : ''}>
                                          {chk.text}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Tags */}
                                {card.tags && card.tags.length > 0 && (
                                  <div className="flex items-center gap-1 mt-2.5 flex-wrap">
                                    {card.tags.map((t) => (
                                      <span
                                        key={t}
                                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                                          isLight
                                            ? 'bg-indigo-50 text-indigo-800 border-indigo-200 font-medium'
                                            : 'bg-slate-800 text-slate-400 border-slate-700/60'
                                        }`}
                                      >
                                        #{t}
                                      </span>
                                    ))}
                                  </div>
                                )}
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
          ) : (
            /* Rendered Document Body with qalam-markdown-preview typography */
            <div
              className={`qalam-markdown-preview prose max-w-none text-[15px] sm:text-base leading-relaxed break-words ${
                isLight ? 'text-slate-900' : 'text-slate-100'
              } ${isRtl ? 'text-right' : 'text-left'}`}
              dangerouslySetInnerHTML={{
                __html: formattedHtml,
              }}
            />
          )}

          {/* Footer note */}
          <footer
            className={`mt-12 pt-6 border-t text-center text-xs font-medium ${
              isLight ? 'border-slate-200 text-slate-500' : 'border-slate-800 text-slate-400'
            }`}
          >
            <span>
              Diterbitkan dari{' '}
              <a
                href="https://lam-note.aiprojek01.my.id/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline font-semibold"
              >
                Qalam Note
              </a>
            </span>
          </footer>
        </article>
      </main>
    </div>
  );
};
