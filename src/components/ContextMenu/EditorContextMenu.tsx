import React, { useState } from 'react';
import {
  Scissors,
  Copy,
  ClipboardPaste,
  CheckSquare,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  List,
  ListOrdered,
  Link,
  Table,
  Minus,
  Calendar,
  Image as ImageIcon,
  Paperclip,
  ScanText,
  Columns2,
  GraduationCap,
  Sparkles,
  ChevronRight,
  Share2,
} from 'lucide-react';
import { useContextMenuPosition } from './useContextMenuPosition';
import type { AppLanguage } from '../../types';

export interface EditorContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  selectedText?: string;
  onCommand: (cmd: string, val?: string) => void;
  onInsertDateTime: () => void;
  onOpenImageModal?: () => void;
  onOpenAttachmentModal?: () => void;
  onOpenOCR?: () => void;
  onOpenSRS?: () => void;
  onToggleSplitScreen?: () => void;
  onCopyMarkdown?: () => void;
  language?: AppLanguage;
  theme?: string;
}

export const EditorContextMenu: React.FC<EditorContextMenuProps> = ({
  isOpen,
  position,
  onClose,
  selectedText = '',
  onCommand,
  onInsertDateTime,
  onOpenImageModal,
  onOpenAttachmentModal,
  onOpenOCR,
  onOpenSRS,
  onToggleSplitScreen,
  onCopyMarkdown,
  language = 'id',
  theme,
}) => {
  const { menuRef, coords } = useContextMenuPosition({
    isOpen,
    position,
    onClose,
    menuWidth: 260,
    menuHeight: 460,
  });

  const [activeSubMenu, setActiveSubMenu] = useState<'format' | 'structure' | 'insert' | null>(null);

  if (!isOpen) return null;

  const isLight = theme === 'qalam-light';
  const isId = language === 'id';
  const hasSelection = Boolean(selectedText && selectedText.trim().length > 0);

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  const handleCut = async () => {
    try {
      if (hasSelection) {
        await navigator.clipboard.writeText(selectedText);
        document.execCommand('delete', false);
      } else {
        document.execCommand('cut', false);
      }
    } catch {
      document.execCommand('cut', false);
    }
  };

  const handleCopy = async () => {
    try {
      if (hasSelection) {
        await navigator.clipboard.writeText(selectedText);
      } else {
        document.execCommand('copy', false);
      }
    } catch {
      document.execCommand('copy', false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        document.execCommand('insertText', false, text);
      } else {
        document.execCommand('paste', false);
      }
    } catch {
      document.execCommand('paste', false);
    }
  };

  const handleSelectAll = () => {
    document.execCommand('selectAll', false);
  };

  return (
    <div
      ref={menuRef}
      role="menu"
      style={{
        position: 'fixed',
        left: `${coords.left}px`,
        top: `${coords.top}px`,
        maxHeight: coords.maxHeight ? `${coords.maxHeight}px` : '85vh',
        zIndex: 9999,
      }}
      className={`w-64 rounded-xl shadow-2xl border text-xs overflow-y-auto custom-scrollbar select-none py-1.5 animate-in fade-in zoom-in-95 duration-100 ${
        isLight
          ? 'bg-white/95 backdrop-blur-md border-slate-200 text-slate-800 shadow-slate-900/15'
          : 'bg-[#1b2434]/95 backdrop-blur-md border-slate-700/80 text-slate-200 shadow-black/40'
      }`}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Header Info if text is selected */}
      {hasSelection && (
        <div
          className={`px-3 py-1 mb-1 text-[10px] font-semibold tracking-wider uppercase border-b flex items-center justify-between ${
            isLight ? 'bg-slate-50 text-slate-500 border-slate-100' : 'bg-slate-800/40 text-slate-400 border-slate-800'
          }`}
        >
          <span>{isId ? 'Teks Terpilih' : 'Selected Text'}</span>
          <span className="font-mono text-blue-400">{selectedText.length} {isId ? 'karakter' : 'chars'}</span>
        </div>
      )}

      {/* Group 1: Clipboard Operations */}
      <div className="px-1 space-y-0.5">
        <button
          type="button"
          onClick={() => handleAction(handleCut)}
          disabled={!hasSelection}
          className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between transition ${
            !hasSelection
              ? 'opacity-40 cursor-not-allowed text-slate-500'
              : isLight
              ? 'hover:bg-slate-100 hover:text-slate-900'
              : 'hover:bg-slate-800/80 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Scissors className="w-3.5 h-3.5 text-slate-400" />
            <span>{isId ? 'Potong' : 'Cut'}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Ctrl+X</span>
        </button>

        <button
          type="button"
          onClick={() => handleAction(handleCopy)}
          className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between transition ${
            isLight ? 'hover:bg-slate-100 hover:text-slate-900' : 'hover:bg-slate-800/80 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Copy className="w-3.5 h-3.5 text-slate-400" />
            <span>{isId ? 'Salin' : 'Copy'}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Ctrl+C</span>
        </button>

        <button
          type="button"
          onClick={() => handleAction(handlePaste)}
          className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between transition ${
            isLight ? 'hover:bg-slate-100 hover:text-slate-900' : 'hover:bg-slate-800/80 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <ClipboardPaste className="w-3.5 h-3.5 text-slate-400" />
            <span>{isId ? 'Tempel' : 'Paste'}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Ctrl+V</span>
        </button>

        <button
          type="button"
          onClick={() => handleAction(handleSelectAll)}
          className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between transition ${
            isLight ? 'hover:bg-slate-100 hover:text-slate-900' : 'hover:bg-slate-800/80 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
            <span>{isId ? 'Pilih Semua' : 'Select All'}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Ctrl+A</span>
        </button>
      </div>

      <div className={`my-1 border-t ${isLight ? 'border-slate-200' : 'border-slate-700/60'}`} />

      {/* Group 2: Quick Inline Formatting */}
      <div className="px-2 py-0.5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1 px-1">
          {isId ? 'Format Teks' : 'Formatting'}
        </div>
        <div className="grid grid-cols-6 gap-1">
          <button
            type="button"
            onClick={() => handleAction(() => onCommand('bold'))}
            title={isId ? 'Tebal (Ctrl+B)' : 'Bold (Ctrl+B)'}
            className={`p-1.5 rounded flex items-center justify-center transition ${
              isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleAction(() => onCommand('italic'))}
            title={isId ? 'Miring (Ctrl+I)' : 'Italic (Ctrl+I)'}
            className={`p-1.5 rounded flex items-center justify-center transition ${
              isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleAction(() => onCommand('underline'))}
            title={isId ? 'Garis Bawah (Ctrl+U)' : 'Underline (Ctrl+U)'}
            className={`p-1.5 rounded flex items-center justify-center transition ${
              isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Underline className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleAction(() => onCommand('strikethrough'))}
            title={isId ? 'Coret Teks' : 'Strikethrough'}
            className={`p-1.5 rounded flex items-center justify-center transition ${
              isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleAction(() => onCommand('highlight'))}
            title={isId ? 'Sorot Teks (Highlight)' : 'Highlight'}
            className={`p-1.5 rounded flex items-center justify-center transition ${
              isLight ? 'hover:bg-amber-100 text-amber-700' : 'hover:bg-amber-950/50 text-amber-300'
            }`}
          >
            <Highlighter className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleAction(() => onCommand('code-inline'))}
            title={isId ? 'Kode Segaris' : 'Inline Code'}
            className={`p-1.5 rounded flex items-center justify-center transition ${
              isLight ? 'hover:bg-slate-100 text-emerald-700' : 'hover:bg-slate-800 text-emerald-400'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className={`my-1 border-t ${isLight ? 'border-slate-200' : 'border-slate-700/60'}`} />

      {/* Group 3: Structure & Headings */}
      <div className="px-1 space-y-0.5">
        <button
          type="button"
          onClick={() => handleAction(() => onCommand('h1'))}
          className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between transition ${
            isLight ? 'hover:bg-slate-100 hover:text-slate-900' : 'hover:bg-slate-800/80 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Heading1 className="w-3.5 h-3.5 text-blue-400" />
            <span>{isId ? 'Judul Utama (H1)' : 'Heading 1'}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">#</span>
        </button>

        <button
          type="button"
          onClick={() => handleAction(() => onCommand('h2'))}
          className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between transition ${
            isLight ? 'hover:bg-slate-100 hover:text-slate-900' : 'hover:bg-slate-800/80 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Heading2 className="w-3.5 h-3.5 text-blue-400" />
            <span>{isId ? 'Sub-Judul (H2)' : 'Heading 2'}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">##</span>
        </button>

        <button
          type="button"
          onClick={() => handleAction(() => onCommand('h3'))}
          className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between transition ${
            isLight ? 'hover:bg-slate-100 hover:text-slate-900' : 'hover:bg-slate-800/80 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Heading3 className="w-3.5 h-3.5 text-blue-400" />
            <span>{isId ? 'Judul Bagian (H3)' : 'Heading 3'}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">###</span>
        </button>

        <button
          type="button"
          onClick={() => handleAction(() => onCommand('quote'))}
          className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between transition ${
            isLight ? 'hover:bg-slate-100 hover:text-slate-900' : 'hover:bg-slate-800/80 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Quote className="w-3.5 h-3.5 text-amber-400" />
            <span>{isId ? 'Blok Kutipan' : 'Blockquote'}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">&gt;</span>
        </button>

        <button
          type="button"
          onClick={() => handleAction(() => onCommand('code'))}
          className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between transition ${
            isLight ? 'hover:bg-slate-100 hover:text-slate-900' : 'hover:bg-slate-800/80 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Code className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isId ? 'Blok Kode Program' : 'Code Block'}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">```</span>
        </button>
      </div>

      <div className={`my-1 border-t ${isLight ? 'border-slate-200' : 'border-slate-700/60'}`} />

      {/* Group 4: Lists & Tasks */}
      <div className="px-1 space-y-0.5">
        <button
          type="button"
          onClick={() => handleAction(() => onCommand('todo'))}
          className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between transition ${
            isLight ? 'hover:bg-slate-100 hover:text-slate-900' : 'hover:bg-slate-800/80 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
            <span>{isId ? 'Daftar Tugas (Checklist)' : 'Task Checklist'}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">- [ ]</span>
        </button>

        <button
          type="button"
          onClick={() => handleAction(() => onCommand('bullet'))}
          className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between transition ${
            isLight ? 'hover:bg-slate-100 hover:text-slate-900' : 'hover:bg-slate-800/80 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <List className="w-3.5 h-3.5 text-blue-400" />
            <span>{isId ? 'Daftar Poin (Bulleted)' : 'Bulleted List'}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">•</span>
        </button>

        <button
          type="button"
          onClick={() => handleAction(() => onCommand('numbered'))}
          className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between transition ${
            isLight ? 'hover:bg-slate-100 hover:text-slate-900' : 'hover:bg-slate-800/80 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <ListOrdered className="w-3.5 h-3.5 text-purple-400" />
            <span>{isId ? 'Daftar Bernomor (Numbered)' : 'Numbered List'}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">1.</span>
        </button>
      </div>

      <div className={`my-1 border-t ${isLight ? 'border-slate-200' : 'border-slate-700/60'}`} />

      {/* Group 5: Insert Elements */}
      <div className="px-1 space-y-0.5">
        <button
          type="button"
          onClick={() => handleAction(() => onCommand('link'))}
          className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between transition ${
            isLight ? 'hover:bg-slate-100 hover:text-slate-900' : 'hover:bg-slate-800/80 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Link className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isId ? 'Sisipkan Tautan Web' : 'Insert Web Link'}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Ctrl+K</span>
        </button>

        <button
          type="button"
          onClick={() => handleAction(() => onCommand('wikilink'))}
          className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between transition ${
            isLight ? 'hover:bg-slate-100 hover:text-slate-900' : 'hover:bg-slate-800/80 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Share2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isId ? 'Tautkan Catatan (WikiLink)' : 'Insert WikiLink'}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">[[...]]</span>
        </button>

        <button
          type="button"
          onClick={() => handleAction(() => onCommand('table'))}
          className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between transition ${
            isLight ? 'hover:bg-slate-100 hover:text-slate-900' : 'hover:bg-slate-800/80 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Table className="w-3.5 h-3.5 text-indigo-400" />
            <span>{isId ? 'Sisipkan Tabel' : 'Insert Table'}</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleAction(onInsertDateTime)}
          className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between transition ${
            isLight ? 'hover:bg-slate-100 hover:text-slate-900' : 'hover:bg-slate-800/80 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>{isId ? 'Sisipkan Tanggal & Waktu' : 'Insert Date & Time'}</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleAction(() => onCommand('hr'))}
          className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between transition ${
            isLight ? 'hover:bg-slate-100 hover:text-slate-900' : 'hover:bg-slate-800/80 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Minus className="w-3.5 h-3.5 text-slate-400" />
            <span>{isId ? 'Garis Pembatas Horizontal' : 'Horizontal Rule'}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">---</span>
        </button>

        {onOpenImageModal && (
          <button
            type="button"
            onClick={() => handleAction(onOpenImageModal)}
            className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between transition ${
              isLight ? 'hover:bg-slate-100 hover:text-slate-900' : 'hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ImageIcon className="w-3.5 h-3.5 text-pink-400" />
              <span>{isId ? 'Sisipkan Gambar' : 'Insert Image'}</span>
            </div>
          </button>
        )}

        {onOpenAttachmentModal && (
          <button
            type="button"
            onClick={() => handleAction(onOpenAttachmentModal)}
            className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between transition ${
              isLight ? 'hover:bg-slate-100 hover:text-slate-900' : 'hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Paperclip className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isId ? 'Sisipkan Berkas Lampiran' : 'Attach File'}</span>
            </div>
          </button>
        )}
      </div>

      <div className={`my-1 border-t ${isLight ? 'border-slate-200' : 'border-slate-700/60'}`} />

      {/* Group 6: Pro Features (Copy Social Markdown, OCR, Split Screen, SRS) */}
      <div className="px-1 space-y-0.5">
        {onCopyMarkdown && (
          <button
            type="button"
            onClick={() => handleAction(onCopyMarkdown)}
            className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between transition font-medium ${
              isLight
                ? 'hover:bg-cyan-50 text-cyan-700 hover:text-cyan-800'
                : 'hover:bg-cyan-950/40 text-cyan-300 hover:text-cyan-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Copy className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isId ? 'Salin Format Markdown (Sosmed)' : 'Copy Markdown (Social)'}</span>
            </div>
          </button>
        )}

        {onOpenOCR && (
          <button
            type="button"
            onClick={() => handleAction(onOpenOCR)}
            className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between transition ${
              isLight ? 'hover:bg-slate-100 hover:text-slate-900' : 'hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ScanText className="w-3.5 h-3.5 text-amber-400" />
              <span>{isId ? 'Pindai Teks Gambar (OCR Lokal)' : 'Scan Image Text (OCR)'}</span>
            </div>
          </button>
        )}

        {onToggleSplitScreen && (
          <button
            type="button"
            onClick={() => handleAction(onToggleSplitScreen)}
            className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between transition ${
              isLight ? 'hover:bg-slate-100 hover:text-slate-900' : 'hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Columns2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>{isId ? 'Layar Belah (Dual View)' : 'Split Screen Editor'}</span>
            </div>
          </button>
        )}

        {onOpenSRS && (
          <button
            type="button"
            onClick={() => handleAction(onOpenSRS)}
            className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between transition ${
              isLight ? 'hover:bg-slate-100 hover:text-slate-900' : 'hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <GraduationCap className="w-3.5 h-3.5 text-violet-400" />
              <span>{isId ? 'Flashcard & Pengulangan (SRS)' : 'Spaced Repetition (SRS)'}</span>
            </div>
          </button>
        )}
      </div>
    </div>
  );
};
