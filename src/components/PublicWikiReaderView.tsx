import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Share2,
  Copy,
  Check,
  Sun,
  Moon,
  Search,
  BookOpen,
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  Lock,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  Kanban as KanbanIcon,
  List,
  Calendar,
  ExternalLink,
  Home,
  CheckCircle2,
  Clock,
  Columns3,
  Hash,
} from 'lucide-react';
import DOMPurify from 'dompurify';
import type { WikiBundle, WikiFolderItem, WikiNoteItem } from '../types/wiki';
import type { KanbanBoardData, KanbanPriority } from '../types';
import { decryptWithPassword } from '../services/crypto';
import { wrapTablesWithScrollContainer } from '../utils/markdown';
import { calculateKanbanStats } from '../utils/kanbanSerializer';
import { QalamIcon } from './icons/QalamIcon';

interface TocHeading {
  id: string;
  text: string;
  level: number;
}

interface PublicWikiReaderViewProps {
  wikiBundle: WikiBundle | null;
  isLoading?: boolean;
  errorMessage?: string | null;
  onBackToApp: () => void;
}

export const PublicWikiReaderView: React.FC<PublicWikiReaderViewProps> = ({
  wikiBundle: initialBundle,
  isLoading = false,
  errorMessage = null,
  onBackToApp,
}) => {
  const [activeBundle, setActiveBundle] = useState<WikiBundle | null>(initialBundle);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const isLight = theme === 'light';

  // Password Unlock State
  const [isUnlocked, setIsUnlocked] = useState<boolean>(!initialBundle?.is_encrypted);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  // Active Note & History Stack for SPA WikiLink Navigation
  const [activeNoteId, setActiveNoteId] = useState<string>('');
  const [historyStack, setHistoryStack] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Search & Filter in Wiki Sidebar
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Table of Contents & Content container
  const [isTocOpen, setIsTocOpen] = useState(true);
  const contentContainerRef = useRef<HTMLDivElement>(null);

  // Synchronize document root theme class with Reader's active theme and clean up on exit
  useEffect(() => {
    const root = document.documentElement;
    const prevClasses = Array.from(root.classList);

    if (isLight) {
      root.classList.remove('qalam-dark', 'dark');
      root.classList.add('qalam-light', 'light');
    } else {
      root.classList.remove('qalam-light', 'light');
      root.classList.add('qalam-dark', 'dark');
    }

    return () => {
      root.classList.remove('qalam-dark', 'qalam-light', 'light', 'dark');
      prevClasses.forEach((cls) => root.classList.add(cls));
    };
  }, [isLight]);

  // Sync bundle on prop update
  useEffect(() => {
    setActiveBundle(initialBundle);
    setIsUnlocked(!initialBundle?.is_encrypted);
  }, [initialBundle]);

  // Unlock password-protected bundle
  const handleUnlockPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeBundle?.encrypted_data || !passwordInput) return;

    setIsDecrypting(true);
    setPasswordError(null);

    try {
      const { ciphertext, iv, salt } = activeBundle.encrypted_data;
      const decryptedJson = await decryptWithPassword(ciphertext, iv, salt, passwordInput);
      const parsed = JSON.parse(decryptedJson);

      if (parsed && Array.isArray(parsed.notes)) {
        setActiveBundle((prev) => (prev ? { ...prev, notes: parsed.notes, folders: parsed.folders || prev.folders } : prev));
        setIsUnlocked(true);
        if (parsed.notes.length > 0) {
          const lId = activeBundle.landing_note_id || parsed.notes[0].id;
          setActiveNoteId(lId);
          setHistoryStack([lId]);
          setHistoryIndex(0);
        }
      } else {
        throw new Error('Data format error');
      }
    } catch (err) {
      setPasswordError('Kata sandi salah. Silakan coba lagi.');
    } finally {
      setIsDecrypting(false);
    }
  };

  // Navigate to Note (Internal SPA Navigation)
  const navigateToNote = (noteId: string) => {
    if (!activeBundle || noteId === activeNoteId) return;
    const exists = activeBundle.notes.some((n) => n.id === noteId);
    if (!exists) return;

    setActiveNoteId(noteId);
    // Push to navigation history
    const nextStack = historyStack.slice(0, historyIndex + 1);
    nextStack.push(noteId);
    setHistoryStack(nextStack);
    setHistoryIndex(nextStack.length - 1);

    // Close mobile drawer if open
    setIsMobileSidebarOpen(false);

    // Scroll reader to top
    if (contentContainerRef.current) {
      contentContainerRef.current.scrollTop = 0;
    }
  };

  // History Back / Forward
  const handleHistoryBack = () => {
    if (historyIndex > 0) {
      const nextIdx = historyIndex - 1;
      setHistoryIndex(nextIdx);
      setActiveNoteId(historyStack[nextIdx]);
    }
  };

  const handleHistoryForward = () => {
    if (historyIndex < historyStack.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setActiveNoteId(historyStack[nextIdx]);
    }
  };

  // Deduplicate notes by ID to prevent any duplicate listings
  const uniqueNotes: WikiNoteItem[] = useMemo(() => {
    if (!activeBundle?.notes) return [];
    const seen = new Set<string>();
    return activeBundle.notes.filter((n) => {
      if (!n || !n.id || seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    });
  }, [activeBundle?.notes]);

  // Set initial active note if not already selected
  useEffect(() => {
    if (activeBundle && uniqueNotes.length > 0 && !activeNoteId) {
      const initialId =
        activeBundle.landing_note_id && uniqueNotes.some((n) => n.id === activeBundle.landing_note_id)
          ? activeBundle.landing_note_id
          : uniqueNotes[0].id;
      setActiveNoteId(initialId);
      setHistoryStack([initialId]);
      setHistoryIndex(0);
    }
  }, [activeBundle, uniqueNotes, activeNoteId]);

  // Find active note object
  const currentNote: WikiNoteItem | null = useMemo(() => {
    if (!activeBundle || uniqueNotes.length === 0) return null;
    if (!activeNoteId) return uniqueNotes[0];
    return uniqueNotes.find((n) => n.id === activeNoteId) || uniqueNotes[0] || null;
  }, [activeBundle, uniqueNotes, activeNoteId]);

  // Folder Breadcrumbs for Active Note (without repeating the root wiki title)
  const breadcrumbs = useMemo(() => {
    if (!activeBundle || !currentNote) return [];
    const crumbs: { id: string; title: string }[] = [];

    let currentFolderId = currentNote.folder_id;
    const visited = new Set<string>();
    while (currentFolderId && !visited.has(currentFolderId)) {
      visited.add(currentFolderId);
      // Skip root wiki folder to prevent title duplication in breadcrumb
      if (currentFolderId === activeBundle.id) {
        break;
      }
      const folder = activeBundle.folders.find((f) => f.id === currentFolderId);
      if (folder) {
        crumbs.unshift({ id: folder.id, title: folder.title });
        currentFolderId = folder.parent_id;
      } else {
        break;
      }
    }
    return crumbs;
  }, [activeBundle, currentNote]);

  // Injects anchor IDs into headings so TOC links jump directly to headings with scrollIntoView
  const { processedHtml, headings } = useMemo(() => {
    if (!currentNote?.html) {
      return { processedHtml: '', headings: [] as TocHeading[] };
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(currentNote.html, 'text/html');
      const headEls = doc.querySelectorAll('h1, h2, h3, h4');
      const items: TocHeading[] = [];
      const seenIds = new Set<string>();

      headEls.forEach((h, index) => {
        const text = h.textContent?.trim() || '';
        if (!text) return;
        const level = parseInt(h.tagName.substring(1), 10) || 2;

        let baseId = h.getAttribute('id');
        if (!baseId) {
          const slug =
            text
              .toLowerCase()
              .replace(/[^\w\s-]/g, '')
              .trim()
              .replace(/[\s_-]+/g, '-')
              .substring(0, 50) || `heading-${index}`;
          baseId = `wiki-${slug}`;
        }

        let finalId = baseId;
        let count = 1;
        while (seenIds.has(finalId)) {
          finalId = `${baseId}-${count++}`;
        }
        seenIds.add(finalId);

        h.setAttribute('id', finalId);
        h.classList.add('scroll-mt-8');

        items.push({
          id: finalId,
          text,
          level,
        });
      });

      return {
        processedHtml: doc.body.innerHTML,
        headings: items,
      };
    } catch {
      return {
        processedHtml: currentNote.html,
        headings: [],
      };
    }
  }, [currentNote?.html]);

  // Smooth scroll directly to a heading element with subtle flash indicator
  const handleScrollToHeading = (headingId: string) => {
    const el = document.getElementById(headingId);
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'start' });

    el.classList.add('qalam-block-target-flash');
    setTimeout(() => {
      el.classList.remove('qalam-block-target-flash');
    }, 1600);
  };

  // Intercept WikiLink clicks inside rendered HTML content
  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a');
    if (!anchor || !activeBundle) return;

    // 1. Check data-wikilink attribute
    const wikilinkTitle = anchor.getAttribute('data-wikilink');
    const href = anchor.getAttribute('href') || '';

    let matchedNote: WikiNoteItem | undefined;

    if (wikilinkTitle) {
      const cleanTarget = wikilinkTitle.toLowerCase().trim();
      matchedNote = uniqueNotes.find((n) => n.title.toLowerCase().trim() === cleanTarget);
    } else if (href.startsWith('#wikilink-') || href.startsWith('wikilink:')) {
      const targetSlug = href.replace(/^#wikilink-|^wikilink:/, '').toLowerCase().trim();
      matchedNote = uniqueNotes.find(
        (n) => n.slug === targetSlug || n.title.toLowerCase().trim() === targetSlug
      );
    } else if (href.startsWith('#') && href.length > 1) {
      // Internal anchor scroll to heading
      const targetId = href.slice(1);
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        e.preventDefault();
        handleScrollToHeading(targetId);
        return;
      }
    }

    if (matchedNote) {
      e.preventDefault();
      navigateToNote(matchedNote.id);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFolderCollapse = (folderId: string) => {
    setCollapsedFolders((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  // Filter notes by search query
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return uniqueNotes;
    const q = searchQuery.toLowerCase().trim();
    return uniqueNotes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        (n.body && n.body.toLowerCase().includes(q)) ||
        (n.tags && n.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }, [uniqueNotes, searchQuery]);

  // Loading state
  if (isLoading) {
    return (
      <div
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 select-none ${
          isLight ? 'bg-slate-100 text-slate-800' : 'bg-[#0b0f19] text-white'
        }`}
      >
        <div className="flex flex-col items-center gap-3 text-center max-w-sm">
          <QalamIcon className="w-14 h-14 shadow-2xl animate-pulse" />
          <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Memuat Digital Garden Wiki...
          </h2>
          <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-300'}`}>
            Mengambil bundle pohon folder & halaman dari Google Sheets...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (errorMessage && !activeBundle) {
    return (
      <div
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 text-center select-none ${
          isLight ? 'bg-slate-100 text-slate-800' : 'bg-[#0b0f19] text-white'
        }`}
      >
        <div className="max-w-md space-y-3 flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Wiki Tidak Tersedia
          </h2>
          <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
            {errorMessage}
          </p>
          <button
            onClick={onBackToApp}
            className="mt-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition"
          >
            Buka Beranda Qalam Note
          </button>
        </div>
      </div>
    );
  }

  // Password Unlock Gate
  if (!isUnlocked && activeBundle?.is_encrypted) {
    return (
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 select-none ${
          isLight ? 'bg-slate-900/40 backdrop-blur-xs text-slate-900' : 'bg-black/80 backdrop-blur-xs text-white'
        }`}
      >
        <div
          className={`w-full max-w-md p-6 sm:p-8 rounded-2xl border shadow-2xl space-y-5 text-center ${
            isLight ? 'bg-white border-slate-300' : 'bg-[#141d2e] border-slate-700'
          }`}
        >
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center shadow-inner">
            <Lock className="w-7 h-7" />
          </div>

          <div>
            <h2 className={`text-lg font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {activeBundle.title}
            </h2>
            <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-300'}`}>
              Wiki ini dilindungi kata sandi dengan enkripsi ujung-ke-ujung (Zero-Knowledge AES-GCM 256).
            </p>
          </div>

          <form onSubmit={handleUnlockPassword} className="space-y-3.5 text-left">
            <div>
              <label className={`block text-xs font-semibold mb-1 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                Masukkan Kata Sandi Pembuka:
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  autoFocus
                  className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs focus:ring-1 focus:ring-amber-500 focus:outline-hidden ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#0f172a] border-slate-700 text-white'
                  }`}
                />
              </div>
            </div>

            {passwordError && (
              <p className="text-xs text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{passwordError}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={isDecrypting || !passwordInput}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {isDecrypting ? (
                <span>Mendekripsi Dokumen...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Buka Akses Wiki</span>
                </>
              )}
            </button>
          </form>

          <div className={`pt-2 border-t ${isLight ? 'border-slate-200' : 'border-slate-700/80'}`}>
            <button onClick={onBackToApp} className={`text-xs hover:underline ${isLight ? 'text-slate-500' : 'text-slate-400 hover:text-white'}`}>
              ← Kembali ke Aplikasi Qalam
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Sidebar Tree Recursive Component
  const renderFolderTree = (folderId: string = '', level: number = 0) => {
    if (!activeBundle) return null;

    const isRoot = folderId === '' || folderId === activeBundle.id;

    // Subfolders belonging to this level (exclude root wiki folder itself)
    const foldersAtLevel = activeBundle.folders.filter((f) => {
      if (f.id === activeBundle.id) return false;
      if (isRoot) {
        return f.parent_id === activeBundle.id || f.parent_id === '' || !f.parent_id;
      }
      return f.parent_id === folderId;
    });

    // Notes belonging directly to this level
    const notesAtLevel = (searchQuery.trim() ? filteredNotes : uniqueNotes).filter((n) => {
      if (isRoot) {
        return n.folder_id === activeBundle.id || !n.folder_id;
      }
      return n.folder_id === folderId;
    });

    return (
      <div className="space-y-0.5">
        {foldersAtLevel.map((folder) => {
          const isCollapsed = Boolean(collapsedFolders[folder.id]);
          return (
            <div key={folder.id} className="relative">
              <button
                type="button"
                onClick={() => toggleFolderCollapse(folder.id)}
                style={{ paddingLeft: `${Math.max(8, 8 + level * 14)}px` }}
                className={`w-full flex items-center justify-between pr-2.5 py-1.5 rounded-lg text-xs font-semibold transition group ${
                  isLight
                    ? 'text-slate-800 hover:bg-slate-200/70'
                    : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={isLight ? 'text-slate-500' : 'text-slate-400 group-hover:text-slate-200'}>
                    {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </span>
                  {isCollapsed ? (
                    <Folder className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  ) : (
                    <FolderOpen className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  )}
                  <span className="truncate">{folder.title}</span>
                </div>
              </button>

              {!isCollapsed && renderFolderTree(folder.id, level + 1)}
            </div>
          );
        })}

        {/* Notes in current folder level */}
        {notesAtLevel.map((note) => {
          const isSelected = note.id === activeNoteId;
          return (
            <button
              key={note.id}
              type="button"
              onClick={() => navigateToNote(note.id)}
              style={{
                paddingLeft: `${Math.max(
                  12,
                  12 + (level + (foldersAtLevel.length > 0 ? 1 : 0)) * 14
                )}px`,
              }}
              className={`w-full flex items-center justify-between pr-2.5 py-1.5 rounded-lg text-xs transition text-left ${
                isSelected
                  ? isLight
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'bg-blue-600/25 text-white border-l-2 border-blue-400 font-semibold shadow-xs'
                  : isLight
                  ? 'text-slate-700 hover:bg-slate-200/60 hover:text-slate-900'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {note.is_kanban ? (
                  <KanbanIcon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                ) : (
                  <FileText
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isSelected
                        ? isLight
                          ? 'text-white'
                          : 'text-blue-300'
                        : isLight
                        ? 'text-slate-500'
                        : 'text-slate-400'
                    }`}
                  />
                )}
                <span className="truncate">{note.title}</span>
              </div>
              {note.id === activeBundle.landing_note_id && (
                <span
                  className={`text-[10px] font-semibold shrink-0 ml-1.5 ${
                    isLight ? 'text-emerald-700' : 'text-emerald-400'
                  }`}
                >
                  (Home)
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className={`fixed inset-0 z-50 h-screen h-dvh w-full flex overflow-hidden font-sans select-text transition-colors duration-200 ${
        isLight ? 'bg-slate-100 text-slate-900' : 'bg-[#0b0f19] text-slate-100 qalam-dark-reader'
      }`}
    >
      {/* 1. Left Sidebar: Wiki Navigation Tree */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-72 md:w-80 shrink-0 flex flex-col border-r transition-transform duration-200 shadow-xl md:shadow-none ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0f172a] border-slate-800 text-slate-100'
        } ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Wiki Brand Header */}
        <div
          className={`p-4 border-b shrink-0 flex items-center justify-between ${
            isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-[#0c1322]'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className={`text-xs font-bold tracking-tight truncate leading-tight ${
                isLight ? '!text-slate-900' : '!text-white'
              }`}>
                {activeBundle?.title || 'Wiki'}
              </h2>
              <span className={`text-[10px] flex items-center gap-1 truncate ${
                isLight ? '!text-slate-500' : '!text-slate-300'
              }`}>
                <span>Oleh {activeBundle?.author || 'Penulis'}</span>
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className={`md:hidden p-1.5 rounded-lg transition ${
              isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Search Input */}
        <div className={`p-3 border-b shrink-0 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari halaman wiki..."
              className={`w-full pl-8 pr-3 py-1.5 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden transition ${
                isLight ? 'bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white' : 'bg-[#1e293b] border-slate-700 text-white placeholder-slate-400 focus:border-blue-500'
              }`}
            />
          </div>
        </div>

        {/* Hierarchical Folder & Notes Tree */}
        <div className="flex-1 overflow-y-auto p-2.5 custom-scrollbar">
          {searchQuery.trim() ? (
            <div className="space-y-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 ${
                isLight ? 'text-slate-400' : 'text-slate-400'
              }`}>
                Hasil Pencarian ({filteredNotes.length})
              </span>
              {filteredNotes.length === 0 ? (
                <div className={`p-4 text-center text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Tidak ada halaman yang cocok
                </div>
              ) : (
                filteredNotes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => navigateToNote(note.id)}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-left transition ${
                      note.id === activeNoteId
                        ? isLight
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'bg-blue-600/25 text-white font-semibold border-l-2 border-blue-400'
                        : isLight
                        ? 'text-slate-700 hover:bg-slate-100'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{note.title}</span>
                  </button>
                ))
              )}
            </div>
          ) : (
            renderFolderTree('')
          )}
        </div>

        {/* Sidebar Footer Controls */}
        <div
          className={`p-3 border-t shrink-0 flex items-center justify-between text-xs ${
            isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-[#0c1322]'
          }`}
        >
          {/* Theme switcher */}
          <button
            onClick={() => setTheme(isLight ? 'dark' : 'light')}
            className={`p-1.5 rounded-lg border flex items-center gap-1.5 text-xs font-medium transition ${
              isLight ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50' : 'bg-[#1e293b] border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white'
            }`}
            title="Ganti Tema"
          >
            {isLight ? <Moon className="w-3.5 h-3.5 text-blue-500" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
            <span className="text-[11px]">{isLight ? 'Dark' : 'Light'}</span>
          </button>

          <button
            onClick={onBackToApp}
            className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 hover:underline"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Kembali ke App</span>
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile drawer */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header
          className={`h-12 px-4 border-b flex items-center justify-between shrink-0 shadow-xs ${
            isLight ? 'bg-white border-slate-200' : 'bg-[#0f172a] border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {/* Mobile Sidebar Hamburger */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className={`md:hidden p-1.5 rounded-lg transition ${
                isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* History Back & Forward */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={handleHistoryBack}
                disabled={historyIndex <= 0}
                className={`p-1 rounded-md disabled:opacity-30 transition ${
                  isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Halaman Sebelumnya"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleHistoryForward}
                disabled={historyIndex >= historyStack.length - 1}
                className={`p-1 rounded-md disabled:opacity-30 transition ${
                  isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Halaman Berikutnya"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Breadcrumbs Navigation */}
            <nav className={`flex items-center gap-1.5 text-xs truncate ml-2 ${
              isLight ? 'text-slate-600' : 'text-slate-300'
            }`}>
              <span className={`flex items-center gap-1 font-semibold ${
                isLight ? 'text-slate-800' : 'text-slate-200'
              }`}>
                <Home className="w-3 h-3 text-emerald-400" />
                <span className="hidden sm:inline">{activeBundle?.title}</span>
              </span>
              {breadcrumbs.map((crumb) => (
                <React.Fragment key={crumb.id}>
                  <span className={isLight ? 'text-slate-400' : 'text-slate-500'}>/</span>
                  <span className="truncate">{crumb.title}</span>
                </React.Fragment>
              ))}
              <span className={isLight ? 'text-slate-400' : 'text-slate-500'}>/</span>
              <span className={`font-bold truncate ${isLight ? '!text-slate-900' : '!text-white'}`}>
                {currentNote?.title}
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Table of Contents toggle button */}
            {headings.length > 0 && (
              <button
                onClick={() => setIsTocOpen((prev) => !prev)}
                className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition ${
                  isTocOpen
                    ? isLight
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-blue-600/25 text-blue-300 border-blue-500/50'
                    : isLight
                    ? 'bg-slate-100 border-slate-300 text-slate-600'
                    : 'bg-[#1e293b] border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Daftar Isi (Table of Contents)"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Daftar Isi</span>
              </button>
            )}

            {/* Share Link */}
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-semibold text-xs transition shadow-xs"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-200" /> : <Share2 className="w-3 h-3" />}
              <span className="hidden sm:inline">{copied ? 'Tersalin!' : 'Bagikan'}</span>
            </button>
          </div>
        </header>

        {/* Scrollable Reader Body + Right TOC Panel */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Document Reading Column */}
          <main
            ref={contentContainerRef}
            onClick={handleContentClick}
            className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 sm:py-12 custom-scrollbar"
          >
            <article
              className={`max-w-3xl mx-auto rounded-2xl border p-6 sm:p-10 transition-colors ${
                isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-[#141d2e] border-slate-700/80 text-slate-100 shadow-2xl'
              }`}
            >
              {currentNote ? (
                <>
                  {/* Note Header */}
                  <div className={`border-b pb-5 mb-8 ${isLight ? 'border-slate-200' : 'border-slate-700/80'}`}>
                    {/* Tags - ZERO PILLS: clean unboxed typographic metadata */}
                    {currentNote.tags && currentNote.tags.length > 0 && (
                      <div className="flex items-center gap-2 mb-3 flex-wrap text-xs font-mono">
                        {currentNote.tags.map((tag, idx) => (
                          <React.Fragment key={tag}>
                            {idx > 0 && <span className={isLight ? 'text-slate-400' : 'text-slate-500'} aria-hidden="true">·</span>}
                            <span className={isLight ? 'text-blue-600' : 'text-blue-400 font-semibold'}>
                              #{tag}
                            </span>
                          </React.Fragment>
                        ))}
                      </div>
                    )}

                    <h1
                      className={`text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight ${
                        isLight ? '!text-slate-950' : '!text-white'
                      }`}
                    >
                      {currentNote.title}
                    </h1>

                    <div className={`flex items-center gap-3 mt-3 text-xs flex-wrap ${isLight ? '!text-slate-600' : '!text-slate-300'}`}>
                      <span>Oleh <strong className={isLight ? '!text-slate-800' : '!text-white font-bold'}>{activeBundle?.author || 'Penulis'}</strong></span>
                      <span aria-hidden="true">·</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                        <span>
                          {new Date(currentNote.updated_time || Date.now()).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Rendered HTML Content with high contrast and injected heading IDs */}
                  <div
                    className={`qalam-markdown-preview prose max-w-none text-[15px] sm:text-base leading-relaxed break-words ${
                      isLight ? 'text-slate-900' : 'text-slate-100 prose-invert'
                    }`}
                    dangerouslySetInnerHTML={{
                      __html: processedHtml || '<p class="italic text-slate-400">Catatan ini kosong.</p>',
                    }}
                  />
                </>
              ) : (
                <div className={`text-center py-12 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Pilih catatan dari panel samping kiri
                </div>
              )}

              {/* Reader Footer */}
              <footer className={`mt-12 pt-6 border-t text-center text-xs ${
                isLight ? 'border-slate-200 text-slate-500' : 'border-slate-700/60 text-slate-400'
              }`}>
                <span>
                  Diterbitkan via{' '}
                  <a
                    href="https://qalam-note.aiprojek01.my.id/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 hover:underline font-medium"
                  >
                    Qalam Note Digital Garden
                  </a>
                </span>
              </footer>
            </article>
          </main>

          {/* 3. Right Sidebar: Table of Contents (TOC) */}
          {isTocOpen && headings.length > 0 && (
            <aside
              className={`w-56 lg:w-64 shrink-0 border-l p-4 overflow-y-auto hidden lg:flex flex-col text-xs custom-scrollbar ${
                isLight ? 'bg-slate-50/90 border-slate-200' : 'bg-[#0f172a] border-slate-800'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] mb-3 text-blue-400">
                <List className="w-3.5 h-3.5 text-blue-400" />
                <span className={isLight ? 'text-slate-700' : 'text-slate-200'}>Daftar Isi</span>
              </div>

              <div className="space-y-1">
                {headings.map((heading) => (
                  <button
                    key={heading.id}
                    type="button"
                    onClick={() => handleScrollToHeading(heading.id)}
                    style={{ paddingLeft: `${Math.max(0, (heading.level - 1) * 10)}px` }}
                    className={`w-full text-left py-1 text-xs transition truncate leading-snug rounded hover:underline cursor-pointer ${
                      heading.level === 1
                        ? isLight
                          ? 'font-semibold !text-slate-900 hover:text-blue-600'
                          : 'font-bold !text-white hover:text-blue-400'
                        : isLight
                        ? 'font-normal !text-slate-600 hover:text-blue-600'
                        : 'font-normal !text-slate-200 hover:text-white hover:text-blue-400'
                    }`}
                  >
                    {heading.text}
                  </button>
                ))}
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
};
