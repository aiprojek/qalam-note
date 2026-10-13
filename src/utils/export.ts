import type { Note } from '../types';
import { markdownToHtml, htmlToMarkdown, convertEmoticonsAndShortcodes } from './markdown';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  UnderlineType,
  ImageRun,
} from 'docx';
import JSZip from 'jszip';
import html2canvas from 'html2canvas';
import * as htmlToImage from 'html-to-image';
import { isRTLText, getNoteDirection, isBlockRTL } from './rtl';

/**
 * Clean filename helper
 */
function sanitizeFileName(name: string, fallback: string = 'catatan'): string {
  const clean = (name || '').replace(/[/\\?%*:|"<>]/g, '').trim();
  return clean || fallback;
}

/**
 * Triggers browser download for a Blob
 */
function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Helper to escape HTML characters
 */
function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Strips remaining HTML tags while preserving inner text
 */
function stripHtmlTags(str: string): string {
  if (!str) return '';
  return str.replace(/<[^>]+>/g, '').trim();
}

/**
 * Cleans Markdown formatting syntax while preserving readable text
 */
function cleanMarkdownText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*\*\*(.*?)\*\*\*/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/___(.*?)___/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/==(.*?)==/g, '$1')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, target, alias) => (alias || target).trim())
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1 ($2)')
    .replace(/<[^>]+>/g, '');
}

/**
 * Downloads a note as a clean Markdown (.md) file
 */
export function exportNoteToMarkdown(note: Note): void {
  if (!note) return;
  const fileName = `${sanitizeFileName(note.title, 'catatan')}.md`;
  const blob = new Blob([note.body || ''], { type: 'text/markdown;charset=utf-8' });
  downloadBlob(blob, fileName);
}

/**
 * Downloads a note as a clean standalone HTML (.html) file
 * with full Tailwind CSS engine and complete offline embedded stylesheet.
 */
