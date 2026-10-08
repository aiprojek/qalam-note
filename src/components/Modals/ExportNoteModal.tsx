import React, { useState } from 'react';
import {
  X,
  FileText,
  FileCode,
  Globe,
  Printer,
  FileDown,
  Check,
  Loader2,
  File,
  AlertCircle,
} from 'lucide-react';
import type { Note, AppLanguage } from '../../types';

interface ExportNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note | null;
  folderTitle?: string;
  language?: AppLanguage;
  theme?: string;
  onExportPdfDirect: (note: Note) => Promise<void> | void;
  onExportDocx: (note: Note) => Promise<void> | void;
  onExportMarkdown: (note: Note) => void;
  onExportHtml: (note: Note) => void;
  onExportPrint: (note: Note) => void;
}

export const ExportNoteModal: React.FC<ExportNoteModalProps> = ({
  isOpen,
  onClose,
  note,
  folderTitle = 'Qalam Note',
  language = 'id',
  theme = 'qalam-dark',
  onExportPdfDirect,
  onExportDocx,
  onExportMarkdown,
  onExportHtml,
  onExportPrint,
}) => {
  const isId = language === 'id';
  const isLight =
    theme === 'qalam-light' ||
    theme === 'light' ||
    theme === 'joplin-light' ||
    (typeof document !== 'undefined' && document.documentElement.classList.contains('light'));

  const [loadingFormat, setLoadingFormat] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !note) return null;

  const handleAction = async (format: string, action: () => Promise<void> | void) => {
    try {
      setErrorMessage(null);
      setLoadingFormat(format);
      await action();
      setTimeout(() => {
        setLoadingFormat(null);
        onClose();
      }, 400);
    } catch (err: any) {
      console.error('Export error', err);
      setLoadingFormat(null);
      setErrorMessage(
        err?.message || (isId ? 'Gagal mengunduh berkas. Silakan coba lagi.' : 'Failed to export file. Please try again.')
      );
    }
  };

  const exportOptions = [
    {
      id: 'pdf',
      title: isId ? 'Dokumen PDF (.pdf)' : 'PDF Document (.pdf)',
      badge: isId ? 'Unduh Langsung' : 'Direct Download',
      badgeColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      desc: isId
        ? 'Unduh berkas PDF rapi langsung ke perangkat tanpa membuka jendela printer'
        : 'Download formatted PDF directly without opening print dialog',
      icon: FileText,
      iconColor: 'text-rose-500 bg-rose-50 dark:bg-rose-500/10',
      action: () => handleAction('pdf', () => onExportPdfDirect(note)),
    },
    {
      id: 'docx',
      title: isId ? 'Microsoft Word (.docx)' : 'Microsoft Word (.docx)',
      badge: 'Word / Office',
      badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      desc: isId
        ? 'Dokumen Word standar (.docx) lengkap dengan judul, format teks, dan daftar'
        : 'Standard Office Word (.docx) with headings, lists, and formatted text',
      icon: File,
      iconColor: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10',
      action: () => handleAction('docx', () => onExportDocx(note)),
    },
    {
      id: 'markdown',
      title: isId ? 'Berkas Markdown (.md)' : 'Markdown File (.md)',
      badge: 'Obsidian / Standar',
      badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      desc: isId
        ? 'Teks Markdown murni standar yang kompatibel dengan Obsidian dan standar Markdown GitHub'
        : 'Pure standard Markdown compatible with Obsidian and standard GitHub Markdown',
      icon: FileCode,
      iconColor: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10',
      action: () => handleAction('markdown', () => onExportMarkdown(note)),
    },
    {
      id: 'html',
      title: isId ? 'Halaman Web Mandiri (.html)' : 'Standalone HTML (.html)',
      badge: 'Web',
      badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      desc: isId
        ? 'Berkas HTML mandiri lengkap dengan gaya visual yang dapat dibuka di peramban mana pun'
        : 'Self-contained HTML file with embedded styling playable in any browser',
      icon: Globe,
      iconColor: 'text-purple-500 bg-purple-50 dark:bg-purple-500/10',
      action: () => handleAction('html', () => onExportHtml(note)),
    },
    {
      id: 'print',
      title: isId ? 'Dialog Pencetak / Printer' : 'Printer Dialog (Print)',
      badge: isId ? 'Cetak Kertas' : 'Paper Print',
      badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      desc: isId
        ? 'Buka jendela pencetak sistem browser untuk mencetak fisik atau simpan via print driver'
        : 'Open browser print window to physically print or save via printer driver',
      icon: Printer,
      iconColor: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10',
      action: () => handleAction('print', () => onExportPrint(note)),
    },
  ];

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs select-none animate-in fade-in duration-150 ${
        isLight ? 'bg-slate-900/50' : 'bg-black/75'
      }`}
    >
      <div
        className={`border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] transition-colors ${
          isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#1e293b] border-slate-700/80 text-slate-100'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-3.5 border-b shrink-0 ${
            isLight ? 'bg-slate-100 border-slate-300 text-slate-900' : 'bg-[#162032] border-slate-700/80 text-slate-100'
          }`}
        >
          <div className="flex items-center gap-2.5 font-bold text-sm">
            <div className={`p-1.5 rounded-lg ${isLight ? 'bg-blue-100 text-blue-700' : 'bg-blue-500/10 text-blue-400'}`}>
              <FileDown className="w-4 h-4" />
            </div>
            <div>
              <span className="block leading-tight">{isId ? 'Ekspor Catatan' : 'Export Note'}</span>
              <span className={`text-[11px] font-medium truncate max-w-[280px] block ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                {note.title || (isId ? 'Catatan Tanpa Judul' : 'Untitled Note')}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition ${
              isLight ? 'hover:bg-slate-200 text-slate-600 hover:text-slate-900' : 'hover:bg-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Note quick info */}
        <div className={`px-5 py-2.5 border-b text-xs flex items-center justify-between ${isLight ? 'bg-slate-50 border-slate-300 text-slate-700 font-medium' : 'bg-slate-800/40 border-slate-700/60 text-slate-400'}`}>
          <span>📂 <strong>Folder:</strong> {folderTitle}</span>
          <span>🕒 {new Date(note.updated_time).toLocaleDateString()}</span>
        </div>

        {/* Error Notification Banner if export failed */}
        {errorMessage && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center justify-between gap-2 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span className="truncate">{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-500 hover:text-red-700 dark:hover:text-red-300 shrink-0 font-medium px-1.5 py-0.5 rounded"
            >
              ✕
            </button>
          </div>
        )}

        {/* Export Options List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5 flex-1">
          {exportOptions.map((opt) => {
            const Icon = opt.icon;
            const isLoading = loadingFormat === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={!!loadingFormat}
                onClick={opt.action}
                className={`w-full p-3.5 rounded-xl border text-left flex items-start gap-3.5 transition group ${
                  isLight
                    ? 'bg-white hover:bg-slate-50 border-slate-300 hover:border-blue-600 hover:shadow-xs'
                    : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/80 hover:border-slate-500'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-black/5 dark:border-white/5 ${opt.iconColor}`}>
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`font-bold text-xs ${isLight ? 'text-slate-900 group-hover:text-blue-600' : 'text-slate-100 group-hover:text-blue-400'}`}>
                      {opt.title}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${opt.badgeColor}`}>
                      {opt.badge}
                    </span>
                  </div>
                  <p className={`text-[11px] leading-relaxed line-clamp-2 ${isLight ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
                    {opt.desc}
                  </p>
                </div>

                <div className="shrink-0 self-center">
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition ${
                    isLight
                      ? 'border-slate-300 bg-slate-100 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 text-slate-800'
                      : 'border-slate-700 bg-slate-800 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 text-slate-300'
                  }`}>
                    {isLoading ? (isId ? 'Memproses...' : 'Processing...') : (isId ? 'Unduh' : 'Download')}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className={`px-5 py-3 border-t flex items-center justify-between text-xs shrink-0 ${isLight ? 'border-slate-300 bg-slate-100' : 'border-slate-700/80 bg-[#162032]'}`}>
          <span className={`text-[11px] ${isLight ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
            {isId ? 'Berkas otomatis tersimpan di folder unduhan perangkat' : 'Files are automatically saved to your downloads folder'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className={`px-3.5 py-1.5 rounded-lg border text-xs font-bold transition ${
              isLight ? 'border-slate-300 bg-white hover:bg-slate-200 text-slate-800' : 'border-slate-600 hover:bg-slate-700 text-slate-300'
            }`}
          >
            {isId ? 'Tutup' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
