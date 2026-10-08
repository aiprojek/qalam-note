import React, { useRef } from 'react';
import {
  Undo2,
  Redo2,
  Bold,
  Italic,
  Strikethrough,
  Underline,
  Highlighter,
  Heading1,
  Heading2,
  Heading3,
  CheckSquare,
  List,
  ListOrdered,
  Quote,
  Code,
  Terminal,
  AlertCircle,
  Link,
  Link2,
  Image as ImageIcon,
  Calculator,
  Minus,
  Mic,
  PenTool,
  Sparkles,
  Table as TableIcon,
  HelpCircle,
  Bookmark,
  ChevronDown,
  Globe,
  Share2,
  Lock,
  Unlock,
  History,
  Printer,
  Download,
  Info,
  Columns,
  AlignLeft,
  AlignRight,
  Paperclip,
  FileDown,
} from 'lucide-react';
import type { AppLanguage, Note } from '../../types';

interface MobileEditorRibbonProps {
  onCommand: (command: string, value?: string) => void;
  onInsertImage?: (file: File) => void;
  onOpenImageModal?: () => void;
  onOpenAttachmentModal?: () => void;
  onOpenTemplates?: () => void;
  onOpenVoiceRecorder?: () => void;
  onOpenDrawingCanvas?: () => void;
  language?: AppLanguage;
  note?: Note;
  isEncrypted?: boolean;
  isUnlocked?: boolean;
  onToggleEncrypt?: () => void;
  onOpenPublish?: () => void;
  onOpenInfo?: () => void;
  onOpenCheatSheet?: (mathOnly?: boolean) => void;
  onOpenRevisionHistory?: () => void;
  onExportPdf?: () => void;
  onExportMarkdown?: () => void;
  onOpenExportModal?: () => void;
  settingsEditorMode?: 'wysiwyg' | 'markdown';
  markdownViewMode?: 'raw' | 'split';
  onMarkdownViewModeChange?: (view: 'raw' | 'split') => void;
}

