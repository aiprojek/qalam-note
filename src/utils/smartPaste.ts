/**
 * Qalam Note - Smart Markdown Paste Utilities
 * 
 * Provides intelligent detection and conversion for clipboard paste events:
 * 1. Automatically converts pasted raw Markdown syntax into formatted rich HTML inside the WYSIWYG editor.
 * 2. Automatically converts pasted rich HTML (from web pages, Word, Google Docs) into clean Markdown syntax inside the Markdown editor.
 * 3. Automatically wraps selected text into markdown or HTML links when a valid URL is pasted.
 * 4. Respects Shift+Paste (Ctrl+Shift+V / Cmd+Shift+V) for intentional unformatted plain-text pasting.
 */

import { markdownToHtml, htmlToMarkdown, wrapTablesWithScrollContainer } from './markdown';

/**
 * Validates whether a given string is a valid standalone web or email URL
 */
export function isValidUrl(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  // Disallow multiline strings or strings with interior whitespace
  if (/\s/.test(trimmed)) return false;
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'mailto:';
  } catch {
    return false;
  }
}

/**
 * Tests whether an HTML string contains rich semantic markup
 * (e.g. tables, headings, lists, quotes, formatted text) that should be converted to Markdown.
 */
export function isRichHtml(html: string): boolean {
  if (!html || typeof html !== 'string') return false;
  const clean = html.replace(/<!--[\s\S]*?-->/g, '').trim();
  if (!clean) return false;

  // Check for rich semantic elements
  const richElementsRegex = /<(?:table|thead|tbody|tr|th|td|h[1-6]|ul|ol|li|blockquote|strong|b|em|i|s|del|a\s+[^>]*href|pre|code|figure|figcaption|hr|details|summary)\b/i;
  return richElementsRegex.test(clean);
}

/**
 * Intelligent detector: determines whether plain-text clipboard content contains Markdown formatting.
 * Returns true if strong or multiple structural Markdown patterns are detected.
 */
