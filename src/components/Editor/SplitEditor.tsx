import React from 'react';
import { MarkdownEditor } from './MarkdownEditor';
import { markdownToHtml } from '../../utils/markdown';
import type { Note } from '../../types';

interface SplitEditorProps {
  content: string;
  onChange: (markdown: string) => void;
  readOnly?: boolean;
  isRtl?: boolean;
  isLight?: boolean;
  onOpenWikiLink?: (targetTitle: string) => void;
  availableNotes?: Note[];
  currentNoteId?: string;
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
}) => {
  const renderedHtml = React.useMemo(() => {
    return markdownToHtml(content, { theme: isLight ? 'light' : 'dark', direction: isRtl ? 'rtl' : 'ltr' });
  }, [content, isRtl, isLight]);

  // Allow clicking checklist checkboxes or WikiLinks in Live Preview!
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
        const updated = content.replace(/^(-\s*\[[ x]\])/gim, (fullMatch) => {
          matchIndex++;
          if (matchIndex === index) {
            return fullMatch.includes('x') ? '- [ ]' : '- [x]';
          }
          return fullMatch;
        });
        onChange(updated);
      }
    }
  };

  return (
    <div className={`flex h-full w-full divide-x transition-colors ${isLight ? 'divide-slate-200' : 'divide-slate-800'}`}>
      {/* Left Pane: Markdown Source Editor */}
      <div className="flex-1 h-full overflow-hidden">
        <MarkdownEditor
          content={content}
          onChange={onChange}
          readOnly={readOnly}
          isRtl={isRtl}
          isLight={isLight}
          availableNotes={availableNotes}
          currentNoteId={currentNoteId}
        />
      </div>

      {/* Right Pane: Qalam Live Rendered Preview */}
      <div
        dir={isRtl ? 'rtl' : 'auto'}
        onClick={handlePreviewClick}
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
