import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Code,
  Copy,
  Check,
  X,
  FileCode2,
  FileText,
  Sparkles,
  Layers,
  ChevronRight,
  Eye,
} from 'lucide-react';
import {
  formatHtmlClean,
  formatMarkdownClean,
  FormattedSourceLine,
} from '../../utils/sourceFormatter';
import type { AppLanguage } from '../../types';

interface SourceInspectorProps {
  htmlContent: string;
  markdownContent: string;
  activeBlockIndex: number | null;
  activeBlockTag?: string | null;
  isLight?: boolean;
  language?: AppLanguage;
  onShowToast?: (message: string, type?: 'success' | 'info') => void;
  onClose?: () => void;
  onSelectBlock?: (blockIndex: number) => void;
}

export const SourceInspector: React.FC<SourceInspectorProps> = ({
  htmlContent,
  markdownContent,
  activeBlockIndex,
  activeBlockTag,
  isLight = false,
  language = 'id',
  onShowToast,
  onClose,
  onSelectBlock,
}) => {
  const [sourceMode, setSourceMode] = useState<'html' | 'markdown'>('html');
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const isId = language === 'id';

  // Format source lines based on active mode
  const { lines, fullText, blockLineRanges, blockCount } = useMemo(() => {
    if (sourceMode === 'html') {
      return formatHtmlClean(htmlContent);
    } else {
      return formatMarkdownClean(markdownContent);
    }
  }, [sourceMode, htmlContent, markdownContent]);

  // Handle fast copy to clipboard
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);

      const msg = isId
        ? `Kode sumber ${sourceMode.toUpperCase()} berhasil disalin ke papan klip!`
        : `${sourceMode.toUpperCase()} source code copied to clipboard!`;
      onShowToast?.(msg, 'success');
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = fullText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
      onShowToast?.(isId ? 'Kode berhasil disalin!' : 'Code copied!', 'success');
    }
  };

  // Cursor position synchronisation: Auto-scroll active block into view
  useEffect(() => {
    if (activeBlockIndex === null || activeBlockIndex === undefined) return;
    const range = blockLineRanges[activeBlockIndex];
    if (!range) return;

    const targetEl = lineRefs.current[range.startLine];
    if (targetEl && containerRef.current) {
      targetEl.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [activeBlockIndex, blockLineRanges]);

  // Syntax highlighting for HTML lines
  const renderHtmlSyntax = (content: string) => {
    if (!content) return <span>&nbsp;</span>;

    // Fast regex tokenizer for HTML tags, attributes, and text
    const parts: React.ReactNode[] = [];
    const tagRegex = /(<\/?[a-zA-Z0-9\-]+)([^>]*?)(\/?>)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tagRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`} className={isLight ? 'text-slate-800' : 'text-slate-200'}>
            {content.substring(lastIndex, match.index)}
          </span>
        );
      }

      const [fullMatch, tagName, attrs, closing] = match;

      // Render tag name
      parts.push(
        <span key={`tag-${match.index}`} className={isLight ? 'text-indigo-600 font-medium' : 'text-purple-400 font-medium'}>
          {tagName}
        </span>
      );

      // Render attributes
      if (attrs) {
        const attrRegex = /([a-zA-Z0-9\-]+)(=)(["'][^"']*["'])/g;
        let lastAttrIndex = 0;
        let attrMatch: RegExpExecArray | null;

        while ((attrMatch = attrRegex.exec(attrs)) !== null) {
          if (attrMatch.index > lastAttrIndex) {
            parts.push(<span key={`aspace-${match.index}-${lastAttrIndex}`}>{attrs.substring(lastAttrIndex, attrMatch.index)}</span>);
          }
          parts.push(
            <span key={`aname-${match.index}-${attrMatch.index}`} className={isLight ? 'text-amber-600' : 'text-amber-300'}>
              {attrMatch[1]}
            </span>
          );
          parts.push(<span key={`aeq-${match.index}-${attrMatch.index}`} className="text-slate-400">=</span>);
          parts.push(
            <span key={`aval-${match.index}-${attrMatch.index}`} className={isLight ? 'text-emerald-600' : 'text-emerald-400'}>
              {attrMatch[3]}
            </span>
          );
          lastAttrIndex = attrMatch.index + attrMatch[0].length;
        }

        if (lastAttrIndex < attrs.length) {
          parts.push(<span key={`atail-${match.index}`}>{attrs.substring(lastAttrIndex)}</span>);
        }
      }

      // Closing bracket > or />
      parts.push(
        <span key={`close-${match.index}`} className={isLight ? 'text-indigo-600 font-medium' : 'text-purple-400 font-medium'}>
          {closing}
        </span>
      );

      lastIndex = match.index + fullMatch.length;
    }

    if (lastIndex < content.length) {
      parts.push(
        <span key={`tail-${lastIndex}`} className={isLight ? 'text-slate-800' : 'text-slate-200'}>
          {content.substring(lastIndex)}
        </span>
      );
    }

    return parts;
  };

  // Syntax highlighting for Markdown lines
  const renderMarkdownSyntax = (content: string) => {
    if (!content) return <span>&nbsp;</span>;

    // Heading
    if (/^#{1,6}\s/.test(content)) {
      return <span className={isLight ? 'text-blue-700 font-bold' : 'text-blue-400 font-bold'}>{content}</span>;
    }
    // Table line
    if (/^\|.+\|/.test(content)) {
      return <span className={isLight ? 'text-cyan-800 font-mono' : 'text-cyan-300 font-mono'}>{content}</span>;
    }
    // List item
    if (/^[-*+]\s|^[0-9]+\.\s/.test(content)) {
      return (
        <span>
          <span className={isLight ? 'text-amber-700 font-bold' : 'text-amber-400 font-bold'}>
            {content.match(/^[-*+]\s|^[0-9]+\.\s/)?.[0]}
          </span>
          <span className={isLight ? 'text-slate-800' : 'text-slate-200'}>
            {content.replace(/^[-*+]\s|^[0-9]+\.\s/, '')}
          </span>
        </span>
      );
    }
    // Blockquote
    if (/^>\s/.test(content)) {
      return <span className={isLight ? 'text-slate-600 italic' : 'text-slate-400 italic'}>{content}</span>;
    }
    // Code fence
    if (/^```/.test(content)) {
      return <span className={isLight ? 'text-pink-700 font-mono font-semibold' : 'text-pink-400 font-mono font-semibold'}>{content}</span>;
    }

    return <span className={isLight ? 'text-slate-800' : 'text-slate-200'}>{content}</span>;
  };

  return (
    <div
      className={`h-full w-full flex flex-col font-mono text-xs select-none transition-colors border-l ${
        isLight
          ? 'bg-[#f8fafc] text-slate-800 border-slate-200'
          : 'bg-[#151c28] text-slate-200 border-slate-700/80'
      }`}
    >
      {/* Header Bar */}
      <div
        className={`px-3 py-2 border-b flex items-center justify-between gap-2 shrink-0 ${
          isLight
            ? 'bg-slate-100 border-slate-200 text-slate-700'
            : 'bg-[#182130] border-slate-700/80 text-slate-300'
        }`}
      >
        {/* Left: Title & Mode Toggle */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 font-bold text-xs shrink-0">
            <Code className="w-4 h-4 text-blue-500 shrink-0" />
            <span className="hidden sm:inline">
              {isId ? 'Inspektur Kode' : 'Source Inspector'}
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold ${
              isLight ? 'bg-slate-200 text-slate-600' : 'bg-slate-800 text-slate-400'
            }`}>
              {isId ? 'Hanya-Baca' : 'Read-Only'}
            </span>
          </div>

          {/* Mode Switcher Tabs */}
          <div className={`flex items-center rounded p-0.5 border ${
            isLight ? 'bg-white border-slate-200' : 'bg-[#111926] border-slate-700/70'
          }`}>
            <button
              type="button"
              onClick={() => setSourceMode('html')}
              title={isId ? 'Tampilkan HTML Bersih' : 'View Clean HTML'}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition flex items-center gap-1 ${
                sourceMode === 'html'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileCode2 className="w-3 h-3" />
              <span>HTML</span>
            </button>
            <button
              type="button"
              onClick={() => setSourceMode('markdown')}
              title={isId ? 'Tampilkan Representasi Markdown' : 'View Markdown Representation'}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition flex items-center gap-1 ${
                sourceMode === 'markdown'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3 h-3" />
              <span>MD</span>
            </button>
          </div>
        </div>

        {/* Right: Active Block Indicator, Copy Code, Close */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Active Block Indicator */}
          {activeBlockIndex !== null && (
            <div
              className={`hidden md:flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-mono transition animate-in fade-in duration-150 ${
                isLight
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-blue-950/50 border-blue-800/80 text-blue-300'
              }`}
            >
              <Sparkles className="w-3 h-3 text-blue-400 shrink-0" />
              <span>
                &lt;{(activeBlockTag || 'block').toLowerCase()}&gt;
              </span>
            </div>
          )}

          {/* Fast "Salin Kode" (Copy Code) Button with Success Indicator */}
          <button
            type="button"
            onClick={handleCopyCode}
            title={isId ? 'Salin seluruh kode sumber ke papan klip' : 'Copy entire source code to clipboard'}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-semibold transition shrink-0 active:scale-95 ${
              copied
                ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/50'
                : isLight
                ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-xs'
                : 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border-blue-500/40'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-emerald-400 whitespace-nowrap">
                  {isId ? 'Kode Disalin!' : 'Copied!'}
                </span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="whitespace-nowrap">
                  {isId ? 'Salin Kode' : 'Copy Code'}
                </span>
              </>
            )}
          </button>

          {/* Close Split Inspector Button */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              title={isId ? 'Tutup Inspektur Kode' : 'Close Source Inspector'}
              className={`p-1 rounded transition ${
                isLight
                  ? 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'
                  : 'hover:bg-slate-700/80 text-slate-400 hover:text-white'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Code Viewer Body with Line Numbers & Synchronized Highlighting */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar select-text flex flex-col"
      >
        <div className="min-w-full inline-block py-2">
          {lines.map((line) => {
            const isCurrentBlock =
              activeBlockIndex !== null &&
              activeBlockIndex !== undefined &&
              line.blockIndex === activeBlockIndex;

            return (
              <div
                key={line.lineNumber}
                ref={(el) => {
                  lineRefs.current[line.lineNumber] = el;
                }}
                onClick={() => {
                  if (line.blockIndex !== null && onSelectBlock) {
                    onSelectBlock(line.blockIndex);
                  }
                }}
                className={`flex items-stretch text-[12px] leading-5 transition-colors group ${
                  line.blockIndex !== null ? 'cursor-pointer' : ''
                } ${
                  isCurrentBlock
                    ? isLight
                      ? 'bg-blue-100/80 border-l-3 border-blue-600 shadow-xs'
                      : 'bg-blue-900/30 border-l-3 border-blue-400'
                    : isLight
                    ? 'hover:bg-slate-100 border-l-3 border-transparent'
                    : 'hover:bg-slate-800/40 border-l-3 border-transparent'
                }`}
              >
                {/* Line Number Gutter */}
                <div
                  className={`w-11 shrink-0 select-none text-right pr-3 font-mono text-[11px] py-0.5 border-r transition-colors ${
                    isCurrentBlock
                      ? isLight
                        ? 'text-blue-700 font-bold border-blue-200 bg-blue-100/50'
                        : 'text-blue-300 font-bold border-blue-800/60 bg-blue-950/40'
                      : isLight
                      ? 'text-slate-400 border-slate-200/80 bg-slate-50/50'
                      : 'text-slate-600 border-slate-800/80 bg-[#121824]/40'
                  }`}
                >
                  {line.lineNumber}
                </div>

                {/* Line Code Content with Syntax Highlighting */}
                <div
                  className={`flex-1 pl-3 pr-4 py-0.5 font-mono whitespace-pre overflow-x-visible transition-colors ${
                    isCurrentBlock
                      ? isLight
                        ? 'font-medium text-slate-950'
                        : 'font-medium text-white'
                      : isLight
                      ? 'text-slate-800'
                      : 'text-slate-200'
                  }`}
                >
                  {sourceMode === 'html'
                    ? renderHtmlSyntax(line.content)
                    : renderMarkdownSyntax(line.content)}
                </div>

                {/* Block tag badge on hover or active */}
                {line.isBlockStart && line.blockTag && (
                  <div
                    className={`select-none px-1.5 py-0.2 mr-2 text-[10px] font-mono uppercase rounded transition opacity-0 group-hover:opacity-100 ${
                      isCurrentBlock
                        ? 'opacity-100 bg-blue-600 text-white font-bold'
                        : isLight
                        ? 'bg-slate-200 text-slate-600'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {line.blockTag}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Status Bar */}
      <div
        className={`px-3 py-1.5 border-t text-[11px] flex items-center justify-between shrink-0 font-sans ${
          isLight
            ? 'bg-slate-100 border-slate-200 text-slate-500'
            : 'bg-[#121824] border-slate-800 text-slate-400'
        }`}
      >
        <div className="flex items-center gap-2">
          <span>{lines.length} {isId ? 'baris' : 'lines'}</span>
          <span>•</span>
          <span>{blockCount} {isId ? 'blok elemen' : 'block elements'}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>{isId ? 'Sinkronisasi Otomatis' : 'Live Sync'}</span>
        </div>
      </div>
    </div>
  );
};