export function exportNoteToHtml(note: Note, folderTitle: string = 'Qalam Note'): void {
  if (!note) return;
  const fileName = `${sanitizeFileName(note.title, 'catatan')}.html`;
  const noteDirection = getNoteDirection(note);
  const isTitleRtl = isBlockRTL(note.title);
  const htmlBody = markdownToHtml(note.body || '', { theme: 'light', direction: noteDirection });

  const fullHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(note.title || 'Catatan Qalam')}</title>
  <!-- Tailwind CSS Engine for Browser -->
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  <style>
    /* Global Reset & Typography */
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Amiri", "Scheherazade New", "Noto Naskh Arabic", "Traditional Arabic", Tahoma, "Segoe UI", Arial, sans-serif;
      color: #0f172a;
      background: #f8fafc;
      line-height: 1.7;
      padding: 40px 20px;
      margin: 0;
    }
    .container {
      max-width: 840px;
      margin: 0 auto;
      background: #ffffff;
      padding: 40px 48px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
      border: 1px solid #e2e8f0;
    }
    .header {
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 16px;
      margin-bottom: 28px;
    }
    h1.title {
      font-size: 28px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 8px 0;
      line-height: 1.3;
    }
    .meta {
      font-size: 12px;
      color: #64748b;
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }

    /* Headings Styling */
    h1:not(.title) { font-size: 26px; font-weight: 800; color: #0f172a; margin: 28px 0 12px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
    h2 { font-size: 21px; font-weight: 700; color: #0f172a; margin: 24px 0 10px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0; }
    h3 { font-size: 18px; font-weight: 700; color: #1e293b; margin: 20px 0 8px; }
    h4 { font-size: 16px; font-weight: 600; color: #334155; margin: 16px 0 6px; }
    h5, h6 { font-size: 14px; font-weight: 600; color: #475569; margin: 14px 0 6px; }

    /* Paragraphs & Lists */
    p { margin: 10px 0; line-height: 1.7; font-size: 15px; }
    ul { list-style-type: disc; margin: 12px 0; padding-left: 24px; }
    ol { list-style-type: decimal; margin: 12px 0; padding-left: 24px; }
    li { margin: 4px 0; }

    /* Arabic & RTL */
    [dir="rtl"] {
      direction: rtl !important;
      text-align: right !important;
      unicode-bidi: isolate !important;
      font-family: "Amiri", "Scheherazade New", "Noto Naskh Arabic", "Traditional Arabic", Tahoma, "Segoe UI", Arial, sans-serif !important;
    }
    [dir="ltr"] {
      direction: ltr !important;
      text-align: left !important;
      unicode-bidi: isolate !important;
    }
    .font-arabic {
      font-family: "Amiri", "Scheherazade New", "Noto Naskh Arabic", "Traditional Arabic", Tahoma, "Segoe UI", Arial, sans-serif !important;
    }

    /* Code & Pre */
    pre, .qalam-code-block {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 14px 16px;
      overflow-x: auto;
      font-size: 13.5px;
      margin: 16px 0;
    }
    code:not(pre code) {
      font-family: ui-monospace, Consolas, monospace;
      padding: 2px 6px;
      font-size: 13px;
      color: #be123c;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
    }

    /* Blockquotes */
    blockquote {
      border-left: 4px solid #3b82f6;
      margin: 16px 0;
      padding: 10px 18px;
      color: #475569;
      background: #f8fafc;
      border-radius: 0 8px 8px 0;
      font-style: italic;
    }
    blockquote[dir="rtl"] {
      border-left: none;
      border-right: 4px solid #3b82f6;
      border-radius: 8px 0 0 8px;
      text-align: right;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 18px 0;
      font-size: 14px;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 10px 14px;
      text-align: left;
    }
    th {
      background: #f1f5f9;
      font-weight: 600;
      color: #0f172a;
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }

    /* Checklists */
    .qalam-todo-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin: 6px 0;
      font-size: 14.5px;
    }
    .qalam-todo-checkbox {
      margin-top: 4px;
      accent-color: #2563eb;
      width: 16px;
      height: 16px;
    }

    /* Callouts */
    .qalam-callout {
      margin: 16px 0;
      padding: 14px 18px;
      border-radius: 8px;
      border-left: 4px solid #3b82f6;
      background: #eff6ff;
    }
    .qalam-callout[dir="rtl"] {
      border-left: none;
      border-right: 4px solid #3b82f6;
      text-align: right;
    }

    /* Math Formulas */
    .qalam-math-block {
      margin: 16px 0;
      padding: 12px 16px;
      border-radius: 8px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      font-family: ui-monospace, monospace;
      text-align: center;
      color: #1d4ed8;
      font-size: 15px;
    }
    .qalam-math-inline {
      background: #eff6ff;
      border: 1px solid #dbeafe;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: ui-monospace, monospace;
      font-size: 13px;
      color: #1d4ed8;
    }

    /* Media & Formatting */
    img { max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0; }
    .qalam-wikilink, a { color: #2563eb; text-decoration: underline; text-underline-offset: 2px; }
    mark { background: #fef08a; color: #713f12; padding: 1px 4px; border-radius: 3px; }
    del { color: #94a3b8; }
    u { text-underline-offset: 3px; }

    /* Footer Note */
    .footer {
      margin-top: 48px;
      padding-top: 18px;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
    }
    .footer a {
      color: #2563eb;
      text-decoration: underline;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title" ${isTitleRtl ? 'dir="rtl"' : ''}>${escapeHtml(note.title || 'Catatan Tanpa Judul')}</h1>
      <div class="meta">
        <span>📂 <strong>Folder:</strong> ${escapeHtml(folderTitle)}</span>
        <span>🕒 <strong>Diperbarui:</strong> ${new Date(note.updated_time).toLocaleString()}</span>
        ${note.tags && note.tags.length > 0 ? `<span>🏷️ <strong>Tag:</strong> #${escapeHtml(note.tags.join(', #'))}</span>` : ''}
      </div>
    </div>
    <div class="body">
      ${htmlBody}
    </div>
    <div class="footer">
      Diterbitkan dari <a href="https://lam-note.aiprojek01.my.id/" target="_blank">Qalam Note</a>
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  downloadBlob(blob, fileName);
}

// -------------------------------------------------------------
// DOCX EXPORT ENGINE (Item 4: Full formatting, RTL & Tables)
// -------------------------------------------------------------

const DOCX_INLINE_TOKEN_REGEX =
  /(\*\*\*[\s\S]+?\*\*\*|\*\*[\s\S]+?\*\*|\*[\s\S]+?\*|~~[\s\S]+?~~|==[\s\S]+?==|<u>[\s\S]+?<\/u>|<ins>[\s\S]+?<\/ins>|<mark>[\s\S]+?<\/mark>|`[^`\n]+`|\$[^\$\n]+?\$|~[a-zA-Z0-9]+~|\^[a-zA-Z0-9]+\^|\[\^[a-zA-Z0-9_-]+\]|<b>[\s\S]+?<\/b>|<strong>[\s\S]+?<\/strong>|<i>[\s\S]+?<\/i>|<em>[\s\S]+?<\/em>|<s>[\s\S]+?<\/s>|<del>[\s\S]+?<\/del>|\[\[[^\]|]+(?:\|[^\]]+)?\]\]|\[[^\]]+\]\([^\)]+\))/g;

function parseDocxInline(rawText: string, defaultRtl: boolean = false): TextRun[] {
  if (!rawText) return [];

  const emoticonsReplaced = convertEmoticonsAndShortcodes(rawText);
  const parts = emoticonsReplaced.split(DOCX_INLINE_TOKEN_REGEX);
  const runs: TextRun[] = [];

  for (const part of parts) {
    if (!part) continue;

    let content = part;
    let bold = false;
    let italics = false;
    let strike = false;
    let underline: { type: typeof UnderlineType.SINGLE } | undefined = undefined;
    let highlight: 'yellow' | undefined = undefined;
    let superScript = false;
    let subScript = false;
    let isCode = false;
    let isMath = false;
    let isLink = false;

    if (part.startsWith('***') && part.endsWith('***') && part.length >= 6) {
      content = part.slice(3, -3);
      bold = true;
      italics = true;
    } else if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      content = part.slice(2, -2);
      bold = true;
    } else if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      content = part.slice(1, -1);
      italics = true;
    } else if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
      content = part.slice(2, -2);
      strike = true;
    } else if (part.startsWith('==') && part.endsWith('==') && part.length >= 4) {
      content = part.slice(2, -2);
      highlight = 'yellow';
    } else if (part.startsWith('<mark>') && part.endsWith('</mark>')) {
      content = part.slice(6, -7);
      highlight = 'yellow';
    } else if (part.startsWith('<u>') && part.endsWith('</u>')) {
      content = part.slice(3, -4);
      underline = { type: UnderlineType.SINGLE };
    } else if (part.startsWith('<ins>') && part.endsWith('</ins>')) {
      content = part.slice(5, -6);
      underline = { type: UnderlineType.SINGLE };
    } else if (part.startsWith('<b>') && part.endsWith('</b>')) {
      content = part.slice(3, -4);
      bold = true;
    } else if (part.startsWith('<strong>') && part.endsWith('</strong>')) {
      content = part.slice(8, -9);
      bold = true;
    } else if (part.startsWith('<i>') && part.endsWith('</i>')) {
      content = part.slice(3, -4);
      italics = true;
    } else if (part.startsWith('<em>') && part.endsWith('</em>')) {
      content = part.slice(4, -5);
      italics = true;
    } else if (part.startsWith('<s>') && part.endsWith('</s>')) {
      content = part.slice(3, -4);
      strike = true;
    } else if (part.startsWith('<del>') && part.endsWith('</del>')) {
      content = part.slice(5, -6);
      strike = true;
    } else if (part.startsWith('~') && part.endsWith('~') && part.length >= 3) {
      content = part.slice(1, -1);
      subScript = true;
    } else if (part.startsWith('^') && part.endsWith('^') && part.length >= 3) {
      content = part.slice(1, -1);
      superScript = true;
    } else if (part.startsWith('[^') && part.endsWith(']')) {
      content = part;
      superScript = true;
      isLink = true;
    } else if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      content = part.slice(1, -1);
      isCode = true;
    } else if (part.startsWith('$') && part.endsWith('$') && part.length >= 2) {
      content = part.slice(1, -1);
      isMath = true;
    } else if (part.startsWith('[[') && part.endsWith(']]')) {
      const inner = part.slice(2, -2);
      const pipeIdx = inner.indexOf('|');
      content = pipeIdx >= 0 ? inner.slice(pipeIdx + 1).trim() : inner.trim();
      isLink = true;
    } else {
      const linkMatch = part.match(/^\[([^\]]+)\]\(([^\)]+)\)$/);
      if (linkMatch) {
        content = `${linkMatch[1]} (${linkMatch[2]})`;
        isLink = true;
      }
    }

    content = stripHtmlTags(content);
    // Decode HTML entities
    content = content
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');

    if (!content) continue;

    const hasRtl = isRTLText(content) || defaultRtl;

    runs.push(
      new TextRun({
        text: content,
        bold,
        italics,
        strike,
        underline,
        highlight,
        superScript,
        subScript,
        font: isCode || isMath ? 'Consolas' : hasRtl ? 'Amiri' : 'Calibri',
        size: isCode || isMath ? 20 : 22,
        color: isCode ? '0369A1' : isMath ? '1D4ED8' : isLink ? '2563EB' : '0F172A',
        rightToLeft: hasRtl,
      })
    );
  }

  return runs.length > 0 ? runs : [new TextRun({ text: stripHtmlTags(rawText), size: 22 })];
}

function parseBase64Image(dataUrl: string): { data: Uint8Array; extension: 'png' | 'jpg' | 'gif' | 'bmp' | 'svg' } | null {
  try {
    const match = dataUrl.match(/^data:image\/(png|jpe?g|gif|bmp|webp|svg\+xml);base64,(.+)$/i);
    if (!match) return null;
    const rawType = match[1].toLowerCase();
    const base64Str = match[2];

    const binary = atob(base64Str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    let ext: 'png' | 'jpg' | 'gif' | 'bmp' | 'svg' = 'png';
    if (rawType === 'jpg' || rawType === 'jpeg') ext = 'jpg';
    else if (rawType === 'gif') ext = 'gif';
    else if (rawType === 'bmp') ext = 'bmp';
    else if (rawType === 'svg+xml') ext = 'svg';

    return { data: bytes, extension: ext };
  } catch {
    return null;
  }
}

function parseMarkdownTableToDocx(tableLines: string[]): Table | null {
  if (tableLines.length < 2) return null;

  const parseRowCells = (line: string): string[] => {
    return line
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());
  };

  const headerCells = parseRowCells(tableLines[0]);
  const isSeparator = /^\|[\s\-\:\.\,\|]+\|$/.test(tableLines[1]);
  const bodyStart = isSeparator ? 2 : 1;

  const rows: TableRow[] = [];

  // Header Row
  if (headerCells.length > 0) {
    rows.push(
      new TableRow({
        tableHeader: true,
        children: headerCells.map((cellText) => {
          const isCellRtl = isRTLText(cellText);
          return new TableCell({
            children: [
              new Paragraph({
                alignment: isCellRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
                bidirectional: isCellRtl,
                children: parseDocxInline(cellText, isCellRtl).map((r) => {
                  return new TextRun({ ...r, bold: true });
                }),
              }),
            ],
            shading: { type: ShadingType.CLEAR, fill: 'F1F5F9' },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
              bottom: { style: BorderStyle.SINGLE, size: 2, color: '94A3B8' },
              left: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
              right: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
            },
          });
        }),
      })
    );
  }

  // Body Rows
  for (let r = bodyStart; r < tableLines.length; r++) {
    const line = tableLines[r];
    if (/^\|[\s\-\:\.\,\|]+\|$/.test(line)) continue;
    const bodyCells = parseRowCells(line);
    if (bodyCells.length === 0) continue;

    rows.push(
      new TableRow({
        children: bodyCells.map((cellText) => {
          const isCellRtl = isRTLText(cellText);
          return new TableCell({
            children: [
              new Paragraph({
                alignment: isCellRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
                bidirectional: isCellRtl,
                children: parseDocxInline(cellText, isCellRtl),
              }),
            ],
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
              left: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
              right: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
            },
          });
        }),
      })
    );
  }

  if (rows.length === 0) return null;

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  });
}

export async function generateDocxBlob(note: Note, folderTitle: string = 'Qalam Note'): Promise<Blob> {
  const children: (Paragraph | Table)[] = [];

  const isTitleRtl = isRTLText(note.title);

  // 1. Title Paragraph
  children.push(
    new Paragraph({
      text: note.title || 'Catatan Tanpa Judul',
      heading: HeadingLevel.TITLE,
      alignment: isTitleRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
      bidirectional: isTitleRtl,
      spacing: { after: 120 },
    })
  );

  // 2. Metadata Paragraph
  const dateStr = new Date(note.updated_time || Date.now()).toLocaleString('id-ID');
  const metaText = `Folder: ${folderTitle}   |   Diperbarui: ${dateStr}${
    note.tags && note.tags.length > 0 ? `   |   Tag: #${note.tags.join(', #')}` : ''
  }`;
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: metaText,
          italics: true,
          color: '64748B',
          size: 18,
        }),
      ],
      spacing: { after: 240 },
    })
  );

  // 3. Process Note Body: convert HTML to clean markdown if HTML tags are present
  let rawBody = (note.body || '').trim();
  if (!rawBody && note.body_html) {
    rawBody = htmlToMarkdown(note.body_html);
  } else if (rawBody && /<(?:p|h[1-6]|table|ul|ol|li|div|blockquote|span|details|summary)[^>]*>/i.test(rawBody)) {
    rawBody = htmlToMarkdown(rawBody);
  }
  const lines = rawBody.split('\n');
  let lineIdx = 0;

  while (lineIdx < lines.length) {
    const rawLine = lines[lineIdx];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      children.push(new Paragraph({ spacing: { after: 80 } }));
      lineIdx++;
      continue;
    }

    // Fenced Code Block
    if (trimmed.startsWith('```')) {
      lineIdx++;
      const codeLines: string[] = [];
      while (lineIdx < lines.length && !lines[lineIdx].trim().startsWith('```')) {
        codeLines.push(lines[lineIdx]);
        lineIdx++;
      }
      if (lineIdx < lines.length && lines[lineIdx].trim().startsWith('```')) {
        lineIdx++;
      }

      children.push(
        new Paragraph({
          children: codeLines.map((cL, idx) => {
            return new TextRun({
              text: cL,
              font: 'Consolas',
              size: 20,
              color: '0F172A',
              break: idx > 0 ? 1 : undefined,
            });
          }),
          shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
          border: { left: { style: BorderStyle.SINGLE, size: 2, color: 'CBD5E1' } },
          spacing: { before: 120, after: 120 },
          indent: { left: 240 },
        })
      );
      continue;
    }

    // Markdown Tables (| col1 | col2 |)
    if (/^\s*\|.*\|\s*$/.test(rawLine)) {
      const tableLines: string[] = [];
      while (lineIdx < lines.length && /^\s*\|.*\|\s*$/.test(lines[lineIdx])) {
        tableLines.push(lines[lineIdx].trim());
        lineIdx++;
      }

      const docxTable = parseMarkdownTableToDocx(tableLines);
      if (docxTable) {
        children.push(docxTable);
        children.push(new Paragraph({ spacing: { after: 120 } }));
      }
      continue;
    }

    // Callouts: > [!NOTE], > [!TIP], > [!WARNING], > [!IMPORTANT]
    const calloutMatch = trimmed.match(/^>\s+\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\](?:\s+(.*))?$/i);
    if (calloutMatch) {
      const type = calloutMatch[1].toUpperCase();
      const customLabel = calloutMatch[2] || '';
      lineIdx++;

      const quoteLines: string[] = [];
      while (lineIdx < lines.length && lines[lineIdx].trim().startsWith('>')) {
        quoteLines.push(lines[lineIdx].trim().replace(/^>\s?/, ''));
        lineIdx++;
      }

      let icon = 'ℹ️';
      let titleLabel = customLabel || 'CATATAN';
      let color = '2563EB';
      let fill = 'EFF6FF';

      if (type === 'TIP') {
        icon = '💡';
        titleLabel = customLabel || 'TIPS';
        color = '16A34A';
        fill = 'F0FDF4';
      } else if (type === 'WARNING' || type === 'CAUTION') {
        icon = '⚠️';
        titleLabel = customLabel || 'PERINGATAN';
        color = 'D97706';
        fill = 'FFFBEB';
      } else if (type === 'IMPORTANT') {
        icon = '📌';
        titleLabel = customLabel || 'PENTING';
        color = '9333EA';
        fill = 'FAF5FF';
      }

      const fullCalloutText = quoteLines.join(' ');
      const isCalloutRtl = isRTLText(fullCalloutText);

      children.push(
        new Paragraph({
          alignment: isCalloutRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
          bidirectional: isCalloutRtl,
          children: [
            new TextRun({ text: `${icon}  ${titleLabel}\n`, bold: true, color, size: 20 }),
            ...parseDocxInline(fullCalloutText, isCalloutRtl),
          ],
          shading: { type: ShadingType.CLEAR, fill },
          border: isCalloutRtl
            ? { right: { style: BorderStyle.SINGLE, size: 3, color } }
            : { left: { style: BorderStyle.SINGLE, size: 3, color } },
          spacing: { before: 140, after: 140 },
          indent: isCalloutRtl ? { right: 300 } : { left: 300 },
        })
      );
      continue;
    }

    // Standard Blockquotes (> ...)
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (lineIdx < lines.length && lines[lineIdx].trim().startsWith('>')) {
        quoteLines.push(lines[lineIdx].trim().replace(/^>\s?/, ''));
        lineIdx++;
      }
      const quoteContent = quoteLines.join(' ');
      const isQuoteRtl = isRTLText(quoteContent);

      children.push(
        new Paragraph({
          alignment: isQuoteRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
          bidirectional: isQuoteRtl,
          children: parseDocxInline(quoteContent, isQuoteRtl).map((r) => {
            return new TextRun({ ...r, italics: true, color: '475569' });
          }),
          border: isQuoteRtl
            ? { right: { style: BorderStyle.SINGLE, size: 2, color: '3B82F6' } }
            : { left: { style: BorderStyle.SINGLE, size: 2, color: '3B82F6' } },
          indent: isQuoteRtl ? { right: 360 } : { left: 360 },
          spacing: { before: 80, after: 80 },
        })
      );
      continue;
    }

    // Checklists (- [ ], - [x], * [ ], * [x])
    const checkMatch = trimmed.match(/^[-*]\s*\[([ xX])\]\s*(.*)$/);
    if (checkMatch) {
      const isDone = checkMatch[1].toLowerCase() === 'x';
      const checkText = checkMatch[2];
      const isItemRtl = isRTLText(checkText);

      children.push(
        new Paragraph({
          alignment: isItemRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
          bidirectional: isItemRtl,
          children: [
            new TextRun({
              text: isDone ? '☑  ' : '☐  ',
              bold: true,
              color: isDone ? '16A34A' : '64748B',
              size: 22,
            }),
            ...parseDocxInline(checkText, isItemRtl).map((r) => {
              return isDone ? new TextRun({ ...r, strike: true, color: '94A3B8' }) : r;
            }),
          ],
          indent: isItemRtl ? { right: 360 } : { left: 360 },
          spacing: { after: 60 },
        })
      );
      lineIdx++;
      continue;
    }

    // Headings (# H1 to ###### H6)
    if (trimmed.startsWith('#')) {
      const hMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (hMatch) {
        const level = hMatch[1].length;
        const hText = hMatch[2];
        const isHeadRtl = isRTLText(hText);

        const headingEnum =
          level === 1
            ? HeadingLevel.HEADING_1
            : level === 2
            ? HeadingLevel.HEADING_2
            : level === 3
            ? HeadingLevel.HEADING_3
            : level === 4
            ? HeadingLevel.HEADING_4
            : level === 5
            ? HeadingLevel.HEADING_5
            : HeadingLevel.HEADING_6;

        children.push(
          new Paragraph({
            text: hText,
            heading: headingEnum,
            alignment: isHeadRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
            bidirectional: isHeadRtl,
            spacing: { before: 180, after: 70 },
          })
        );
        lineIdx++;
        continue;
      }
    }

    // Math block ($$ formula $$)
    if (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length >= 4) {
      const formula = trimmed.slice(2, -2).trim();
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: `\\( ${formula} \\)`,
              font: 'Consolas',
              size: 22,
              color: '1E3A8A',
            }),
          ],
          shading: { type: ShadingType.CLEAR, fill: 'EFF6FF' },
          border: {
            top: { style: BorderStyle.SINGLE, size: 1, color: 'BFDBFE' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: 'BFDBFE' },
          },
          spacing: { before: 120, after: 120 },
        })
      );
      lineIdx++;
      continue;
    }

    // Numbered list (1. ...)
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      const numLabel = numMatch[1];
      const itemText = numMatch[2];
      const isItemRtl = isRTLText(itemText);

      children.push(
        new Paragraph({
          alignment: isItemRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
          bidirectional: isItemRtl,
          children: [
            new TextRun({
              text: `${numLabel}.  `,
              bold: true,
              color: '2563EB',
              size: 22,
            }),
            ...parseDocxInline(itemText, isItemRtl),
          ],
          indent: isItemRtl ? { right: 360 } : { left: 360 },
          spacing: { after: 60 },
        })
      );
      lineIdx++;
      continue;
    }

    // Bullet list (- ... or * ... or + ...)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('+ ')) {
      const itemText = trimmed.slice(2).trim();
      const isItemRtl = isRTLText(itemText);

      children.push(
        new Paragraph({
          alignment: isItemRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
          bidirectional: isItemRtl,
          children: [
            new TextRun({
              text: '•  ',
              bold: true,
              color: '2563EB',
              size: 22,
            }),
            ...parseDocxInline(itemText, isItemRtl),
          ],
          indent: isItemRtl ? { right: 360 } : { left: 360 },
          spacing: { after: 60 },
        })
      );
      lineIdx++;
      continue;
    }

    // Horizontal Rule (---, ***, ___)
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '________________________________________________',
              color: 'CBD5E1',
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 100, after: 100 },
        })
      );
      lineIdx++;
      continue;
    }

    // Image handling (![alt](url))
    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^\)]+)\)$/);
    if (imgMatch) {
      const alt = imgMatch[1];
      const src = imgMatch[2];
      const base64Img = parseBase64Image(src);

      if (base64Img) {
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                data: base64Img.data,
                transformation: { width: 480, height: 270 },
                type: base64Img.extension === 'svg' ? 'png' : base64Img.extension,
              }),
            ],
            spacing: { before: 120, after: 120 },
          })
        );
      } else if (src.startsWith('http://') || src.startsWith('https://')) {
        let embedded = false;
        try {
          const res = await fetch(src);
          if (res.ok) {
            const buf = await res.arrayBuffer();
            const bytes = new Uint8Array(buf);
            let ext: 'png' | 'jpg' | 'gif' | 'bmp' = 'png';
            const lowerSrc = src.toLowerCase();
            if (lowerSrc.includes('.jpg') || lowerSrc.includes('.jpeg')) ext = 'jpg';
            else if (lowerSrc.includes('.gif')) ext = 'gif';
            else if (lowerSrc.includes('.bmp')) ext = 'bmp';

            children.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new ImageRun({
                    data: bytes,
                    transformation: { width: 480, height: 270 },
                    type: ext,
                  }),
                ],
                spacing: { before: 120, after: 120 },
              })
            );
            embedded = true;
          }
        } catch {}

        if (!embedded) {
          children.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: `🖼️ [Gambar: ${alt || 'Ilustrasi / Foto'}]`,
                  italics: true,
                  color: '64748B',
                  size: 20,
                }),
              ],
              spacing: { before: 80, after: 80 },
            })
          );
        }
      } else {
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `🖼️ [Gambar: ${alt || 'Ilustrasi / Foto'}]`,
                italics: true,
                color: '64748B',
                size: 20,
              }),
            ],
            spacing: { before: 80, after: 80 },
          })
        );
      }
      lineIdx++;
      continue;
    }

    // Standard Paragraph with inline formatting and RTL detection
    const isParaRtl = isRTLText(trimmed);
    children.push(
      new Paragraph({
        alignment: isParaRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
        bidirectional: isParaRtl,
        children: parseDocxInline(trimmed, isParaRtl),
        spacing: { after: 90 },
      })
    );
    lineIdx++;
  }

  // 4. Footer Paragraph
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'Diekspor dari Qalam Note • Local-First & Encrypted Notes',
          size: 16,
          color: '94A3B8',
          italics: true,
        }),
      ],
      spacing: { before: 360 },
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

