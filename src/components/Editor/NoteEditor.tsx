import React, { useState, useRef, useEffect } from 'react';
import {
  Folder as FolderIcon,
  Tag as TagIcon,
  Calendar,
  CheckCircle2,
  Circle,
  X,
  Plus,
  Lock,
  Paperclip,
  FileText,
  Trash2,
  ArrowLeft,
  Share2,
  ExternalLink,
  Download,
} from 'lucide-react';
import type { Note, Folder, Attachment, AppLanguage } from '../../types';
import { EditorToolbar } from './EditorToolbar';
import { WYSIWYGEditor } from './WYSIWYGEditor';
import { MarkdownEditor } from './MarkdownEditor';
import { SplitEditor } from './SplitEditor';
import { MobileEditorRibbon } from './MobileEditorRibbon';
import { MarkdownCheatSheetModal } from '../Modals/MarkdownCheatSheetModal';
import { LinkModal } from '../Modals/LinkModal';
import { ImageModal } from '../Modals/ImageModal';
import { FileAttachmentModal } from '../Modals/FileAttachmentModal';
import { getT } from '../../utils/i18n';
import { getNoteDirection } from '../../utils/rtl';
import { htmlToMarkdown, markdownToHtml } from '../../utils/markdown';

interface NoteEditorProps {
  note: Note;
  folders: Folder[];
  availableTags: string[];
  allNotes?: Note[];
  settingsEditorMode: 'wysiwyg' | 'markdown';
  markdownViewMode: 'raw' | 'split';
  isVaultUnlocked: boolean;
  onUpdateNote: (updated: Partial<Note>) => void;
  onMarkdownViewModeChange: (view: 'raw' | 'split') => void;
  onOpenPublish: () => void;
  onOpenInfo: () => void;
  onToggleEncrypt: () => void;
  onRequestUnlock: () => void;
  onBackToNotes?: () => void;
  onOpenWikiLink?: (targetTitle: string) => void;
  onOpenTemplates?: () => void;
  onOpenGraphView?: () => void;
  onOpenRevisionHistory?: () => void;
  onOpenVoiceRecorder?: () => void;
  onOpenDrawingCanvas?: () => void;
  onExportPdf?: () => void;
  onExportMarkdown?: () => void;
  onOpenExportModal?: () => void;
  language?: AppLanguage;
  theme?: string;
  isMobile?: boolean;
  mobileReadingMode?: boolean;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  folders,
  availableTags,
  allNotes = [],
  settingsEditorMode,
  markdownViewMode,
  isVaultUnlocked,
  onUpdateNote,
  onMarkdownViewModeChange,
  onOpenPublish,
  onOpenInfo,
  onToggleEncrypt,
  onRequestUnlock,
  onBackToNotes,
  onOpenWikiLink,
  onOpenTemplates,
  onOpenGraphView,
  onOpenRevisionHistory,
  onOpenVoiceRecorder,
  onOpenDrawingCanvas,
  onExportPdf,
  onExportMarkdown,
  onOpenExportModal,
  language = 'id',
  theme = 'qalam-dark',
  isMobile = false,
  mobileReadingMode = false,
}) => {
  const isLight = theme === 'qalam-light' || theme === 'light' || theme === 'joplin-light';
  const [newTagInput, setNewTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [isCheatSheetOpen, setIsCheatSheetOpen] = useState(false);
  const [isCheatSheetMathOnly, setIsCheatSheetMathOnly] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkInitialText, setLinkInitialText] = useState('');
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isFileAttachmentModalOpen, setIsFileAttachmentModalOpen] = useState(false);
  const savedRangeRef = useRef<Range | null>(null);
  const t = getT(language);

  // Undo & Redo History Management
  const historyRef = useRef<{ body: string; body_html?: string }[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isUndoRedoAction = useRef(false);
  const currentNoteIdRef = useRef<string>(note.id);

  // Initialize or reset history when switching note
  useEffect(() => {
    if (currentNoteIdRef.current !== note.id) {
      currentNoteIdRef.current = note.id;
      historyRef.current = [{ body: note.body, body_html: note.body_html }];
      historyIndexRef.current = 0;
    } else if (historyRef.current.length === 0) {
      historyRef.current = [{ body: note.body, body_html: note.body_html }];
      historyIndexRef.current = 0;
    }
  }, [note.id]);

  // Determine active text direction for title/fallback
  const isRtl = getNoteDirection(note) === 'rtl';

  const currentFolder = folders.find((f) => f.id === note.folder_id) || folders[0];

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateNote({ title: e.target.value, updated_time: Date.now() });
  };

  const handleBodyChange = (markdown: string, html?: string) => {
    if (!isUndoRedoAction.current) {
      const curIndex = historyIndexRef.current;
      const newHist = historyRef.current.slice(0, curIndex + 1);
      newHist.push({ body: markdown, body_html: html });
      if (newHist.length > 50) newHist.shift();
      historyRef.current = newHist;
      historyIndexRef.current = newHist.length - 1;
    }
    onUpdateNote({
      body: markdown,
      body_html: html,
      updated_time: Date.now(),
      sync_status: 'pending',
    });
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdateNote({ folder_id: e.target.value, updated_time: Date.now() });
  };

  const handleToggleTodo = () => {
    onUpdateNote({
      todo_completed: note.todo_completed ? 0 : Date.now(),
      updated_time: Date.now(),
    });
  };

  const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onUpdateNote({
      todo_due: val ? new Date(val).getTime() : 0,
      updated_time: Date.now(),
    });
  };

  const handleAddTag = (tagName: string) => {
    const clean = tagName.trim().toLowerCase().replace(/,/g, '');
    if (clean && !note.tags.includes(clean)) {
      onUpdateNote({
        tags: [...note.tags, clean],
        updated_time: Date.now(),
      });
    }
    setNewTagInput('');
    setShowTagInput(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdateNote({
      tags: note.tags.filter((t) => t !== tagToRemove),
      updated_time: Date.now(),
    });
  };

  // Insert Image from Local File
  const handleInsertImageFile = (file: File, altText?: string) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const label = altText || file.name;
      const newAttachment: Attachment = {
        id: 'att-img-' + Date.now(),
        name: file.name,
        mime: file.type || 'image/png',
        size: file.size,
        dataUrl,
        created_time: Date.now(),
      };

      const updatedAttachments = [...(note.attachments || []), newAttachment];
      const imageMarkdown = `\n\n![${label}](${dataUrl})\n\n`;
      onUpdateNote({
        attachments: updatedAttachments,
        body: note.body + imageMarkdown,
        updated_time: Date.now(),
      });
    };
    reader.readAsDataURL(file);
  };

  // Insert Image from Web URL / Link
  const handleInsertImageUrl = (url: string, altText?: string) => {
    let cleanName = altText;
    if (!cleanName) {
      try {
        const parsed = new URL(url);
        const lastPart = parsed.pathname.split('/').filter(Boolean).pop();
        cleanName = lastPart ? decodeURIComponent(lastPart) : 'Gambar';
      } catch {
        cleanName = 'Gambar';
      }
    }
    const newAttachment: Attachment = {
      id: 'att-img-url-' + Date.now(),
      name: cleanName,
      mime: 'image/*',
      size: 0,
      dataUrl: url,
      created_time: Date.now(),
    };

    const updatedAttachments = [...(note.attachments || []), newAttachment];
    const imageMarkdown = `\n\n![${cleanName}](${url})\n\n`;
    onUpdateNote({
      attachments: updatedAttachments,
      body: note.body + imageMarkdown,
      updated_time: Date.now(),
    });
  };

  // Insert File Attachment from Local File
  const handleInsertAttachmentFile = (file: File, customName?: string) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const finalName = customName || file.name;
      const newAttachment: Attachment = {
        id: 'att-file-' + Date.now(),
        name: finalName,
        mime: file.type || 'application/octet-stream',
        size: file.size,
        dataUrl,
        created_time: Date.now(),
      };

      const updatedAttachments = [...(note.attachments || []), newAttachment];
      const fileMarkdown = `\n\n[📎 ${finalName}](${dataUrl})\n\n`;
      onUpdateNote({
        attachments: updatedAttachments,
        body: note.body + fileMarkdown,
        updated_time: Date.now(),
      });
    };
    reader.readAsDataURL(file);
  };

  // Insert File Attachment from Web / Cloud URL
  const handleInsertAttachmentUrl = (url: string, fileName: string) => {
    const finalName = fileName.trim() || 'Lampiran Berkas';
    const newAttachment: Attachment = {
      id: 'att-file-url-' + Date.now(),
      name: finalName,
      mime: 'application/octet-stream',
      size: 0,
      dataUrl: url,
      created_time: Date.now(),
    };

    const updatedAttachments = [...(note.attachments || []), newAttachment];
    const fileMarkdown = `\n\n[📎 ${finalName}](${url})\n\n`;
    onUpdateNote({
      attachments: updatedAttachments,
      body: note.body + fileMarkdown,
      updated_time: Date.now(),
    });
  };

  // Direct image fallback
  const handleInsertImage = (file: File) => {
    handleInsertImageFile(file);
  };

  // Open / Download Attachment safely without window.open
  const handleDownloadOrOpenAttachment = (att: Attachment) => {
    const a = document.createElement('a');
    a.href = att.dataUrl;
    if (att.dataUrl.startsWith('data:')) {
      a.download = att.name;
    } else {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleRemoveAttachment = (attId: string) => {
    const updated = (note.attachments || []).filter((a) => a.id !== attId);
    onUpdateNote({ attachments: updated, updated_time: Date.now() });
  };

  // Keyboard shortcuts for Undo, Redo, and Link
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      if (isCtrlOrMeta && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleCommand('redo');
        } else {
          e.preventDefault();
          handleCommand('undo');
        }
      } else if (isCtrlOrMeta && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleCommand('redo');
      } else if (isCtrlOrMeta && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        handleCommand('link');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Insert link from LinkModal
  const handleInsertLink = (linkText: string, linkUrl: string, openInNewTab: boolean) => {
    if (settingsEditorMode === 'wysiwyg') {
      const editorRoot = document.querySelector('[contenteditable="true"]') as HTMLElement | null;
      if (editorRoot) {
        editorRoot.focus();
        const sel = window.getSelection();
        let range: Range | null = savedRangeRef.current;
        if (!range || !editorRoot.contains(range.commonAncestorContainer)) {
          range = document.createRange();
          range.selectNodeContents(editorRoot);
          range.collapse(false);
        }
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(range);
        }
        const targetAttr = openInNewTab ? 'target="_blank" rel="noopener noreferrer"' : '';
        const linkHtml = `<a href="${linkUrl}" ${targetAttr} class="text-blue-400 hover:text-blue-300 underline underline-offset-2 cursor-pointer font-medium">${linkText || linkUrl}</a>&nbsp;`;
        let inserted = false;
        try {
          inserted = document.execCommand('insertHTML', false, linkHtml);
        } catch {
          inserted = false;
        }
        if (!inserted) {
          const temp = document.createElement('span');
          temp.innerHTML = linkHtml;
          range.deleteContents();
          range.insertNode(temp);
        }
        const newHtml = editorRoot.innerHTML;
        const newMd = htmlToMarkdown(newHtml);
        handleBodyChange(newMd, newHtml);
      }
    } else {
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement | null;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const mdLink = `[${linkText || 'tautan'}](${linkUrl})`;
        const updated = textarea.value.substring(0, start) + mdLink + textarea.value.substring(end);
        handleBodyChange(updated);
        setTimeout(() => {
          textarea.focus();
          textarea.selectionStart = start + mdLink.length;
          textarea.selectionEnd = start + mdLink.length;
        }, 10);
      } else {
        const mdLink = `[${linkText || 'tautan'}](${linkUrl})`;
        handleBodyChange(note.body + '\n' + mdLink);
      }
    }
  };

  // Handle toolbar commands
  const handleCommand = (cmd: string, val?: string) => {
    if (settingsEditorMode === 'wysiwyg') {
      const editorRoot = document.querySelector('[contenteditable="true"]') as HTMLElement | null;
      if (editorRoot) {
        const sel = window.getSelection();
        // If focus is not inside editorRoot or no selection exists, place caret inside editorRoot
        if (!sel || sel.rangeCount === 0 || !editorRoot.contains(sel.anchorNode)) {
          editorRoot.focus();
          const range = document.createRange();
          range.selectNodeContents(editorRoot);
          range.collapse(false);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      }

      switch (cmd) {
        case 'undo': {
          document.execCommand('undo', false);
          if (historyIndexRef.current > 0) {
            historyIndexRef.current--;
            const prev = historyRef.current[historyIndexRef.current];
            isUndoRedoAction.current = true;
            onUpdateNote({
              body: prev.body,
              body_html: prev.body_html,
              updated_time: Date.now(),
              sync_status: 'pending',
            });
            if (editorRoot && prev.body_html !== undefined) {
              editorRoot.innerHTML = prev.body_html;
            }
            setTimeout(() => {
              isUndoRedoAction.current = false;
            }, 60);
          }
          return;
        }
        case 'redo': {
          document.execCommand('redo', false);
          if (historyIndexRef.current < historyRef.current.length - 1) {
            historyIndexRef.current++;
            const next = historyRef.current[historyIndexRef.current];
            isUndoRedoAction.current = true;
            onUpdateNote({
              body: next.body,
              body_html: next.body_html,
              updated_time: Date.now(),
              sync_status: 'pending',
            });
            if (editorRoot && next.body_html !== undefined) {
              editorRoot.innerHTML = next.body_html;
            }
            setTimeout(() => {
              isUndoRedoAction.current = false;
            }, 60);
          }
          return;
        }
        case 'bold':
          document.execCommand('bold', false);
          break;
        case 'italic':
          document.execCommand('italic', false);
          break;
        case 'strikethrough':
          document.execCommand('strikeThrough', false);
          break;
        case 'underline':
          document.execCommand('underline', false);
          break;
        case 'highlight': {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
            const range = selection.getRangeAt(0);
            let container: Node | null = range.commonAncestorContainer;
            if (container.nodeType === Node.TEXT_NODE) {
              container = container.parentElement;
            }
            const existingMark = (container as HTMLElement | null)?.closest('mark');
            if (existingMark) {
              // Toggle off highlight
              const parent = existingMark.parentNode;
              while (existingMark.firstChild) {
                parent?.insertBefore(existingMark.firstChild, existingMark);
              }
              parent?.removeChild(existingMark);
            } else {
              const frag = range.extractContents();
              const mark = document.createElement('mark');
              mark.className = 'bg-amber-500/40 text-amber-200 px-1 py-0.5 rounded font-medium';
              mark.appendChild(frag);
              range.insertNode(mark);
            }
          } else {
            document.execCommand(
              'insertHTML',
              false,
              '<mark class="bg-amber-500/40 text-amber-200 px-1 py-0.5 rounded font-medium">sorot teks</mark>&nbsp;'
            );
          }
          break;
        }
        case 'h1':
        case 'h2':
        case 'h3': {
          const targetTag = cmd.toLowerCase();
          const sel = window.getSelection();
          let currentHeading: HTMLElement | null = null;
          if (sel && sel.rangeCount > 0) {
            let node: Node | null = sel.getRangeAt(0).commonAncestorContainer;
            if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
            currentHeading = (node as HTMLElement | null)?.closest('h1, h2, h3, h4, h5, h6') || null;
            if (!currentHeading && sel.anchorNode) {
              const aNode = sel.anchorNode.nodeType === Node.TEXT_NODE ? sel.anchorNode.parentElement : sel.anchorNode;
              currentHeading = (aNode as HTMLElement | null)?.closest('h1, h2, h3, h4, h5, h6') || null;
            }
          }

          if (currentHeading) {
            if (currentHeading.tagName.toLowerCase() === targetTag) {
              // TOGGLE OFF: convert heading to normal paragraph
              const p = document.createElement('p');
              p.className = 'my-2 leading-relaxed text-slate-200';
              p.innerHTML = currentHeading.innerHTML;
              currentHeading.replaceWith(p);
              if (sel) {
                const r = document.createRange();
                r.selectNodeContents(p);
                r.collapse(false);
                sel.removeAllRanges();
                sel.addRange(r);
              }
            } else {
              // Switch heading level (e.g. h2 to h1)
              const newHeading = document.createElement(targetTag);
              newHeading.className =
                targetTag === 'h1'
                  ? 'text-2xl font-bold my-3 text-white border-b border-slate-700/60 pb-1'
                  : targetTag === 'h2'
                  ? 'text-xl font-bold my-2.5 text-slate-100 border-b border-slate-800 pb-0.5'
                  : 'text-lg font-semibold my-2 text-slate-200';
              newHeading.innerHTML = currentHeading.innerHTML;
              currentHeading.replaceWith(newHeading);
              if (sel) {
                const r = document.createRange();
                r.selectNodeContents(newHeading);
                r.collapse(false);
                sel.removeAllRanges();
                sel.addRange(r);
              }
            }
          } else {
            // Apply heading to current paragraph / selection
            let formatted = false;
            try {
              formatted = document.execCommand('formatBlock', false, `<${targetTag.toUpperCase()}>`);
            } catch {
              formatted = false;
            }
            if (!formatted) {
              try {
                document.execCommand('formatBlock', false, targetTag.toUpperCase());
              } catch {
                // Ignore
              }
            }
          }
          break;
        }
        case 'bullet': {
          const executed = document.execCommand('insertUnorderedList', false);
          if (!executed) {
            document.execCommand('insertHTML', false, '<ul><li>Item</li></ul><p>&#8203;</p>');
          }
          break;
        }
        case 'numbered': {
          const executed = document.execCommand('insertOrderedList', false);
          if (!executed) {
            document.execCommand('insertHTML', false, '<ol><li>Item 1</li></ol><p>&#8203;</p>');
          }
          break;
        }
        case 'quote':
          try {
            document.execCommand('formatBlock', false, '<blockquote>');
          } catch {
            document.execCommand('formatBlock', false, 'BLOCKQUOTE');
          }
          break;
        case 'code': {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
            try {
              document.execCommand('formatBlock', false, '<pre>');
            } catch {
              document.execCommand('formatBlock', false, 'PRE');
            }
          } else {
            document.execCommand(
              'insertHTML',
              false,
              '<pre class="bg-slate-900 border border-slate-800 p-3 rounded font-mono text-sm text-emerald-400"><code>// Kode di sini...</code></pre><p>&#8203;</p>'
            );
          }
          break;
        }
        case 'code-inline': {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
            const range = selection.getRangeAt(0);
            const frag = range.extractContents();
            const codeEl = document.createElement('code');
            codeEl.appendChild(frag);
            range.insertNode(codeEl);
          } else {
            document.execCommand('insertHTML', false, '<code>kode</code>&nbsp;');
          }
          break;
        }
        case 'callout':
          document.execCommand(
            'insertHTML',
            false,
            '<div class="qalam-callout my-3 p-3 rounded-lg border-l-4 border-blue-500 bg-blue-950/30 text-blue-300"><div class="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wide mb-1 text-blue-400"><span>ℹ️</span><span>Catatan Penting</span></div><p>Tuliskan catatan informasi atau panduan di sini...</p></div><p>&#8203;</p>'
          );
          break;
        case 'details':
          document.execCommand(
            'insertHTML',
            false,
            '<details class="my-3 p-3 bg-slate-900/60 rounded-lg border border-slate-800 text-slate-200 cursor-pointer"><summary class="font-semibold text-blue-400 cursor-pointer outline-none mb-2">Klik untuk membuka rincian</summary><p>Konten tersembunyi dapat ditulis di sini...</p></details><p>&#8203;</p>'
          );
          break;
        case 'footnote':
          document.execCommand(
            'insertHTML',
            false,
            '<sup class="qalam-footnote-ref font-mono text-[11px]"><a href="#fn-1" class="text-blue-400 hover:underline">[1]</a></sup>'
          );
          break;
        case 'wikilink': {
          const sel = window.getSelection();
          let text = 'Catatan Terkait';
          if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
            text = sel.toString().trim() || 'Catatan Terkait';
          }
          document.execCommand(
            'insertHTML',
            false,
            `<a href="#wikilink-${encodeURIComponent(text)}" data-wikilink="${encodeURIComponent(text)}" class="qalam-wikilink font-semibold text-blue-400 underline decoration-blue-500/60 hover:text-blue-300">[[${text}]]</a>&nbsp;`
          );
          break;
        }
        case 'link': {
          const sel = window.getSelection();
          let text = '';
          if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
            savedRangeRef.current = sel.getRangeAt(0).cloneRange();
            text = sel.toString().trim();
          } else if (sel && sel.rangeCount > 0) {
            savedRangeRef.current = sel.getRangeAt(0).cloneRange();
          } else {
            savedRangeRef.current = null;
          }
          setLinkInitialText(text);
          setIsLinkModalOpen(true);
          return;
        }
        case 'hr':
          document.execCommand('insertHorizontalRule', false);
          break;
        case 'todo':
          document.execCommand(
            'insertHTML',
            false,
            '<div class="qalam-todo-item flex items-center gap-2 my-1.5"><input type="checkbox" class="qalam-todo-checkbox accent-blue-500 cursor-pointer w-4 h-4 rounded" /> <span>Tugas baru</span></div><p>&#8203;</p>'
          );
          break;
        case 'table':
          document.execCommand(
            'insertHTML',
            false,
            '<table class="border border-slate-700 w-full my-3 border-collapse"><thead><tr class="bg-slate-800"><th class="border border-slate-700 p-2 text-left font-bold">Kolom 1</th><th class="border border-slate-700 p-2 text-left font-bold">Kolom 2</th><th class="border border-slate-700 p-2 text-left font-bold">Kolom 3</th></tr></thead><tbody><tr><td class="border border-slate-700 p-2">Nilai 1</td><td class="border border-slate-700 p-2">Nilai 2</td><td class="border border-slate-700 p-2">Nilai 3</td></tr><tr><td class="border border-slate-700 p-2">Data A</td><td class="border border-slate-700 p-2">Data B</td><td class="border border-slate-700 p-2">Data C</td></tr></tbody></table><p>&#8203;</p>'
          );
          break;
        case 'math':
          document.execCommand(
            'insertHTML',
            false,
            '<div class="qalam-math-block bg-blue-950/40 text-blue-300 p-2.5 my-2.5 rounded font-mono text-center">$$\\ e^{i\\pi} + 1 = 0 \\$$</div><p>&#8203;</p>'
          );
          break;
        case 'dir-ltr':
        case 'dir-rtl': {
          const targetDir = cmd === 'dir-rtl' ? 'rtl' : 'ltr';
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            let node: Node | null = range.commonAncestorContainer;
            if (node.nodeType === Node.TEXT_NODE) {
              node = node.parentElement;
            }

            let block = node as HTMLElement | null;
            while (
              block &&
              block.parentElement &&
              !block.hasAttribute('contenteditable') &&
              !['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'TABLE'].includes(
                block.tagName
              )
            ) {
              block = block.parentElement;
            }

            if (block && !block.hasAttribute('contenteditable')) {
              block.setAttribute('dir', targetDir);
              block.style.textAlign = targetDir === 'rtl' ? 'right' : 'left';
              block.style.unicodeBidi = 'isolate';
            } else if (!range.collapsed) {
              const span = document.createElement('span');
              span.setAttribute('dir', targetDir);
              span.style.unicodeBidi = 'isolate';
              span.style.textAlign = targetDir === 'rtl' ? 'right' : 'left';
              try {
                range.surroundContents(span);
              } catch {
                const frag = range.cloneContents();
                span.appendChild(frag);
                range.deleteContents();
                range.insertNode(span);
              }
            } else {
              const p = document.createElement('p');
              p.setAttribute('dir', targetDir);
              p.style.textAlign = targetDir === 'rtl' ? 'right' : 'left';
              p.style.unicodeBidi = 'isolate';
              p.innerHTML = '&#8203;';
              range.insertNode(p);
              range.selectNodeContents(p);
              range.collapse(false);
            }
          }
          break;
        }
      }

      // Immediately sync formatted HTML and update Markdown in Dexie & state
      if (editorRoot) {
        const newHtml = editorRoot.innerHTML;
        const newMd = htmlToMarkdown(newHtml);
        onUpdateNote({
          body: newMd,
          body_html: newHtml,
          updated_time: Date.now(),
          sync_status: 'pending',
        });
      }
    } else {
      // Markdown Mode: Insert snippet at cursor or append
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement | null;
      let snippet = '';

      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = textarea.value.substring(start, end);

        switch (cmd) {
          case 'undo': {
            if (historyIndexRef.current > 0) {
              historyIndexRef.current--;
              const prev = historyRef.current[historyIndexRef.current];
              isUndoRedoAction.current = true;
              onUpdateNote({
                body: prev.body,
                updated_time: Date.now(),
              });
              setTimeout(() => {
                isUndoRedoAction.current = false;
              }, 60);
            } else {
              document.execCommand('undo');
            }
            return;
          }
          case 'redo': {
            if (historyIndexRef.current < historyRef.current.length - 1) {
              historyIndexRef.current++;
              const next = historyRef.current[historyIndexRef.current];
              isUndoRedoAction.current = true;
              onUpdateNote({
                body: next.body,
                updated_time: Date.now(),
              });
              setTimeout(() => {
                isUndoRedoAction.current = false;
              }, 60);
            } else {
              document.execCommand('redo');
            }
            return;
          }
          case 'bold':
            snippet = `**${selected || 'bold text'}**`;
            break;
          case 'italic':
            snippet = `*${selected || 'italic text'}*`;
            break;
          case 'strikethrough':
            snippet = `~~${selected || 'strikethrough'}~~`;
            break;
          case 'underline':
            snippet = `<u>${selected || 'underlined text'}</u>`;
            break;
          case 'highlight':
            snippet = `==${selected || 'highlighted text'}==`;
            break;
          case 'h1':
          case 'h2':
          case 'h3': {
            const prefix = cmd === 'h1' ? '# ' : cmd === 'h2' ? '## ' : '### ';
            const fullText = textarea.value;
            // Find current line bounds around selection/caret
            const lineStart = fullText.lastIndexOf('\n', start - 1) + 1;
            let lineEnd = fullText.indexOf('\n', end);
            if (lineEnd === -1) lineEnd = fullText.length;
            const currentLine = fullText.substring(lineStart, lineEnd);

            let updatedLine = '';
            if (currentLine.startsWith(prefix)) {
              // TOGGLE OFF: remove heading prefix, returning to normal sentence
              updatedLine = currentLine.slice(prefix.length);
            } else if (/^#{1,6}\s+/.test(currentLine)) {
              // Replace other heading level
              updatedLine = prefix + currentLine.replace(/^#{1,6}\s+/, '');
            } else {
              // Add heading prefix to this line
              updatedLine = prefix + currentLine;
            }

            const updatedBody = fullText.substring(0, lineStart) + updatedLine + fullText.substring(lineEnd);
            handleBodyChange(updatedBody);
            setTimeout(() => {
              textarea.focus();
              const newPos = Math.min(start + (updatedLine.length - currentLine.length), updatedBody.length);
              textarea.selectionStart = newPos;
              textarea.selectionEnd = newPos;
            }, 10);
            return;
          }
          case 'bullet':
            snippet = `\n- ${selected || 'Item'}\n`;
            break;
          case 'numbered':
            snippet = `\n1. ${selected || 'Item'}\n`;
            break;
          case 'todo':
            snippet = `\n- [ ] ${selected || 'Task item'}\n`;
            break;
          case 'code':
            snippet = `\n\`\`\`typescript\n${selected || '// code here'}\n\`\`\`\n`;
            break;
          case 'quote':
            snippet = `\n> ${selected || 'Blockquote here'}\n`;
            break;
          case 'link':
            setLinkInitialText(selected);
            setIsLinkModalOpen(true);
            return;
          case 'wikilink':
            snippet = selected ? `[[${selected}]]` : `[[Catatan Terkait]]`;
            break;
          case 'table':
            snippet = '\n| Header 1 | Header 2 | Header 3 |\n|---|---|---|\n| Cell 1 | Cell 2 | Cell 3 |\n| Data A | Data B | Data C |\n';
            break;
          case 'hr':
            snippet = '\n---\n';
            break;
          case 'math':
            snippet = `\n$$\n${selected || 'e^{i\\pi} + 1 = 0'}\n$$\n`;
            break;
          case 'dir-ltr':
          case 'dir-rtl': {
            const targetDir = cmd === 'dir-rtl' ? 'rtl' : 'ltr';
            snippet = `\n\n<div dir="${targetDir}">\n\n${selected || (targetDir === 'rtl' ? 'نص من اليمين لليسار' : 'Left-to-right text')}\n\n</div>\n\n`;
            break;
          }
        }

        const updated = textarea.value.substring(0, start) + snippet + textarea.value.substring(end);
        onUpdateNote({ body: updated, updated_time: Date.now() });
        setTimeout(() => {
          textarea.focus();
          textarea.selectionStart = start + snippet.length;
          textarea.selectionEnd = start + snippet.length;
        }, 10);
      } else {
        onUpdateNote({ body: note.body + '\n' + snippet, updated_time: Date.now() });
      }
    }
  };

  const handleInsertCheatSheetSnippet = (snippet: string) => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement | null;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const updated = textarea.value.substring(0, start) + snippet + textarea.value.substring(end);
      onUpdateNote({ body: updated, updated_time: Date.now() });
      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + snippet.length;
      }, 10);
    } else {
      // Append to note body or insert into WYSIWYG
      const editorRoot = document.querySelector('[contenteditable="true"]') as HTMLElement | null;
      if (editorRoot) {
        editorRoot.focus();
        if (snippet.startsWith('$$')) {
          const innerFormula = snippet.replace(/^\$\$\n?/, '').replace(/\n?\$\$$/, '').trim();
          const mathHtml = `<div class="qalam-math-block bg-blue-950/40 text-blue-300 p-2.5 my-2.5 rounded font-mono text-center">$$\\ ${innerFormula} \\$$</div><p>&#8203;</p>`;
          document.execCommand('insertHTML', false, mathHtml);
        } else if (snippet.startsWith('$')) {
          const innerFormula = snippet.replace(/^\$/, '').replace(/\$$/, '').trim();
          const mathHtml = `<code class="bg-blue-950/30 text-blue-300 px-1.5 py-0.5 rounded text-xs border border-blue-900/50 font-mono">\\( ${innerFormula} \\)</code>&nbsp;`;
          document.execCommand('insertHTML', false, mathHtml);
        } else {
          document.execCommand('insertText', false, snippet);
        }
        const newHtml = editorRoot.innerHTML;
        const newMd = htmlToMarkdown(newHtml);
        onUpdateNote({ body: newMd, body_html: newHtml, updated_time: Date.now() });
      } else {
        onUpdateNote({ body: note.body + '\n\n' + snippet, updated_time: Date.now() });
      }
    }
  };

  const isEncryptedAndLocked = note.is_encrypted && !isVaultUnlocked;

  return (
    <div className={`flex flex-col h-full w-full select-none transition-colors ${isLight ? 'bg-white text-slate-900' : 'bg-[#1e2738] text-slate-100'}`}>
      {/* Top Note Meta Bar: Title, Notebook Selector, Tag Chips */}
      <div className={`px-4 sm:px-6 pt-2.5 pb-2 border-b transition-colors ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#202b3f] border-slate-700/70'}`}>
        {/* Row 1: Title input & completion checkbox */}
        <div className="flex items-center gap-2">
          {/* If To-Do, display completion checkbox */}
          {note.is_todo && (
            <button
              onClick={handleToggleTodo}
              title={note.todo_completed ? t.mark_incomplete : t.mark_complete}
              className={`transition shrink-0 ${isLight ? 'text-slate-500 hover:text-blue-600' : 'text-slate-400 hover:text-blue-400'}`}
            >
              {note.todo_completed ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-100 dark:fill-emerald-950/40" />
              ) : (
                <Circle className="w-5 h-5 text-slate-400 hover:text-blue-500" />
              )}
            </button>
          )}

          <input
            type="text"
            dir={isRtl ? 'rtl' : 'ltr'}
            value={note.title}
            onChange={handleTitleChange}
            placeholder={t.note_title_placeholder}
            className={`flex-1 bg-transparent text-lg sm:text-xl font-bold focus:outline-none tracking-tight select-text ${
              isLight ? 'text-slate-900 placeholder:text-slate-400' : 'text-white placeholder:text-slate-500'
            } ${isRtl ? 'text-right' : 'text-left'}`}
          />

          {onOpenGraphView && (
            <button
              type="button"
              onClick={onOpenGraphView}
              title={language === 'id' ? 'Lihat dalam Grafik Pengetahuan (Ctrl+G)' : 'View in Knowledge Graph (Ctrl+G)'}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-medium transition shrink-0 active:scale-95 ${
                isLight
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 shadow-xs'
                  : 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border-emerald-800/60'
              }`}
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">{language === 'id' ? 'Grafik' : 'Graph'}</span>
            </button>
          )}
        </div>

        {/* Row 2: Compact Metadata Strip (Folder, Due Date, Tags) */}
        <div className="flex items-center gap-2 mt-2 text-xs overflow-x-auto custom-scrollbar flex-nowrap pb-0.5">
          {/* Folder selector chip */}
          <div
            className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border shrink-0 transition-colors ${
              isLight
                ? 'bg-slate-200/90 text-slate-800 border-slate-300'
                : 'bg-slate-800/80 text-slate-300 border-slate-700/80'
            }`}
          >
            <FolderIcon className="w-3 h-3 text-blue-500 shrink-0" />
            <select
              value={note.folder_id}
              onChange={handleFolderChange}
              className={`bg-transparent text-[11px] font-medium outline-none cursor-pointer max-w-[130px] truncate ${
                isLight ? 'text-slate-900' : 'text-slate-200'
              }`}
            >
              {folders.map((f) => (
                <option key={f.id} value={f.id} className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-slate-100'}>
                  {f.title}
                </option>
              ))}
            </select>
          </div>

          {/* To-Do Due Date */}
          {note.is_todo && (
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded border shrink-0 text-[11px] transition-colors ${
                isLight
                  ? 'bg-slate-200/80 text-slate-800 border-slate-300'
                  : 'bg-slate-800/60 text-slate-300 border-slate-700/60'
              }`}
            >
              <Calendar className="w-3 h-3 text-amber-500 shrink-0" />
              <input
                type="date"
                value={note.todo_due ? new Date(note.todo_due).toISOString().split('T')[0] : ''}
                onChange={handleDueDateChange}
                className={`bg-transparent text-[11px] font-medium outline-none cursor-pointer ${
                  isLight ? 'text-slate-900' : 'text-slate-200'
                }`}
              />
              {note.todo_due > 0 && (
                <button
                  onClick={() => onUpdateNote({ todo_due: 0, updated_time: Date.now() })}
                  title={t.clear_due_date}
                  className={`ml-0.5 transition ${isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          )}

          {/* Tags list */}
          <div className="flex items-center gap-1 shrink-0">
            <TagIcon className={`w-3 h-3 shrink-0 ${isLight ? 'text-slate-600' : 'text-slate-400'}`} />
            {note.tags && note.tags.length > 0 ? (
              note.tags.map((tName) => (
                <span
                  key={tName}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${
                    isLight
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : 'bg-blue-950/60 text-blue-300 border-blue-800/50'
                  }`}
                >
                  <span>{tName}</span>
                  <button
                    onClick={() => handleRemoveTag(tName)}
                    className={isLight ? 'hover:text-red-700 transition' : 'hover:text-red-300 transition'}
                  >
                    <X className="w-2 h-2" />
                  </button>
                </span>
              ))
            ) : (
              <span className={`text-[10px] italic shrink-0 ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>{t.no_tags}</span>
            )}

            {/* Add tag button / input */}
            {showTagInput ? (
              <div className="flex items-center gap-1 shrink-0">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddTag(newTagInput);
                    if (e.key === 'Escape') setShowTagInput(false);
                  }}
                  placeholder="tag..."
                  autoFocus
                  className={`text-[11px] px-1.5 py-0.5 rounded border border-blue-500 outline-none w-16 ${
                    isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-slate-200'
                  }`}
                />
                <button
                  onClick={() => handleAddTag(newTagInput)}
                  className="text-blue-600 hover:text-blue-700 font-bold text-xs"
                >
                  ✓
                </button>
                <button
                  onClick={() => setShowTagInput(false)}
                  className={`text-xs ${isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowTagInput(true)}
                title={t.add_tag}
                className={`p-0.5 rounded transition shrink-0 ${
                  isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Plus className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Attachments bar (if note has attachments) - Fully theme-responsive & high contrast */}
        {note.attachments && note.attachments.length > 0 && (
          <div
            className={`mt-2.5 p-2.5 rounded-xl border text-xs overflow-x-auto custom-scrollbar flex items-center gap-2 flex-wrap transition-colors ${
              isLight
                ? 'bg-slate-100/90 border-slate-300/90 shadow-2xs'
                : 'bg-slate-800/50 border-slate-700/60'
            }`}
          >
            <span
              className={`flex items-center gap-1.5 text-[11px] font-bold shrink-0 ${
                isLight ? 'text-slate-900' : 'text-slate-300'
              }`}
            >
              <Paperclip className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              {t.attachments_label}
            </span>
            {note.attachments.map((att) => {
              const isUrl = att.dataUrl.startsWith('http://') || att.dataUrl.startsWith('https://');
              return (
                <div
                  key={att.id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] transition group ${
                    isLight
                      ? 'bg-white hover:bg-slate-50 border-slate-300 hover:border-blue-500 text-slate-900 shadow-2xs'
                      : 'bg-slate-800 hover:bg-slate-750 border-slate-700 hover:border-slate-500 text-slate-100'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleDownloadOrOpenAttachment(att)}
                    title={
                      isUrl
                        ? language === 'id'
                          ? 'Buka tautan berkas di tab baru'
                          : 'Open file link in new tab'
                        : language === 'id'
                        ? 'Unduh berkas'
                        : 'Download file'
                    }
                    className={`flex items-center gap-1.5 text-left transition ${
                      isLight ? 'hover:text-blue-700' : 'hover:text-blue-400'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span
                      className={`truncate max-w-[150px] font-semibold ${
                        isLight ? 'text-slate-900 group-hover:text-blue-700' : 'text-slate-100 group-hover:text-blue-300'
                      }`}
                    >
                      {att.name}
                    </span>
                    {att.size > 0 && (
                      <span className={`text-[10px] font-mono font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        ({(att.size / 1024).toFixed(0)} KB)
                      </span>
                    )}
                    {isUrl ? (
                      <ExternalLink
                        className={`w-3 h-3 shrink-0 transition ${
                          isLight ? 'text-slate-500 group-hover:text-blue-700' : 'text-slate-400 group-hover:text-blue-400'
                        }`}
                      />
                    ) : (
                      <Download
                        className={`w-3 h-3 shrink-0 transition ${
                          isLight ? 'text-slate-500 group-hover:text-blue-700' : 'text-slate-400 group-hover:text-blue-400'
                        }`}
                      />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(att.id)}
                    title={language === 'id' ? 'Hapus lampiran' : 'Remove attachment'}
                    className={`ml-1 p-0.5 rounded transition ${
                      isLight
                        ? 'text-slate-500 hover:text-red-700 hover:bg-red-100/80'
                        : 'text-slate-400 hover:text-red-400 hover:bg-slate-700/60'
                    }`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Editor Toolbar - Desktop & Tablet only; Mobile uses MobileEditorRibbon at the bottom */}
      {!isMobile && (
        <EditorToolbar
          settingsEditorMode={settingsEditorMode}
          markdownViewMode={markdownViewMode}
          onMarkdownViewModeChange={onMarkdownViewModeChange}
          onCommand={handleCommand}
          note={note}
          isEncrypted={note.is_encrypted}
          isUnlocked={isVaultUnlocked}
          onToggleEncrypt={onToggleEncrypt}
          onOpenPublish={onOpenPublish}
          onOpenInfo={onOpenInfo}
          onOpenCheatSheet={(mathOnly) => {
            setIsCheatSheetMathOnly(!!mathOnly);
            setIsCheatSheetOpen(true);
          }}
          onInsertImage={handleInsertImage}
          onOpenImageModal={() => setIsImageModalOpen(true)}
          onOpenAttachmentModal={() => setIsFileAttachmentModalOpen(true)}
          onOpenTemplates={onOpenTemplates}
          onOpenRevisionHistory={onOpenRevisionHistory}
          onOpenVoiceRecorder={onOpenVoiceRecorder}
          onOpenDrawingCanvas={onOpenDrawingCanvas}
          onExportPdf={onExportPdf}
          onExportMarkdown={onExportMarkdown}
          onOpenExportModal={onOpenExportModal}
          language={language}
        />
      )}

      {/* Editor Body, Locked Screen, or Mobile Reading Preview */}
      <div className="flex-1 relative overflow-hidden flex flex-col">
        {isEncryptedAndLocked ? (
          <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center bg-[#182130]">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-amber-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{t.locked_note_title}</h3>
            <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
              {t.locked_note_desc}
            </p>
            <button
              onClick={onRequestUnlock}
              className="flex items-center gap-2 px-4 py-2 rounded bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs shadow-md transition"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{t.unlock_vault_btn}</span>
            </button>
          </div>
        ) : isMobile && mobileReadingMode ? (
          /* Mobile Distraction-Free Reading Mode (Obsidian / Joplin Reading View) */
          <div
            onClick={(e) => {
              const target = e.target as HTMLElement;
              const wikiLinkEl = target.closest('a[data-wikilink]');
              if (wikiLinkEl) {
                e.preventDefault();
                const targetTitle = decodeURIComponent(wikiLinkEl.getAttribute('data-wikilink') || '');
                if (targetTitle && onOpenWikiLink) {
                  onOpenWikiLink(targetTitle);
                }
              }
            }}
            className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 custom-scrollbar select-text bg-[#1e2738]"
          >
            <div
              className="qalam-markdown-preview prose prose-invert max-w-none text-slate-100 text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: markdownToHtml(note.body, isLight ? 'light' : 'dark') }}
            />
          </div>
        ) : (
          <>
            <div className="flex-1 relative overflow-hidden">
              {settingsEditorMode === 'wysiwyg' && (
                <WYSIWYGEditor
                  noteId={note.id}
                  content={note.body}
                  htmlContent={note.body_html}
                  onChange={handleBodyChange}
                  isRtl={isRtl}
                  language={language}
                  isLight={isLight}
                  onOpenWikiLink={onOpenWikiLink}
                  availableNotes={allNotes}
                  currentNoteId={note.id}
                />
              )}
              {settingsEditorMode === 'markdown' && markdownViewMode === 'raw' && (
                <MarkdownEditor
                  content={note.body}
                  onChange={(md) => handleBodyChange(md)}
                  isRtl={isRtl}
                  isLight={isLight}
                  availableNotes={allNotes}
                  currentNoteId={note.id}
                />
              )}
              {settingsEditorMode === 'markdown' && markdownViewMode === 'split' && (
                <SplitEditor
                  content={note.body}
                  onChange={(md) => handleBodyChange(md)}
                  isRtl={isRtl}
                  isLight={isLight}
                  onOpenWikiLink={onOpenWikiLink}
                  availableNotes={allNotes}
                  currentNoteId={note.id}
                />
              )}
            </div>

            {/* Obsidian-Style Mobile Quick Formatting Ribbon - Full Feature Parity with Desktop */}
            {isMobile && (
              <MobileEditorRibbon
                onCommand={handleCommand}
                onInsertImage={handleInsertImage}
                onOpenImageModal={() => setIsImageModalOpen(true)}
                onOpenAttachmentModal={() => setIsFileAttachmentModalOpen(true)}
                onOpenTemplates={onOpenTemplates}
                onOpenVoiceRecorder={onOpenVoiceRecorder}
                onOpenDrawingCanvas={onOpenDrawingCanvas}
                language={language}
                note={note}
                isEncrypted={note.is_encrypted}
                isUnlocked={isVaultUnlocked}
                onToggleEncrypt={onToggleEncrypt}
                onOpenPublish={onOpenPublish}
                onOpenInfo={onOpenInfo}
                onOpenCheatSheet={(mathOnly) => {
                  setIsCheatSheetMathOnly(!!mathOnly);
                  setIsCheatSheetOpen(true);
                }}
                onOpenRevisionHistory={onOpenRevisionHistory}
                onExportPdf={onExportPdf}
                onExportMarkdown={onExportMarkdown}
                onOpenExportModal={onOpenExportModal}
                settingsEditorMode={settingsEditorMode}
                markdownViewMode={markdownViewMode}
                onMarkdownViewModeChange={onMarkdownViewModeChange}
              />
            )}
          </>
        )}
      </div>

      {/* Web Link Modal */}
      <LinkModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        onInsert={handleInsertLink}
        initialText={linkInitialText}
        language={language}
      />

      {/* Markdown Cheatsheet / Math Guide Modal */}
      <MarkdownCheatSheetModal
        isOpen={isCheatSheetOpen}
        onClose={() => setIsCheatSheetOpen(false)}
        onInsertSnippet={handleInsertCheatSheetSnippet}
        language={language}
        mathOnly={isCheatSheetMathOnly}
      />

      {/* Image Modal (From Local Folder or Web URL) */}
      <ImageModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onInsertImageFile={handleInsertImageFile}
        onInsertImageUrl={handleInsertImageUrl}
        language={language}
        theme={theme}
      />

      {/* File Attachment Modal (From Local Folder or Web/Cloud URL) */}
      <FileAttachmentModal
        isOpen={isFileAttachmentModalOpen}
        onClose={() => setIsFileAttachmentModalOpen(false)}
        onInsertAttachmentFile={handleInsertAttachmentFile}
        onInsertAttachmentUrl={handleInsertAttachmentUrl}
        language={language}
        theme={theme}
      />
    </div>
  );
};
