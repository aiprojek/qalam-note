import React, { useEffect, useRef, useState, useMemo } from 'react';
import { FileText, CheckSquare, Link2, Plus } from 'lucide-react';
import { markdownToHtml, htmlToMarkdown, wrapTablesWithScrollContainer } from '../../utils/markdown';
import { searchWikiLinkSuggestions } from '../../utils/wikilinks';
import { isMarkdownText, isValidUrl, convertMarkdownForWysiwyg } from '../../utils/smartPaste';
import { TableControls } from './TableControls';
import type { Note, AppLanguage } from '../../types';

export interface ActiveBlockInfo {
  index: number;
  tagName: string;
  html: string;
  text: string;
}

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
  onShowToast?: (message: string, type?: 'success' | 'info') => void;
  onActiveBlockChange?: (info: ActiveBlockInfo | null) => void;
  targetedBlockIndex?: number | null;
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
  onShowToast,
  onActiveBlockChange,
  targetedBlockIndex,
}) => {
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const currentNoteIdRef = useRef<string | null>(null);
  const prevIsLightRef = useRef<boolean>(isLight);
  const lastPropContentRef = useRef<string>(content);
  const isUpdatingFromProps = useRef(false);

  // Active Table & Cell context state
  const [activeTable, setActiveTable] = useState<HTMLTableElement | null>(null);
  const [activeCell, setActiveCell] = useState<HTMLTableCellElement | null>(null);

  // Table resizing drag state
  const resizeStateRef = useRef<{
    type: 'col' | 'row';
    table: HTMLTableElement;
    cell: HTMLTableCellElement;
    row: HTMLTableRowElement;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    colIndex: number;
  } | null>(null);

  // WikiLink autocomplete suggestions state
  const [showWikiSuggestions, setShowWikiSuggestions] = useState(false);
  const [wikiQuery, setWikiQuery] = useState('');
  const [selectedWikiIndex, setSelectedWikiIndex] = useState(0);
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number; left: number } | null>(null);
  const suggestionsListRef = useRef<HTMLDivElement>(null);

  const wikiSuggestions = useMemo(() => {
    if (!showWikiSuggestions) return [];
    return searchWikiLinkSuggestions(wikiQuery, availableNotes, currentNoteId || noteId);
  }, [showWikiSuggestions, wikiQuery, availableNotes, currentNoteId, noteId]);

  // Total selectable items (suggestions + optional create item)
  const totalItemsCount = wikiSuggestions.length + (wikiQuery.trim() ? 1 : 0);

  // Auto-scroll the dropdown list to ensure keyboard-selected item is always visible
  useEffect(() => {
    if (showWikiSuggestions && suggestionsListRef.current) {
      const container = suggestionsListRef.current;
      const buttons = container.querySelectorAll<HTMLButtonElement>('button');
      const activeEl = buttons[selectedWikiIndex];
      if (activeEl) {
        const containerTop = container.scrollTop;
        const containerHeight = container.clientHeight;
        const itemTop = activeEl.offsetTop - container.offsetTop;
        const itemBottom = itemTop + activeEl.offsetHeight;

        if (itemTop < containerTop) {
          container.scrollTop = itemTop;
        } else if (itemBottom > containerTop + containerHeight) {
          container.scrollTop = itemBottom - containerHeight;
        }
      }
    }
  }, [selectedWikiIndex, showWikiSuggestions]);

  // Reset scroll position to top when opening or switching to a different note
  useEffect(() => {
    if (editorContainerRef.current) {
      editorContainerRef.current.scrollTop = 0;
    }
  }, [noteId]);

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

      if (isDifferentNote && editorContainerRef.current) {
        editorContainerRef.current.scrollTop = 0;
      }
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
    checkActiveBlock();

    setTimeout(() => {
      isUpdatingFromProps.current = false;
    }, 50);
  };

  const focusTableCell = (targetCell: HTMLTableCellElement) => {
    const sel = window.getSelection();
    if (!sel) return;
    const range = document.createRange();
    range.selectNodeContents(targetCell);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    targetCell.focus();
    setActiveCell(targetCell);
  };

  const checkTableContext = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !editorRef.current) {
      setActiveTable(null);
      setActiveCell(null);
      return;
    }
    let node: Node | null = sel.getRangeAt(0).startContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    const cell = (node as HTMLElement | null)?.closest('th, td') as HTMLTableCellElement | null;
    const table = (node as HTMLElement | null)?.closest('table') as HTMLTableElement | null;
    if (table && editorRef.current.contains(table)) {
      setActiveTable(table);
      setActiveCell(cell);
    } else {
      setActiveTable(null);
      setActiveCell(null);
    }
  };

  const checkActiveBlock = () => {
    if (!editorRef.current || !onActiveBlockChange) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      onActiveBlockChange(null);
      return;
    }
    let node: Node | null = sel.getRangeAt(0).startContainer;
    if (!editorRef.current.contains(node)) {
      onActiveBlockChange(null);
      return;
    }

    let curr: Node | null = node;
    while (curr && curr.parentElement && curr.parentElement !== editorRef.current) {
      curr = curr.parentElement;
    }

    if (!curr || curr.parentElement !== editorRef.current) {
      onActiveBlockChange(null);
      return;
    }

    const element = curr.nodeType === Node.ELEMENT_NODE ? (curr as HTMLElement) : (curr.parentElement as HTMLElement);
    if (!element) {
      onActiveBlockChange(null);
      return;
    }

    const children = Array.from(editorRef.current.children);
    const index = children.indexOf(element);

    if (index === -1) {
      onActiveBlockChange(null);
      return;
    }

    const tableInside = element.tagName.toLowerCase() === 'table' ? element : element.querySelector('table');
    const tagName = tableInside ? 'table' : element.tagName.toLowerCase();

    onActiveBlockChange({
      index,
      tagName,
      html: element.outerHTML,
      text: element.textContent || '',
    });
  };

  // Scroll to targeted block when clicked from Source Inspector
  useEffect(() => {
    if (targetedBlockIndex === undefined || targetedBlockIndex === null || !editorRef.current) return;
    const children = Array.from(editorRef.current.children);
    const target = children[targetedBlockIndex] as HTMLElement | undefined;
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add('qalam-block-target-flash');
      setTimeout(() => {
        target.classList.remove('qalam-block-target-flash');
      }, 1500);
    }
  }, [targetedBlockIndex]);

  useEffect(() => {
    const handleSelectionChange = () => {
      checkTableContext();
      checkActiveBlock();
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [onActiveBlockChange]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (resizeStateRef.current) return;
    const target = e.target as HTMLElement;
    const cell = target.closest('th, td') as HTMLTableCellElement | null;
    if (!cell || !editorRef.current?.contains(cell)) {
      if (editorRef.current) editorRef.current.style.cursor = '';
      return;
    }

    const rect = cell.getBoundingClientRect();
    const isNearRightEdge = e.clientX >= rect.right - 6 && e.clientX <= rect.right + 4;
    const isNearBottomEdge = e.clientY >= rect.bottom - 6 && e.clientY <= rect.bottom + 4;

    if (isNearRightEdge) {
      editorRef.current.style.cursor = 'col-resize';
    } else if (isNearBottomEdge) {
      editorRef.current.style.cursor = 'row-resize';
    } else {
      editorRef.current.style.cursor = '';
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const cell = target.closest('th, td') as HTMLTableCellElement | null;
    if (!cell || !editorRef.current?.contains(cell)) return;

    const rect = cell.getBoundingClientRect();
    const isNearRightEdge = e.clientX >= rect.right - 6 && e.clientX <= rect.right + 4;
    const isNearBottomEdge = e.clientY >= rect.bottom - 6 && e.clientY <= rect.bottom + 4;

    if (isNearRightEdge || isNearBottomEdge) {
      e.preventDefault();
      e.stopPropagation();

      const row = cell.closest('tr') as HTMLTableRowElement;
      const table = cell.closest('table') as HTMLTableElement;
      if (!row || !table) return;

      const rowCells = Array.from(row.querySelectorAll('th, td'));
      const colIndex = rowCells.indexOf(cell);

      resizeStateRef.current = {
        type: isNearRightEdge ? 'col' : 'row',
        table,
        cell,
        row,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: rect.width,
        startHeight: rect.height,
        colIndex,
      };

      const onWindowMouseMove = (moveEvent: MouseEvent) => {
        const state = resizeStateRef.current;
        if (!state) return;

        if (state.type === 'col') {
          const deltaX = moveEvent.clientX - state.startX;
          const newWidth = Math.max(40, state.startWidth + deltaX);
          state.table.style.tableLayout = 'fixed';
          const allRows = state.table.querySelectorAll('tr');
          allRows.forEach((r) => {
            const c = r.children[state.colIndex] as HTMLElement | undefined;
            if (c) {
              c.style.width = `${newWidth}px`;
              c.style.minWidth = `${newWidth}px`;
            }
          });
        } else {
          const deltaY = moveEvent.clientY - state.startY;
          const newHeight = Math.max(26, state.startHeight + deltaY);
          state.row.style.height = `${newHeight}px`;
          Array.from(state.row.querySelectorAll('th, td')).forEach((c) => {
            (c as HTMLElement).style.height = `${newHeight}px`;
          });
        }
      };

      const onWindowMouseUp = () => {
        window.removeEventListener('mousemove', onWindowMouseMove);
        window.removeEventListener('mouseup', onWindowMouseUp);
        if (editorRef.current) editorRef.current.style.cursor = '';
        resizeStateRef.current = null;
        handleInput();
        checkTableContext();
      };

      window.addEventListener('mousemove', onWindowMouseMove);
      window.addEventListener('mouseup', onWindowMouseUp);
    }
  };

  const handleMouseLeave = () => {
    if (!resizeStateRef.current && editorRef.current) {
      editorRef.current.style.cursor = '';
    }
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
          setWikiQuery((prev) => {
            if (prev !== cleanQuery) {
              setSelectedWikiIndex(0);
            }
            return cleanQuery;
          });
          setShowWikiSuggestions(true);

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
        e.stopPropagation();
        setSelectedWikiIndex((prev) => (prev + 1) % totalItemsCount);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedWikiIndex((prev) => (prev - 1 + totalItemsCount) % totalItemsCount);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
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
        e.stopPropagation();
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
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        let node: Node | null = selection.getRangeAt(0).commonAncestorContainer;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;

        // Check Table navigation and auto-row creation first
        const cell = (node as HTMLElement | null)?.closest('th, td') as HTMLTableCellElement | null;
        if (cell && editorRef.current?.contains(cell)) {
          const tr = cell.closest('tr');
          const table = cell.closest('table');
          if (tr && table) {
            const allCells = Array.from(tr.querySelectorAll('th, td'));
            const cellIdx = allCells.indexOf(cell);

            if (!e.shiftKey) {
              // Tab forward
              if (cellIdx < allCells.length - 1) {
                focusTableCell(allCells[cellIdx + 1] as HTMLTableCellElement);
              } else {
                // Next row
                const nextTr = tr.nextElementSibling as HTMLTableRowElement | null;
                if (nextTr) {
                  const nextCells = Array.from(nextTr.querySelectorAll('th, td'));
                  if (nextCells.length > 0) {
                    focusTableCell(nextCells[0] as HTMLTableCellElement);
                  }
                } else if (tr.parentElement?.tagName.toLowerCase() === 'thead' && table.querySelector('tbody tr')) {
                  const firstBodyTr = table.querySelector('tbody tr') as HTMLTableRowElement;
                  const firstCell = firstBodyTr?.querySelector('th, td') as HTMLTableCellElement;
                  if (firstCell) focusTableCell(firstCell);
                } else {
                  // Last cell of table: append new row!
                  const colsCount = allCells.length;
                  const tbody = table.querySelector('tbody') || table;
                  const newTr = document.createElement('tr');
                  for (let c = 0; c < colsCount; c++) {
                    const newTd = document.createElement('td');
                    newTd.className = isLight
                      ? 'border border-slate-300 p-2 text-slate-800'
                      : 'border border-slate-700 p-2 text-slate-200';
                    newTd.innerHTML = '&nbsp;';
                    newTr.appendChild(newTd);
                  }
                  tbody.appendChild(newTr);
                  handleInput();
                  const firstNewCell = newTr.querySelector('td') as HTMLTableCellElement;
                  if (firstNewCell) focusTableCell(firstNewCell);
                }
              }
            } else {
              // Shift+Tab backward
              if (cellIdx > 0) {
                focusTableCell(allCells[cellIdx - 1] as HTMLTableCellElement);
              } else {
                const prevTr = tr.previousElementSibling as HTMLTableRowElement | null;
                if (prevTr) {
                  const prevCells = Array.from(prevTr.querySelectorAll('th, td'));
                  if (prevCells.length > 0) {
                    focusTableCell(prevCells[prevCells.length - 1] as HTMLTableCellElement);
                  }
                } else if (tr.parentElement?.tagName.toLowerCase() === 'tbody' && table.querySelector('thead tr')) {
                  const theadTr = table.querySelector('thead tr') as HTMLTableRowElement;
                  const theadCells = Array.from(theadTr?.querySelectorAll('th, td') || []);
                  if (theadCells.length > 0) {
                    focusTableCell(theadCells[theadCells.length - 1] as HTMLTableCellElement);
                  }
                }
              }
            }
            checkTableContext();
            return;
          }
        }

        // Checklist indentation
        const todoItem = (node as HTMLElement | null)?.closest('.qalam-todo-item') as HTMLElement | null;
        if (todoItem) {
          const currentIndent = parseInt(todoItem.getAttribute('data-indent') || '0', 10);
          if (!e.shiftKey) {
            const nextIndent = Math.min(currentIndent + 1, 6);
            todoItem.setAttribute('data-indent', String(nextIndent));
            todoItem.style.marginLeft = `${nextIndent * 1.5}rem`;
          } else {
            const nextIndent = Math.max(currentIndent - 1, 0);
            todoItem.setAttribute('data-indent', String(nextIndent));
            todoItem.style.marginLeft = nextIndent > 0 ? `${nextIndent * 1.5}rem` : '';
          }
          handleInput();
          return;
        }
      }

      if (!e.shiftKey) {
        document.execCommand('indent', false);
      } else {
        document.execCommand('outdent', false);
      }
      handleInput();
    } else if (isMetaOrCtrl && e.key === ']') {
      e.preventDefault();
      document.execCommand('indent', false);
      handleInput();
    } else if (isMetaOrCtrl && e.key === '[') {
      e.preventDefault();
      document.execCommand('outdent', false);
      handleInput();
    } else if (e.key === 'Enter') {
      // Smart Checklist Enter continuation
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const startNode = range.startContainer;
        const currentItem = (startNode instanceof Element ? startNode : startNode.parentElement)?.closest('.qalam-todo-item') as HTMLElement | null;
        if (currentItem) {
          e.preventDefault();
          const span = currentItem.querySelector('span');
          const currentText = span?.textContent?.trim() || '';
          const currentIndent = parseInt(currentItem.getAttribute('data-indent') || '0', 10);

          if (!currentText || currentText === '\u00A0' || currentText === '​') {
            if (currentIndent > 0) {
              // Outdent empty nested todo by 1 level
              const nextIndent = currentIndent - 1;
              currentItem.setAttribute('data-indent', String(nextIndent));
              currentItem.style.marginLeft = nextIndent > 0 ? `${nextIndent * 1.5}rem` : '';
            } else {
              // At root level: convert to normal paragraph
              const p = document.createElement('p');
              p.innerHTML = '<br/>';
              currentItem.parentNode?.insertBefore(p, currentItem.nextSibling);
              currentItem.remove();

              const newRange = document.createRange();
              newRange.setStart(p, 0);
              newRange.collapse(true);
              selection.removeAllRanges();
              selection.addRange(newRange);
            }
          } else {
            const newItem = document.createElement('div');
            newItem.className = 'qalam-todo-item flex items-center gap-2 my-1.5';
            if (currentIndent > 0) {
              newItem.setAttribute('data-indent', String(currentIndent));
              newItem.style.marginLeft = `${currentIndent * 1.5}rem`;
            }
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

  // Handle checklist checkbox clicks, table context and web link clicks inside editor
  const handleClick = (e: React.MouseEvent) => {
    checkWikiLinkTrigger();
    checkTableContext();
    checkActiveBlock();
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

  // Smart Clipboard Paste Handler:
  // 1. Files & images: bubble to parent NoteEditor
  // 2. Shift+Paste: standard unformatted plain-text
  // 3. Selection + URL: wraps selection into a link
  // 4. Raw Markdown: converts markdown syntax into rich HTML directly in WYSIWYG
  // 5. Rich HTML tables: wraps tables in responsive horizontal scroll containers
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    // 1. Pass file attachments (screenshots, images, PDFs) to NoteEditor
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
          return; // Allow bubbling to NoteEditor's handleEditorPaste
        }
      }
    }

    // 2. Allow standard plain-text paste if Shift is pressed (Ctrl+Shift+V / Cmd+Shift+V)
    const isShiftPressed = Boolean((e.nativeEvent as unknown as { shiftKey?: boolean })?.shiftKey);
    if (isShiftPressed) {
      return;
    }

    const plainText = e.clipboardData?.getData('text/plain') || '';
    const htmlData = e.clipboardData?.getData('text/html') || '';

    // 3. Smart Linkification: if user has selected text and pastes a valid URL
    const selection = window.getSelection();
    const selectedText = selection ? selection.toString().trim() : '';
    if (selectedText && isValidUrl(plainText.trim())) {
      e.preventDefault();
      const url = plainText.trim();
      const success = document.execCommand('createLink', false, url);
      if (!success && selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const a = document.createElement('a');
        a.href = url;
        a.textContent = selectedText;
        a.className = 'text-blue-500 underline hover:text-blue-600 transition-colors';
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        range.insertNode(a);
        range.setStartAfter(a);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      handleInput();
      onShowToast?.(
        language === 'id' ? 'Tautan berhasil disisipkan ke teks terpilih!' : 'Link applied to selected text!',
        'info'
      );
      return;
    }

    // 4. Smart Markdown to WYSIWYG conversion:
    // If clipboard plain text contains Markdown formatting (tables, headings, checklists, code blocks, math, etc.)
    if (isMarkdownText(plainText)) {
      e.preventDefault();
      const { html: convertedHtml } = convertMarkdownForWysiwyg(plainText, {
        theme: isLight ? 'light' : 'dark',
        direction: isRtl ? 'rtl' : 'ltr',
      });

      // Insert the converted rich HTML
      const inserted = document.execCommand('insertHTML', false, convertedHtml);
      if (!inserted && selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const temp = document.createElement('div');
        temp.innerHTML = convertedHtml;
        const frag = document.createDocumentFragment();
        let lastNode: Node | null = null;
        while (temp.firstChild) {
          lastNode = temp.firstChild;
          frag.appendChild(temp.firstChild);
        }
        range.insertNode(frag);
        if (lastNode) {
          range.setStartAfter(lastNode);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }

      handleInput();
      onShowToast?.(
        language === 'id'
          ? 'Teks format Markdown otomatis dikonversi ke tampilan WYSIWYG!'
          : 'Markdown formatted text converted to rich WYSIWYG!',
        'info'
      );
      return;
    }

    // 5. Rich HTML with tables pasted from web: ensure responsive scroll container
    if (htmlData && htmlData.includes('<table')) {
      e.preventDefault();
      const wrapped = wrapTablesWithScrollContainer(htmlData);
      document.execCommand('insertHTML', false, wrapped);
      handleInput();
      return;
    }
  };

  const placeholderText =
    language === 'id'
      ? 'Mulai menulis catatan Anda dalam teks kaya (WYSIWYG)...'
      : 'Start typing your note in rich text (WYSIWYG)...';

  return (
    <div
      ref={editorContainerRef}
      className="h-full w-full relative overflow-y-auto px-4 sm:px-6 py-4 focus:outline-none custom-scrollbar bg-transparent"
    >
      {/* Interactive Table Controls Overlay */}
      {activeTable && (
        <TableControls
          activeTable={activeTable}
          activeCell={activeCell}
          editorContainer={editorContainerRef.current}
          isLight={isLight}
          language={language}
          onTableModified={handleInput}
          onClose={() => {
            setActiveTable(null);
            setActiveCell(null);
          }}
        />
      )}

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
          <div ref={suggestionsListRef} className="max-h-60 overflow-y-auto custom-scrollbar divide-y divide-slate-700/30">
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
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        onKeyUp={(e) => {
          checkTableContext();
          checkActiveBlock();
          if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Enter', 'Tab', 'Escape'].includes(e.key)) return;
          checkWikiLinkTrigger();
        }}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        data-placeholder={placeholderText}
        className={`min-h-full w-full outline-none text-[15px] leading-relaxed select-text font-sans empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none prose max-w-none ${
          isLight ? 'text-slate-900' : 'prose-invert text-slate-100'
        }`}
      />
    </div>
  );
};