export async function exportNoteToDocx(note: Note, folderTitle: string = 'Qalam Note'): Promise<void> {
  if (!note) return;
  const fileName = `${sanitizeFileName(note.title, 'catatan')}.docx`;
  const blob = await generateDocxBlob(note, folderTitle);
  downloadBlob(blob, fileName);
}

// -------------------------------------------------------------
// PDF EXPORT ENGINE (Items 1 & 2: Full Arabic & HTML Components)
// -------------------------------------------------------------

const emojiDataUrlCache = new Map<string, string>();

export function emojiToDataUrl(emoji: string): string {
  if (!emoji) return '';
  if (emojiDataUrlCache.has(emoji)) {
    return emojiDataUrlCache.get(emoji)!;
  }
  if (typeof document === 'undefined') return '';

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.clearRect(0, 0, 64, 64);
    ctx.font = '46px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 32, 34);

    const dataUrl = canvas.toDataURL('image/png');
    emojiDataUrlCache.set(emoji, dataUrl);
    return dataUrl;
  } catch (err) {
    console.warn('Failed to convert emoji to data URL', emoji, err);
    return '';
  }
}

/**
 * Creates high-resolution canvas snapshot of Arabic text strings so they can be
 * cleanly inserted into PDF pages with native OpenType ligatures and Harakat.
 */
