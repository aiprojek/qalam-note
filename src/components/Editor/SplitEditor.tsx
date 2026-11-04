import React, { useRef } from 'react';
import { MarkdownEditor } from './MarkdownEditor';
import { markdownToHtml } from '../../utils/markdown';
import type { Note, AppLanguage } from '../../types';

interface SplitEditorProps {
  content: string;
  onChange: (markdown: string) => void;
  readOnly?: boolean;
  isRtl?: boolean;
  isLight?: boolean;
  onOpenWikiLink?: (targetTitle: string) => void;
  availableNotes?: Note[];
  currentNoteId?: string;
  language?: AppLanguage;
  onShowToast?: (message: string, type?: 'success' | 'info') => void;
}

export const SplitEditor: React.FC<SplitEditorProps> = ({
  content,
  onChange,
  readOnly = false,
  isRtl = false,
  isLight = false,
  onOpenWikiLink,
  availableNotes = [],
  currentNoteId,
  language = 'id',
  onShowToast,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);

  // Lock flag with debounce to prevent infinite loop recursion between Editor & Preview
  const isScrollingSourceRef = useRef<'editor' | 'preview' | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setScrollingSource = (source: 'editor' | 'preview') => {
    isScrollingSourceRef.current = source;
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingSourceRef.current = null;
    }, 220);
  };

  // Render HTML with [data-line] line markers for split view synchronisation
  const renderedHtml = React.useMemo(() => {
    return markdownToHtml(content, {
      theme: isLight ? 'light' : 'dark',
      direction: isRtl ? 'rtl' : 'ltr',
      withLineNumbers: true,
    });
  }, [content, isRtl, isLight]);

  // Synchronise Editor ➔ Preview when cursor moves (onKeyUp, onClick, selectionchange)
  const handleEditorCursorActivity = (cursorLine: number) => {
    if (isScrollingSourceRef.current === 'preview') return;
    setScrollingSource('editor');

    const preview = previewContainerRef.current;
    if (!preview) return;

    // Find HTML element with data-line matching or closest preceding cursorLine
    const elements = Array.from(preview.querySelectorAll<HTMLElement>('[data-line]'));
    let matchedBlock: HTMLElement | null = null;

    for (const el of elements) {
      const line = parseInt(el.getAttribute('data-line') || '0', 10);
      if (line <= cursorLine) {
        matchedBlock = el;
      } else {
        break;
      }
    }

    if (matchedBlock) {
      matchedBlock.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      // Highlight active preview block
      preview.querySelectorAll('.qalam-sync-active').forEach((el) => {
        el.classList.remove('qalam-sync-active');
      });
      matchedBlock.classList.add('qalam-sync-active');
    }
  };

  // Synchronise Editor ➔ Preview when editor textarea scrolls
  const handleEditorScroll = (scrollTop: number, scrollHeight: number, clientHeight: number) => {
    if (isScrollingSourceRef.current === 'preview') return;
    setScrollingSource('editor');

    const preview = previewContainerRef.current;
    if (!preview) return;

    // Boundary conditions
    if (scrollTop <= 5) {
      preview.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }

    if (scrollTop + clientHeight >= scrollHeight - 5) {
      preview.scrollTo({ top: preview.scrollHeight, behavior: 'auto' });
      return;
    }

    // Line-based scroll calculation
    const lineHeight = 24;
    const topLine = Math.floor(scrollTop / lineHeight) + 1;

    const elements = Array.from(preview.querySelectorAll<HTMLElement>('[data-line]'));
    let matchedBlock: HTMLElement | null = null;
    for (const el of elements) {
      const line = parseInt(el.getAttribute('data-line') || '0', 10);
      if (line <= topLine) {
        matchedBlock = el;
      } else {
        break;
      }
    }

    if (matchedBlock) {
      const containerTop = preview.getBoundingClientRect().top;
      const blockTop = matchedBlock.getBoundingClientRect().top;
      const targetScroll = preview.scrollTop + (blockTop - containerTop) - 20;
      preview.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: 'auto',
      });
    } else {
      // Proportional fallback
      const ratio = scrollTop / (scrollHeight - clientHeight);
      preview.scrollTop = ratio * (preview.scrollHeight - preview.clientHeight);
    }
  };

  // Synchronise Preview ➔ Editor when preview area is scrolled
  const handlePreviewScroll = () => {
    if (isScrollingSourceRef.current === 'editor') return;
    setScrollingSource('preview');

    const preview = previewContainerRef.current;
    const textarea = textareaRef.current;
    if (!preview || !textarea) return;

    if (preview.scrollTop <= 5) {
      textarea.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }

    if (preview.scrollTop + preview.clientHeight >= preview.scrollHeight - 5) {
      textarea.scrollTo({ top: textarea.scrollHeight, behavior: 'auto' });
      return;
    }

    const containerTop = preview.getBoundingClientRect().top;
    const elements = Array.from(preview.querySelectorAll<HTMLElement>('[data-line]'));
    let topVisibleBlock: HTMLElement | null = null;

    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      if (rect.bottom >= containerTop + 24) {
        topVisibleBlock = el;
        break;
      }
    }

    if (topVisibleBlock) {
      const lineNum = parseInt(topVisibleBlock.getAttribute('data-line') || '1', 10);
      const lineHeight = 24;
      const targetScroll = Math.max(0, (lineNum - 1) * lineHeight);
      textarea.scrollTo({ top: targetScroll, behavior: 'auto' });
    } else {
      const ratio = preview.scrollTop / (preview.scrollHeight - preview.clientHeight);
      textarea.scrollTop = ratio * (textarea.scrollHeight - textarea.clientHeight);
    }
  };

  // Sync editor cursor and scroll when clicking an element in the preview
  const syncEditorToLine = (lineNum: number) => {
    setScrollingSource('preview');
    const textarea = textareaRef.current;
    if (!textarea) return;

    const lines = content.split('\n');
    let charPos = 0;
    for (let i = 0; i < lineNum - 1 && i < lines.length; i++) {
      charPos += lines[i].length + 1;
    }

    textarea.focus();
    textarea.setSelectionRange(charPos, charPos);

    const lineHeight = 24;
    const targetScroll = Math.max(0, (lineNum - 2) * lineHeight);
    textarea.scrollTo({ top: targetScroll, behavior: 'smooth' });
  };

  // Handle preview clicks: WikiLinks, Checklist checkboxes, and Bi-directional cursor navigation
  const handlePreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    // Handle WikiLinks
    const wikiLinkEl = target.closest('a[data-wikilink]');
    if (wikiLinkEl) {
      e.preventDefault();
      const targetTitle = decodeURIComponent(wikiLinkEl.getAttribute('data-wikilink') || '');
      if (targetTitle && onOpenWikiLink) {
        onOpenWikiLink(targetTitle);
        return;
      }
    }

    // Handle Checkboxes
    if (target && target.tagName.toLowerCase() === 'input' && target.getAttribute('type') === 'checkbox') {
      const container = e.currentTarget;
      const checkboxes = Array.from(container.querySelectorAll('input[type="checkbox"]'));
      const index = checkboxes.indexOf(target as HTMLInputElement);
      if (index >= 0) {
        let matchIndex = -1;
        const updated = content.replace(/^([ \t]*-\s*\[[ xX]\])/gim, (fullMatch) => {
          matchIndex++;
          if (matchIndex === index) {
            const hasX = /\[[xX]\]/.test(fullMatch);
            return hasX ? fullMatch.replace(/\[[xX]\]/, '[ ]') : fullMatch.replace(/\[ \]/, '[x]');
          }
          return fullMatch;
        });
        onChange(updated);
      }
      return;
    }

    // Bi-directional click sync: find closest [data-line] element and sync editor
    const blockEl = target.closest('[data-line]') as HTMLElement | null;
    if (blockEl) {
      const lineNum = parseInt(blockEl.getAttribute('data-line') || '1', 10);
      syncEditorToLine(lineNum);
    }
  };

  return (
    <div className={`flex h-full w-full divide-x transition-colors ${isLight ? 'divide-slate-200' : 'divide-slate-800'}`}>
      {/* Left Pane: Markdown Source Editor with bi-directional cursor and scroll callbacks */}
      <div className="flex-1 h-full overflow-hidden">
        <MarkdownEditor
          content={content}
          onChange={onChange}
          readOnly={readOnly}
          isRtl={isRtl}
          isLight={isLight}
          availableNotes={availableNotes}
          currentNoteId={currentNoteId}
          language={language}
          onShowToast={onShowToast}
          textareaRef={textareaRef}
          onCursorActivity={handleEditorCursorActivity}
          onEditorScroll={handleEditorScroll}
        />
      </div>

      {/* Right Pane: Qalam Live Rendered Preview with bi-directional scroll and click synchronization */}
      <div
        ref={previewContainerRef}
        dir={isRtl ? 'rtl' : 'auto'}
        onClick={handlePreviewClick}
        onScroll={handlePreviewScroll}
        className={`flex-1 h-full overflow-y-auto p-6 select-text custom-scrollbar transition-colors ${
          isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#1a2333] text-slate-100'
        }`}
      >
        <div className="max-w-2xl mx-auto">
          <div
            className={`prose max-w-none text-[15px] leading-relaxed ${
              isLight ? 'text-slate-900' : 'prose-invert text-slate-100'
            }`}
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        </div>
      </div>
    </div>
  );
};
