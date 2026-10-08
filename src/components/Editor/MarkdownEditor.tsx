import React, { useRef, useMemo, useState } from 'react';
import { FileText, CheckSquare, Link2, Plus } from 'lucide-react';
import type { Note } from '../../types';
import { searchWikiLinkSuggestions } from '../../utils/wikilinks';

interface MarkdownEditorProps {
  content: string;
  onChange: (markdown: string) => void;
  readOnly?: boolean;
  isRtl?: boolean;
  isLight?: boolean;
  availableNotes?: Note[];
  currentNoteId?: string;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  content,
  onChange,
  readOnly = false,
  isRtl = false,
  isLight = false,
  availableNotes = [],
  currentNoteId,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // WikiLink [[ autocomplete state
  const [showWikiSuggestions, setShowWikiSuggestions] = useState(false);
  const [wikiQuery, setWikiQuery] = useState('');
  const [wikiTriggerIndex, setWikiTriggerIndex] = useState(-1);
  const [selectedWikiIndex, setSelectedWikiIndex] = useState(0);

  const wikiSuggestions = useMemo(() => {
    if (!showWikiSuggestions) return [];
    return searchWikiLinkSuggestions(wikiQuery, availableNotes, currentNoteId);
  }, [showWikiSuggestions, wikiQuery, availableNotes, currentNoteId]);

  const totalItemsCount = wikiSuggestions.length + (wikiQuery.trim() ? 1 : 0);

  const linesCount = useMemo(() => {
    return (content || '').split('\n').length;
  }, [content]);

  // Insert selected WikiLink into textarea
  const insertWikiLink = (title: string) => {
    if (!textareaRef.current || wikiTriggerIndex === -1) return;
    const textarea = textareaRef.current;
    const currentCursor = textarea.selectionStart;

    const before = content.substring(0, wikiTriggerIndex);
    // If the text after cursor has closing brackets from previous [[...]], replace them
    const textRest = content.substring(currentCursor);
    const after = textRest.replace(/^\]+/, '');
    const replacement = `[[${title}]]`;
    const updated = before + replacement + after;

