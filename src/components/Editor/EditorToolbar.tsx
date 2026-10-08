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
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Terminal,
  AlertCircle,
  ChevronDownSquare,
  Bookmark,
  Quote,
  Link,
  Image,
  Table,
  Minus,
  Binary,
  Globe,
  Lock,
  Unlock,
  Info,
  Columns,
  Eye,
  Share2,
  AlignLeft,
  AlignRight,
  HelpCircle,
  Calculator,
  Link2,
  Mic,
  PenTool,
  Sparkles,
  History,
  Printer,
  Download,
  Paperclip,
  FileDown,
} from 'lucide-react';
import type { Note, AppLanguage } from '../../types';
import { getT } from '../../utils/i18n';

interface EditorToolbarProps {
  settingsEditorMode: 'wysiwyg' | 'markdown';
  markdownViewMode: 'raw' | 'split';
  onMarkdownViewModeChange: (view: 'raw' | 'split') => void;
  onCommand: (command: string, value?: string) => void;
  note: Note;
  isEncrypted: boolean;
  isUnlocked: boolean;
  onToggleEncrypt: () => void;
  onOpenPublish: () => void;
  onOpenInfo: () => void;
  onOpenCheatSheet?: (mathOnly?: boolean) => void;
  onInsertImage: (file: File) => void;
  onOpenImageModal?: () => void;
  onOpenAttachmentModal?: () => void;
  onOpenTemplates?: () => void;
  onOpenRevisionHistory?: () => void;
  onOpenVoiceRecorder?: () => void;
  onOpenDrawingCanvas?: () => void;
  onExportPdf?: () => void;
  onExportMarkdown?: () => void;
  onOpenExportModal?: () => void;
  language?: AppLanguage;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  settingsEditorMode,
  markdownViewMode,
  onMarkdownViewModeChange,
  onCommand,
  note,
  isEncrypted,
  isUnlocked,
  onToggleEncrypt,
  onOpenPublish,
  onOpenInfo,
  onOpenCheatSheet,
  onInsertImage,
  onOpenImageModal,
  onOpenAttachmentModal,
  onOpenTemplates,
  onOpenRevisionHistory,
  onOpenVoiceRecorder,
  onOpenDrawingCanvas,
  onExportPdf,
  onExportMarkdown,
  onOpenExportModal,
  language = 'id',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = getT(language);
  const isId = language === 'id';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onInsertImage(e.target.files[0]);
      e.target.value = '';
    }
  };

  return (
    <div className="flex items-center px-2 py-1 bg-[#232f45] border-b border-slate-700/80 text-slate-300 text-xs select-none overflow-x-auto custom-scrollbar flex-nowrap gap-1 shrink-0 w-full">
      {/* Hidden file input for image attachments */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,.pdf,.txt,.doc,.docx"
        className="hidden"
      />

      {/* Formatting tools - onMouseDown prevents stealing focus from editor */}
      <div className="flex items-center gap-0.5 shrink-0 flex-nowrap">
        {/* Undo & Redo */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onCommand('undo')}
          title={isId ? 'Urungkan (Undo - Ctrl+Z)' : 'Undo (Ctrl+Z)'}
          className="p-1.5 rounded hover:bg-slate-700/70 hover:text-white transition text-slate-300"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onCommand('redo')}
          title={isId ? 'Ulangi (Redo - Ctrl+Y)' : 'Redo (Ctrl+Y)'}
          className="p-1.5 rounded hover:bg-slate-700/70 hover:text-white transition text-slate-300"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>

        <span className="w-px h-4 bg-slate-700 mx-1" />

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onCommand('bold')}
          title={t.tb_bold}
          className="p-1.5 rounded hover:bg-slate-700/70 hover:text-white transition"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onCommand('italic')}
          title={t.tb_italic}
          className="p-1.5 rounded hover:bg-slate-700/70 hover:text-white transition"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onCommand('strikethrough')}
          title={t.tb_strikethrough}
          className="p-1.5 rounded hover:bg-slate-700/70 hover:text-white transition"
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onCommand('underline')}
          title={isId ? 'Garis Bawah (Underline)' : 'Underline'}
          className="p-1.5 rounded hover:bg-slate-700/70 hover:text-white transition"
        >
          <Underline className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onCommand('highlight')}
          title={isId ? 'Sorot Teks (Highlight ==teks==)' : 'Highlight text'}
          className="p-1.5 rounded hover:bg-slate-700/70 hover:text-white transition text-amber-300"
        >
          <Highlighter className="w-3.5 h-3.5" />
        </button>

        <span className="w-px h-4 bg-slate-700 mx-1" />

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onCommand('h1')}
          title={t.tb_h1}
          className="p-1.5 rounded hover:bg-slate-700/70 hover:text-white transition"
        >
          <Heading1 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onCommand('h2')}
          title={t.tb_h2}
          className="p-1.5 rounded hover:bg-slate-700/70 hover:text-white transition"
        >
          <Heading2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onCommand('h3')}
          title={t.tb_h3}
          className="p-1.5 rounded hover:bg-slate-700/70 hover:text-white transition"
        >
          <Heading3 className="w-3.5 h-3.5" />
        </button>

        <span className="w-px h-4 bg-slate-700 mx-1" />

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onCommand('bullet')}
          title={t.tb_bullet}
          className="p-1.5 rounded hover:bg-slate-700/70 hover:text-white transition"
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onCommand('numbered')}
          title={t.tb_numbered}
          className="p-1.5 rounded hover:bg-slate-700/70 hover:text-white transition"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onCommand('todo')}
          title={t.tb_todo}
          className="p-1.5 rounded hover:bg-slate-700/70 hover:text-white transition"
        >
          <CheckSquare className="w-3.5 h-3.5" />
        </button>

        <span className="w-px h-4 bg-slate-700 mx-1" />

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onCommand('code')}
          title={isId ? 'Blok Kode (Fenced Code Block ```)' : 'Code Block'}
          className="p-1.5 rounded hover:bg-slate-700/70 hover:text-white transition"
        >
          <Code className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onCommand('code-inline')}
          title={isId ? 'Kode Segaris (Inline Code `code`)' : 'Inline Code'}
          className="p-1.5 rounded hover:bg-slate-700/70 hover:text-white transition text-emerald-400"
        >
          <Terminal className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onCommand('callout')}
          title={isId ? 'Kotak Catatan / Callout (> [!NOTE])' : 'Callout / Note Box'}
          className="p-1.5 rounded hover:bg-slate-700/70 hover:text-white transition text-sky-400"
        >
          <AlertCircle className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onCommand('quote')}
          title={t.tb_quote}
          className="p-1.5 rounded hover:bg-slate-700/70 hover:text-white transition"
        >
          <Quote className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onCommand('link')}
          title={isId ? 'Sisipkan Tautan Web (Ctrl+L)' : 'Insert Web Link (Ctrl+L)'}
          className="p-1.5 rounded hover:bg-slate-700/70 hover:text-white transition text-blue-300 shrink-0"
        >
          <Link className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onCommand('wikilink')}
          title={isId ? 'Sisipkan WikiLink Catatan ([[...]])' : 'Insert Note WikiLink ([[...]])'}
          className="p-1.5 rounded hover:bg-slate-700/70 hover:text-white transition text-blue-400"
        >
          <Link2 className="w-3.5 h-3.5" />
        </button>
        {/* Sisipkan Gambar (Folder / Tautan) */}
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
          title={t.tb_image}
          className="p-1.5 rounded hover:bg-slate-700/70 hover:text-white transition text-sky-400"
        >
          <Image className="w-3.5 h-3.5" />
        </button>

        {/* Sisipkan Berkas Lampiran (Folder / Tautan) */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (onOpenAttachmentModal) {
              onOpenAttachmentModal();
            }
          }}
          title={t.tb_attachment || (isId ? 'Sisipkan Berkas Lampiran (Folder / Tautan)' : 'Insert File Attachment (Folder / Link)')}
          className="p-1.5 rounded hover:bg-slate-700/70 hover:text-white transition text-emerald-400"
        >
          <Paperclip className="w-3.5 h-3.5" />
        </button>
        {onOpenVoiceRecorder && (
          <button
            type="button"
            onClick={onOpenVoiceRecorder}
            title={isId ? 'Rekam Memo Suara' : 'Record Voice Memo'}
            className="p-1.5 rounded hover:bg-slate-700/70 hover:text-white transition text-red-400"
          >
            <Mic className="w-3.5 h-3.5" />
          </button>
        )}
        {onOpenDrawingCanvas && (
          <button
            type="button"
            onClick={onOpenDrawingCanvas}
            title={isId ? 'Kanvas Sketsa Tangan' : 'Handwriting Sketch Canvas'}
            className="p-1.5 rounded hover:bg-slate-700/70 hover:text-white transition text-amber-400"
          >
            <PenTool className="w-3.5 h-3.5" />
          </button>
        )}
        {onOpenTemplates && (
          <button
            type="button"
            onClick={onOpenTemplates}
            title={isId ? 'Sisipkan Templat Catatan' : 'Insert Note Template'}
            className="p-1.5 rounded hover:bg-slate-700/70 hover:text-white transition text-purple-400"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onCommand('table')}
          title={t.tb_table}
          className="p-1.5 rounded hover:bg-slate-700/70 hover:text-white transition"
        >
          <Table className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onCommand('details')}
          title={isId ? 'Bagian Rincian / Spoiler (<details>)' : 'Collapsible Details Section'}
          className="p-1.5 rounded hover:bg-slate-700/70 hover:text-white transition text-purple-400"
        >
          <ChevronDownSquare className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onCommand('footnote')}
          title={isId ? 'Catatan Kaki ([^1])' : 'Footnote'}
          className="p-1.5 rounded hover:bg-slate-700/70 hover:text-white transition text-teal-400"
        >
          <Bookmark className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onCommand('hr')}
          title={t.tb_hr}
          className="p-1.5 rounded hover:bg-slate-700/70 hover:text-white transition"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onCommand('math')}
          title={t.tb_math}
          className="p-1.5 rounded hover:bg-slate-700/70 hover:text-white transition"
        >
          <Binary className="w-3.5 h-3.5" />
        </button>

        <span className="w-px h-4 bg-slate-700 mx-1" />

        {/* Word-style Text Direction Buttons for selected text / current paragraph */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onCommand('dir-ltr')}
          title={
            isId
              ? 'Terapkan Arah Kiri-ke-Kanan (LTR) ke teks terpilih / paragraf'
              : 'Apply Left-to-Right (LTR) to selected text / paragraph'
          }
          className="flex items-center gap-1 p-1.5 rounded hover:bg-slate-700/70 text-slate-300 hover:text-white transition text-xs"
        >
          <AlignLeft className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[11px] font-medium">LTR</span>
        </button>

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onCommand('dir-rtl')}
          title={
            isId
              ? 'Terapkan Arah Kanan-ke-Kiri (RTL) ke teks terpilih / paragraf'
              : 'Apply Right-to-Left (RTL) to selected text / paragraph'
          }
          className="flex items-center gap-1 p-1.5 rounded hover:bg-slate-700/70 text-slate-300 hover:text-white transition text-xs"
        >
          <AlignRight className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] font-medium">RTL</span>
        </button>
      </div>

      {/* Right side controls: Mode Toggle, E2EE, Publish to GAS, Info, Cheatsheet Hint */}
      <div className="flex items-center gap-1.5 shrink-0 flex-nowrap whitespace-nowrap ml-auto">
        {/* Markdown Cheatsheet / Hint button */}
        {onOpenCheatSheet && (
          <button
            type="button"
            onClick={() => onOpenCheatSheet(settingsEditorMode === 'wysiwyg')}
            title={
              settingsEditorMode === 'wysiwyg'
                ? isId
                  ? 'Panduan Rumus Matematika (KaTeX / LaTeX)'
                  : 'Math Formula & LaTeX Guide'
                : isId
                ? 'Panduan Sintaks & Cheatsheet Markdown'
                : 'Markdown Cheatsheet & Syntax Guide'
            }
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border transition shrink-0 whitespace-nowrap min-h-[30px] ${
              settingsEditorMode === 'wysiwyg'
                ? 'text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30'
                : 'text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30'
            }`}
          >
            {settingsEditorMode === 'wysiwyg' ? (
              <>
                <Calculator className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="hidden sm:inline whitespace-nowrap">{isId ? 'Rumus' : 'Math'}</span>
              </>
            ) : (
              <>
                <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="hidden sm:inline whitespace-nowrap">{isId ? 'Panduan' : 'Hint'}</span>
              </>
            )}
          </button>
        )}

        {/* Publish note via Google Sheets (GAS) */}
        <button
          type="button"
          onClick={onOpenPublish}
          title={isId ? 'Publikasikan catatan ke web melalui Google Sheets (Gaya Simplenote)' : 'Publish note to web via Google Sheets (Simplenote style)'}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition shrink-0 whitespace-nowrap min-h-[30px] ${
            note.published_info?.is_published
              ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-600/40'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xs'
          }`}
        >
          {note.published_info?.is_published ? (
            <>
              <Share2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="whitespace-nowrap">{t.tb_published_badge}</span>
            </>
          ) : (
            <>
              <Globe className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">{isId ? 'Publikasikan' : 'Publish'}</span>
            </>
          )}
        </button>

        {/* E2EE Lock / Unlock */}
        <button
          type="button"
          onClick={onToggleEncrypt}
          title={
            isEncrypted
              ? isUnlocked
                ? isId
                  ? 'Catatan Terenkripsi E2EE (Brankas Terbuka). Klik untuk mengunci atau kelola.'
                  : 'E2EE Encrypted (Vault Unlocked). Click to lock or manage.'
                : isId
                ? 'Catatan Terenkripsi E2EE (Terkunci). Klik untuk membuka brankas.'
                : 'E2EE Encrypted (Locked). Click to unlock.'
              : isId
              ? 'Enkripsikan catatan ini dengan Enkripsi End-to-End'
              : 'Encrypt this note with End-to-End Encryption'
          }
          className={`p-1.5 rounded transition flex items-center gap-1 ${
            isEncrypted
              ? isUnlocked
                ? 'text-emerald-400 hover:bg-emerald-950/40'
                : 'text-amber-400 hover:bg-amber-950/40'
              : 'hover:bg-slate-700/70 text-slate-400'
          }`}
        >
          {isEncrypted ? (
            isUnlocked ? (
              <Unlock className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-amber-400" />
            )
          ) : (
            <Lock className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Revision History */}
        {onOpenRevisionHistory && (
          <button
            type="button"
            onClick={onOpenRevisionHistory}
            title={isId ? 'Riwayat Versi Catatan (Time Machine)' : 'Revision History'}
            className="p-1.5 rounded hover:bg-slate-700/70 hover:text-white transition text-blue-400"
          >
            <History className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Unified Export Modal (Direct PDF, Word DOCX, Markdown, HTML, Print) */}
        {onOpenExportModal ? (
          <button
            type="button"
            onClick={onOpenExportModal}
            title={isId ? 'Ekspor Catatan (PDF Langsung, Word DOCX, Markdown, HTML)' : 'Export Note (Direct PDF, Word DOCX, Markdown, HTML)'}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 transition text-xs font-semibold shrink-0 active:scale-95"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>{isId ? 'Ekspor' : 'Export'}</span>
          </button>
        ) : (
          <>
            {/* Print / Export to PDF fallback */}
            {onExportPdf && (
              <button
                type="button"
                onClick={onExportPdf}
                title={isId ? 'Cetak / Ekspor Catatan ke PDF' : 'Print / Export to PDF'}
                className="p-1.5 rounded hover:bg-slate-700/70 hover:text-white transition text-emerald-400"
              >
                <Printer className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Download Markdown fallback */}
            {onExportMarkdown && (
              <button
                type="button"
                onClick={onExportMarkdown}
                title={isId ? 'Unduh Berkas Markdown (.md)' : 'Download Markdown (.md)'}
                className="p-1.5 rounded hover:bg-slate-700/70 hover:text-white transition text-slate-300"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        )}

        {/* Note Info Dialog */}
        <button
          type="button"
          onClick={onOpenInfo}
          title={t.tb_note_properties}
          className="p-1.5 rounded hover:bg-slate-700/70 hover:text-white transition"
        >
          <Info className="w-3.5 h-3.5" />
        </button>

        {/* Editor Mode Control:
            - If in WYSIWYG mode (Settings): DO NOT show split or markdown switcher buttons!
            - If in Markdown mode (Settings): Show option to switch between Split Preview and Raw Markdown!
        */}
        {settingsEditorMode === 'markdown' && (
          <>
            <span className="w-px h-4 bg-slate-700 mx-0.5" />
            <div className="flex items-center bg-slate-800/80 rounded p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => onMarkdownViewModeChange('split')}
                title={isId ? 'Tampilan Belah dengan Pratinjau Langsung (Split Preview)' : 'Split Live Preview'}
                className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition ${
                  markdownViewMode === 'split'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Columns className="w-3 h-3" />
                <span>Split</span>
              </button>
              <button
                type="button"
                onClick={() => onMarkdownViewModeChange('raw')}
                title={isId ? 'Tampilan Markdown Murni' : 'Raw Markdown View'}
                className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition ${
                  markdownViewMode === 'raw'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Markdown</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