export function isMarkdownText(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (trimmed.length < 2) return false;

  // 1. Markdown Headings (# Heading, ## Heading, up to ###### Heading)
  if (/(?:^|\n)#{1,6}\s+\S+/m.test(trimmed)) {
    return true;
  }

  // 2. GFM Tables with pipes and delimiter row (e.g. | Col 1 | Col 2 |\n| --- | --- |\n| Val 1 | Val 2 |)
  if (/(?:^|\n)\s*\|.+?\|\s*\r?\n\s*\|[-:\s|]+\|\s*(?:\r?\n\s*\|.+?\|\s*)+/m.test(trimmed)) {
    return true;
  }

  // 2b. Tables without edge pipes (Col 1 | Col 2\n--- | ---\nVal 1 | Val 2)
  if (/(?:^|\n)[^\n|]+\|[^\n|]+\r?\n\s*[-:\s|]+[-:]{2,}[-:\s|]*\r?\n[^\n|]+\|[^\n|]+/m.test(trimmed)) {
    return true;
  }

  // 3. Task lists / Checklists (- [ ] Task, - [x] Done, * [ ] Task)
  if (/(?:^|\n)\s*[-*+]\s+\[[ xX]\]\s+\S+/m.test(trimmed)) {
    return true;
  }

  // 4. Fenced Code Blocks (```lang\n...\n``` or ~~~lang\n...\n~~~)
  if (/(?:^|\n)(?:```|~~~)[a-zA-Z0-9_-]*\r?\n[\s\S]*?\r?\n(?:```|~~~)/m.test(trimmed) || /(?:^|\n)```[\s\S]+?```/m.test(trimmed)) {
    return true;
  }

  // 5. Blockquotes and Callouts (> Quote, > [!NOTE], > [!TIP], etc.)
  if (/(?:^|\n)>\s*(?:\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION|INFO|TODO|SUCCESS|DANGER)\]|\S+)/im.test(trimmed)) {
    return true;
  }

  // 6. LaTeX Math Blocks ($$ ... $$)
  if (/\$\$[\s\S]+?\$\$/m.test(trimmed)) {
    return true;
  }

  // 7. Horizontal Rules (---, ***, ___)
  if (/(?:^|\n)\s*(?:-{3,}|\*{3,}|_{3,})\s*(?:\r?\n|$)/m.test(trimmed)) {
    return true;
  }

  // 8. Markdown Links ([text](https://...) or ![alt](https://...))
  if (/!?\[[^\]\n]+\]\((?:https?:\/\/[^\s\)]+|attachment:[^\s\)]+|#[^\s\)]+)\)/m.test(trimmed)) {
    return true;
  }

  // 9. WikiLinks ([[Note Title]] or [[Note Title|Custom Label]])
  if (/\[\[[^\]|\n]+(?:\|[^\]\n]+)?\]\]/m.test(trimmed)) {
    return true;
  }

  // 10. Footnotes ([^1]: Definition)
  if (/(?:^|\n)\[\^[^\]]+\]:\s+\S+/m.test(trimmed)) {
    return true;
  }

  // 11. Multi-line bullet or numbered lists (at least 2 consecutive items)
  if (/(?:(?:^|\n)\s*(?:[-*+]|\d+\.|\w\.)\s+\S+[^\n]*\r?\n\s*(?:[-*+]|\d+\.|\w\.)\s+\S+)/m.test(trimmed)) {
    return true;
  }

  // 12. Strong emphasis formatting (Bold, Strikethrough, Inline Code, Inline Math)
  const hasBold = /(?:^|\s)(?:\*\*|__)(?!\s)[^\n]+?(?<!\s)(?:\*\*|__)(?:\s|[.,!?;:]|$)/m.test(trimmed);
  const hasStrike = /(?:^|\s)~~(?!\s)[^\n]+?(?<!\s)~~(?:\s|[.,!?;:]|$)/m.test(trimmed);
  const hasInlineCode = /(?:^|\s)`[^`\n]+`(?:\s|[.,!?;:]|$)/m.test(trimmed);
  const hasInlineMath = /(?:^|\s)\$[^\$\n]+?\$(?:\s|[.,!?;:]|$)/m.test(trimmed);

  if (hasBold || hasStrike || hasInlineCode || hasInlineMath) {
    return true;
  }

  return false;
}

/**
 * Converts a Markdown snippet into safe, responsive HTML for WYSIWYG editor insertion.
 * If the markdown is a single inline phrase (e.g. `**bold**`), unwraps the outer <p>...</p>
 * so it inserts naturally inside existing sentences without breaking the line.
 */
export function convertMarkdownForWysiwyg(
  markdown: string,
  options?: { theme?: 'dark' | 'light'; direction?: 'ltr' | 'rtl' }
): { html: string; isInline: boolean } {
  const isLight = options?.theme === 'light';
  const direction = options?.direction || 'ltr';

  // Check if this is a single inline snippet without newlines or block indicators
  const isSingleLine = !markdown.includes('\n');
  const isBlockStart = /^(\s*#{1,6}\s|\s*[-*+]\s|\s*\d+\.\s|\s*\|\s*|\s*>\s*|\s*```|\s*\$\$)/.test(markdown);
  const isInline = isSingleLine && !isBlockStart;

  let html = markdownToHtml(markdown, { theme: isLight ? 'light' : 'dark', direction });

  if (isInline) {
    // Strip wrapping <p ...> and </p> if present
    const pMatch = html.match(/^<p[^>]*>([\s\S]*?)<\/p>$/i);
    if (pMatch) {
      html = pMatch[1];
    }
  }

  // Wrap any tables in responsive scroll containers
  html = wrapTablesWithScrollContainer(html);

  return { html, isInline };
}

/**
 * Converts rich HTML content into clean Markdown for Markdown editor insertion.
 */
export function convertHtmlForMarkdown(html: string): string {
  return htmlToMarkdown(html);
}
