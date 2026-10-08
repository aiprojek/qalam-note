import React, { useState, useMemo } from 'react';
import {
  Globe,
  X,
  Copy,
  ExternalLink,
  Check,
  RefreshCw,
  Trash2,
  FileCode,
  Eye,
  AlertCircle,
  Share2,
  AlertTriangle,
} from 'lucide-react';
import type { Note, GASConfig, AppLanguage } from '../../types';
import { publishNoteToGAS, unpublishNoteFromGAS } from '../../services/gas';
import { encodePublishCipher } from '../../services/publishCipher';
import { markdownToHtml } from '../../utils/markdown';
import { getNoteDirection } from '../../utils/rtl';

interface PublishModalProps {
  note: Note;
  gasConfig: GASConfig;
  onUpdateNote: (updated: Partial<Note>) => void;
  onUpdateGASConfig: (config: Partial<GASConfig>) => void;
  onOpenGASHelp: () => void;
  onClose: () => void;
  language?: AppLanguage;
  theme?: string;
}

export const PublishModal: React.FC<PublishModalProps> = ({
  note,
  gasConfig,
  onUpdateNote,
  onUpdateGASConfig,
  onOpenGASHelp,
  onClose,
  language = 'id',
  theme = 'qalam-dark',
}) => {
  const [gasUrl, setGasUrl] = useState(gasConfig.web_app_url || '');
  const [authorName, setAuthorName] = useState(gasConfig.author_name || (language === 'id' ? 'Anonim' : 'Anonymous'));
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'preview'>('details');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const isId = language === 'id';
  const isLight =
    theme === 'qalam-light' ||
    theme === 'light' ||
    theme === 'joplin-light' ||
    (typeof document !== 'undefined' && document.documentElement.classList.contains('light'));

  const isPublished = !!note.published_info?.is_published;
  const publicUrl = useMemo(() => {
    if (!isPublished) return '';
    const baseUrl = typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname.replace(/\/$/, '')}`
      : '';
    // Encode compact URL-safe cipher
    const cipher = encodePublishCipher({
      id: note.id,
      gasUrl: note.published_info?.gas_url || gasUrl || undefined,
      title: note.title,
      author: authorName,
      publishedAt: note.published_info?.published_at,
    });
    return `${baseUrl}/?k=${cipher}`;
  }, [isPublished, note.published_info, note.id, note.title, authorName, gasUrl]);

  // Automatic natural text direction (RTL if note contains Arabic/Hebrew, otherwise LTR)
  const noteDirection = getNoteDirection(note);
  const isRtl = noteDirection === 'rtl';

  const handlePublish = async () => {
    setIsPublishing(true);
    setStatusMessage(null);

    // Save configured GAS URL to settings
    onUpdateGASConfig({ web_app_url: gasUrl, author_name: authorName });

    const result = await publishNoteToGAS(note, gasUrl, authorName);

    if (result.success) {
      onUpdateNote({
        published_info: {
          is_published: true,
          published_at: result.published_at,
          public_url: result.public_url,
          gas_url: gasUrl,
        },
        updated_time: Date.now(),
      });
      setStatusMessage(result.message || (isId ? 'Catatan berhasil dipublikasikan!' : 'Note published successfully!'));
    } else {
      setStatusMessage(result.message || (isId ? 'Gagal mempublikasikan catatan.' : 'Could not publish note.'));
    }

    setIsPublishing(false);
  };

  const executeUnpublish = async () => {
    setShowUnpublishConfirm(false);
    setIsUnpublishing(true);
    await unpublishNoteFromGAS(note.id, gasUrl);

    onUpdateNote({
      published_info: {
        is_published: false,
        published_at: 0,
        public_url: '',
        gas_url: gasUrl,
      },
      updated_time: Date.now(),
    });

    setIsUnpublishing(false);
    setStatusMessage(isId ? 'Publikasi catatan telah dicabut.' : 'Note unpublished.');
  };

  const handleCopy = () => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-xs select-none transition-colors animate-in fade-in duration-150 ${
        isLight ? 'bg-slate-900/45' : 'bg-black/75'
      }`}
    >
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[90vh] transition-colors ${
          isLight
            ? 'bg-white border-slate-300 text-slate-800'
            : 'bg-[#1e293b] border-slate-700/80 text-slate-100'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`flex items-center justify-between px-4 sm:px-6 py-3.5 border-b shrink-0 ${
            isLight
              ? 'bg-slate-50/95 border-slate-200 text-slate-900'
              : 'bg-[#162032] border-slate-700/80 text-slate-100'
          }`}
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div
              className={`p-2 rounded-xl shrink-0 ${
                isLight ? 'bg-blue-100 text-blue-600' : 'bg-blue-500/15 text-blue-400'
              }`}
            >
              <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className={`text-sm sm:text-base font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {isId ? 'Publikasikan Catatan ke Web' : 'Publish Note to Web'}
              </h3>
              <p className={`text-[11px] sm:text-xs truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {isId
                  ? 'Didukung oleh Google Sheets (GAS) • Tanpa server khusus'
                  : 'Powered by Google Sheets (GAS) • Serverless publishing'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className={`p-2 rounded-lg transition min-h-[38px] min-w-[38px] flex items-center justify-center shrink-0 ${
              isLight
                ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/80'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/80'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs: Details / Web Preview */}
        <div
          className={`flex items-center border-b px-4 sm:px-6 shrink-0 text-xs sm:text-sm font-medium gap-2 sm:gap-4 overflow-x-auto custom-scrollbar ${
            isLight ? 'bg-slate-100/70 border-slate-200' : 'bg-[#182234] border-slate-700/80'
          }`}
        >
          <button
            onClick={() => setActiveTab('details')}
            className={`py-2.5 sm:py-3 border-b-2 font-semibold transition shrink-0 ${
              activeTab === 'details'
                ? isLight
                  ? 'border-blue-600 text-blue-600'
                  : 'border-blue-500 text-blue-400'
                : isLight
                ? 'border-transparent text-slate-500 hover:text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {isId ? 'Pengaturan Publikasi' : 'Publish Settings'}
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`py-2.5 sm:py-3 border-b-2 font-semibold transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'preview'
                ? isLight
                  ? 'border-blue-600 text-blue-600'
                  : 'border-blue-500 text-blue-400'
                : isLight
                ? 'border-transparent text-slate-500 hover:text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{isId ? 'Pratinjau Pembaca' : 'Reader Preview'}</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 custom-scrollbar text-xs sm:text-sm flex-1 min-h-0">
          {activeTab === 'details' ? (
            <>
              {/* Note Details summary card */}
              <div
                className={`rounded-xl border p-3.5 sm:p-4 transition-colors ${
                  isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-800'
                    : 'bg-slate-900/60 border-slate-800 text-slate-200'
                }`}
              >
                <div className={`text-[11px] sm:text-xs font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  {isId ? 'Catatan yang akan dipublikasikan:' : 'Note to publish:'}
                </div>
                <div
                  className={`font-bold text-sm sm:text-base mt-1 truncate ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}
                >
                  {note.title || (isId ? 'Catatan Tanpa Judul' : 'Untitled Note')}
                </div>
                <div
                  className={`text-[11px] sm:text-xs mt-1.5 flex items-center gap-3 sm:gap-4 flex-wrap ${
                    isLight ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  <span>
                    <strong>{isId ? 'Tag' : 'Tags'}:</strong>{' '}
                    {note.tags.length > 0 ? note.tags.map((t) => `#${t}`).join(', ') : isId ? 'Tidak ada' : 'None'}
                  </span>
                  <span>•</span>
                  <span>
                    <strong>{isId ? 'Panjang' : 'Length'}:</strong> {note.body.length} {isId ? 'karakter' : 'chars'}
                  </span>
                </div>
              </div>

              {/* Status Banner */}
              {isPublished ? (
                <div
                  className={`rounded-xl border p-3.5 sm:p-4 space-y-2.5 transition-colors ${
                    isLight
                      ? 'bg-emerald-50/90 border-emerald-300 text-emerald-900'
                      : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  }`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span
                      className={`flex items-center gap-1.5 font-bold text-xs sm:text-sm ${
                        isLight ? 'text-emerald-800' : 'text-emerald-400'
                      }`}
                    >
                      <Share2 className="w-4 h-4 shrink-0" />
                      {isId ? 'Catatan ini aktif di web publik!' : 'This note is live on the web!'}
                    </span>
                    <span className={`text-[11px] ${isLight ? 'text-emerald-700' : 'text-slate-400'}`}>
                      {isId ? 'Dipublikasikan' : 'Published'}{' '}
                      {new Date(note.published_info!.published_at).toLocaleString(isId ? 'id-ID' : 'en-US')}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-1">
                    <div className="relative flex-1 min-w-0">
                      <input
                        type="text"
                        readOnly
                        value={publicUrl}
                        className={`w-full text-xs font-mono px-3 py-2 pr-20 rounded-lg border outline-none select-all truncate ${
                          isLight
                            ? 'bg-white text-slate-900 border-emerald-300 focus:border-emerald-500'
                            : 'bg-slate-900/90 text-slate-200 border-slate-700 focus:border-blue-500'
                        }`}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/25">
                        ?k=cipher
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="flex-1 sm:flex-none px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95 min-h-[38px] whitespace-nowrap shrink-0 border border-blue-700/40"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 shrink-0 text-emerald-200" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
                        <span className="whitespace-nowrap">{copied ? (isId ? 'Tersalin' : 'Copied') : isId ? 'Salin URL' : 'Copy URL'}</span>
                      </button>
                      <a
                        href={publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`p-2 rounded-lg transition active:scale-95 flex items-center justify-center min-h-[38px] min-w-[38px] shrink-0 ${
                          isLight
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                        }`}
                        title={isId ? 'Buka tautan publik' : 'Open public link'}
                      >
                        <ExternalLink className="w-4 h-4 shrink-0" />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 text-slate-400 flex-wrap gap-1">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      ✓ {isId ? 'Link ringkas terenkripsi (?k=...) siap dibagikan' : 'Encrypted compact link (?k=...) ready to share'}
                    </span>
                    {(note.published_info?.gas_url || gasUrl) && (
                      <a
                        href={`${note.published_info?.gas_url || gasUrl}?id=${encodeURIComponent(note.id)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-slate-300 underline inline-flex items-center gap-1 text-[10px]"
                      >
                        <span>{isId ? 'Buka langsung di GAS' : 'Open raw GAS endpoint'}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  className={`rounded-xl border p-3.5 sm:p-4 flex items-start gap-3 transition-colors ${
                    isLight
                      ? 'bg-blue-50/90 border-blue-200 text-blue-900'
                      : 'bg-blue-950/30 border-blue-800/40 text-slate-300'
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                      isLight ? 'bg-blue-100 text-blue-600' : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <div className={`font-bold text-xs sm:text-sm ${isLight ? 'text-blue-950' : 'text-blue-300'}`}>
                      {isId ? 'Siap dipublikasikan ke web' : 'Ready to publish to the web'}
                    </div>
                    <div
                      className={`text-[11px] sm:text-xs mt-1 leading-relaxed ${
                        isLight ? 'text-blue-900/80' : 'text-slate-400'
                      }`}
                    >
                      {isId
                        ? 'Publikasi membuat salinan snapshot catatan yang dapat dibaca siapa saja melalui tautan publik. Konten disimpan ke Google Spreadsheet Anda via Google Apps Script (GAS).'
                        : 'Publishing makes a read-only snapshot accessible via a public shareable URL. Content is stored into your Google Sheets spreadsheet via Google Apps Script.'}
                    </div>
                  </div>
                </div>
              )}

              {/* GAS Configuration */}
              <div className="space-y-3.5 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                    <label className={`font-semibold text-xs sm:text-sm ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                      {isId ? 'URL Web App Google Apps Script:' : 'Google Apps Script Web App URL:'}
                    </label>
                    <button
                      type="button"
                      onClick={onOpenGASHelp}
                      className={`text-xs flex items-center gap-1 transition font-medium ${
                        isLight ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'
                      }`}
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      <span>{isId ? 'Panduan Skrip Sheets Gratis' : 'Free Sheets Setup Guide'}</span>
                    </button>
                  </div>
                  <input
                    type="url"
                    value={gasUrl}
                    onChange={(e) => setGasUrl(e.target.value)}
                    placeholder={
                      isId
                        ? 'https://script.google.com/macros/s/.../exec (Kosongkan untuk pratinjau internal)'
                        : 'https://script.google.com/macros/s/.../exec (Leave blank for in-app preview)'
                    }
                    className={`w-full text-xs sm:text-sm px-3 py-2 rounded-lg border font-mono outline-none transition ${
                      isLight
                        ? 'bg-white text-slate-900 border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-slate-400'
                        : 'bg-slate-900 text-slate-200 border-slate-700 focus:border-blue-500 placeholder-slate-500'
                    }`}
                  />
                  <p className={`text-[11px] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {isId
                      ? 'Tip: Jika URL dikosongkan, Anda tetap dapat mempublikasikan catatan dan melihat pratinjau tampilan web dengan penampil Qalam bawaan!'
                      : 'Tip: If left blank, you can still publish and view the note in the built-in clean reader!'}
                  </p>
                </div>

                <div>
                  <label className={`block font-semibold text-xs sm:text-sm mb-1.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                    {isId ? 'Nama Penulis / Pembuat:' : 'Author Name:'}
                  </label>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder={isId ? 'Contoh: Nama Anda atau Pengguna Qalam Note' : 'e.g. Your Name or Qalam User'}
                    className={`w-full text-xs sm:text-sm px-3 py-2 rounded-lg border outline-none transition ${
                      isLight
                        ? 'bg-white text-slate-900 border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-slate-400'
                        : 'bg-slate-900 text-slate-200 border-slate-700 focus:border-blue-500 placeholder-slate-500'
                    }`}
                  />
                </div>
              </div>

              {/* Inline Confirmation for Unpublish */}
              {showUnpublishConfirm && (
                <div
                  className={`p-3.5 sm:p-4 rounded-xl border space-y-2 transition-colors ${
                    isLight
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : 'bg-amber-950/50 border-amber-500/60 text-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                    <AlertTriangle className={`w-4 h-4 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
                    <span>{isId ? 'Cabut publikasi catatan ini?' : 'Unpublish this note?'}</span>
                  </div>
                  <p className={`text-[11px] sm:text-xs leading-relaxed ${isLight ? 'text-amber-900/90' : 'text-amber-300/90'}`}>
                    {isId
                      ? 'Tautan publik tidak akan dapat diakses lagi oleh pembaca Anda. Anda dapat menerbitkannya kembali kapan saja.'
                      : 'The public link will become inaccessible to readers. You can republish it at any time.'}
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setShowUnpublishConfirm(false)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition active:scale-95 ${
                        isLight
                          ? 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 shadow-2xs'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
                      }`}
                    >
                      {isId ? 'Batal' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      onClick={executeUnpublish}
                      className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold text-xs whitespace-nowrap transition shadow-xs active:scale-95 border border-red-700/40"
                    >
                      {isId ? 'Ya, Cabut Publikasi' : 'Yes, Unpublish'}
                    </button>
                  </div>
                </div>
              )}

              {statusMessage && (
                <div
                  className={`p-3 rounded-xl border text-xs sm:text-sm flex items-center gap-2.5 transition-colors ${
                    isLight
                      ? 'bg-blue-50 border-blue-200 text-blue-900'
                      : 'bg-slate-900 text-blue-300 border-blue-900'
                  }`}
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-blue-500" />
                  <span>{statusMessage}</span>
                </div>
              )}
            </>
          ) : (
            /* Reader Preview: Default light theme only, responsive, no extra theme/direction toggles */
            <div className="space-y-3.5">
              {/* Clean Preview Header Indicator */}
              <div
                className={`flex items-center justify-between px-3.5 sm:px-4 py-2.5 rounded-xl border ${
                  isLight
                    ? 'bg-slate-100/90 border-slate-200 text-slate-700'
                    : 'bg-slate-900/90 border-slate-700/80 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Eye className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className={`font-semibold text-xs sm:text-sm truncate ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                    {isId ? 'Pratinjau Tampilan Web Publik' : 'Public Web Reader Preview'}
                  </span>
                  <span
                    className={`hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                      isLight ? 'bg-slate-200/80 text-slate-700' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {isId ? 'Tema Terang' : 'Light Theme'}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isRtl ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">
                      RTL
                    </span>
                  ) : (
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded border ${
                        isLight
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                      }`}
                    >
                      {isId ? 'Tampilan Bersih' : 'Clean View'}
                    </span>
                  )}
                </div>
              </div>

              {/* Reader Note Container: Crisp Light Theme by default */}
              <div
                dir={noteDirection}
                className="rounded-2xl p-5 sm:p-8 transition-colors select-text border border-slate-200 bg-white text-slate-900 shadow-sm"
              >
                {/* Header */}
                <div className="border-b border-slate-200 pb-4 mb-6">
                  <div className={`flex items-center gap-2 mb-2.5 ${isRtl ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded bg-blue-600 text-white shadow-xs">
                      {isId ? 'Catatan Publik Qalam Note' : 'Qalam Public Note'}
                    </span>
                    {isRtl && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 border border-amber-500/30">
                        RTL
                      </span>
                    )}
                  </div>

                  <h1
                    className={`text-xl sm:text-2xl md:text-3xl font-black mt-2 mb-3 tracking-tight text-slate-950 ${
                      isRtl ? 'text-right' : 'text-left'
                    }`}
                  >
                    {note.title || (isId ? 'Catatan Tanpa Judul' : 'Untitled Note')}
                  </h1>

                  <div
                    className={`flex items-center gap-2 text-xs flex-wrap text-slate-600 ${
                      isRtl ? 'justify-end text-right' : 'justify-start text-left'
                    }`}
                  >
                    <span>
                      {isId ? 'Oleh' : 'By'}{' '}
                      <strong className="text-slate-900 font-bold">{authorName}</strong>
                    </span>
                    <span>&bull;</span>
                    <span>{new Date().toLocaleDateString(isId ? 'id-ID' : 'en-US')}</span>
                    {note.tags && note.tags.length > 0 && (
                      <>
                        <span>&bull;</span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {note.tags.map((t) => (
                            <span
                              key={t}
                              className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Article Body: Rendered with Light Theme */}
                <div
                  className={`text-sm sm:text-[15px] leading-relaxed max-w-none text-slate-900 space-y-3 ${
                    isRtl ? 'text-right' : 'text-left'
                  }`}
                  dangerouslySetInnerHTML={{
                    __html: markdownToHtml(note.body, {
                      theme: 'light',
                      direction: noteDirection,
                    }),
                  }}
                />

                {/* Article Footer */}
                <div className="border-t border-slate-200 mt-8 pt-4 text-xs text-center text-slate-500 font-medium">
                  {isId
                    ? 'Diterbitkan dari Qalam Note • Didukung oleh Google Sheets'
                    : 'Published from Qalam Note • Powered by Google Sheets'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div
          className={`flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 border-t gap-2.5 sm:gap-3 shrink-0 ${
            isLight
              ? 'bg-slate-50/95 border-slate-200'
              : 'bg-[#162032] border-slate-700/80'
          }`}
        >
          <div className="flex items-center justify-center sm:justify-start">
            {isPublished && !showUnpublishConfirm && (
              <button
                type="button"
                onClick={() => setShowUnpublishConfirm(true)}
                disabled={isUnpublishing}
                className={`w-full sm:w-auto px-3 py-1.5 sm:py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 min-h-[36px] sm:min-h-[38px] whitespace-nowrap shrink-0 active:scale-95 ${
                  isLight
                    ? 'text-rose-700 hover:text-rose-800 hover:bg-rose-50 border border-rose-200/90'
                    : 'text-rose-300 hover:text-rose-200 hover:bg-rose-950/40 border border-rose-900/40'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">
                  {isUnpublishing
                    ? isId
                      ? 'Mencabut...'
                      : 'Unpublishing...'
                    : isId
                    ? 'Cabut Publikasi'
                    : 'Unpublish'}
                </span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 justify-end w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className={`px-3.5 sm:px-4 py-2 min-h-[38px] rounded-lg text-xs sm:text-sm font-semibold transition active:scale-95 flex-1 sm:flex-initial text-center justify-center whitespace-nowrap shrink-0 ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 border border-slate-300 shadow-2xs'
                  : 'bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-100 border border-slate-700'
              }`}
            >
              {isId ? 'Tutup' : 'Close'}
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={isPublishing}
              className="px-3.5 sm:px-5 py-2 min-h-[38px] rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs sm:text-sm shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5 sm:gap-2 disabled:opacity-50 flex-1 sm:flex-initial whitespace-nowrap shrink-0 border border-blue-700/40 focus:ring-2 focus:ring-blue-500/40"
            >
              {isPublishing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span className="whitespace-nowrap sm:hidden">{isId ? 'Memproses...' : 'Saving...'}</span>
                  <span className="whitespace-nowrap hidden sm:inline">{isId ? 'Mempublikasikan...' : 'Publishing...'}</span>
                </>
              ) : isPublished ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                  <span className="whitespace-nowrap sm:hidden">{isId ? 'Perbarui' : 'Update'}</span>
                  <span className="whitespace-nowrap hidden sm:inline">{isId ? 'Perbarui Publikasi' : 'Update Note'}</span>
                </>
              ) : (
                <>
                  <Globe className="w-3.5 h-3.5 shrink-0" />
                  <span className="whitespace-nowrap sm:hidden">{isId ? 'Publikasi' : 'Publish'}</span>
                  <span className="whitespace-nowrap hidden sm:inline">{isId ? 'Publikasikan Catatan' : 'Publish Note'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
