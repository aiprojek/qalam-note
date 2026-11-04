/**
 * Source code formatter and block mapper for WYSIWYG Read-Only Source Inspector.
 * Cleanly formats HTML and Markdown with line numbering, syntax categorization,
 * and precise block-to-line mapping for real-time cursor synchronisation.
 */

export interface FormattedSourceLine {
  lineNumber: number;
  content: string;
  blockIndex: number | null;
  blockTag: string;
  isBlockStart?: boolean;
  isBlockEnd?: boolean;
}

export interface BlockLineRange {
  startLine: number;
  endLine: number;
  tagName: string;
}

export interface FormattedSourceResult {
  lines: FormattedSourceLine[];
  fullText: string;
  blockCount: number;
  blockLineRanges: Record<number, BlockLineRange>;
}

/**
 * Clean unwanted editor-internal attributes from HTML elements before inspection.
 */
function cleanElementAttributes(el: Element) {
  const attrsToRemove = [
    'contenteditable',
    'spellcheck',
    'tabindex',
    'data-placeholder',
    'data-table-id',
    'data-active-cell',
    'data-selected',
  ];

  attrsToRemove.forEach((attr) => el.removeAttribute(attr));

  // Clean style attributes that are purely for WYSIWYG selection/resizing
  const style = el.getAttribute('style');
  if (style) {
    const cleanedStyle = style
      .replace(/cursor:\s*[^;]+;?/gi, '')
      .replace(/outline:\s*[^;]+;?/gi, '')
      .replace(/user-select:\s*[^;]+;?/gi, '')
      .trim();
    if (cleanedStyle) {
      el.setAttribute('style', cleanedStyle);
    } else {
      el.removeAttribute('style');
    }
  }

  // Recursively clean children
  Array.from(el.children).forEach(cleanElementAttributes);
}

/**
 * Format an element into indented clean HTML lines.
 */