    onChange(updated);
    setShowWikiSuggestions(false);

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = before.length + replacement.length;
    }, 10);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart;
    onChange(val);

    // Check if cursor is immediately following [[ or inside [[...
    const beforeCursor = val.substring(0, cursorPos);
    const lastOpenIndex = beforeCursor.lastIndexOf('[[');
    if (lastOpenIndex !== -1) {
      const textAfter = beforeCursor.substring(lastOpenIndex + 2);
      const cleanTextAfter = textAfter.replace(/\]+$/, '');
      if (!cleanTextAfter.includes('\n')) {
        setWikiQuery(cleanTextAfter);
        setWikiTriggerIndex(lastOpenIndex);
        setShowWikiSuggestions(true);
        setSelectedWikiIndex(0);
        return;
      }
    }
    setShowWikiSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);
    const isMetaOrCtrl = e.ctrlKey || e.metaKey;

    // Handle WikiLink popup keyboard navigation
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

    // Tab key: Indent 2 spaces (or Shift+Tab outdent)
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        // Outdent
        const before = content.substring(0, start);
        const lineStart = before.lastIndexOf('\n') + 1;
        if (content.substring(lineStart, lineStart + 2) === '  ') {
          const updated = content.substring(0, lineStart) + content.substring(lineStart + 2);
          onChange(updated);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = Math.max(start - 2, lineStart);
          }, 0);
        }
      } else {
        const updated = content.substring(0, start) + '  ' + content.substring(end);
        onChange(updated);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        }, 0);
      }
      return;
    }

    // Enter key: smart list continuation (- [ ], -, 1.)
    if (e.key === 'Enter') {
      const before = content.substring(0, start);
      const currentLineStart = before.lastIndexOf('\n') + 1;
      const currentLine = before.substring(currentLineStart);

      // Empty checkbox list item -> clear list prefix
      if (/^-\s*\[[ x]\]\s*$/.test(currentLine)) {
        e.preventDefault();
        const updated = content.substring(0, currentLineStart) + content.substring(start);
        onChange(updated);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = currentLineStart;
        }, 0);
        return;
      }

      // Checkbox continuation
      if (/^-\s*\[[ x]\]\s+/.test(currentLine)) {
        e.preventDefault();
        const insertion = '\n- [ ] ';
        const updated = content.substring(0, start) + insertion + content.substring(end);
        onChange(updated);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + insertion.length;
        }, 0);
        return;
      }

      // Empty bullet -> clear bullet
      if (/^[-*]\s*$/.test(currentLine)) {
        e.preventDefault();
        const updated = content.substring(0, currentLineStart) + content.substring(start);
        onChange(updated);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = currentLineStart;
        }, 0);
        return;
      }

      // Bullet continuation
      const bulletMatch = currentLine.match(/^(\s*[-*]\s+)/);
      if (bulletMatch) {
        e.preventDefault();
        const insertion = '\n' + bulletMatch[1];
        const updated = content.substring(0, start) + insertion + content.substring(end);
        onChange(updated);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + insertion.length;
        }, 0);
        return;
      }

      // Numbered list continuation
      const numMatch = currentLine.match(/^(\s*)(\d+)\.\s+/);
      if (numMatch) {
        // If empty numbered line -> clear
        if (/^\s*\d+\.\s*$/.test(currentLine)) {
          e.preventDefault();
          const updated = content.substring(0, currentLineStart) + content.substring(start);
          onChange(updated);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = currentLineStart;
          }, 0);
          return;
        }
        e.preventDefault();
        const nextNum = parseInt(numMatch[2], 10) + 1;
        const insertion = `\n${numMatch[1]}${nextNum}. `;
        const updated = content.substring(0, start) + insertion + content.substring(end);
        onChange(updated);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + insertion.length;
        }, 0);
        return;
      }
    }

    // Ctrl+B: Bold
    if (isMetaOrCtrl && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      const replacement = `**${selected || 'bold text'}**`;
      const updated = content.substring(0, start) + replacement + content.substring(end);
      onChange(updated);
      setTimeout(() => {
        textarea.selectionStart = start + 2;
        textarea.selectionEnd = start + replacement.length - 2;
      }, 0);
    }

    // Ctrl+I: Italic
    if (isMetaOrCtrl && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      const replacement = `*${selected || 'italic text'}*`;
      const updated = content.substring(0, start) + replacement + content.substring(end);
      onChange(updated);
      setTimeout(() => {
        textarea.selectionStart = start + 1;
        textarea.selectionEnd = start + replacement.length - 1;
      }, 0);
    }

    // Ctrl+L / Cmd+L: Link (Ctrl+K is exclusively for Command Palette)
    if (isMetaOrCtrl && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      const replacement = `[${selected || 'Link Title'}](https://)`;
      const updated = content.substring(0, start) + replacement + content.substring(end);
      onChange(updated);
      setTimeout(() => {
        textarea.selectionStart = start + replacement.length - 9;
        textarea.selectionEnd = start + replacement.length - 1;
      }, 0);
    }

    // Ctrl+Shift+S / Ctrl+Shift+X: Strikethrough
    if (isMetaOrCtrl && e.shiftKey && (e.key.toLowerCase() === 's' || e.key.toLowerCase() === 'x')) {
      e.preventDefault();
      const replacement = `~~${selected || 'strikethrough text'}~~`;
      const updated = content.substring(0, start) + replacement + content.substring(end);
      onChange(updated);
      setTimeout(() => {
        textarea.selectionStart = start + 2;
        textarea.selectionEnd = start + replacement.length - 2;
      }, 0);
    }

    // Ctrl+Shift+H: Highlight
    if (isMetaOrCtrl && e.shiftKey && e.key.toLowerCase() === 'h') {
      e.preventDefault();
      const replacement = `==${selected || 'highlighted text'}==`;
      const updated = content.substring(0, start) + replacement + content.substring(end);
      onChange(updated);
      setTimeout(() => {
        textarea.selectionStart = start + 2;
        textarea.selectionEnd = start + replacement.length - 2;
      }, 0);
    }
  };

  return (
    <div
      className={`flex h-full w-full font-mono text-[13px] overflow-hidden transition-colors ${
        isLight ? 'bg-white text-slate-900' : 'bg-[#161d2b] text-slate-100'
      }`}
    >
      {/* Line Numbers */}
      <div
        className={`w-12 shrink-0 select-none py-4 pr-3 text-right font-mono text-xs transition-colors ${
          isLight
            ? 'bg-slate-50 text-slate-400 border-r border-slate-200'
            : 'bg-[#121824] text-slate-600 border-r border-slate-800/80'
        }`}
      >
        {Array.from({ length: Math.max(linesCount, 1) }).map((_, i) => (
          <div key={i} className="leading-6">
            {i + 1}
          </div>
        ))}
      </div>

      {/* Textarea */}
      <div className="flex-1 relative h-full">
        {/* Floating WikiLink Suggestion Dropdown */}
        {showWikiSuggestions && (wikiSuggestions.length > 0 || wikiQuery.trim().length > 0) && (
          <div
            className={`absolute left-4 top-4 z-40 w-80 rounded-xl border shadow-2xl overflow-hidden text-xs animate-in fade-in duration-100 ${
              isLight
                ? 'bg-white border-blue-400 text-slate-900 shadow-xl'
                : 'bg-[#1e2739] border-blue-500/60 text-slate-100 shadow-2xl'
            }`}
          >
            <div
              className={`px-3 py-1.5 border-b text-[10px] uppercase font-bold flex items-center justify-between ${
                isLight
                  ? 'bg-blue-50/80 border-slate-200 text-blue-700'
                  : 'bg-[#161d2b] border-slate-700/80 text-blue-400'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Link2 className="w-3 h-3 text-blue-500" />
                <span>Tautkan Catatan ([[WikiLink]])</span>
              </span>
              <kbd
                className={`px-1.5 py-0.5 rounded text-[9px] ${
                  isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-400'
                }`}
              >
                ↵ / Tab
              </kbd>
            </div>
            <div className="max-h-56 overflow-y-auto custom-scrollbar divide-y divide-slate-700/20">
              {wikiSuggestions.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertWikiLink(item.title);
                  }}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 transition ${
                    idx === selectedWikiIndex
                      ? 'bg-blue-600 text-white font-medium'
                      : isLight
                      ? 'text-slate-800 hover:bg-slate-100'
                      : 'text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {item.is_todo ? (
                      <CheckSquare
                        className={`w-3.5 h-3.5 shrink-0 ${idx === selectedWikiIndex ? 'text-white' : 'text-amber-400'}`}
                      />
                    ) : (
                      <FileText
                        className={`w-3.5 h-3.5 shrink-0 ${idx === selectedWikiIndex ? 'text-white' : 'text-blue-400'}`}
                      />
                    )}
                    <span className="truncate">{item.title || 'Untitled'}</span>
                  </div>
                </button>
              ))}

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
                  <span className="truncate">Tautkan: "[[{wikiQuery.trim()}]]"</span>
                </button>
              )}

              {wikiSuggestions.length === 0 && !wikiQuery.trim() && (
                <div
                  className={`p-3 text-center text-xs ${
                    isLight ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  Ketik nama catatan untuk mencari atau menautkan
                </div>
              )}
            </div>
          </div>
        )}

        <textarea
          ref={textareaRef}
          dir={isRtl ? 'rtl' : 'auto'}
          value={content}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          readOnly={readOnly}
          spellCheck={false}
          placeholder="Tulis catatan Anda dalam format Markdown... (Ketik [[ untuk menautkan catatan lain)"
          className={`h-full w-full resize-none bg-transparent p-4 focus:outline-none leading-6 font-mono select-text transition-colors ${
            isLight
              ? 'text-slate-900 placeholder:text-slate-400'
              : 'text-slate-100 placeholder:text-slate-600'
          }`}
        />
      </div>
    </div>
  );
};
