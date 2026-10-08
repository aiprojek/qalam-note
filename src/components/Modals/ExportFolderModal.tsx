import React, { useState } from 'react';
import {
  X,
  FolderArchive,
  FileCode,
  File,
  Globe,
  Archive,
  Loader2,
  Check,
  AlertCircle,
  FileText,
} from 'lucide-react';
import type { Folder, Note, AppLanguage } from '../../types';

interface ExportFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder: Folder | null;
  notes: Note[];
  language?: AppLanguage;
  theme?: string;
  onExportZip: (format: 'all' | 'markdown' | 'docx' | 'html' | 'pdf') => Promise<void> | void;
}

export const ExportFolderModal: React.FC<ExportFolderModalProps> = ({
  isOpen,
  onClose,
  folder,
  notes,
  language = 'id',
  theme = 'qalam-dark',
  onExportZip,
}) => {
  const isId = language === 'id';
  const isLight =
    theme === 'qalam-light' ||
    theme === 'light' ||
    theme === 'joplin-light' ||
    (typeof document !== 'undefined' && document.documentElement.classList.contains('light'));

  const [loadingFormat, setLoadingFormat] = useState<string | null>(null);

  if (!isOpen || !folder) return null;

  const handleAction = async (format: 'all' | 'markdown' | 'docx' | 'html' | 'pdf') => {
    try {
      setLoadingFormat(format);
      await onExportZip(format);
      setTimeout(() => {
        setLoadingFormat(null);
        onClose();
      }, 500);
    } catch (err) {
      console.error('Export folder zip error', err);
      setLoadingFormat(null);
    }
  };

  const options = [
    {
      id: 'all' as const,
      title: isId ? 'Arsip Lengkap (PDF + Word + Markdown + HTML)' : 'Complete Archive (PDF + DOCX + MD + HTML)',
      badge: isId ? 'Paling Lengkap' : 'All-in-One',
      badgeColor: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
      desc: isId
        ? 'Ekspor seluruh catatan dalam format PDF, Word (.docx), Markdown, dan HTML dalam satu berkas .zip rapi'
        : 'Export all notes as PDF, Word (.docx), Markdown, and HTML inside a single .zip archive',
      icon: Archive,
      iconColor: 'text-blue-600 bg-blue-100 dark:bg-blue-500/10',
    },
    {
      id: 'pdf' as const,
      title: isId ? 'Hanya Berkas Dokumen PDF (.pdf)' : 'PDF Documents (.pdf) Only',
      badge: 'PDF',
      badgeColor: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30',
      desc: isId
        ? 'Seluruh catatan dikonversi menjadi berkas PDF berkualitas tinggi yang siap dibaca dan dicetak'
        : 'All notes converted to high-quality PDF files ready to read and print',
      icon: FileText,
      iconColor: 'text-rose-600 bg-rose-100 dark:bg-rose-500/10',
    },
    {
      id: 'docx' as const,
      title: isId ? 'Hanya Dokumen Microsoft Word (.docx)' : 'Microsoft Word (.docx) Only',
      badge: 'Word / Office',
      badgeColor: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30',
      desc: isId
        ? 'Seluruh catatan dikonversi ke dokumen Word standar dengan judul, daftar, dan pemformatan'
        : 'All notes converted to standard Word documents with headings and lists',
      icon: File,
      iconColor: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-500/10',
    },
    {
      id: 'markdown' as const,
      title: isId ? 'Hanya Berkas Markdown (.md)' : 'Markdown Files (.md) Only',
      badge: 'Obsidian / Standar',
      badgeColor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
      desc: isId
        ? 'Format teks Markdown murni yang siap diimpor ke Obsidian, editor Markdown lain, atau disimpan di GitHub'
        : 'Pure Markdown files ready to import into Obsidian, Markdown editors, or store in Git',
      icon: FileCode,
      iconColor: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-500/10',
    },
    {
      id: 'html' as const,
      title: isId ? 'Hanya Halaman Web Mandiri (.html)' : 'Standalone HTML (.html) Only',
      badge: 'Web',
      badgeColor: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30',
      desc: isId
        ? 'Berkas HTML dengan gaya visual yang dapat dibuka langsung di peramban tanpa aplikasi tambahan'
        : 'Formatted HTML files that can be directly viewed in any web browser',
      icon: Globe,
      iconColor: 'text-purple-600 bg-purple-100 dark:bg-purple-500/10',
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
            <div className={`p-1.5 rounded-lg ${isLight ? 'bg-amber-100 text-amber-800' : 'bg-amber-500/10 text-amber-400'}`}>
              <FolderArchive className="w-4 h-4" />
            </div>
            <div>
              <span className="block leading-tight">{isId ? 'Ekspor Folder (Arsip ZIP)' : 'Export Notebook (ZIP Archive)'}</span>
              <span className={`text-[11px] font-medium truncate max-w-[280px] block ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                {folder.title} &bull; {notes.length} {isId ? 'catatan' : 'notes'}
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

        {/* Folder summary info bar */}
        <div
          className={`px-5 py-2.5 border-b text-xs flex items-center justify-between ${
            isLight ? 'bg-amber-50/80 border-slate-300 text-amber-950 font-medium' : 'bg-amber-950/20 border-slate-700/60 text-amber-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>📁 <strong>{folder.title}</strong></span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
              isLight ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-amber-900/40 border-amber-700 text-amber-300'
            }`}>
              {notes.length} {isId ? 'Catatan Tersimpan' : 'Saved Notes'}
            </span>
          </div>
          <span className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            Arsip &bull; ZIP
          </span>
        </div>

        {/* Options List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5 flex-1">
          {notes.length === 0 ? (
            <div className={`p-6 text-center rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-slate-800/40 border-slate-700 text-slate-400'}`}>
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-500 opacity-80" />
              <p className="font-semibold text-xs mb-1">
                {isId ? 'Folder ini belum memiliki catatan' : 'This notebook has no notes'}
              </p>
              <p className="text-[11px]">
                {isId ? 'Tambahkan catatan terlebih dahulu sebelum melakukan ekspor.' : 'Add notes to this notebook before exporting.'}
              </p>
            </div>
          ) : (
            options.map((opt) => {
              const Icon = opt.icon;
              const isLoading = loadingFormat === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={!!loadingFormat}
                  onClick={() => handleAction(opt.id)}
                  className={`w-full p-3.5 rounded-xl border text-left flex items-start gap-3.5 transition group ${
                    isLight
                      ? 'bg-white hover:bg-slate-50 border-slate-300 hover:border-amber-500 hover:shadow-xs'
                      : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/80 hover:border-amber-500'
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
                      <span className={`font-bold text-xs ${isLight ? 'text-slate-900 group-hover:text-amber-800' : 'text-slate-100 group-hover:text-amber-400'}`}>
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
                        ? 'border-slate-300 bg-slate-100 group-hover:bg-amber-600 group-hover:text-white group-hover:border-amber-600 text-slate-800'
                        : 'border-slate-700 bg-slate-800 group-hover:bg-amber-600 group-hover:text-white group-hover:border-amber-600 text-slate-300'
                    }`}>
                      {isLoading ? (isId ? 'Mengompres...' : 'Compressing...') : (isId ? 'Unduh ZIP' : 'Download ZIP')}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className={`px-5 py-3 border-t flex items-center justify-between text-xs shrink-0 ${isLight ? 'border-slate-300 bg-slate-100' : 'border-slate-700/80 bg-[#162032]'}`}>
          <span className={`text-[11px] ${isLight ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
            {isId ? 'Berkas .ZIP akan tersimpan di folder Unduhan' : 'The .ZIP file will be saved in your Downloads folder'}
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
