import React, { useState, useEffect } from 'react';
import {
  Globe,
  ArrowLeft,
  Share2,
  Copy,
  Check,
  Sun,
  Moon,
  AlignLeft,
  AlignRight,
  ExternalLink,
  AlertTriangle,
  RotateCw,
} from 'lucide-react';
import type { Note } from '../types';
import { markdownToHtml } from '../utils/markdown';
import { getNoteDirection } from '../utils/rtl';
import { QalamIcon } from './icons/QalamIcon';

export interface RemotePublishedNote {
  id: string;
  title: string;
  html: string;
  author?: string;
  tags?: string[];
  updated_at?: number | string;
  gasUrl?: string;
}

interface PublicReaderViewProps {
  note?: Note | null;
  remoteNote?: RemotePublishedNote | null;
  authorName?: string;
  gasUrl?: string;
  noteId?: string;
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
  isLoadingRemote = false,
  errorMessage = null,
  onBackToApp,
}) => {
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Determine active note data
  const title = note?.title || remoteNote?.title || 'Catatan Publik';
  const rawHtml = remoteNote?.html || (note?.body ? markdownToHtml(note.body, { theme }) : '');
  const tags = note?.tags || remoteNote?.tags || [];
  const displayAuthor = remoteNote?.author || authorName || 'Anonymous';
  const effectiveGasUrl = gasUrl || remoteNote?.gasUrl;

  const [isRtl, setIsRtl] = useState<boolean>(() => {
    if (note) return getNoteDirection(note) === 'rtl';
    const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u0590-\u05FF]/;
    return arabicRegex.test(title);
  });

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

  // Loading State
  if (isLoadingRemote) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center p-6 transition-colors duration-200 select-none ${
          isLight ? 'bg-slate-100 text-slate-800' : 'bg-[#0a0f1d] text-slate-100'
        }`}
      >
        <div className="flex flex-col items-center gap-3 text-center max-w-sm">
          <QalamIcon className="w-14 h-14 shadow-2xl animate-pulse" />
          <h2 className="text-base font-bold">Memuat Catatan Publik...</h2>
          <p className="text-xs text-slate-400">
            Mengambil isi dokumen dari Google Sheets (GAS)...
          </p>
        </div>
      </div>
    );
  }

  // Error State
  if (errorMessage && !note && !remoteNote) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center p-6 text-center transition-colors duration-200 select-none ${
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
            {effectiveGasUrl && noteId && (
              <a
                href={`${effectiveGasUrl}?id=${encodeURIComponent(noteId)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 transition border border-slate-700"
              >
                <span>Buka Langsung di GAS</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col font-sans select-text transition-colors duration-200 ${
        isLight ? 'bg-slate-100 text-slate-900' : 'bg-[#0a0f1d] text-slate-100'
      }`}
    >
      {/* Top Banner Bar */}
      <header className="bg-[#151f32] text-white px-4 sm:px-6 py-3 flex items-center justify-between shadow-md border-b border-slate-800 shrink-0">
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
          {/* Direct GAS Source Link if available */}
          {effectiveGasUrl && (
            <a
              href={`${effectiveGasUrl}?id=${encodeURIComponent(note?.id || remoteNote?.id || noteId || '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-[11px] font-medium text-slate-300 border border-slate-700/60 transition"
              title="Buka endpoint Google Apps Script"
            >
              <span>Sumber GAS</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}

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

      {/* Main Reading Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <article
          dir={isRtl ? 'rtl' : 'ltr'}
          className={`rounded-2xl border p-6 sm:p-10 md:p-12 transition-colors ${
            isLight
              ? 'bg-white text-slate-950 border-slate-200/90 shadow-md'
              : 'bg-[#11192a] text-slate-100 border-slate-800 shadow-xl'
          }`}
        >
          {/* Note Header */}
          <div
            className={`border-b pb-5 mb-8 ${
              isLight ? 'border-slate-200' : 'border-slate-800'
            }`}
          >
            <div className={`flex items-center gap-2 mb-3 flex-wrap ${isRtl ? 'justify-end' : 'justify-start'}`}>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <Globe className="w-3 h-3" />
                Catatan Publik
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                ?k=cipher
              </span>
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

            <h1
              className={`text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight ${
                isRtl ? 'text-right' : 'text-left'
              } ${isLight ? 'text-slate-950' : 'text-white'}`}
            >
              {title}
            </h1>

            <div
              className={`flex items-center gap-2 mt-4 text-xs flex-wrap ${
                isRtl ? 'justify-end text-right' : 'justify-start text-left'
              } ${isLight ? 'text-slate-600' : 'text-slate-400'}`}
            >
              <span>
                Oleh:{' '}
                <strong className={isLight ? 'text-slate-950 font-bold' : 'text-slate-200 font-bold'}>
                  {displayAuthor}
                </strong>
              </span>
              <span>&bull;</span>
              <span>
                {note?.updated_time
                  ? new Date(note.updated_time).toLocaleDateString([], {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : remoteNote?.updated_at
                  ? new Date(remoteNote.updated_at).toLocaleDateString([], {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'Tersimpan'}
              </span>
            </div>
          </div>

          {/* Rendered Body */}
          <div
            className={`text-[15px] leading-relaxed max-w-none break-words ${
              isRtl ? 'text-right' : 'text-left'
            }`}
            dangerouslySetInnerHTML={{
              __html: rawHtml,
            }}
          />

          {/* Footer note */}
          <footer
            className={`mt-12 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-medium ${
              isLight ? 'border-slate-200 text-slate-500' : 'border-slate-800 text-slate-400'
            }`}
          >
            <span>Diterbitkan dari Qalam Note &bull; Local-First & PWA</span>
            <button
              onClick={onBackToApp}
              className="text-blue-500 hover:underline inline-flex items-center gap-1 font-semibold"
            >
              <span>Mulai Menulis dengan Qalam Note</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </footer>
        </article>
      </main>
    </div>
  );
};