function renderArabicTextToDataUrl(
  text: string,
  fontSizePx: number = 22,
  maxWidthPx: number = 720
): { dataUrl: string; widthMm: number; heightMm: number } | null {
  if (!text || typeof document === 'undefined') return null;

  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const font = `${fontSizePx}px "Amiri", "Scheherazade New", "Noto Naskh Arabic", "Traditional Arabic", Tahoma, Arial, sans-serif`;
    ctx.font = font;

    // Word wrapping for Arabic text
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length === 0) return null;

    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidthPx && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }

    const lineHeight = Math.ceil(fontSizePx * 1.65);
    const totalHeight = Math.max(lineHeight, lines.length * lineHeight + 12);
    let maxLineWidth = 0;
    for (const line of lines) {
      const w = ctx.measureText(line).width;
      if (w > maxLineWidth) maxLineWidth = w;
    }

    const actualWidth = Math.min(maxWidthPx, Math.ceil(maxLineWidth) + 24);

    canvas.width = actualWidth * 2;
    canvas.height = totalHeight * 2;

    const drawCtx = canvas.getContext('2d');
    if (!drawCtx) return null;

    drawCtx.scale(2, 2);
    drawCtx.font = font;
    drawCtx.fillStyle = '#0f172a';
    drawCtx.textAlign = 'right';
    drawCtx.textBaseline = 'top';
    drawCtx.direction = 'rtl';

    let y = 6;
    for (const line of lines) {
      drawCtx.fillText(line, actualWidth - 8, y);
      y += lineHeight;
    }

    const widthMm = (actualWidth * 25.4) / 96;
    const heightMm = (totalHeight * 25.4) / 96;

    return {
      dataUrl: canvas.toDataURL('image/png'),
      widthMm,
      heightMm,
    };
  } catch {
    return null;
  }
}

/**
 * Validates whether a rendered canvas actually contains ink/pixels
 * and is not completely blank or empty.
 */
function isCanvasBlank(canvas: HTMLCanvasElement): boolean {
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) return true;
    const testWidth = Math.min(canvas.width, 400);
    const testHeight = Math.min(canvas.height, 600);
    const imgData = ctx.getImageData(0, 0, testWidth, testHeight).data;
    let nonWhiteCount = 0;
    // Sample pixels across the canvas (stride of 128 bytes in RGBA)
    for (let i = 0; i < imgData.length; i += 128) {
      const r = imgData[i];
      const g = imgData[i + 1];
      const b = imgData[i + 2];
      const a = imgData[i + 3];
      // Dark pixel (text, borders, images, icons)
      if (a > 20 && (r < 235 || g < 235 || b < 235)) {
        nonWhiteCount++;
        if (nonWhiteCount > 25) {
          return false; // Found visible content!
        }
      }
    }
    return nonWhiteCount <= 25;
  } catch {
    // If reading pixel data fails (e.g. cross-origin canvas), assume not blank
    return false;
  }
}

function findBestCanvasSplitRow(canvas: HTMLCanvasElement, minY: number, maxY: number): number {
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) return maxY;

    const clampMin = Math.max(0, Math.floor(minY));
    const clampMax = Math.min(canvas.height, Math.floor(maxY));
    if (clampMax <= clampMin) return maxY;

    const stepY = 2;
    const sampleStepX = 16;
    let bestRow = maxY;
    let minNonWhite = Infinity;

    for (let y = clampMax; y >= clampMin; y -= stepY) {
      try {
        const rowData = ctx.getImageData(0, y, canvas.width, 1).data;
        let nonWhiteCount = 0;

        for (let x = 0; x < canvas.width; x += sampleStepX) {
          const idx = x * 4;
          const r = rowData[idx];
          const g = rowData[idx + 1];
          const b = rowData[idx + 2];
          if (r < 245 || g < 245 || b < 245) {
            nonWhiteCount++;
          }
        }

        if (nonWhiteCount === 0) {
          return y;
        }

        if (nonWhiteCount < minNonWhite) {
          minNonWhite = nonWhiteCount;
          bestRow = y;
        }
      } catch {
        return maxY;
      }
    }

    return minNonWhite <= 2 ? bestRow : maxY;
  } catch {
    return maxY;
  }
}

/**
 * Primary high-fidelity HTML-to-Canvas PDF renderer.
 * Renders into an off-screen container with full CSS styles,
 * avoiding canvas tainting and ensuring 100% accurate rendering of Arabic text,
 * KaTeX math formulas, callouts, tables, checklists, images, and embedded HTML components.
 */