export const MobileEditorRibbon: React.FC<MobileEditorRibbonProps> = ({
  onCommand,
  onInsertImage,
  onOpenImageModal,
  onOpenAttachmentModal,
  onOpenTemplates,
  onOpenVoiceRecorder,
  onOpenDrawingCanvas,
  language = 'id',
  note,
  isEncrypted = false,
  isUnlocked = false,
  onToggleEncrypt,
  onOpenPublish,
  onOpenInfo,
  onOpenCheatSheet,
  onOpenRevisionHistory,
  onExportPdf,
  onExportMarkdown,
  onOpenExportModal,
  settingsEditorMode,
  markdownViewMode,
  onMarkdownViewModeChange,
}) => {
  const isId = language === 'id';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onInsertImage) {
      onInsertImage(e.target.files[0]);
      e.target.value = '';
    }
  };

  return (
    <div className="flex items-center h-11 px-2 bg-[#171f2c] border-t border-slate-700/80 text-slate-300 select-none overflow-x-auto no-scrollbar flex-nowrap gap-1 shrink-0 w-full z-20">
      {/* Hidden file input for image/file attachments */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,.pdf,.txt,.doc,.docx"
        className="hidden"
      />

      {/* 1. Undo & Redo */}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onCommand('undo')}
        title={isId ? 'Urungkan (Undo)' : 'Undo'}
        className="min-w-[34px] h-[34px] flex items-center justify-center rounded-lg hover:bg-slate-700/70 active:bg-blue-600 active:text-white transition text-slate-300 shrink-0"
      >
        <Undo2 className="w-4 h-4" />
      </button>

      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onCommand('redo')}
        title={isId ? 'Ulangi (Redo)' : 'Redo'}
        className="min-w-[34px] h-[34px] flex items-center justify-center rounded-lg hover:bg-slate-700/70 active:bg-blue-600 active:text-white transition text-slate-300 shrink-0"
      >
        <Redo2 className="w-4 h-4" />
      </button>

      <span className="w-px h-5 bg-slate-700/80 mx-0.5 shrink-0" />

      {/* 2. Text Styles */}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onCommand('bold')}
        title={isId ? 'Tebal (Bold)' : 'Bold'}
        className="min-w-[34px] h-[34px] flex items-center justify-center rounded-lg hover:bg-slate-700/70 active:bg-blue-600 active:text-white transition text-slate-300 shrink-0"
      >
        <Bold className="w-4 h-4" />
      </button>

      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onCommand('italic')}
        title={isId ? 'Miring (Italic)' : 'Italic'}
        className="min-w-[34px] h-[34px] flex items-center justify-center rounded-lg hover:bg-slate-700/70 active:bg-blue-600 active:text-white transition text-slate-300 shrink-0"
      >
        <Italic className="w-4 h-4" />
      </button>

      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onCommand('strikethrough')}
        title={isId ? 'Coret (Strikethrough)' : 'Strikethrough'}
        className="min-w-[34px] h-[34px] flex items-center justify-center rounded-lg hover:bg-slate-700/70 active:bg-blue-600 active:text-white transition text-slate-300 shrink-0"
      >
        <Strikethrough className="w-4 h-4" />
      </button>

      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onCommand('underline')}
        title={isId ? 'Garis Bawah (Underline)' : 'Underline'}
        className="min-w-[34px] h-[34px] flex items-center justify-center rounded-lg hover:bg-slate-700/70 active:bg-blue-600 active:text-white transition text-slate-300 shrink-0"
      >
        <Underline className="w-4 h-4" />
      </button>

      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onCommand('highlight')}
        title={isId ? 'Sorot Teks (Highlight)' : 'Highlight'}
        className="min-w-[34px] h-[34px] flex items-center justify-center rounded-lg hover:bg-slate-700/70 active:bg-blue-600 active:text-white transition text-amber-300 shrink-0"
      >
        <Highlighter className="w-4 h-4" />
      </button>

      <span className="w-px h-5 bg-slate-700/80 mx-0.5 shrink-0" />

      {/* 3. Headings */}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onCommand('h1')}
        title="Heading 1"
        className="min-w-[34px] h-[34px] flex items-center justify-center rounded-lg hover:bg-slate-700/70 active:bg-blue-600 active:text-white transition text-slate-300 shrink-0"
      >
        <Heading1 className="w-4 h-4" />
      </button>

      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onCommand('h2')}
        title="Heading 2"
        className="min-w-[34px] h-[34px] flex items-center justify-center rounded-lg hover:bg-slate-700/70 active:bg-blue-600 active:text-white transition text-slate-300 shrink-0"
      >
        <Heading2 className="w-4 h-4" />
      </button>

      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onCommand('h3')}
        title="Heading 3"
        className="min-w-[34px] h-[34px] flex items-center justify-center rounded-lg hover:bg-slate-700/70 active:bg-blue-600 active:text-white transition text-slate-300 shrink-0"
      >
        <Heading3 className="w-4 h-4" />
      </button>

      <span className="w-px h-5 bg-slate-700/80 mx-0.5 shrink-0" />

      {/* 4. Checkbox / Todo & Lists */}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onCommand('todo')}
        title={isId ? 'Daftar Tugas (Checkbox)' : 'Checklist'}
        className="min-w-[34px] h-[34px] flex items-center justify-center rounded-lg hover:bg-slate-700/70 active:bg-blue-600 active:text-white transition text-amber-400 shrink-0"
      >
        <CheckSquare className="w-4 h-4" />
      </button>

      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onCommand('bullet')}
        title={isId ? 'Daftar Poin (Bullet List)' : 'Bullet List'}
        className="min-w-[34px] h-[34px] flex items-center justify-center rounded-lg hover:bg-slate-700/70 active:bg-blue-600 active:text-white transition text-slate-300 shrink-0"
      >
        <List className="w-4 h-4" />
      </button>

      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onCommand('numbered')}
        title={isId ? 'Daftar Angka (Numbered List)' : 'Numbered List'}
        className="min-w-[34px] h-[34px] flex items-center justify-center rounded-lg hover:bg-slate-700/70 active:bg-blue-600 active:text-white transition text-slate-300 shrink-0"
      >
        <ListOrdered className="w-4 h-4" />
      </button>

      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onCommand('quote')}
        title={isId ? 'Kutipan (Blockquote)' : 'Blockquote'}
        className="min-w-[34px] h-[34px] flex items-center justify-center rounded-lg hover:bg-slate-700/70 active:bg-blue-600 active:text-white transition text-slate-300 shrink-0"
      >
        <Quote className="w-4 h-4" />
      </button>

      <span className="w-px h-5 bg-slate-700/80 mx-0.5 shrink-0" />

      {/* 5. Code & Callout */}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onCommand('code')}
        title={isId ? 'Blok Kode (Code Block ```)' : 'Code Block'}
        className="min-w-[34px] h-[34px] flex items-center justify-center rounded-lg hover:bg-slate-700/70 active:bg-blue-600 active:text-white transition text-blue-400 shrink-0"
      >
        <Code className="w-4 h-4" />
      </button>

      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onCommand('code-inline')}
        title={isId ? 'Kode Segaris (Inline Code)' : 'Inline Code'}
        className="min-w-[34px] h-[34px] flex items-center justify-center rounded-lg hover:bg-slate-700/70 active:bg-blue-600 active:text-white transition text-emerald-400 shrink-0"
      >
        <Terminal className="w-4 h-4" />
      </button>

      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onCommand('callout')}
        title={isId ? 'Kotak Catatan / Callout (> [!NOTE])' : 'Callout Box'}
        className="min-w-[34px] h-[34px] flex items-center justify-center rounded-lg hover:bg-slate-700/70 active:bg-blue-600 active:text-white transition text-sky-400 shrink-0"
      >
        <AlertCircle className="w-4 h-4" />
      </button>

      <span className="w-px h-5 bg-slate-700/80 mx-0.5 shrink-0" />

      {/* 6. Links */}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onCommand('link')}
        title={isId ? 'Sisipkan Tautan Web' : 'Insert Web Link'}
        className="min-w-[34px] h-[34px] flex items-center justify-center rounded-lg hover:bg-slate-700/70 active:bg-blue-600 active:text-white transition text-slate-300 shrink-0"
      >
        <Link className="w-4 h-4" />
      </button>

      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onCommand('wikilink')}
        title={isId ? 'WikiLink Catatan ([[...]])' : 'Note WikiLink ([[...]])'}
        className="min-w-[34px] h-[34px] flex items-center justify-center rounded-lg hover:bg-slate-700/70 active:bg-blue-600 active:text-white transition text-blue-400 shrink-0"
      >
        <Link2 className="w-4 h-4" />
      </button>

      <span className="w-px h-5 bg-slate-700/80 mx-0.5 shrink-0" />

      {/* 7. Media & Creative Tools */}
      {/* Handwriting / Sketch Canvas */}
      {onOpenDrawingCanvas && (
        <button
          type="button"
          onClick={onOpenDrawingCanvas}
          title={isId ? 'Kanvas Sketsa Tangan' : 'Handwriting Sketch'}
          className="min-w-[34px] h-[34px] flex items-center justify-center rounded-lg hover:bg-slate-700/70 active:bg-blue-600 active:text-white transition text-amber-400 shrink-0"
        >
          <PenTool className="w-4 h-4" />
        </button>
      )}

      {/* Image (Folder or Link) */}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          if (onOpenImageModal) {
            onOpenImageModal();
          } else {
            fileInputRef.current?.click();
          }
        }}
        title={isId ? 'Sisipkan Gambar (Folder / Tautan)' : 'Insert Image (Folder / Link)'}
        className="min-w-[34px] h-[34px] flex items-center justify-center rounded-lg hover:bg-slate-700/70 active:bg-blue-600 active:text-white transition text-sky-400 shrink-0"
      >
        <ImageIcon className="w-4 h-4" />
      </button>

      {/* File Attachment (Folder or Link) */}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          if (onOpenAttachmentModal) {
            onOpenAttachmentModal();
          }
        }}
        title={isId ? 'Sisipkan Berkas Lampiran (Folder / Tautan)' : 'Insert File Attachment (Folder / Link)'}
        className="min-w-[34px] h-[34px] flex items-center justify-center rounded-lg hover:bg-slate-700/70 active:bg-blue-600 active:text-white transition text-emerald-400 shrink-0"
      >
        <Paperclip className="w-4 h-4" />
      </button>

      {/* Voice Memo */}
      {onOpenVoiceRecorder && (
        <button
          type="button"
          onClick={onOpenVoiceRecorder}
          title={isId ? 'Memo Suara' : 'Voice Memo'}
          className="min-w-[34px] h-[34px] flex items-center justify-center rounded-lg hover:bg-slate-700/70 active:bg-blue-600 active:text-white transition text-red-400 shrink-0"
        >
          <Mic className="w-4 h-4" />
        </button>
      )}

      {/* Templates */}
      {onOpenTemplates && (
        <button
          type="button"
          onClick={onOpenTemplates}
          title={isId ? 'Templat Catatan' : 'Note Templates'}
          className="min-w-[34px] h-[34px] flex items-center justify-center rounded-lg hover:bg-slate-700/70 active:bg-blue-600 active:text-white transition text-purple-400 shrink-0"
        >
          <Sparkles className="w-4 h-4" />
        </button>
      )}

      {/* Table */}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onCommand('table')}
        title={isId ? 'Sisipkan Tabel' : 'Insert Table'}
        className="min-w-[34px] h-[34px] flex items-center justify-center rounded-lg hover:bg-slate-700/70 active:bg-blue-600 active:text-white transition text-cyan-400 shrink-0"
      >
        <TableIcon className="w-4 h-4" />
      </button>

      {/* Math Formula */}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onCommand('math')}
        title={isId ? 'Rumus Matematika ($$)' : 'Math Formula'}
        className="min-w-[34px] h-[34px] flex items-center justify-center rounded-lg hover:bg-slate-700/70 active:bg-blue-600 active:text-white transition text-purple-400 shrink-0"
      >
        <Calculator className="w-4 h-4" />
      </button>

      {/* Collapsible Details */}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onCommand('details')}
        title={isId ? 'Kotak Rincian Terlipat (<details>)' : 'Collapsible Spoiler'}
        className="min-w-[34px] h-[34px] flex items-center justify-center rounded-lg hover:bg-slate-700/70 active:bg-blue-600 active:text-white transition text-slate-300 shrink-0"
      >
        <ChevronDown className="w-4 h-4" />
      </button>

      {/* Footnote */}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onCommand('footnote')}
        title={isId ? 'Catatan Kaki ([^1])' : 'Footnote'}
        className="min-w-[34px] h-[34px] flex items-center justify-center rounded-lg hover:bg-slate-700/70 active:bg-blue-600 active:text-white transition text-teal-400 shrink-0"
      >
        <Bookmark className="w-4 h-4" />
      </button>

      {/* Horizontal Divider */}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onCommand('hr')}
        title={isId ? 'Garis Pemisah (---)' : 'Horizontal Line'}
        className="min-w-[34px] h-[34px] flex items-center justify-center rounded-lg hover:bg-slate-700/70 active:bg-blue-600 active:text-white transition text-slate-400 shrink-0"
      >
        <Minus className="w-4 h-4" />
      </button>

      <span className="w-px h-5 bg-slate-700/80 mx-0.5 shrink-0" />

      {/* 8. Text Direction (LTR / RTL) */}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onCommand('dir-ltr')}
        title={isId ? 'Terapkan Arah Kiri-ke-Kanan (LTR)' : 'Left-to-Right (LTR)'}
        className="h-[34px] px-2 flex items-center gap-1 rounded-lg hover:bg-slate-700/70 active:bg-blue-600 active:text-white transition text-slate-300 text-[11px] font-mono shrink-0"
      >
        <AlignLeft className="w-3.5 h-3.5 text-blue-400" />
        <span>LTR</span>
      </button>

      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onCommand('dir-rtl')}
        title={isId ? 'Terapkan Arah Kanan-ke-Kiri (RTL)' : 'Right-to-Left (RTL)'}
        className="h-[34px] px-2 flex items-center gap-1 rounded-lg hover:bg-slate-700/70 active:bg-blue-600 active:text-white transition text-slate-300 text-[11px] font-mono shrink-0"
      >
        <AlignRight className="w-3.5 h-3.5 text-amber-400" />
        <span>RTL</span>
      </button>

      <span className="w-px h-5 bg-slate-700/80 mx-0.5 shrink-0" />

      {/* 9. Markdown View Mode (Raw vs Split) - if in markdown mode */}
      {settingsEditorMode === 'markdown' && onMarkdownViewModeChange && (
        <button
          type="button"
          onClick={() => onMarkdownViewModeChange(markdownViewMode === 'split' ? 'raw' : 'split')}
          title={
            markdownViewMode === 'split'
              ? isId ? 'Kembali ke Editor Tunggal (Raw)' : 'Single Editor View'
              : isId ? 'Tampilan Belah dengan Pratinjau (Split)' : 'Split Preview View'
          }
          className={`h-[34px] px-2 flex items-center gap-1.5 rounded-lg border text-xs font-medium transition shrink-0 ${
            markdownViewMode === 'split'
              ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
              : 'hover:bg-slate-700/70 text-slate-300 border-slate-700'
          }`}
        >
          <Columns className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[11px] font-mono">{markdownViewMode === 'split' ? 'Split' : 'Raw'}</span>
        </button>
      )}

      {/* 10. Desktop Action Tools: Publish, E2EE, History, PDF, Download, Info, Cheatsheet */}
      {/* Publish Note via GAS */}
      {onOpenPublish && (
        <button
          type="button"
          onClick={onOpenPublish}
          title={isId ? 'Publikasikan Catatan ke Web' : 'Publish Note to Web'}
          className={`h-[34px] px-2.5 flex items-center gap-1.5 rounded-lg text-xs font-medium transition shrink-0 ${
            note?.published_info?.is_published
              ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50'
              : 'bg-blue-600/90 hover:bg-blue-500 text-white shadow-xs'
          }`}
        >
          {note?.published_info?.is_published ? (
            <>
              <Share2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px]">{isId ? 'Online' : 'Published'}</span>
            </>
          ) : (
            <>
              <Globe className="w-3.5 h-3.5" />
              <span className="text-[11px]">{isId ? 'Publikasi' : 'Publish'}</span>
            </>
          )}
        </button>
      )}

      {/* E2EE Lock / Unlock */}
      {onToggleEncrypt && (
        <button
          type="button"
          onClick={onToggleEncrypt}
          title={
            isEncrypted
              ? isUnlocked
                ? isId ? 'Catatan Terenkripsi (Brankas Terbuka)' : 'Encrypted (Vault Unlocked)'
                : isId ? 'Catatan Terenkripsi (Terkunci)' : 'Encrypted (Locked)'
              : isId ? 'Enkripsi Catatan (E2EE)' : 'Encrypt Note (E2EE)'
          }
          className={`min-w-[34px] h-[34px] flex items-center justify-center rounded-lg transition shrink-0 ${
            isEncrypted
              ? isUnlocked
                ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                : 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
              : 'hover:bg-slate-700/70 text-slate-400'
          }`}
        >
          {isEncrypted ? (
            isUnlocked ? <Unlock className="w-4 h-4 text-emerald-400" /> : <Lock className="w-4 h-4 text-amber-400" />
          ) : (
            <Lock className="w-4 h-4" />
          )}
        </button>
      )}

      {/* Version History */}
      {onOpenRevisionHistory && (
        <button
          type="button"
          onClick={onOpenRevisionHistory}
          title={isId ? 'Riwayat Versi (Time Machine)' : 'Version History'}
          className="min-w-[34px] h-[34px] flex items-center justify-center rounded-lg hover:bg-slate-700/70 active:bg-blue-600 active:text-white transition text-blue-400 shrink-0"
        >
          <History className="w-4 h-4" />
        </button>
      )}

      {/* Unified Export Modal (Direct PDF, Word DOCX, MD, HTML) */}
      {onOpenExportModal ? (
        <button
          type="button"
          onClick={onOpenExportModal}
          title={isId ? 'Ekspor Catatan (PDF Langsung, Word DOCX, MD)' : 'Export Note (Direct PDF, Word DOCX, MD)'}
          className="min-w-[34px] h-[34px] flex items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white active:bg-blue-600 active:text-white transition shrink-0"
        >
          <FileDown className="w-4 h-4" />
        </button>
      ) : (
        <>
          {/* Print / Export to PDF fallback */}
          {onExportPdf && (
            <button
              type="button"
              onClick={onExportPdf}
              title={isId ? 'Cetak / Ekspor PDF' : 'Print / Export PDF'}
              className="min-w-[34px] h-[34px] flex items-center justify-center rounded-lg hover:bg-slate-700/70 active:bg-blue-600 active:text-white transition text-emerald-400 shrink-0"
            >
              <Printer className="w-4 h-4" />
            </button>
          )}

          {/* Download Markdown (.md) fallback */}
          {onExportMarkdown && (
            <button
              type="button"
              onClick={onExportMarkdown}
              title={isId ? 'Unduh Berkas Markdown (.md)' : 'Download Markdown (.md)'}
              className="min-w-[34px] h-[34px] flex items-center justify-center rounded-lg hover:bg-slate-700/70 active:bg-blue-600 active:text-white transition text-slate-300 shrink-0"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </>
      )}

      {/* Note Info & Stats */}
      {onOpenInfo && (
        <button
          type="button"
          onClick={onOpenInfo}
          title={isId ? 'Informasi & Statistik Catatan' : 'Note Info & Stats'}
          className="min-w-[34px] h-[34px] flex items-center justify-center rounded-lg hover:bg-slate-700/70 active:bg-blue-600 active:text-white transition text-slate-300 shrink-0"
        >
          <Info className="w-4 h-4 text-blue-400" />
        </button>
      )}

      {/* Cheatsheet / Guide */}
      {onOpenCheatSheet && (
        <button
          type="button"
          onClick={() => onOpenCheatSheet(settingsEditorMode === 'wysiwyg')}
          title={
            settingsEditorMode === 'wysiwyg'
              ? isId ? 'Panduan Rumus Matematika' : 'Math Guide'
              : isId ? 'Panduan Sintaks Markdown' : 'Markdown Guide'
          }
          className="min-w-[34px] h-[34px] flex items-center justify-center rounded-lg hover:bg-slate-700/70 active:bg-blue-600 active:text-white transition text-amber-400 shrink-0"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