function formatElementToLines(el: Element, indentLevel: number = 0): string[] {
  const indent = '  '.repeat(indentLevel);
  const tag = el.tagName.toLowerCase();

  // Self closing elements
  if (tag === 'hr') {
    return [`${indent}<hr />`];
  }
  if (tag === 'br') {
    return [`${indent}<br />`];
  }
  if (tag === 'img') {
    const src = el.getAttribute('src') || '';
    const alt = el.getAttribute('alt') || '';
    const title = el.getAttribute('title');
    const width = el.getAttribute('width');
    let imgAttrs = `src="${src}" alt="${alt}"`;
    if (title) imgAttrs += ` title="${title}"`;
    if (width) imgAttrs += ` width="${width}"`;
    return [`${indent}<img ${imgAttrs} />`];
  }

  // Build opening tag with cleaned attributes
  let openTag = `<${tag}`;
  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes[i];
    openTag += ` ${attr.name}="${attr.value}"`;
  }
  openTag += '>';
  const closeTag = `</${tag}>`;

  // Leaf or inline-only blocks (headings, short paragraphs, single line elements)
  const isLeafOrInline =
    ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'pre', 'code'].includes(tag) &&
    el.children.length === 0;

  if (isLeafOrInline) {
    const inner = el.innerHTML.trim();
    if (!inner) return [`${indent}${openTag}${closeTag}`];
    // If short and no newline, single line
    if (!inner.includes('\n') && inner.length < 100) {
      return [`${indent}${openTag}${inner}${closeTag}`];
    }
    // Multi-line code block or long paragraph
    const innerLines = inner.split('\n').map((l) => `${indent}  ${l}`);
    return [`${indent}${openTag}`, ...innerLines, `${indent}${closeTag}`];
  }

  // Pre blocks with inner code
  if (tag === 'pre') {
    const codeChild = el.querySelector('code');
    if (codeChild) {
      const lang = codeChild.className.replace('language-', '').trim();
      const codeClass = lang ? ` class="language-${lang}"` : '';
      const rawCode = codeChild.innerHTML.trim();
      const codeLines = rawCode.split('\n').map((l) => `${indent}    ${l}`);
      return [
        `${indent}<pre>`,
        `${indent}  <code${codeClass}>`,
        ...codeLines,
        `${indent}  </code>`,
        `${indent}</pre>`,
      ];
    }
  }

  // Table blocks: beautiful multi-line semantic table formatting
  if (tag === 'table') {
    const lines: string[] = [`${indent}${openTag}`];
    const thead = el.querySelector('thead');
    const tbody = el.querySelector('tbody');

    if (thead) {
      lines.push(`${indent}  <thead>`);
      const trs = Array.from(thead.querySelectorAll('tr'));
      trs.forEach((tr) => {
        lines.push(`${indent}    <tr>`);
        Array.from(tr.querySelectorAll('th, td')).forEach((cell) => {
          const cTag = cell.tagName.toLowerCase();
          const cInner = cell.innerHTML.trim();
          lines.push(`${indent}      <${cTag}>${cInner}</${cTag}>`);
        });
        lines.push(`${indent}    </tr>`);
      });
      lines.push(`${indent}  </thead>`);
    }

    if (tbody) {
      lines.push(`${indent}  <tbody>`);
      const trs = Array.from(tbody.querySelectorAll('tr'));
      trs.forEach((tr) => {
        lines.push(`${indent}    <tr>`);
        Array.from(tr.querySelectorAll('th, td')).forEach((cell) => {
          const cTag = cell.tagName.toLowerCase();
          const cInner = cell.innerHTML.trim();
          lines.push(`${indent}      <${cTag}>${cInner}</${cTag}>`);
        });
        lines.push(`${indent}    </tr>`);
      });
      lines.push(`${indent}  </tbody>`);
    } else if (!thead) {
      // Table without thead/tbody: format direct rows
      const trs = Array.from(el.querySelectorAll('tr'));
      trs.forEach((tr) => {
        lines.push(`${indent}  <tr>`);
        Array.from(tr.querySelectorAll('th, td')).forEach((cell) => {
          const cTag = cell.tagName.toLowerCase();
          const cInner = cell.innerHTML.trim();
          lines.push(`${indent}    <${cTag}>${cInner}</${cTag}>`);
        });
        lines.push(`${indent}  </tr>`);
      });
    }

    lines.push(`${indent}${closeTag}`);
    return lines;
  }

  // Lists: ul, ol
  if (tag === 'ul' || tag === 'ol') {
    const lines: string[] = [`${indent}${openTag}`];
    Array.from(el.children).forEach((child) => {
      if (child.tagName.toLowerCase() === 'li') {
        const liInner = child.innerHTML.trim();
        // Check if li contains sub-lists
        const subList = child.querySelector('ul, ol');
        if (subList) {
          const nonListClone = child.cloneNode(true) as Element;
          Array.from(nonListClone.querySelectorAll('ul, ol')).forEach((s) => s.remove());
          const directText = nonListClone.innerHTML.trim();
          lines.push(`${indent}  <li>${directText}`);
          const subLines = formatElementToLines(subList, indentLevel + 2);
          lines.push(...subLines);
          lines.push(`${indent}  </li>`);
        } else {
          lines.push(`${indent}  <li>${liInner}</li>`);
        }
      } else {
        lines.push(...formatElementToLines(child, indentLevel + 1));
      }
    });
    lines.push(`${indent}${closeTag}`);
    return lines;
  }

  // Blockquote or Details
  if (tag === 'blockquote' || tag === 'details') {
    const lines: string[] = [`${indent}${openTag}`];
    Array.from(el.children).forEach((child) => {
      lines.push(...formatElementToLines(child, indentLevel + 1));
    });
    if (el.children.length === 0 && el.innerHTML.trim()) {
      lines.push(`${indent}  <p>${el.innerHTML.trim()}</p>`);
    }
    lines.push(`${indent}${closeTag}`);
    return lines;
  }

  // Generic container div or section
  if (el.children.length > 0) {
    const lines: string[] = [`${indent}${openTag}`];
    Array.from(el.children).forEach((child) => {
      lines.push(...formatElementToLines(child, indentLevel + 1));
    });
    lines.push(`${indent}${closeTag}`);
    return lines;
  }

  // Fallback
  return [`${indent}${openTag}${el.innerHTML.trim()}${closeTag}`];
}

/**
 * Format raw WYSIWYG HTML into clean formatted source lines with block mapping.
 */