async function renderHtmlNoteToPdf(note: Note, folderTitle: string = 'Qalam Note'): Promise<Blob> {
  const container = document.createElement('div');
  container.id = 'qalam-pdf-render-container';
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.zIndex = '-99999';
  container.style.width = '794px'; // standard A4 at 96 DPI
  container.style.maxWidth = '794px';
  container.style.minHeight = '1123px';
  container.style.boxSizing = 'border-box';
  container.style.padding = '40px 48px';
  container.style.background = '#ffffff';
  container.style.color = '#0f172a';
  container.style.fontFamily =
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Amiri", "Scheherazade New", "Noto Naskh Arabic", "Traditional Arabic", Tahoma, Arial, sans-serif';
  container.style.lineHeight = '1.65';
  container.style.fontSize = '14px';
  container.style.pointerEvents = 'none';
  container.style.opacity = '1';
  container.style.visibility = 'visible';
  container.style.overflow = 'visible';

  const noteDirection = getNoteDirection(note);
  const isTitleRtl = isBlockRTL(note.title);
  const cleanTitle = convertEmoticonsAndShortcodes(note.title || 'Catatan Tanpa Judul');

  const dateStr = new Date(note.updated_time || Date.now()).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const rawHtmlBody = markdownToHtml(note.body || note.body_html || '', {
    theme: 'light',
    direction: noteDirection,
  });

  container.innerHTML = `
    <style>
      * { box-sizing: border-box; }
      .qalam-pdf-header { margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #e2e8f0; }
      .qalam-pdf-title { font-size: 26px; font-weight: 700; color: #0f172a; margin: 0 0 10px 0; line-height: 1.3; }
      .qalam-pdf-meta { font-size: 11px; color: #64748b; display: flex; flex-wrap: wrap; gap: 16px; }
      
      /* BiDi & Arabic typography */
      [dir="rtl"] {
        direction: rtl !important;
        text-align: right !important;
        unicode-bidi: isolate !important;
        font-family: "Amiri", "Scheherazade New", "Noto Naskh Arabic", "Traditional Arabic", Tahoma, "Segoe UI", Arial, sans-serif !important;
        letter-spacing: normal !important;
      }
      [dir="ltr"] {
        direction: ltr !important;
        text-align: left !important;
        unicode-bidi: isolate !important;
      }
      .font-arabic {
        font-family: "Amiri", "Scheherazade New", "Noto Naskh Arabic", "Traditional Arabic", Tahoma, "Segoe UI", Arial, sans-serif !important;
        letter-spacing: normal !important;
      }
      
      /* Callouts */
      .qalam-callout { margin: 16px 0; padding: 12px 16px; border-radius: 8px; border-left: 4px solid #3b82f6; background: #eff6ff; }
      [dir="rtl"] .qalam-callout, .qalam-callout[dir="rtl"] { border-left: none; border-right: 4px solid #3b82f6; text-align: right; }

      /* Math */
      .qalam-math-block { margin: 14px 0; padding: 12px; border-radius: 8px; background: #eff6ff; border: 1px solid #bfdbfe; font-family: ui-monospace, monospace; text-align: center; color: #1d4ed8; }
      .qalam-math-inline { background: #eff6ff; padding: 2px 6px; border-radius: 4px; font-family: ui-monospace, monospace; font-size: 12px; color: #1d4ed8; border: 1px solid #dbeafe; }

      /* Tables */
      table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
      th, td { border: 1px solid #cbd5e1; padding: 8px 12px; }
      th { background: #f1f5f9; font-weight: 600; color: #0f172a; }
      td { color: #334155; }
      tr:nth-child(even) td { background: #f8fafc; }

      /* Checklists */
      .qalam-todo-item { display: flex; align-items: flex-start; gap: 8px; margin: 6px 0; font-size: 13.5px; }
      .qalam-todo-checkbox { margin-top: 3px; accent-color: #2563eb; width: 15px; height: 15px; }

      /* Quotes */
      blockquote { margin: 14px 0; padding: 8px 16px; border-left: 4px solid #3b82f6; background: #f8fafc; color: #475569; font-style: italic; border-radius: 0 6px 6px 0; }
      blockquote[dir="rtl"] { border-left: none; border-right: 4px solid #3b82f6; border-radius: 6px 0 0 6px; text-align: right; }

      /* Code */
      pre { background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px 16px; border-radius: 8px; overflow-x: auto; font-family: ui-monospace, Consolas, monospace; font-size: 12.5px; color: #0f172a; }
      code:not(pre code) { font-family: ui-monospace, Consolas, monospace; font-size: 12px; background: #f1f5f9; color: #be123c; padding: 2px 5px; border-radius: 4px; border: 1px solid #e2e8f0; }

      /* Media */
      img { max-width: 100%; height: auto; border-radius: 6px; margin: 8px 0; }
      figure { margin: 12px 0; }
      figcaption { font-size: 11px; color: #64748b; margin-top: 4px; font-style: italic; }

      /* Details */
      details { margin: 12px 0; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
      summary { font-weight: 600; color: #2563eb; cursor: pointer; margin-bottom: 6px; }

      /* Dividers */
      hr { margin: 24px 0; border: none; border-top: 1.5px solid #e2e8f0; }

      /* Formattings */
      .qalam-wikilink, a { color: #2563eb; text-decoration: underline; }
      mark { background: #fef08a; color: #713f12; padding: 1px 3px; border-radius: 2px; }
      del { color: #94a3b8; }
      u { text-underline-offset: 2px; }

      /* Page-break avoidance */
      table, figure, img, pre, .qalam-callout, .qalam-math-block { page-break-inside: avoid; break-inside: avoid; }
      h1, h2, h3, h4, h5, h6 { page-break-after: avoid; break-after: avoid; }
    </style>
    <div class="qalam-pdf-header">
      <h1 class="qalam-pdf-title" ${isTitleRtl ? 'dir="rtl"' : 'dir="ltr"'}>${escapeHtml(cleanTitle)}</h1>
      <div class="qalam-pdf-meta">
        <span>📂 <strong>Folder:</strong> ${escapeHtml(folderTitle)}</span>
        <span>🕒 <strong>Diperbarui:</strong> ${escapeHtml(dateStr)}</span>
        ${note.tags && note.tags.length > 0 ? `<span>🏷️ <strong>Tag:</strong> #${escapeHtml(note.tags.join(', #'))}</span>` : ''}
      </div>
    </div>
    <div class="qalam-pdf-body">
      ${rawHtmlBody}
    </div>
  `;

  document.body.appendChild(container);

  try {
    // Wait for web fonts (Amiri, Scheherazade New) to fully load
    if (document.fonts) {
      try {
        await document.fonts.ready;
      } catch {}
    }
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Convert remote images to data URLs or placeholders to prevent canvas tainting
    const images = Array.from(container.querySelectorAll('img'));
    for (const img of images) {
      try {
        if (!img.src.startsWith('data:')) {
          try {
            const resp = await fetch(img.src, { mode: 'cors' });
            if (resp.ok) {
              const b = await resp.blob();
              const reader = new FileReader();
              const dataUrl = await new Promise<string>((res, rej) => {
                reader.onloadend = () => res(reader.result as string);
                reader.onerror = rej;
                reader.readAsDataURL(b);
              });
              img.src = dataUrl;
            } else {
              throw new Error('Image fetch status not OK');
            }
          } catch {
            const placeholder = document.createElement('div');
            placeholder.style.padding = '10px 14px';
            placeholder.style.background = '#f1f5f9';
            placeholder.style.border = '1px dashed #cbd5e1';
            placeholder.style.borderRadius = '6px';
            placeholder.style.fontSize = '12px';
            placeholder.style.color = '#64748b';
            placeholder.style.fontStyle = 'italic';
            placeholder.innerText = `🖼️ [Gambar: ${img.alt || 'Foto / Ilustrasi'}]`;
            img.parentNode?.replaceChild(placeholder, img);
          }
        }
      } catch {}
    }

    if (images.length > 0) {
      await Promise.all(
        images.map(
          (img) =>
            new Promise((resolve) => {
              if (img.complete) return resolve(null);
              img.onload = () => resolve(null);
              img.onerror = () => resolve(null);
              setTimeout(resolve, 1000);
            })
        )
      );
    }

    let canvas: HTMLCanvasElement | null = null;
    try {
      // Primary High-Fidelity Engine: html-to-image
      // SVG foreignObject natively rendered by browser engine guarantees 100% accurate Arabic cursive joining,
      // complex glyph shaping, KaTeX math formulas, and crisp typography!
      // skipFonts: true and fontEmbedCSS: '' bypass remote stylesheet inspection (avoiding CORS errors on Google Fonts),
      // while browser's already-loaded font cache (Amiri, Scheherazade New) renders with complete visual fidelity.
      canvas = await htmlToImage.toCanvas(container, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        skipFonts: true,
        fontEmbedCSS: '',
        style: {
          position: 'static',
          top: '0px',
          left: '0px',
          margin: '0px',
          transform: 'none',
          zIndex: 'auto',
          opacity: '1',
          visibility: 'visible',
        },
      });

      if (!canvas || canvas.width === 0 || canvas.height === 0 || isCanvasBlank(canvas)) {
        throw new Error('html-to-image returned an empty or blank canvas');
      }
    } catch (err1) {
      console.warn('html-to-image failed or produced empty canvas, falling back to html2canvas:', err1);
      try {
        canvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          logging: false,
          backgroundColor: '#ffffff',
          x: 0,
          y: 0,
          width: 794,
          height: container.scrollHeight || 1123,
          scrollX: 0,
          scrollY: 0,
        });
      } catch (err2) {
        console.error('Canvas generation fallback failed:', err2);
      }
    }

    if (!canvas || canvas.width === 0 || canvas.height === 0 || isCanvasBlank(canvas)) {
      throw new Error('Canvas rendering produced zero size or blank content');
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidthMm = 210;
    const pageHeightMm = 297;
    const marginMm = 12;
    const contentWidthMm = pageWidthMm - marginMm * 2; // 186mm
    const footerReservedMm = 14;
    const maxContentHeightMm = pageHeightMm - marginMm * 2 - footerReservedMm; // 259mm

    const pageCanvasHeight = Math.max(200, Math.floor((canvas.width * maxContentHeightMm) / contentWidthMm));

    let currentY = 0;
    const slices: { startY: number; height: number }[] = [];

    while (currentY < canvas.height) {
      const remaining = canvas.height - currentY;
      let sliceH = Math.min(pageCanvasHeight, remaining);

      if (remaining > pageCanvasHeight) {
        const lookback = Math.floor(pageCanvasHeight * 0.15);
        const searchMin = currentY + pageCanvasHeight - lookback;
        const searchMax = currentY + pageCanvasHeight;

        const splitY = findBestCanvasSplitRow(canvas, searchMin, searchMax);
        if (splitY > currentY + 100) {
          sliceH = splitY - currentY;
        }
      }

      slices.push({ startY: currentY, height: sliceH });
      currentY += sliceH;
    }

    const totalPages = slices.length;

    for (let i = 0; i < slices.length; i++) {
      const { startY, height: sliceH } = slices[i];
      if (i > 0) {
        doc.addPage();
      }

      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceH;
      const sCtx = sliceCanvas.getContext('2d');
      if (sCtx) {
        sCtx.fillStyle = '#ffffff';
        sCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        sCtx.drawImage(canvas, 0, startY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
      }

      let sliceDataUrl = '';
      try {
        sliceDataUrl = sliceCanvas.toDataURL('image/jpeg', 0.95);
      } catch {
        sliceDataUrl = sliceCanvas.toDataURL('image/png');
      }

      const renderHeightMm = (sliceH * contentWidthMm) / canvas.width;
      doc.addImage(sliceDataUrl, 'JPEG', marginMm, marginMm, contentWidthMm, renderHeightMm);

      // Document footer line & page number
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.3);
      doc.line(marginMm, pageHeightMm - 12, pageWidthMm - marginMm, pageHeightMm - 12);
      doc.text('Diterbitkan dari Qalam Note', marginMm, pageHeightMm - 7);
      doc.text(`Halaman ${i + 1} dari ${totalPages}`, pageWidthMm - marginMm, pageHeightMm - 7, { align: 'right' });
    }

    return doc.output('blob');
  } finally {
    container.remove();
  }
}

/**
 * Robust Markdown & Arabic Vector PDF Generator (Fallback Engine).
 * Renders headings, tables, blockquotes, checklists, code blocks, and math formulas.
 * Safely renders Arabic script via 2D Canvas so it never outputs Latin-1 mojibake bytes.
 */
function generateVectorNotePdfBlob(note: Note, folderTitle: string = 'Qalam Note'): Blob {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const maxPageY = pageHeight - 18;

  let currentY = margin;

  const ensureSpace = (neededHeight: number = 10) => {
    if (currentY + neededHeight > maxPageY) {
      doc.addPage();
      currentY = margin;
    }
  };

  // Header Title
  const cleanTitle = cleanMarkdownText(note.title || 'Catatan Tanpa Judul');
  const isTitleRtl = isBlockRTL(cleanTitle);
  const dateStr = new Date(note.updated_time || Date.now()).toLocaleDateString('id-ID');
  const metaInfo = `Folder: ${folderTitle}   |   Diperbarui: ${dateStr}${
    note.tags && note.tags.length > 0 ? `   |   Tag: #${note.tags.join(', #')}` : ''
  }`;

  if (isTitleRtl) {
    const titleSnap = renderArabicTextToDataUrl(cleanTitle, 30);
    if (titleSnap) {
      ensureSpace(titleSnap.heightMm + 10);
      const drawWidth = Math.min(contentWidth, titleSnap.widthMm);
      const drawX = margin + contentWidth - drawWidth;
      doc.addImage(titleSnap.dataUrl, 'PNG', drawX, currentY, drawWidth, titleSnap.heightMm);
      currentY += titleSnap.heightMm + 3;
    }
    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin, bottom: 18 },
      tableWidth: contentWidth,
      body: [
        [{ content: metaInfo, styles: { fontStyle: 'normal', fontSize: 8.5, textColor: [100, 116, 139] } }],
      ],
      theme: 'plain',
      didDrawCell: () => {
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.4);
        doc.line(margin, currentY + 6, margin + contentWidth, currentY + 6);
      },
    });
    currentY = (doc as any).lastAutoTable.finalY + 6;
  } else {
    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin, bottom: 18 },
      tableWidth: contentWidth,
      body: [
        [{ content: cleanTitle, styles: { fontStyle: 'bold', fontSize: 16.5, textColor: [15, 23, 42] } }],
        [{ content: metaInfo, styles: { fontStyle: 'normal', fontSize: 8.5, textColor: [100, 116, 139] } }],
      ],
      theme: 'plain',
      didDrawCell: (data) => {
        if (data.row.index === 1) {
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.4);
          doc.line(margin, data.cell.y + data.cell.height + 1, margin + contentWidth, data.cell.y + data.cell.height + 1);
        }
      },
    });
    currentY = (doc as any).lastAutoTable.finalY + 6;
  }

  // Body Parsing
  const rawBody = (note.body || '').trim() || (note.body_html ? stripHtmlTags(note.body_html) : '');
  const lines = rawBody.split('\n');
  let lineIdx = 0;

  while (lineIdx < lines.length) {
    const rawLine = lines[lineIdx];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      currentY += 2;
      lineIdx++;
      continue;
    }

    // Skip HTML wrapping tags like <div dir="rtl">, </div>, etc.
    if (/^<\/?(div|section|article|span)[^>]*>$/i.test(trimmed)) {
      lineIdx++;
      continue;
    }

    // 1. Fenced Code Block
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      lineIdx++;
      const codeLines: string[] = [];
      while (lineIdx < lines.length && !lines[lineIdx].trim().startsWith('```')) {
        codeLines.push(lines[lineIdx]);
        lineIdx++;
      }
      if (lineIdx < lines.length && lines[lineIdx].trim().startsWith('```')) {
        lineIdx++;
      }

      ensureSpace(14);
      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin, bottom: 18 },
        tableWidth: contentWidth,
        body: [[{
          content: codeLines.join('\n') || ' ',
          styles: {
            font: 'courier',
            fontSize: 8.5,
            fillColor: [248, 250, 252],
            textColor: [15, 23, 42],
            cellPadding: 4,
          },
        }]],
        theme: 'plain',
        didDrawCell: (data) => {
          doc.setDrawColor(203, 213, 225);
          doc.setLineWidth(0.3);
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'S');
          if (lang) {
            doc.setFont('courier', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(148, 163, 184);
            doc.text(lang.toUpperCase(), data.cell.x + data.cell.width - 2.5, data.cell.y + 3.2, { align: 'right' });
          }
        },
      });
      currentY = (doc as any).lastAutoTable.finalY + 3.5;
      continue;
    }

    // 2. Markdown Tables (| col1 | col2 |)
    if (/^\s*\|.*\|\s*$/.test(rawLine)) {
      const tableLines: string[] = [];
      while (lineIdx < lines.length && /^\s*\|.*\|\s*$/.test(lines[lineIdx])) {
        tableLines.push(lines[lineIdx].trim());
        lineIdx++;
      }

      if (tableLines.length >= 2) {
        const parseRow = (rowStr: string) => {
          const cells = rowStr.split('|').slice(1, -1);
          return cells.map((c) => cleanMarkdownText(c.trim()));
        };

        const headerRow = parseRow(tableLines[0]);
        const isSeparator = /^\|[\s\-\:\.\,\|]+\|$/.test(tableLines[1]);
        const bodyStart = isSeparator ? 2 : 1;
        const bodyRows: string[][] = [];

        for (let r = bodyStart; r < tableLines.length; r++) {
          if (/^\|[\s\-\:\.\,\|]+\|$/.test(tableLines[r])) continue;
          bodyRows.push(parseRow(tableLines[r]));
        }

        ensureSpace(16);
        autoTable(doc, {
          startY: currentY,
          margin: { left: margin, right: margin, bottom: 18 },
          tableWidth: contentWidth,
          head: headerRow.length > 0 ? [headerRow] : undefined,
          body: bodyRows,
          theme: 'grid',
          headStyles: {
            fillColor: [241, 245, 249],
            textColor: [15, 23, 42],
            fontStyle: 'bold',
            fontSize: 8.5,
            cellPadding: 2.5,
          },
          bodyStyles: {
            textColor: [30, 41, 59],
            fontSize: 8.5,
            cellPadding: 2.5,
            overflow: 'linebreak',
          },
          alternateRowStyles: {
            fillColor: [253, 254, 255],
          },
        });
        currentY = (doc as any).lastAutoTable.finalY + 4;
        continue;
      }
    }

    // 3. Callouts / Admonitions
    const calloutMatch = trimmed.match(/^>\s+\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\](?:\s+(.*))?$/i);
    if (calloutMatch) {
      const type = calloutMatch[1].toUpperCase();
      const customLabel = calloutMatch[2] || '';
      lineIdx++;

      const quoteLines: string[] = [];
      while (lineIdx < lines.length && lines[lineIdx].trim().startsWith('>')) {
        quoteLines.push(lines[lineIdx].trim().replace(/^>\s?/, ''));
        lineIdx++;
      }

      const icon = type === 'TIP' ? '💡 TIPS' : type === 'WARNING' ? '⚠️ PERINGATAN' : 'ℹ️ CATATAN';
      const label = customLabel || icon;
      const content = cleanMarkdownText(quoteLines.join(' '));

      ensureSpace(12);
      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin, bottom: 18 },
        tableWidth: contentWidth,
        body: [
          [{ content: label, styles: { fontStyle: 'bold', fontSize: 8.5, textColor: [37, 99, 235], fillColor: [239, 246, 255], cellPadding: { top: 2, bottom: 1, left: 6, right: 4 } } }],
          [{ content, styles: { fontStyle: 'normal', fontSize: 9, textColor: [30, 58, 138], fillColor: [239, 246, 255], cellPadding: { top: 1, bottom: 3, left: 6, right: 4 }, overflow: 'linebreak' } }],
        ],
        theme: 'plain',
        didDrawCell: (data) => {
          doc.setDrawColor(59, 130, 246);
          doc.setLineWidth(1.2);
          doc.line(data.cell.x, data.cell.y, data.cell.x, data.cell.y + data.cell.height);
        },
      });
      currentY = (doc as any).lastAutoTable.finalY + 3.5;
      continue;
    }

    // 4. Blockquotes (> ...)
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (lineIdx < lines.length && lines[lineIdx].trim().startsWith('>')) {
        quoteLines.push(lines[lineIdx].trim().replace(/^>\s?/, ''));
        lineIdx++;
      }
      const quoteContent = cleanMarkdownText(quoteLines.join(' '));

      ensureSpace(10);
      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin, bottom: 18 },
        tableWidth: contentWidth,
        body: [[{
          content: quoteContent,
          styles: { fontStyle: 'italic', fontSize: 9.5, textColor: [51, 65, 85], fillColor: [248, 250, 252], cellPadding: { top: 2.5, bottom: 2.5, left: 6, right: 3 }, overflow: 'linebreak' },
        }]],
        theme: 'plain',
        didDrawCell: (data) => {
          doc.setDrawColor(59, 130, 246);
          doc.setLineWidth(1.2);
          doc.line(data.cell.x, data.cell.y, data.cell.x, data.cell.y + data.cell.height);
        },
      });
      currentY = (doc as any).lastAutoTable.finalY + 3;
      continue;
    }

    // 5. Headings (# H1 to ###### H6)
    if (trimmed.startsWith('#')) {
      const hMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (hMatch) {
        const level = hMatch[1].length;
        const hText = cleanMarkdownText(hMatch[2]);
        const fontSize = level === 1 ? 15 : level === 2 ? 13 : level === 3 ? 11 : 10;
        const textColor: [number, number, number] = level === 1 ? [15, 23, 42] : level === 2 ? [30, 41, 59] : [51, 65, 85];

        if (isBlockRTL(hText)) {
          const arabicSnap = renderArabicTextToDataUrl(hText, Math.round(fontSize * 1.8));
          if (arabicSnap) {
            ensureSpace(arabicSnap.heightMm + 4);
            const drawWidth = Math.min(contentWidth, arabicSnap.widthMm);
            const drawX = margin + contentWidth - drawWidth;
            doc.addImage(arabicSnap.dataUrl, 'PNG', drawX, currentY, drawWidth, arabicSnap.heightMm);
            currentY += arabicSnap.heightMm + 3;
            lineIdx++;
            continue;
          }
        }

        ensureSpace(8);
        autoTable(doc, {
          startY: currentY,
          margin: { left: margin, right: margin, bottom: 18 },
          tableWidth: contentWidth,
          body: [[{
            content: hText,
            styles: { fontStyle: 'bold', fontSize, textColor, cellPadding: { top: 2, bottom: 1.5, left: 0, right: 0 }, overflow: 'linebreak' },
          }]],
          theme: 'plain',
        });
        currentY = (doc as any).lastAutoTable.finalY + 2.5;
        lineIdx++;
        continue;
      }
    }

    // 6. Checklists (- [ ], - [x])
    const checkMatch = trimmed.match(/^[-*]\s*\[([ xX])\]\s*(.*)$/);
    if (checkMatch) {
      const isDone = checkMatch[1].toLowerCase() === 'x';
      const checkText = cleanMarkdownText(checkMatch[2]);

      ensureSpace(6);
      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin, bottom: 18 },
        tableWidth: contentWidth,
        columns: [
          { dataKey: 'check', header: '' },
          { dataKey: 'text', header: '' },
        ],
        body: [{ check: '', text: checkText }],
        columnStyles: {
          check: { cellWidth: 6, cellPadding: 1 },
          text: {
            cellWidth: contentWidth - 6,
            fontSize: 9.5,
            fontStyle: isDone ? 'italic' : 'normal',
            textColor: isDone ? [148, 163, 184] : [30, 41, 59],
            cellPadding: { top: 1, bottom: 1, left: 1, right: 0 },
            overflow: 'linebreak',
          },
        },
        theme: 'plain',
        didDrawCell: (data) => {
          if (data.column.dataKey === 'check') {
            const bx = data.cell.x + 1;
            const by = data.cell.y + 1.2;
            doc.setDrawColor(isDone ? 34 : 148, isDone ? 197 : 163, isDone ? 94 : 184);
            doc.setLineWidth(0.4);
            doc.roundedRect(bx, by, 3.4, 3.4, 0.6, 0.6, 'S');
            if (isDone) {
              doc.setFillColor(34, 197, 94);
              doc.roundedRect(bx + 0.4, by + 0.4, 2.6, 2.6, 0.4, 0.4, 'F');
              doc.setDrawColor(255, 255, 255);
              doc.setLineWidth(0.4);
              doc.line(bx + 0.8, by + 1.7, bx + 1.4, by + 2.4);
              doc.line(bx + 1.4, by + 2.4, bx + 2.6, by + 0.9);
            }
          }
        },
      });
      currentY = (doc as any).lastAutoTable.finalY + 1.5;
      lineIdx++;
      continue;
    }

    // 7. Math block ($$ formula $$)
    if (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length >= 4) {
      const formula = trimmed.slice(2, -2).trim();
      ensureSpace(8);
      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin, bottom: 18 },
        tableWidth: contentWidth,
        body: [[{
          content: formula,
          styles: { font: 'courier', halign: 'center', fontSize: 9.5, fillColor: [239, 246, 255], textColor: [29, 78, 216], cellPadding: 3 },
        }]],
        theme: 'plain',
        didDrawCell: (data) => {
          doc.setDrawColor(191, 219, 254);
          doc.setLineWidth(0.3);
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'S');
        },
      });
      currentY = (doc as any).lastAutoTable.finalY + 2.5;
      lineIdx++;
      continue;
    }

    // 8. Horizontal Dividers (---, ***, ___)
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      ensureSpace(6);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, currentY + 1.5, margin + contentWidth, currentY + 1.5);
      currentY += 4;
      lineIdx++;
      continue;
    }

    // 9. Arabic Text Paragraphs (render via canvas snapshot to prevent Latin-1 mojibake)
    if (isBlockRTL(trimmed)) {
      const cleanArabic = cleanMarkdownText(trimmed);
      const arabicSnap = renderArabicTextToDataUrl(cleanArabic, 22);

      if (arabicSnap) {
        ensureSpace(arabicSnap.heightMm + 2);
        const drawWidth = Math.min(contentWidth, arabicSnap.widthMm);
        const drawX = margin + contentWidth - drawWidth;
        doc.addImage(arabicSnap.dataUrl, 'PNG', drawX, currentY, drawWidth, arabicSnap.heightMm);
        currentY += arabicSnap.heightMm + 2.5;
        lineIdx++;
        continue;
      }
    }

    // 10. Standard Paragraph (with Markdown cleaned)
    const paraText = cleanMarkdownText(trimmed);
    ensureSpace(6);
    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin, bottom: 18 },
      tableWidth: contentWidth,
      body: [[{
        content: paraText,
        styles: { fontSize: 9.5, textColor: [30, 41, 59], cellPadding: { top: 1, bottom: 1, left: 0, right: 0 }, overflow: 'linebreak' },
      }]],
      theme: 'plain',
    });
    currentY = (doc as any).lastAutoTable.finalY + 2.5;
    lineIdx++;
  }

  // Document Footer Across All Pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, margin + contentWidth, pageHeight - 12);
    doc.text('Diterbitkan dari Qalam Note', margin, pageHeight - 7);
    doc.text(`Halaman ${p} dari ${totalPages}`, margin + contentWidth, pageHeight - 7, { align: 'right' });
  }

  return doc.output('blob');
}

