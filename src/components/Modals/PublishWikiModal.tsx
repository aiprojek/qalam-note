import React, { useState, useMemo } from 'react';
import {
  Globe,
  X,
  Copy,
  ExternalLink,
  Check,
  RefreshCw,
  Trash2,
  Lock,
  BookOpen,
  FolderTree,
  FileText,
  AlertCircle,
  HelpCircle,
  Sparkles,
  KeyRound,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import type { Folder, Note, GASConfig, AppLanguage } from '../../types';
import type { WikiBundle, WikiFolderItem, WikiNoteItem } from '../../types/wiki';
import { publishWikiToGAS, unpublishWikiFromGAS } from '../../services/gas';
import { buildWikiPublishUrl } from '../../services/publishCipher';
import { encryptWithPassword } from '../../services/crypto';
import { markdownToHtml, wrapTablesWithScrollContainer } from '../../utils/markdown';
import { getNoteDirection } from '../../utils/rtl';
import { kanbanDataToHtml, markdownToKanbanData } from '../../utils/kanbanSerializer';

interface PublishWikiModalProps {
  initialFolder: Folder;
  allFolders: Folder[];
  allNotes: Note[];
  gasConfig: GASConfig;
  onUpdateFolder: (updated: Folder) => void;
  onUpdateGASConfig: (config: Partial<GASConfig>) => void;
  onOpenGASHelp: () => void;
  onOpenWikiReader: (wikiId: string, gasUrl?: string) => void;
  onClose: () => void;
  language?: AppLanguage;
  theme?: string;
}

export const PublishWikiModal: React.FC<PublishWikiModalProps> = ({
  initialFolder,
  allFolders,
  allNotes,
  gasConfig,
  onUpdateFolder,
  onUpdateGASConfig,
  onOpenGASHelp,
  onOpenWikiReader,
  onClose,
  language = 'id',
  theme = 'qalam-dark',
}) => {
  const isId = language === 'id';
  const isLight =
    theme === 'qalam-light' ||
    theme === 'light' ||
    theme === 'joplin-light' ||
    (typeof document !== 'undefined' && document.documentElement.classList.contains('light'));

  const [selectedFolderId, setSelectedFolderId] = useState(initialFolder.id);
  const activeFolder = useMemo(() => {
    return allFolders.find((f) => f.id === selectedFolderId) || initialFolder;
  }, [allFolders, selectedFolderId, initialFolder]);

  // Recursively collect all descendant folder IDs
  const includedFolders = useMemo(() => {
    const getDescendants = (parentId: string): Folder[] => {
      const children = allFolders.filter((f) => f.parent_id === parentId && !f.is_deleted);
      let res: Folder[] = [...children];
      for (const child of children) {
        res = res.concat(getDescendants(child.id));
      }
      return res;
    };
    return [activeFolder, ...getDescendants(activeFolder.id)];
  }, [activeFolder, allFolders]);

  const includedFolderIds = useMemo(() => {
    return new Set(includedFolders.map((f) => f.id));
  }, [includedFolders]);

  // All non-deleted notes inside the included folders
  const includedNotes = useMemo(() => {
    return allNotes.filter((n) => includedFolderIds.has(n.folder_id) && !n.is_deleted);
  }, [allNotes, includedFolderIds]);

  // Form states
  const [wikiTitle, setWikiTitle] = useState(
    activeFolder.published_info?.wiki_title || activeFolder.title
  );
  const [description, setDescription] = useState('');
  const [authorName, setAuthorName] = useState(
    gasConfig.author_name || (isId ? 'Penulis Qalam' : 'Qalam Author')
  );
  const [gasUrl, setGasUrl] = useState(gasConfig.web_app_url || '');

  // Landing note selection: default to index/readme or first note
  const defaultLandingNoteId = useMemo(() => {
    if (activeFolder.published_info?.landing_note_id) {
      const exists = includedNotes.some((n) => n.id === activeFolder.published_info?.landing_note_id);
      if (exists) return activeFolder.published_info.landing_note_id;
    }
    const indexNote = includedNotes.find((n) => {
      const t = n.title.toLowerCase().trim();
      return (
        t === 'index' ||
        t === 'beranda' ||
        t === 'home' ||
        t === 'readme' ||
        t.startsWith('index') ||
        t.startsWith('beranda')
      );
    });
    if (indexNote) return indexNote.id;
    return includedNotes.length > 0 ? includedNotes[0].id : '';
  }, [includedNotes, activeFolder.published_info]);

  const [landingNoteId, setLandingNoteId] = useState(defaultLandingNoteId);

  // Password Protection
  const [enablePassword, setEnablePassword] = useState(
    Boolean(activeFolder.published_info?.is_encrypted)
  );
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // UI state
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isPublished = Boolean(activeFolder.published_info?.is_published);

  // Canonical compact Wiki URL
  const publicUrl = useMemo(() => {
    if (!isPublished) return '';
    return (
      activeFolder.published_info?.public_url ||
      buildWikiPublishUrl({
        id: activeFolder.id,
        gasUrl: activeFolder.published_info?.gas_url || gasUrl || undefined,
        title: wikiTitle,
        author: authorName,
        publishedAt: activeFolder.published_info?.published_at,
        isWiki: true,
        landingNoteId,
      })
    );
  }, [isPublished, activeFolder, gasUrl, wikiTitle, authorName, landingNoteId]);

  const handleCopyLink = () => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePublish = async () => {
    setPasswordError(null);
    setStatusMessage(null);

    if (enablePassword) {
      if (!password || password.length < 4) {
        setPasswordError(
          isId
            ? 'Kata sandi minimal 4 karakter untuk enkripsi.'
            : 'Password must be at least 4 characters long.'
        );
        return;
      }
      if (password !== confirmPassword) {
        setPasswordError(
          isId ? 'Konfirmasi kata sandi tidak cocok.' : 'Passwords do not match.'
        );
        return;
      }
    }

    if (includedNotes.length === 0) {
      setStatusMessage(
        isId
          ? 'Folder ini belum memiliki catatan. Tambahkan minimal 1 catatan sebelum mempublikasikan Wiki.'
          : 'This folder has no notes. Please add at least 1 note before publishing as Wiki.'
      );
      return;
    }

    setIsPublishing(true);

    try {
      // 1. Save configured GAS URL & author to global settings
      onUpdateGASConfig({ web_app_url: gasUrl, author_name: authorName });

      // 2. Prepare Wiki Folder Items
      const wikiFolders: WikiFolderItem[] = includedFolders.map((f, idx) => ({
        id: f.id,
        title: f.title,
        parent_id: f.id === activeFolder.id ? '' : f.parent_id,
        order: f.order ?? idx,
      }));

      // 3. Prepare Wiki Note Items with compiled HTML
      const wikiNotes: WikiNoteItem[] = includedNotes.map((note) => {
        const isKanban = Boolean(note.is_kanban);
        const noteDir = getNoteDirection(note);
        let compiledHtml = '';

        if (isKanban) {
          const kData = note.kanban_data || markdownToKanbanData(note.body || '');
          compiledHtml =
            `<!--QALAM_KANBAN_DATA:${encodeURIComponent(JSON.stringify(kData))}-->\n` +
            kanbanDataToHtml(kData, note.title);
        } else if (note.body_html && note.body_html.trim()) {
          compiledHtml = wrapTablesWithScrollContainer(note.body_html);
        } else {
          compiledHtml = wrapTablesWithScrollContainer(
            markdownToHtml(note.body || '', { theme: 'light', direction: noteDir })
          );
        }

        return {
          id: note.id,
          folder_id: note.folder_id,
          title: note.title || 'Untitled',
          slug: note.title
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .trim()
            .replace(/[\s_-]+/g, '-')
            .substring(0, 50) || 'note',
          body: note.body || '',
          body_html: note.body_html,
          html: compiledHtml,
          tags: note.tags || [],
          is_todo: note.is_todo,
          todo_completed: note.todo_completed,
          created_time: note.created_time,
          updated_time: note.updated_time,
          is_kanban: isKanban,
          kanban_data: note.kanban_data,
        };
      });

      // 4. Construct WikiBundle
      const chosenLandingNote =
        landingNoteId && includedNotes.some((n) => n.id === landingNoteId)
          ? landingNoteId
          : includedNotes[0].id;

      let bundle: WikiBundle = {
        version: 1,
        id: activeFolder.id,
        title: wikiTitle.trim() || activeFolder.title,
        description: description.trim() || undefined,
        author: authorName.trim() || 'Anonymous',
        published_at: Date.now(),
        landing_note_id: chosenLandingNote,
        folders: wikiFolders,
        notes: wikiNotes,
      };

      // 5. Encrypt bundle client-side if password enabled
      if (enablePassword && password) {
        const plainJson = JSON.stringify({
          notes: wikiNotes,
          folders: wikiFolders,
        });
        const encResult = await encryptWithPassword(plainJson, password);

        bundle = {
          ...bundle,
          is_encrypted: true,
          salt: encResult.salt,
          encrypted_data: {
            ciphertext: encResult.ciphertext,
            iv: encResult.iv,
            salt: encResult.salt,
          },
          // Clear plaintext contents in published payload to guarantee zero-knowledge privacy
          notes: wikiNotes.map((n) => ({
            ...n,
            body: '',
            body_html: '',
            html: '',
          })),
        };
      }

      // 6. Upload to GAS
      const result = await publishWikiToGAS(bundle, gasUrl, activeFolder.title);

      if (result.success) {
        const updatedFolder: Folder = {
          ...activeFolder,
          published_info: {
            is_published: true,
            published_at: result.published_at,
            public_url: result.public_url,
            gas_url: gasUrl,
            wiki_title: bundle.title,
            landing_note_id: bundle.landing_note_id,
            is_encrypted: Boolean(bundle.is_encrypted),
            salt: bundle.salt,
          },
          updated_time: Date.now(),
        };

        onUpdateFolder(updatedFolder);
        setStatusMessage(
          result.message ||
            (isId
              ? 'Wiki interaktif berhasil dipublikasikan ke Google Sheets!'
              : 'Interactive Wiki successfully published to Google Sheets!')
        );
      } else {
        setStatusMessage(
          result.message ||
            (isId ? 'Gagal mempublikasikan wiki.' : 'Failed to publish wiki.')
        );
      }
    } catch (err: any) {
      console.error('Error publishing wiki:', err);
      setStatusMessage(
        (isId ? 'Terjadi kesalahan: ' : 'An error occurred: ') + (err.message || String(err))
      );
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    setShowUnpublishConfirm(false);
    setIsUnpublishing(true);
    setStatusMessage(null);

    try {
      await unpublishWikiFromGAS(
        activeFolder.id,
        activeFolder.title,
        activeFolder.published_info?.gas_url || gasUrl
      );

      const updatedFolder: Folder = {
        ...activeFolder,
        published_info: {
          is_published: false,
          published_at: 0,
          public_url: '',
          gas_url: gasUrl,
        },
        updated_time: Date.now(),
      };

      onUpdateFolder(updatedFolder);
      setStatusMessage(
        isId
          ? 'Publikasi Wiki dicabut dan tab sheet terkait telah dihapus dari Google Sheets.'
          : 'Wiki unpublished and dedicated sheet removed from Google Sheets.'
      );
    } catch (err: any) {
      console.warn('Unpublish wiki error:', err);
      setStatusMessage(
        isId
          ? 'Publikasi Wiki dicabut lokal. (Google Sheets mungkin telah memperbarui tab).'
          : 'Wiki unpublished locally.'
      );
    } finally {
      setIsUnpublishing(false);
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
            : 'bg-[#1b2434] border-slate-700/80 text-slate-100'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-4 sm:px-6 py-3.5 border-b shrink-0 ${
            isLight
              ? 'bg-slate-50 border-slate-200 text-slate-900'
              : 'bg-[#161f2e] border-slate-700/80 text-slate-100'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`p-2 rounded-xl shrink-0 ${
                isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/15 text-emerald-400'
              }`}
            >
              <Globe className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className={`text-sm sm:text-base font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {isId ? 'Publikasi Folder sebagai Wiki Interaktif' : 'Publish Notebook as Interactive Wiki'}
                </h3>
              </div>
              <p className={`text-[11px] sm:text-xs truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {isId
                  ? 'Digital Garden dengan sidebar hierarki, pencarian instan, & navigasi WikiLink tanpa reload'
                  : 'Digital Garden with hierarchical tree, instant search, and seamless SPA WikiLinks'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Tutup"
            className={`p-2 rounded-lg transition min-h-[36px] min-w-[36px] flex items-center justify-center shrink-0 ${
              isLight
                ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/80'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/80'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 custom-scrollbar text-xs">
          {/* Active status banner */}
          {isPublished && (
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 flex-wrap ${
                isLight
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <div>
                  <span className="font-bold text-xs">
                    {isId ? 'Wiki Sedang Aktif & Terpublikasi' : 'Wiki is Active & Published'}
                  </span>
                  <p className="text-[11px] opacity-80 mt-0.5">
                    {isId
                      ? 'Tautan digital garden siap diakses oleh pembaca di peramban.'
                      : 'Digital garden link is ready for readers in their browsers.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1 shadow-xs transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? (isId ? 'Tersalin!' : 'Copied!') : isId ? 'Salin Link' : 'Copy Link'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenWikiReader(activeFolder.id, activeFolder.published_info?.gas_url || gasUrl)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{isId ? 'Buka Pembaca' : 'Open Reader'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Folder selection & bundle metrics */}
          <div
            className={`p-3.5 rounded-xl border space-y-2.5 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#151c2a] border-slate-700/60'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="font-bold text-xs flex items-center gap-1.5">
                <FolderTree className="w-3.5 h-3.5 text-blue-400" />
                <span>{isId ? 'Buku Catatan yang Dipublikasikan:' : 'Notebook to Publish:'}</span>
              </label>
              <select
                value={selectedFolderId}
                onChange={(e) => {
                  setSelectedFolderId(e.target.value);
                  const f = allFolders.find((x) => x.id === e.target.value);
                  if (f) setWikiTitle(f.title);
                }}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold focus:outline-hidden ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-800'
                    : 'bg-[#1e293b] border-slate-700 text-slate-100'
                }`}
              >
                {allFolders
                  .filter((f) => !f.is_deleted)
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      📁 {f.title}
                    </option>
                  ))}
              </select>
            </div>

            {/* Scope Summary */}
            <div className="flex items-center gap-2 flex-wrap text-[11px] opacity-80 pt-1 border-t border-slate-700/30">
              <span className="font-semibold text-emerald-400">
                📦 {includedNotes.length} {isId ? 'Catatan' : 'Notes'}
              </span>
              <span>&bull;</span>
              <span>
                📂 {includedFolders.length} {isId ? 'Folder/Sub-folder' : 'Folders'}
              </span>
              <span>&bull;</span>
              <span>
                📑 {isId ? 'Tab Google Sheet:' : 'Google Sheet Tab:'}{' '}
                <strong className={isLight ? 'text-slate-900 font-mono' : 'text-cyan-300 font-mono'}>
                  Wiki - {activeFolder.title}
                </strong>
              </span>
            </div>
          </div>

          {/* Wiki Title & Description */}
          <div className="space-y-3">
            <div>
              <label className="block font-semibold mb-1">
                {isId ? 'Judul Publikasi Wiki:' : 'Wiki Title:'}
              </label>
              <input
                type="text"
                value={wikiTitle}
                onChange={(e) => setWikiTitle(e.target.value)}
                placeholder={isId ? 'Masukkan nama Wiki...' : 'Enter Wiki title...'}
                className={`w-full px-3 py-2 rounded-xl border text-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900'
                    : 'bg-[#141b27] border-slate-700 text-slate-100'
                }`}
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">
                {isId ? 'Deskripsi Ringkas (Opsional):' : 'Short Description (Optional):'}
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  isId
                    ? 'Contoh: Dokumentasi arsitektur proyek, catatan riset, atau basis pengetahuan...'
                    : 'E.g., Engineering docs, research garden, or knowledge base...'
                }
                className={`w-full px-3 py-2 rounded-xl border text-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900'
                    : 'bg-[#141b27] border-slate-700 text-slate-100'
                }`}
              />
            </div>

            {/* Landing Note (Beranda Utama) */}
            <div>
              <label className="block font-semibold mb-1">
                {isId ? 'Halaman Beranda Utama (Landing / Index Note):' : 'Landing / Index Note:'}
              </label>
              <select
                value={landingNoteId}
                onChange={(e) => setLandingNoteId(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-hidden ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900'
                    : 'bg-[#141b27] border-slate-700 text-slate-100'
                }`}
              >
                {includedNotes.map((n) => (
                  <option key={n.id} value={n.id}>
                    📄 {n.title}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                {isId
                  ? 'Halaman yang pertama kali terbuka saat pengunjung membuka tautan Wiki ini.'
                  : 'The page that opens automatically when readers visit this Wiki.'}
              </p>
            </div>
          </div>

          {/* Author & GAS URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">
                {isId ? 'Nama Penulis:' : 'Author Name:'}
              </label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-hidden ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900'
                    : 'bg-[#141b27] border-slate-700 text-slate-100'
                }`}
              />
            </div>

            <div>
              {(() => {
                const isCloudflare = gasUrl.includes('workers.dev');
                const isCustom = !gasUrl.includes('script.google.com') && !isCloudflare && gasUrl.trim() !== '';
                const providerName = isCloudflare ? 'Cloudflare Worker' : isCustom ? 'Server Mandiri' : 'Google Sheets';

                return (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <label className="font-semibold">{isId ? 'URL Endpoint Publikasi:' : 'Publishing Endpoint URL:'}</label>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                          {providerName}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={onOpenGASHelp}
                        className="text-[11px] text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <HelpCircle className="w-3 h-3" />
                        <span>{isId ? 'Panduan Setup & Skrip' : 'Setup Guide & Scripts'}</span>
                      </button>
                    </div>
                    <input
                      type="url"
                      value={gasUrl}
                      onChange={(e) => setGasUrl(e.target.value)}
                      placeholder={
                        isId
                          ? 'URL Google Apps Script, Cloudflare Worker, atau Server (Kosongkan untuk pratinjau)'
                          : 'GAS URL, Cloudflare Worker, or Custom Server (Leave blank for preview)'
                      }
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-mono focus:outline-hidden ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900'
                          : 'bg-[#141b27] border-slate-700 text-slate-100'
                      }`}
                    />
                  </>
                );
              })()}
            </div>
          </div>

          {/* Password Protection Card */}
          <div
            className={`p-3.5 rounded-xl border space-y-3 transition ${
              enablePassword
                ? isLight
                  ? 'bg-amber-50/70 border-amber-300'
                  : 'bg-amber-950/20 border-amber-700/50'
                : isLight
                ? 'bg-slate-50 border-slate-200'
                : 'bg-[#141b27] border-slate-700/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-xs select-none">
                <input
                  type="checkbox"
                  checked={enablePassword}
                  onChange={(e) => setEnablePassword(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span className="flex items-center gap-1.5">
                  <Lock className={`w-3.5 h-3.5 ${enablePassword ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>{isId ? 'Proteksi Kata Sandi (Enkripsi Klien AES-GCM)' : 'Password Protection (Client AES-GCM)'}</span>
                </span>
              </label>

              {enablePassword && (
                <span className="text-[11px] text-amber-400 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Zero-Knowledge</span>
                </span>
              )}
            </div>

            {enablePassword && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    {isId ? 'Kata Sandi Pembuka:' : 'Access Password:'}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs focus:outline-hidden ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'bg-[#1a2333] border-slate-700 text-slate-100'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    {isId ? 'Konfirmasi Kata Sandi:' : 'Confirm Password:'}
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs focus:outline-hidden ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'bg-[#1a2333] border-slate-700 text-slate-100'
                    }`}
                  />
                </div>
              </div>
            )}

            {passwordError && (
              <p className="text-[11px] text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{passwordError}</span>
              </p>
            )}
          </div>

          {/* Feedback & Status Message */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                statusMessage.includes('berhasil') || statusMessage.includes('success')
                  ? isLight
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
                  : isLight
                  ? 'bg-rose-50 text-rose-800 border-rose-300'
                  : 'bg-rose-950/40 text-rose-300 border-rose-800/60'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Unpublish confirmation box */}
          {showUnpublishConfirm && (
            <div
              className={`p-3.5 rounded-xl border space-y-2.5 ${
                isLight
                  ? 'bg-rose-50 border-rose-300 text-rose-900'
                  : 'bg-rose-950/30 border-rose-800/60 text-rose-200'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs">
                <Trash2 className="w-4 h-4 text-rose-500" />
                <span>{isId ? 'Cabut Publikasi & Hapus Tab Sheet di Google Sheets?' : 'Unpublish & Delete Sheet from Google Sheets?'}</span>
              </div>
              <p className="text-[11px] opacity-90 leading-relaxed">
                {isId
                  ? `Tindakan ini akan menghapus tab sheet "Wiki - ${activeFolder.title}" di Google Sheets sehingga hemat sheet dan rapih. Tautan publik wiki tidak dapat dibuka lagi.`
                  : `This action will delete the tab sheet "Wiki - ${activeFolder.title}" in Google Sheets to save space and keep it tidy. The public link will become inactive.`}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleUnpublish}
                  disabled={isUnpublishing}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5"
                >
                  {isUnpublishing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isId ? 'Ya, Cabut & Hapus Sheet' : 'Yes, Unpublish & Delete'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowUnpublishConfirm(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-600 hover:bg-slate-700/50 text-xs font-medium transition"
                >
                  {isId ? 'Batal' : 'Cancel'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div
          className={`px-4 sm:px-6 py-3.5 border-t flex items-center justify-between gap-3 shrink-0 flex-wrap ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#151c2a] border-slate-700/80'
          }`}
        >
          {/* Left: Unpublish action */}
          <div>
            {isPublished && !showUnpublishConfirm && (
              <button
                type="button"
                onClick={() => setShowUnpublishConfirm(true)}
                className="px-3 py-1.5 rounded-lg text-rose-400 hover:bg-rose-950/30 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isId ? 'Cabut Publikasi Wiki' : 'Unpublish Wiki'}</span>
              </button>
            )}
          </div>

          {/* Right: Close & Publish */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                isLight
                  ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {isId ? 'Tutup' : 'Close'}
            </button>

            <button
              type="button"
              onClick={handlePublish}
              disabled={isPublishing}
              className="px-5 py-2 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white text-xs font-bold shadow-md transition disabled:opacity-50 flex items-center gap-2"
            >
              {isPublishing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{isId ? 'Mengemas & Mengunggah Wiki...' : 'Publishing Wiki...'}</span>
                </>
              ) : (
                <>
                  <Globe className="w-3.5 h-3.5" />
                  <span>
                    {isPublished
                      ? isId
                        ? 'Perbarui Publikasi Wiki'
                        : 'Update Published Wiki'
                      : isId
                      ? 'Publikasikan sebagai Wiki'
                      : 'Publish as Wiki'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
