import React, { useEffect, useRef, useState, useMemo } from 'react';
import { FileText, CheckSquare, Link2, Plus } from 'lucide-react';
import { markdownToHtml, htmlToMarkdown } from '../../utils/markdown';
import { searchWikiLinkSuggestions } from '../../utils/wikilinks';
import type { Note, AppLanguage } from '../../types';

interface WYSIWYGEditorProps {
  noteId: string;
  content: string; // Markdown
  htmlContent?: string;
  onChange: (markdown: string, html: string) => void;
  readOnly?: boolean;
  isRtl?: boolean;
  language?: AppLanguage;
  isLight?: boolean;
  onOpenWikiLink?: (targetTitle: string) => void;
  availableNotes?: Note[];
  currentNoteId?: string;
}

export const WYSIWYGEditor: React.FC<WYSIWYGEditorProps> = ({
  noteId,
  content,
  htmlContent,
  onChange,
  readOnly = false,
  isRtl = false,
  language = 'id',
  isLight = false,
  onOpenWikiLink,
  availableNotes = [],
  currentNoteId,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const currentNoteIdRef = useRef<string | null>(null);
  const prevIsLightRef = useRef<boolean>(isLight);
  const lastPropContentRef = useRef<string>(content);
  const isUpdatingFromProps = useRef(false);

  // WikiLink autocomplete suggestions state
  const [showWikiSuggestions, setShowWikiSuggestions] = useState(false);
  const [wikiQuery, setWikiQuery] = useState('');
  const [selectedWikiIndex, setSelectedWikiIndex] = useState(0);
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number; left: number } | null>(null);

  const wikiSuggestions = useMemo(() => {
    if (!showWikiSuggestions) return [];
    return searchWikiLinkSuggestions(wikiQuery, availableNotes, currentNoteId || noteId);
  }, [showWikiSuggestions, wikiQuery, availableNotes, currentNoteId, noteId]);

  // Total selectable items (suggestions + optional create item)
  const totalItemsCount = wikiSuggestions.length + (wikiQuery.trim() ? 1 : 0);

  // Initialize or update content when note changes ID, theme changes, or external content update (e.g. Drawing, Voice, Template)
  useEffect(() => {
    if (!editorRef.current) return;

    const isDifferentNote = currentNoteIdRef.current !== noteId;
    const isThemeChanged = prevIsLightRef.current !== isLight;
    const isExternalChange = !isUpdatingFromProps.current && lastPropContentRef.current !== content;

    if (isDifferentNote || isThemeChanged || isExternalChange || currentNoteIdRef.current === null) {
      currentNoteIdRef.current = noteId;
      prevIsLightRef.current = isLight;
      lastPropContentRef.current = content;

      let html = isThemeChanged ? undefined : htmlContent;
      if (html && /joplin/i.test(html)) {
        html = undefined;
      }
      const initialHtml =
        html ||
        markdownToHtml(content, { theme: isLight ? 'light' : 'dark', direction: isRtl ? 'rtl' : 'ltr' });
      editorRef.current.innerHTML = initialHtml;
    }
  }, [noteId, content, htmlContent, isRtl, isLight]);

  const handleInput = () => {
    if (!editorRef.current) return;
    isUpdatingFromProps.current = true;
    const currentHtml = editorRef.current.innerHTML;
    const convertedMarkdown = htmlToMarkdown(currentHtml);
    lastPropContentRef.current = convertedMarkdown;
    onChange(convertedMarkdown, currentHtml);

    // Detect if cursor is typing [[
    checkWikiLinkTrigger();

    setTimeout(() => {
      isUpdatingFromProps.current = false;
    }, 50);
  };

  const checkWikiLinkTrigger = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !editorRef.current) {
      setShowWikiSuggestions(false);
      return;
    }

    try {
      const range = sel.getRangeAt(0);

      // 1. Direct text check if inside a TextNode
      let textBefore = '';
      if (range.startContainer.nodeType === Node.TEXT_NODE) {
        const fullText = range.startContainer.textContent || '';
        textBefore = fullText.substring(0, range.startOffset);
      }

      // 2. Fallback to block element traversal
      if (!textBefore.includes('[[')) {
        let container: Node | null = range.startContainer;
        while (container && container !== editorRef.current && container.nodeType !== Node.ELEMENT_NODE) {
          container = container.parentNode;
        }
        const blockEl = container && container !== editorRef.current ? container : editorRef.current;
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(blockEl);
        preCaretRange.setEnd(range.startContainer, range.startOffset);
        textBefore = preCaretRange.toString();
      }

      const lastOpen = textBefore.lastIndexOf('[[');
      if (lastOpen !== -1) {
        const queryWithEnd = textBefore.substring(lastOpen + 2);
        const cleanQuery = queryWithEnd.replace(/^\[+/, '').replace(/\]+$/, '');
        if (!cleanQuery.includes('\n')) {
          setWikiQuery(cleanQuery);
          setShowWikiSuggestions(true);
          setSelectedWikiIndex(0);

          // Calculate caret positioning for dropdown
          const rect = range.getBoundingClientRect();
          const editorContainer = editorRef.current.parentElement;
          if (rect && rect.top > 0 && editorContainer) {
            const containerRect = editorContainer.getBoundingClientRect();
            const top = rect.bottom - containerRect.top + editorContainer.scrollTop + 6;
            const left = Math.min(Math.max(16, rect.left - containerRect.left), containerRect.width - 330);
            setDropdownCoords({ top, left });
          } else {
            setDropdownCoords(null);
          }
          return;
        }
      }
    } catch {
      // fallback
    }

    setShowWikiSuggestions(false);
  };

  // Insert selected WikiLink into WYSIWYG editor
  const insertWikiLink = (targetTitle: string) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !editorRef.current) return;
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    const offset = range.startOffset;

    const targetEncoded = encodeURIComponent(targetTitle);
    const linkEl = document.createElement('a');
    linkEl.setAttribute('href', `#wikilink-${targetEncoded}`);
    linkEl.setAttribute('data-wikilink', targetEncoded);
    linkEl.className = isLight
      ? 'qalam-wikilink inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800 underline decoration-blue-400 underline-offset-2 transition cursor-pointer select-none'
      : 'qalam-wikilink inline-flex items-center gap-1 font-semibold text-blue-400 hover:text-blue-300 underline decoration-blue-500/60 hover:decoration-blue-300 decoration-1 underline-offset-2 transition cursor-pointer select-none';
    linkEl.innerHTML = `<span class="text-[11px] opacity-75">🔗</span><span>${targetTitle}</span>`;

    if (node && node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      const before = text.substring(0, offset);
      const lastOpen = before.lastIndexOf('[[');
      if (lastOpen !== -1) {
        // Strip any trailing ]] that the user typed or that follows the cursor
        const after = text.substring(offset).replace(/^\]+/, '');
        node.textContent = before.substring(0, lastOpen);
        const nextTextNode = document.createTextNode(after);
        const parent = node.parentNode;
        if (parent) {
          parent.insertBefore(linkEl, node.nextSibling);
          const spaceNode = document.createTextNode('\u00A0');
          parent.insertBefore(spaceNode, linkEl.nextSibling);
          parent.insertBefore(nextTextNode, spaceNode.nextSibling);

          const newRange = document.createRange();
          newRange.setStartAfter(spaceNode);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);
        }
        handleInput();
        setShowWikiSuggestions(false);
        return;
      }
    }

    // Fallback: document.execCommand
    document.execCommand('insertHTML', false, linkEl.outerHTML + '&nbsp;');
    handleInput();
    setShowWikiSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle WikiLink suggestion keyboard navigation
    if (showWikiSuggestions && totalItemsCount > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedWikiIndex((prev) => (prev + 1) % totalItemsCount);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedWikiIndex((prev) => (prev - 1 + totalItemsCount) % totalItemsCount);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (selectedWikiIndex < wikiSuggestions.length) {
          const selectedNote = wikiSuggestions[selectedWikiIndex];
          if (selectedNote) insertWikiLink(selectedNote.title);
        } else if (wikiQuery.trim()) {
          insertWikiLink(wikiQuery.trim());
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowWikiSuggestions(false);
        return;
      }
    }

    const isMetaOrCtrl = e.ctrlKey || e.metaKey;

    // Formatting shortcuts
    if (isMetaOrCtrl && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      document.execCommand('bold', false);
      handleInput();
    } else if (isMetaOrCtrl && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      document.execCommand('italic', false);
      handleInput();
    } else if (isMetaOrCtrl && e.key.toLowerCase() === 'u') {
      e.preventDefault();
      document.execCommand('underline', false);
      handleInput();
    } else if (isMetaOrCtrl && e.shiftKey && (e.key.toLowerCase() === 's' || e.key.toLowerCase() === 'x')) {
      e.preventDefault();
      document.execCommand('strikeThrough', false);
      handleInput();
    } else if (isMetaOrCtrl && e.shiftKey && e.key.toLowerCase() === 'h') {
      e.preventDefault();
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        const frag = range.extractContents();
        const mark = document.createElement('mark');
        mark.className = 'bg-amber-500/40 text-amber-200 px-1 py-0.5 rounded font-medium';
        mark.appendChild(frag);
        range.insertNode(mark);
        handleInput();
      }
    } else if (isMetaOrCtrl && e.altKey && e.key === '1') {
      e.preventDefault();
      document.execCommand('formatBlock', false, '<h1>');
      handleInput();
    } else if (isMetaOrCtrl && e.altKey && e.key === '2') {
      e.preventDefault();
      document.execCommand('formatBlock', false, '<h2>');
      handleInput();
    } else if (isMetaOrCtrl && e.altKey && e.key === '3') {
      e.preventDefault();
      document.execCommand('formatBlock', false, '<h3>');
      handleInput();
    } else if (isMetaOrCtrl && e.shiftKey && e.key === '7') {
      e.preventDefault();
      document.execCommand('insertOrderedList', false);
      handleInput();
    } else if (isMetaOrCtrl && e.shiftKey && e.key === '8') {
      e.preventDefault();
      document.execCommand('insertUnorderedList', false);
      handleInput();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        document.execCommand('outdent', false);
      } else {
        document.execCommand('indent', false);
      }
      handleInput();
    } else if (e.key === 'Enter') {
      // Smart Checklist Enter continuation
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const startNode = range.startContainer;
        const currentItem = (startNode instanceof Element ? startNode : startNode.parentElement)?.closest('.qalam-todo-item');
        if (currentItem) {
          e.preventDefault();
          const span = currentItem.querySelector('span');
          const currentText = span?.textContent?.trim() || '';

          if (!currentText || currentText === '\u00A0' || currentText === '​') {
            const p = document.createElement('p');
            p.innerHTML = '<br/>';
            currentItem.parentNode?.insertBefore(p, currentItem.nextSibling);
            currentItem.remove();

            const newRange = document.createRange();
            newRange.setStart(p, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
          } else {
            const newItem = document.createElement('div');
            newItem.className = 'qalam-todo-item flex items-center gap-2 my-1.5';
            newItem.innerHTML = '<input type="checkbox" class="qalam-todo-checkbox accent-blue-500 cursor-pointer w-4 h-4 rounded" /> <span>&nbsp;</span>';
            currentItem.parentNode?.insertBefore(newItem, currentItem.nextSibling);

            const newSpan = newItem.querySelector('span');
            if (newSpan) {
              const newRange = document.createRange();
              newRange.selectNodeContents(newSpan);
              newRange.collapse(false);
              selection.removeAllRanges();
              selection.addRange(newRange);
            }
          }
          handleInput();
        }
      }
    }
  };

  // Handle checklist checkbox clicks and web link clicks inside editor
  const handleClick = (e: React.MouseEvent) => {
    checkWikiLinkTrigger();
    const target = e.target as HTMLElement;

    // Check if user clicked an anchor link or WikiLink
    const anchor = target.closest('a') as HTMLAnchorElement | null;
    if (anchor) {
      const wikiTarget = anchor.getAttribute('data-wikilink');
      if (wikiTarget && onOpenWikiLink) {
        e.preventDefault();
        onOpenWikiLink(decodeURIComponent(wikiTarget));
        return;
      }
      if (anchor.getAttribute('href')) {
        const href = anchor.getAttribute('href')!;
        const tempA = document.createElement('a');
        tempA.href = href;
        tempA.target = '_blank';
        tempA.rel = 'noopener noreferrer';
        document.body.appendChild(tempA);
        tempA.click();
        document.body.removeChild(tempA);
        return;
      }
    }

    if (target && target.tagName.toLowerCase() === 'input' && target.getAttribute('type') === 'checkbox') {
      const checkbox = target as HTMLInputElement;
      if (checkbox.checked) {
        checkbox.setAttribute('checked', 'checked');
        const sibling = checkbox.nextElementSibling as HTMLElement | null;
        if (sibling) {
          sibling.classList.add('line-through', 'text-slate-400');
        }
      } else {
        checkbox.removeAttribute('checked');
        const sibling = checkbox.nextElementSibling as HTMLElement | null;
        if (sibling) {
          sibling.classList.remove('line-through', 'text-slate-400');
        }
      }
      handleInput();
    }
  };

  const placeholderText =
    language === 'id'
      ? 'Mulai menulis catatan Anda dalam teks kaya (WYSIWYG)...'
      : 'Start typing your note in rich text (WYSIWYG)...';

  return (
    <div className="h-full w-full relative overflow-y-auto px-4 sm:px-6 py-4 focus:outline-none custom-scrollbar bg-transparent">
      {/* Floating WikiLink Suggestion Dropdown */}
      {showWikiSuggestions && (
        <div
          style={dropdownCoords ? { top: dropdownCoords.top, left: dropdownCoords.left } : undefined}
          className={`${dropdownCoords ? 'absolute' : 'sticky top-4 left-6'} z-40 w-80 rounded-xl border shadow-2xl overflow-hidden py-1 text-xs animate-in fade-in zoom-in-95 duration-100 ${
            isLight
              ? 'bg-white border-blue-400 text-slate-900 shadow-xl'
              : 'bg-[#1e2739] border-blue-500/50 text-slate-100 shadow-2xl'
          }`}
        >
          <div
            className={`px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider border-b flex items-center justify-between ${
              isLight
                ? 'bg-blue-50/80 border-slate-200 text-blue-700'
                : 'bg-[#161d2b] border-slate-700/80 text-blue-400'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-blue-500" />
              <span>{language === 'id' ? 'Tautkan Catatan (WikiLink)' : 'Link Note (WikiLink)'}</span>
            </span>
            <kbd className={`px-1.5 py-0.5 rounded text-[9px] ${isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-400'}`}>
              ↵ / Tab
            </kbd>
          </div>
          <div className="max-h-60 overflow-y-auto custom-scrollbar divide-y divide-slate-700/30">
            {wikiSuggestions.map((item, idx) => {
              const isSelected = idx === selectedWikiIndex;
              const isCurrent = item.id === (currentNoteId || noteId);
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertWikiLink(item.title);
                  }}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 transition ${
                    isSelected
                      ? 'bg-blue-600 text-white font-medium'
                      : isLight
                      ? 'text-slate-800 hover:bg-slate-100'
                      : 'text-slate-200 hover:bg-slate-700/70'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {item.is_todo ? (
                      <CheckSquare className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-amber-400'}`} />
                    ) : (
                      <FileText className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-blue-400'}`} />
                    )}
                    <span className="truncate">{item.title}</span>
                  </div>
                  {isCurrent && (
                    <span className={`text-[10px] shrink-0 font-normal ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                      {language === 'id' ? '(saat ini)' : '(current)'}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Option to link or create new note */}
            {wikiQuery.trim() && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertWikiLink(wikiQuery.trim());
                }}
                className={`w-full px-3 py-2 text-left flex items-center gap-2 transition text-xs font-semibold ${
                  selectedWikiIndex === wikiSuggestions.length
                    ? 'bg-blue-600 text-white'
                    : isLight
                    ? 'text-blue-600 hover:bg-blue-50'
                    : 'text-blue-400 hover:bg-slate-800'
                }`}
              >
                <Plus className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                <span className="truncate">
                  {language === 'id' ? `Tautkan: "[[${wikiQuery.trim()}]]"` : `Link to: "[[${wikiQuery.trim()}]]"`}
                </span>
              </button>
            )}

            {wikiSuggestions.length === 0 && !wikiQuery.trim() && (
              <div className={`p-3 text-center text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {language === 'id' ? 'Ketik nama catatan untuk mencari atau menautkan' : 'Type note title to search or link'}
              </div>
            )}
          </div>
        </div>
      )}

      <div
        ref={editorRef}
        dir={isRtl ? 'rtl' : 'auto'}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onKeyUp={() => checkWikiLinkTrigger()}
        onClick={handleClick}
        data-placeholder={placeholderText}
        className={`min-h-full w-full outline-none text-[15px] leading-relaxed select-text font-sans empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none prose max-w-none ${
          isLight ? 'text-slate-900' : 'prose-invert text-slate-100'
        }`}
      />
    </div>
  );
};