/**
 * Generates a clean, multi-page PDF document Blob.
 * Correctly renders Arabic script, KaTeX math, callouts, tables, checklists, and images.
 */
export async function generateNotePdfBlob(note: Note, folderTitle: string = 'Qalam Note'): Promise<Blob> {
  if (!note) {
    return new Blob([], { type: 'application/pdf' });
  }

  if (typeof document !== 'undefined') {
    try {
      return await renderHtmlNoteToPdf(note, folderTitle);
    } catch (err) {
      console.warn('HTML-to-Canvas PDF failed, falling back to vector engine:', err);
    }
  }

  return generateVectorNotePdfBlob(note, folderTitle);
}

/**
 * Directly renders and downloads a PDF file without opening the browser's printer dialog
 */
export async function exportNoteToPdfDirect(note: Note, folderTitle: string = 'Qalam Note'): Promise<void> {
  if (!note) return;
  const fileName = `${sanitizeFileName(note.title, 'catatan')}.pdf`;
  const blob = await generateNotePdfBlob(note, folderTitle);
  downloadBlob(blob, fileName);
}

/**
 * Backward compatibility alias: defaults to direct PDF export
 */
export async function exportNoteToPdf(note: Note, folderTitle: string = 'Qalam Note'): Promise<void> {
  await exportNoteToPdfDirect(note, folderTitle);
}