export function formatHtmlClean(rawHtml: string): FormattedSourceResult {
  const lines: FormattedSourceLine[] = [];
  const blockLineRanges: Record<number, BlockLineRange> = {};

  if (!rawHtml || !rawHtml.trim()) {
    return {
      lines: [
        {
          lineNumber: 1,
          content: '<p></p>',
          blockIndex: 0,
          blockTag: 'P',
          isBlockStart: true,
          isBlockEnd: true,
        },
      ],
      fullText: '<p></p>',
      blockCount: 1,
      blockLineRanges: { 0: { startLine: 1, endLine: 1, tagName: 'p' } },
    };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');
  const body = doc.body;

  // Extract top-level blocks
  const blocks: Element[] = [];
  Array.from(body.children).forEach((child) => {
    // If child is table-scroll-wrapper or table container, inspect the table inside
    const tableInside =
      child.tagName.toLowerCase() === 'div' &&
      (child.classList.contains('table-scroll-wrapper') ||
        child.classList.contains('table-container') ||
        child.querySelector('table'));

    if (tableInside) {
      const table = child.querySelector('table') || child;
      blocks.push(table);
    } else {
      blocks.push(child);
    }
  });

  // If no block children (e.g. bare text node), wrap in p
  if (blocks.length === 0 && body.innerHTML.trim()) {
    const p = doc.createElement('p');
    p.innerHTML = body.innerHTML;
    blocks.push(p);
  }

  let currentLine = 1;

  blocks.forEach((block, blockIndex) => {
    cleanElementAttributes(block);
    const rawTag = block.tagName.toLowerCase();
    const formattedLines = formatElementToLines(block, 0);
    const startLine = currentLine;

    formattedLines.forEach((content, idx) => {
      lines.push({
        lineNumber: currentLine,
        content,
        blockIndex,
        blockTag: rawTag.toUpperCase(),
        isBlockStart: idx === 0,
        isBlockEnd: idx === formattedLines.length - 1,
      });
      currentLine++;
    });

    const endLine = currentLine - 1;
    blockLineRanges[blockIndex] = {
      startLine,
      endLine,
      tagName: rawTag,
    };

    // Add empty separator line between blocks for readability
    if (blockIndex < blocks.length - 1) {
      lines.push({
        lineNumber: currentLine,
        content: '',
        blockIndex: null,
        blockTag: '',
      });
      currentLine++;
    }
  });

  const fullText = lines.map((l) => l.content).join('\n');

  return {
    lines,
    fullText,
    blockCount: blocks.length,
    blockLineRanges,
  };
}

/**
 * Format raw Markdown representation into mapped source lines.
 */
export function formatMarkdownClean(rawMarkdown: string): FormattedSourceResult {
  const lines: FormattedSourceLine[] = [];
  const blockLineRanges: Record<number, BlockLineRange> = {};

  if (!rawMarkdown || !rawMarkdown.trim()) {
    return {
      lines: [
        {
          lineNumber: 1,
          content: '',
          blockIndex: 0,
          blockTag: 'PARAGRAPH',
          isBlockStart: true,
          isBlockEnd: true,
        },
      ],
      fullText: '',
      blockCount: 1,
      blockLineRanges: { 0: { startLine: 1, endLine: 1, tagName: 'p' } },
    };
  }

  // Split markdown by double newlines or block boundaries
  const rawBlocks = rawMarkdown.split(/\n{2,}/);
  let currentLine = 1;

  rawBlocks.forEach((blockStr, blockIndex) => {
    const trimmed = blockStr.trim();
    if (!trimmed) return;

    let detectedTag = 'PARAGRAPH';
    if (/^#{1,6}\s/.test(trimmed)) detectedTag = 'HEADING';
    else if (/^\|.+\|/m.test(trimmed)) detectedTag = 'TABLE';
    else if (/^[-*+]\s|^[0-9]+\.\s/m.test(trimmed)) detectedTag = 'LIST';
    else if (/^>\s/m.test(trimmed)) detectedTag = 'BLOCKQUOTE';
    else if (/^```/m.test(trimmed)) detectedTag = 'CODE';
    else if (/^---|^___|^\*\*\*/.test(trimmed)) detectedTag = 'HR';

    const blockLines = blockStr.split('\n');
    const startLine = currentLine;

    blockLines.forEach((content, idx) => {
      lines.push({
        lineNumber: currentLine,
        content,
        blockIndex,
        blockTag: detectedTag,
        isBlockStart: idx === 0,
        isBlockEnd: idx === blockLines.length - 1,
      });
      currentLine++;
    });

    const endLine = currentLine - 1;
    blockLineRanges[blockIndex] = {
      startLine,
      endLine,
      tagName: detectedTag.toLowerCase(),
    };

    // Separator line between blocks
    if (blockIndex < rawBlocks.length - 1) {
      lines.push({
        lineNumber: currentLine,
        content: '',
        blockIndex: null,
        blockTag: '',
      });
      currentLine++;
    }
  });

  const fullText = lines.map((l) => l.content).join('\n');

  return {
    lines,
    fullText,
    blockCount: rawBlocks.length,
    blockLineRanges,
  };
}