/**
 * Prints or exports note via browser printer dialog
 */
export function exportNoteToPrint(note: Note, folderTitle: string = 'Qalam Note'): void {
  if (!note) return;

  const noteDirection = getNoteDirection(note);
  const isTitleRtl = isBlockRTL(note.title);
  const htmlBody = markdownToHtml(note.body || '', { theme: 'light', direction: noteDirection });

  let printFrame = document.getElementById('qalam-print-frame') as HTMLIFrameElement | null;
  if (!printFrame) {
    printFrame = document.createElement('iframe');
    printFrame.id = 'qalam-print-frame';
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    printFrame.style.visibility = 'hidden';
    document.body.appendChild(printFrame);
  }

  const printDocument = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(note.title || 'Catatan Qalam')}</title>
  <style>
    @page { margin: 15mm; size: auto; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Amiri", "Scheherazade New", "Noto Naskh Arabic", "Traditional Arabic", Tahoma, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      line-height: 1.65;
      font-size: 13px;
      margin: 0;
      padding: 16px;
    }
    .print-header { border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 20px; }
    .print-title { font-size: 24px; font-weight: 700; color: #0f172a; margin: 0 0 6px 0; }
    .print-meta { font-size: 11px; color: #64748b; display: flex; gap: 16px; }
    [dir="rtl"] {
      direction: rtl !important;
      text-align: right !important;
      unicode-bidi: isolate !important;
      font-family: "Amiri", "Scheherazade New", "Noto Naskh Arabic", "Traditional Arabic", Tahoma, "Segoe UI", Arial, sans-serif !important;
    }
    [dir="ltr"] {
      direction: ltr !important;
      text-align: left !important;
      unicode-bidi: isolate !important;
    }
    .font-arabic {
      font-family: "Amiri", "Scheherazade New", "Noto Naskh Arabic", "Traditional Arabic", Tahoma, "Segoe UI", Arial, sans-serif !important;
    }
    pre, code { font-family: monospace; background: #f1f5f9; border-radius: 4px; }
    pre { padding: 12px; border: 1px solid #cbd5e1; overflow-x: auto; }
    code:not(pre code) { padding: 2px 5px; font-size: 12px; }
    blockquote { border-left: 4px solid #3b82f6; margin: 12px 0; padding: 6px 16px; color: #475569; background: #f8fafc; }
    blockquote[dir="rtl"] { border-left: none; border-right: 4px solid #3b82f6; text-align: right; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
    th { background: #f1f5f9; font-weight: 600; }
    img { max-width: 100%; height: auto; border-radius: 6px; }
    .print-footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
    .print-footer a { color: #2563eb; text-decoration: underline; font-weight: 600; }
  </style>
</head>
<body>
  <div class="print-header">
    <h1 class="print-title" ${isTitleRtl ? 'dir="rtl"' : 'dir="ltr"'}>${escapeHtml(note.title || 'Catatan Tanpa Judul')}</h1>
    <div class="print-meta">
      <span>📂 <strong>Folder:</strong> ${escapeHtml(folderTitle)}</span>
      <span>🕒 <strong>Diperbarui:</strong> ${new Date(note.updated_time).toLocaleString()}</span>
      ${note.tags && note.tags.length > 0 ? `<span>🏷️ <strong>Tag:</strong> #${escapeHtml(note.tags.join(', #'))}</span>` : ''}
    </div>
  </div>
  <div class="print-body">
    ${htmlBody}
  </div>
  <div class="print-footer">
    Diterbitkan dari <a href="https://lam-note.aiprojek01.my.id/" target="_blank">Qalam Note</a>
  </div>
</body>
</html>`;

  const frameDoc = printFrame.contentWindow?.document;
  if (!frameDoc) {
    window.print();
    return;
  }

  frameDoc.open();
  frameDoc.write(printDocument);
  frameDoc.close();

  setTimeout(() => {
    printFrame?.contentWindow?.focus();
    printFrame?.contentWindow?.print();
  }, 400);
}

/**
 * Exports an entire folder of notes into a ZIP archive (Joplin style)
 */
export async function exportFolderToZip(
  folderTitle: string,
  notesInFolder: Note[],
  format: 'markdown' | 'docx' | 'html' | 'pdf' | 'all' = 'all'
): Promise<void> {
  if (!notesInFolder || notesInFolder.length === 0) return;

  const zip = new JSZip();
  const folderSafeName = sanitizeFileName(folderTitle, 'Folder');
  const rootFolder = zip.folder(folderSafeName) || zip;

  const usedNames = new Set<string>();

  for (let i = 0; i < notesInFolder.length; i++) {
    const note = notesInFolder[i];
    const baseTitle = sanitizeFileName(note.title, `catatan-${i + 1}`);

    let uniqueTitle = baseTitle;
    let counter = 1;
    while (usedNames.has(uniqueTitle)) {
      counter++;
      uniqueTitle = `${baseTitle} (${counter})`;
    }
    usedNames.add(uniqueTitle);

    // Add PDF file (.pdf)
    if (format === 'pdf' || format === 'all') {
      try {
        const pdfBlob = await generateNotePdfBlob(note, folderTitle);
        rootFolder.file(`${uniqueTitle}.pdf`, pdfBlob);
      } catch (err) {
        console.error('Failed to generate pdf for note in zip', note.title, err);
      }
    }

    // Add Markdown file (.md)
    if (format === 'markdown' || format === 'all') {
      const mdContent = `# ${note.title || 'Catatan Tanpa Judul'}\n\n${note.body || ''}`;
      rootFolder.file(`${uniqueTitle}.md`, mdContent);
    }

    // Add DOCX file (.docx)
    if (format === 'docx' || format === 'all') {
      try {
        const docxBlob = await generateDocxBlob(note, folderTitle);
        rootFolder.file(`${uniqueTitle}.docx`, docxBlob);
      } catch (err) {
        console.error('Failed to generate docx for note in zip', note.title, err);
      }
    }

    // Add standalone HTML file (.html)
    if (format === 'html' || format === 'all') {
      try {
        const noteDirection = getNoteDirection(note);
        const htmlBody = markdownToHtml(note.body || '', { theme: 'light', direction: noteDirection });
        const standaloneHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(note.title || 'Catatan')}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Amiri", "Scheherazade New", Tahoma, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 20px; color: #0f172a; }
    h1 { border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
    pre { background: #f1f5f9; padding: 12px; border-radius: 6px; overflow-x: auto; }
    [dir="rtl"] { direction: rtl; text-align: right; }
    .font-arabic { font-family: "Amiri", "Scheherazade New", Tahoma, sans-serif; }
    .footer { margin-top: 36px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
    .footer a { color: #2563eb; text-decoration: underline; font-weight: 600; }
  </style>
</head>
<body>
  <h1 ${isBlockRTL(note.title) ? 'dir="rtl"' : ''}>${escapeHtml(note.title || 'Catatan Tanpa Judul')}</h1>
  <p style="font-size: 12px; color: #64748b;">Folder: ${escapeHtml(folderTitle)} | Diperbarui: ${new Date(note.updated_time).toLocaleString()}</p>
  <div>${htmlBody}</div>
  <div class="footer">
    Diterbitkan dari <a href="https://lam-note.aiprojek01.my.id/" target="_blank">Qalam Note</a>
  </div>
</body>
</html>`;
        rootFolder.file(`${uniqueTitle}.html`, standaloneHtml);
      } catch (err) {
        console.error('Failed to generate html for note in zip', note.title, err);
      }
    }
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(zipBlob, `${folderSafeName}-catatan.zip`);
}
