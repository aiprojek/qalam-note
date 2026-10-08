import type { Note } from '../types';
import { markdownToHtml, convertEmoticonsAndShortcodes } from './markdown';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import JSZip from 'jszip';

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
 */
export function exportNoteToHtml(note: Note, folderTitle: string = 'Qalam Note'): void {
  if (!note) return;
  const fileName = `${sanitizeFileName(note.title, 'catatan')}.html`;
  const htmlBody = markdownToHtml(note.body || '', 'light');

  const fullHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${note.title || 'Catatan Qalam'}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #f8fafc;
      line-height: 1.65;
      padding: 40px 20px;
      margin: 0;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      padding: 36px 44px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
      border: 1px solid #e2e8f0;
    }
    .header {
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    h1.title {
      font-size: 28px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 8px 0;
    }
    .meta {
      font-size: 12px;
      color: #64748b;
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }
    pre, code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      background: #f1f5f9;
      border-radius: 6px;
    }
    pre {
      padding: 14px;
      border: 1px solid #cbd5e1;
      overflow-x: auto;
    }
    code:not(pre code) {
      padding: 2px 6px;
      font-size: 12px;
      color: #0284c7;
    }
    blockquote {
      border-left: 4px solid #3b82f6;
      margin: 16px 0;
      padding: 8px 16px;
      color: #475569;
      background: #f8fafc;
      border-radius: 0 8px 8px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background: #f1f5f9;
      font-weight: 600;
    }
    img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">${note.title || 'Catatan Tanpa Judul'}</h1>
      <div class="meta">
        <span>📂 <strong>Folder:</strong> ${folderTitle}</span>
        <span>🕒 <strong>Diperbarui:</strong> ${new Date(note.updated_time).toLocaleString()}</span>
        ${note.tags && note.tags.length > 0 ? `<span>🏷️ <strong>Tag:</strong> #${note.tags.join(', #')}</span>` : ''}
      </div>
    </div>
    <div class="body">
      ${htmlBody}
    </div>
    <div class="footer">
      Diekspor dari Qalam Note &bull; Local-First & Encrypted Notes
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  downloadBlob(blob, fileName);
}

/**
 * Generates a clean DOCX Blob for a note using docx library
 */
export async function generateDocxBlob(note: Note, folderTitle: string = 'Qalam Note'): Promise<Blob> {
  const children: Paragraph[] = [];

  // Title
  children.push(
    new Paragraph({
      text: note.title || 'Catatan Tanpa Judul',
      heading: HeadingLevel.TITLE,
      spacing: { after: 120 },
    })
  );

  // Metadata paragraph
  const metaText = `Folder: ${folderTitle} | Diperbarui: ${new Date(note.updated_time).toLocaleString()}${
    note.tags && note.tags.length > 0 ? ` | Tag: #${note.tags.join(', #')}` : ''
  }`;
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: metaText,
          italics: true,
          color: '64748B',
          size: 18, // 9pt
        }),
      ],
      spacing: { after: 240 },
    })
  );

  // Parse lines of note body
  const lines = (note.body || '').split('\n');
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Check code fence
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        inCodeBlock = false;
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: codeBuffer.join('\n'),
                font: 'Consolas',
                size: 20, // 10pt
                color: '0F172A',
              }),
            ],
            spacing: { before: 100, after: 100 },
          })
        );
        codeBuffer = [];
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine);
      continue;
    }

    // Heading 1 (# ...)
    if (trimmed.startsWith('# ')) {
      children.push(
        new Paragraph({
          text: trimmed.slice(2).trim(),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 200, after: 80 },
        })
      );
      continue;
    }

    // Heading 2 (## ...)
    if (trimmed.startsWith('## ')) {
      children.push(
        new Paragraph({
          text: trimmed.slice(3).trim(),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 160, after: 60 },
        })
      );
      continue;
    }

    // Heading 3 (### ...)
    if (trimmed.startsWith('### ')) {
      children.push(
        new Paragraph({
          text: trimmed.slice(4).trim(),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 120, after: 40 },
        })
      );
      continue;
    }

    // Bullet list (- ... or * ...)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '•  ' + trimmed.slice(2).trim(),
              size: 22,
            }),
          ],
          indent: { left: 360 },
          spacing: { after: 60 },
        })
      );
      continue;
    }

    // Numbered list (1. ...)
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${numMatch[1]}.  ${numMatch[2]}`,
              size: 22,
            }),
          ],
          indent: { left: 360 },
          spacing: { after: 60 },
        })
      );
      continue;
    }

    // Blockquote (> ...)
    if (trimmed.startsWith('> ')) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmed.slice(2).trim(),
              italics: true,
              color: '475569',
              size: 22,
            }),
          ],
          indent: { left: 400 },
          spacing: { before: 60, after: 60 },
        })
      );
      continue;
    }

    // Horizontal rule (---)
    if (trimmed === '---' || trimmed === '***') {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: '________________________________________________', color: 'CBD5E1' })],
          spacing: { before: 100, after: 100 },
          alignment: AlignmentType.CENTER,
        })
      );
      continue;
    }

    // Empty line
    if (!trimmed) {
      children.push(new Paragraph({ spacing: { after: 80 } }));
      continue;
    }

    // Regular paragraph
    // Clean common markdown inline syntax like bold (**text**) and italic (*text*)
    const runs: TextRun[] = [];
    const parts = rawLine.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);

    for (const part of parts) {
      if (part.startsWith('**') && part.endsWith('**')) {
        runs.push(new TextRun({ text: part.slice(2, -2), bold: true, size: 22 }));
      } else if (part.startsWith('*') && part.endsWith('*')) {
        runs.push(new TextRun({ text: part.slice(1, -1), italics: true, size: 22 }));
      } else if (part.startsWith('`') && part.endsWith('`')) {
        runs.push(
          new TextRun({
            text: part.slice(1, -1),
            font: 'Consolas',
            color: '0369A1',
            size: 20,
          })
        );
      } else if (part) {
        runs.push(new TextRun({ text: part, size: 22 }));
      }
    }

    children.push(
      new Paragraph({
        children: runs.length > 0 ? runs : [new TextRun({ text: rawLine, size: 22 })],
        spacing: { after: 80 },
      })
    );
  }

  // Footer note
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Diekspor dari Qalam Note • Local-First & Encrypted Notes',
          size: 16,
          color: '94A3B8',
          italics: true,
        }),
      ],
      spacing: { before: 360 },
      alignment: AlignmentType.CENTER,
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

/**
 * Downloads a note directly as a Microsoft Word (.docx) file
 */
export async function exportNoteToDocx(note: Note, folderTitle: string = 'Qalam Note'): Promise<void> {
  if (!note) return;
  const fileName = `${sanitizeFileName(note.title, 'catatan')}.docx`;
  const blob = await generateDocxBlob(note, folderTitle);
  downloadBlob(blob, fileName);
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

const emojiDataUrlCache = new Map<string, string>();

/**
 * Converts an emoji character into a high-resolution 64x64 PNG Data URL using the browser's native 2D canvas.
 * This guarantees emojis render in full color across every OS without depending on PDF fonts or font metrics.
 */
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

const FULL_EMOJI_REGEX = /(\p{RI}\p{RI}|\p{Extended_Pictographic}(?:\p{EMod}|\uFE0F|\u200D\p{Extended_Pictographic})*)/gu;

/**
 * Cleans Markdown formatting syntax while preserving readable text, URLs, and wikilink aliases.
 */
function cleanMarkdownText(text: string): string {
  if (!text) return '';
  return text
    // Replace markdown bold & italic
    .replace(/\*\*\*(.*?)\*\*\*/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/___(.*?)___/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/~~(.*?)~~/g, '$1')
    // Inline code `code` -> code
    .replace(/`([^`\n]+)`/g, '$1')
    // Replace wikilinks: [[target|alias]] -> alias; [[target]] -> target
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, target, alias) => (alias || target).trim())
    // Replace markdown links: [text](url) -> text (url)
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1 ($2)');
}

/**
 * Renders a line of text onto the PDF document, seamlessly embedding high-resolution
 * emoji PNG images at the exact character positions without corrupting standard jsPDF fonts.
 */
function drawLineWithEmojis(
  doc: jsPDF,
  line: string,
  startX: number,
  baselineY: number,
  fontSizePt: number
): void {
  FULL_EMOJI_REGEX.lastIndex = 0;
  let lastIdx = 0;
  let curX = startX;
  const emojiSizeMm = fontSizePt * 0.3528 * 1.1;

  let match: RegExpExecArray | null;
  while ((match = FULL_EMOJI_REGEX.exec(line)) !== null) {
    const matchIdx = match.index;
    const matchText = match[0];

    if (matchIdx > lastIdx) {
      const textChunk = line.slice(lastIdx, matchIdx);
      doc.text(textChunk, curX, baselineY);
      curX += doc.getTextWidth(textChunk);
    }

    const dataUrl = emojiToDataUrl(matchText);
    if (dataUrl) {
      try {
        doc.addImage(dataUrl, 'PNG', curX, baselineY - emojiSizeMm * 0.85, emojiSizeMm, emojiSizeMm);
      } catch {
        // Fallback: advance cursor even if image add fails
      }
    }
    curX += emojiSizeMm + 0.6;
    lastIdx = matchIdx + matchText.length;
  }

  if (lastIdx < line.length) {
    const textChunk = line.slice(lastIdx);
    doc.text(textChunk, curX, baselineY);
  }
}

/**
 * Creates autoTable hooks that intercept cell text containing emojis.
 * Prevents jsPDF from writing corrupted Latin-1 byte symbols, and renders emojis as crisp images.
 */
function createEmojiTableHooks(doc: jsPDF) {
  const savedCellLines = new Map<any, string[]>();

  return {
    willDrawCell: (data: any) => {
      if (!data.cell || !Array.isArray(data.cell.text) || data.cell.text.length === 0) return;
      const fullText = data.cell.text.join(' ');
      FULL_EMOJI_REGEX.lastIndex = 0;
      if (FULL_EMOJI_REGEX.test(fullText)) {
        savedCellLines.set(data.cell, [...data.cell.text]);
        data.cell.text = []; // Suppress raw Latin-1 drawing
      }
    },
    didDrawCell: (data: any) => {
      if (savedCellLines.has(data.cell)) {
        const lines = savedCellLines.get(data.cell)!;
        const textPos = data.cell.getTextPos();
        const styles = data.cell.styles || {};
        const fontSize = styles.fontSize || 9.5;

        doc.setFont(styles.font || 'helvetica', styles.fontStyle || 'normal');
        doc.setFontSize(fontSize);

        if (styles.textColor) {
          if (Array.isArray(styles.textColor)) {
            doc.setTextColor(styles.textColor[0], styles.textColor[1], styles.textColor[2]);
          } else if (typeof styles.textColor === 'number') {
            doc.setTextColor(styles.textColor);
          } else if (typeof styles.textColor === 'string') {
            doc.setTextColor(styles.textColor);
          }
        } else {
          doc.setTextColor(30, 41, 59);
        }

        const lineHeightMm = fontSize * 0.3528 * 1.35;
        for (let i = 0; i < lines.length; i++) {
          drawLineWithEmojis(doc, lines[i], textPos.x, textPos.y + i * lineHeightMm, fontSize);
        }
      }
    },
  };
}

/**
 * Generates a clean, vector-based, multi-page PDF document Blob using a Table Engine (jspdf-autotable).
 * Guarantees zero text overflow outside margins for links, wikilinks, quotes, and code blocks,
 * natively formats markdown tables, and renders all emoticons/emojis with high-resolution canvas images.
 */
export async function generateNotePdfBlob(note: Note, folderTitle: string = 'Qalam Note'): Promise<Blob> {
  if (!note) {
    return new Blob([], { type: 'application/pdf' });
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm
  const maxPageY = pageHeight - 18; // bottom margin threshold

  let currentY = margin;

  const ensureSpace = (neededHeight: number = 10) => {
    if (currentY + neededHeight > maxPageY) {
      doc.addPage();
      currentY = margin;
    }
  };

  const emojiHooks = createEmojiTableHooks(doc);

  // 1. Document Header & Metadata Box
  const cleanTitle = convertEmoticonsAndShortcodes(note.title || 'Catatan Tanpa Judul');
  const dateStr = new Date(note.updated_time || Date.now()).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  let metaInfo = `Folder: ${folderTitle || 'Qalam Note'}   |   Diperbarui: ${dateStr}`;
  if (note.tags && note.tags.length > 0) {
    metaInfo += `   |   Tag: #${note.tags.join(', #')}`;
  }
  metaInfo = convertEmoticonsAndShortcodes(metaInfo);

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin, bottom: 18 },
    tableWidth: contentWidth,
    body: [
      [{ content: cleanTitle, styles: { fontStyle: 'bold', fontSize: 16.5, textColor: [15, 23, 42], cellPadding: { top: 1, bottom: 2, left: 0, right: 0 } } }],
      [{ content: metaInfo, styles: { fontStyle: 'normal', fontSize: 8.5, textColor: [100, 116, 139], cellPadding: { top: 1, bottom: 3, left: 0, right: 0 } } }],
    ],
    theme: 'plain',
    willDrawCell: emojiHooks.willDrawCell,
    didDrawCell: (data) => {
      emojiHooks.didDrawCell(data);
      if (data.row.index === 1) {
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.4);
        doc.line(margin, data.cell.y + data.cell.height + 1.2, margin + contentWidth, data.cell.y + data.cell.height + 1.2);
      }
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;

  // 2. Parse Note Body
  const rawBody = (note.body || '').trim() || (note.body_html ? note.body_html.replace(/<[^>]+>/g, ' ') : '');
  const bodyWithEmoticons = convertEmoticonsAndShortcodes(rawBody);
  const lines = bodyWithEmoticons.split('\n');

  let lineIdx = 0;
  while (lineIdx < lines.length) {
    const rawLine = lines[lineIdx];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      currentY += 2;
      lineIdx++;
      continue;
    }

    // 1. Fenced Code Blocks
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      lineIdx++;
      const codeLines: string[] = [];
      while (lineIdx < lines.length && !lines[lineIdx].trim().startsWith('```')) {
        codeLines.push(lines[lineIdx]);
        lineIdx++;
      }
      if (lineIdx < lines.length && lines[lineIdx].trim().startsWith('```')) {
        lineIdx++; // consume closing fence
      }

      ensureSpace(12);
      const codeContent = codeLines.join('\n') || ' ';

      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin, bottom: 18 },
        tableWidth: contentWidth,
        body: [
          [{
            content: codeContent,
            styles: {
              font: 'courier',
              fontStyle: 'normal',
              fontSize: 8.5,
              textColor: [15, 23, 42],
              fillColor: [248, 250, 252],
              cellPadding: 3.5,
              overflow: 'linebreak',
            },
          }],
        ],
        theme: 'plain',
        willDrawCell: emojiHooks.willDrawCell,
        didDrawCell: (data) => {
          emojiHooks.didDrawCell(data);
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

      currentY = (doc as any).lastAutoTable.finalY + 3;
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

        ensureSpace(14);
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
            cellPadding: 2,
          },
          bodyStyles: {
            textColor: [30, 41, 59],
            fontSize: 8.5,
            cellPadding: 2,
            overflow: 'linebreak',
          },
          alternateRowStyles: {
            fillColor: [253, 254, 255],
          },
          willDrawCell: emojiHooks.willDrawCell,
          didDrawCell: emojiHooks.didDrawCell,
        });

        currentY = (doc as any).lastAutoTable.finalY + 3.5;
        continue;
      }
    }

    // 3. Blockquotes (> ...)
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (lineIdx < lines.length && lines[lineIdx].trim().startsWith('>')) {
        quoteLines.push(lines[lineIdx].trim().replace(/^>\s?/, ''));
        lineIdx++;
      }

      ensureSpace(10);
      const quoteContent = cleanMarkdownText(quoteLines.join(' '));

      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin, bottom: 18 },
        tableWidth: contentWidth,
        body: [
          [{
            content: quoteContent,
            styles: {
              fontStyle: 'italic',
              fontSize: 9.5,
              textColor: [51, 65, 85],
              fillColor: [248, 250, 252],
              cellPadding: { top: 2.5, bottom: 2.5, left: 6, right: 3 },
              overflow: 'linebreak',
            },
          }],
        ],
        theme: 'plain',
        willDrawCell: emojiHooks.willDrawCell,
        didDrawCell: (data) => {
          emojiHooks.didDrawCell(data);
          doc.setDrawColor(59, 130, 246);
          doc.setLineWidth(1.2);
          doc.line(data.cell.x, data.cell.y, data.cell.x, data.cell.y + data.cell.height);
        },
      });

      currentY = (doc as any).lastAutoTable.finalY + 3;
      continue;
    }

    // 4. Horizontal Dividers (---, ***, ___)
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      ensureSpace(6);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, currentY + 1.5, margin + contentWidth, currentY + 1.5);
      currentY += 4.5;
      lineIdx++;
      continue;
    }

    // 5. Headings (# H1, ## H2, ### H3, #### H4)
    if (trimmed.startsWith('#')) {
      const match = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        const headingText = cleanMarkdownText(match[2]);
        const fontSize = level === 1 ? 15 : level === 2 ? 13 : level === 3 ? 11 : 10;
        const textColor: [number, number, number] =
          level === 1 ? [15, 23, 42] : level === 2 ? [30, 41, 59] : [51, 65, 85];

        ensureSpace(8);
        autoTable(doc, {
          startY: currentY,
          margin: { left: margin, right: margin, bottom: 18 },
          tableWidth: contentWidth,
          body: [
            [{
              content: headingText,
              styles: {
                fontStyle: 'bold',
                fontSize: fontSize,
                textColor: textColor,
                cellPadding: { top: level === 1 ? 2.5 : 1.5, bottom: 1.5, left: 0, right: 0 },
                overflow: 'linebreak',
              },
            }],
          ],
          theme: 'plain',
          willDrawCell: emojiHooks.willDrawCell,
          didDrawCell: (data) => {
            emojiHooks.didDrawCell(data);
            if (level === 1) {
              doc.setDrawColor(241, 245, 249);
              doc.setLineWidth(0.4);
              doc.line(margin, data.cell.y + data.cell.height + 0.5, margin + contentWidth, data.cell.y + data.cell.height + 0.5);
            }
          },
        });

        currentY = (doc as any).lastAutoTable.finalY + (level === 1 ? 3 : 2);
        lineIdx++;
        continue;
      }
    }

    // 6. Checklists (- [ ], - [x], * [ ], * [x])
    if (/^[-*]\s*\[([ xX])\]\s*(.*)$/.test(trimmed)) {
      const match = trimmed.match(/^[-*]\s*\[([ xX])\]\s*(.*)$/);
      const isDone = match ? match[1].toLowerCase() === 'x' : false;
      const checkText = cleanMarkdownText(match ? match[2] : '');

      ensureSpace(6);
      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin, bottom: 18 },
        tableWidth: contentWidth,
        columns: [
          { dataKey: 'check', header: '' },
          { dataKey: 'text', header: '' },
        ],
        body: [
          {
            check: '',
            text: checkText,
          },
        ],
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
        willDrawCell: emojiHooks.willDrawCell,
        didDrawCell: (data) => {
          emojiHooks.didDrawCell(data);
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

      currentY = (doc as any).lastAutoTable.finalY + 1.2;
      lineIdx++;
      continue;
    }

    // 7. Numbered Lists (1. Item)
    if (/^\d+\.\s+(.*)$/.test(trimmed)) {
      const match = trimmed.match(/^(\d+\.)\s+(.*)$/);
      const numLabel = match ? match[1] : '1.';
      const listText = cleanMarkdownText(match ? match[2] : '');

      ensureSpace(6);
      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin, bottom: 18 },
        tableWidth: contentWidth,
        columns: [
          { dataKey: 'num', header: '' },
          { dataKey: 'text', header: '' },
        ],
        body: [
          { num: numLabel, text: listText },
        ],
        columnStyles: {
          num: {
            cellWidth: 7,
            fontSize: 9,
            fontStyle: 'bold',
            textColor: [59, 130, 246],
            cellPadding: { top: 1, bottom: 1, left: 0, right: 1 },
          },
          text: {
            cellWidth: contentWidth - 7,
            fontSize: 9.5,
            textColor: [30, 41, 59],
            cellPadding: { top: 1, bottom: 1, left: 1, right: 0 },
            overflow: 'linebreak',
          },
        },
        theme: 'plain',
        willDrawCell: emojiHooks.willDrawCell,
        didDrawCell: emojiHooks.didDrawCell,
      });

      currentY = (doc as any).lastAutoTable.finalY + 1.2;
      lineIdx++;
      continue;
    }

    // 8. Bullet Lists (- Item, * Item)
    if (/^[-*+]\s+(.*)$/.test(trimmed)) {
      const match = trimmed.match(/^[-*+]\s+(.*)$/);
      const listText = cleanMarkdownText(match ? match[1] : '');

      ensureSpace(6);
      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin, bottom: 18 },
        tableWidth: contentWidth,
        columns: [
          { dataKey: 'bullet', header: '' },
          { dataKey: 'text', header: '' },
        ],
        body: [
          { bullet: '', text: listText },
        ],
        columnStyles: {
          bullet: { cellWidth: 5, cellPadding: 1 },
          text: {
            cellWidth: contentWidth - 5,
            fontSize: 9.5,
            textColor: [30, 41, 59],
            cellPadding: { top: 1, bottom: 1, left: 1, right: 0 },
            overflow: 'linebreak',
          },
        },
        theme: 'plain',
        willDrawCell: emojiHooks.willDrawCell,
        didDrawCell: (data) => {
          emojiHooks.didDrawCell(data);
          if (data.column.dataKey === 'bullet') {
            doc.setFillColor(59, 130, 246);
            doc.circle(data.cell.x + 2, data.cell.y + 2.5, 0.75, 'F');
          }
        },
      });

      currentY = (doc as any).lastAutoTable.finalY + 1.2;
      lineIdx++;
      continue;
    }

    // 9. Standard Paragraph (with link & wikilink & emoji auto-wrap)
    const paraText = cleanMarkdownText(trimmed);
    ensureSpace(6);
    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin, bottom: 18 },
      tableWidth: contentWidth,
      body: [
        [{
          content: paraText,
          styles: {
            fontSize: 9.5,
            textColor: [30, 41, 59],
            cellPadding: { top: 1, bottom: 1, left: 0, right: 0 },
            overflow: 'linebreak',
          },
        }],
      ],
      theme: 'plain',
      willDrawCell: emojiHooks.willDrawCell,
      didDrawCell: emojiHooks.didDrawCell,
    });

    currentY = (doc as any).lastAutoTable.finalY + 2.5;
    lineIdx++;
  }

  // 3. Document Footers with Page Numbers Across All Pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, margin + contentWidth, pageHeight - 12);
    doc.text('Qalam Note  •  Local-First & Encrypted Notes', margin, pageHeight - 7);
    doc.text(`Halaman ${p} dari ${totalPages}`, margin + contentWidth, pageHeight - 7, { align: 'right' });
  }

  return doc.output('blob');
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
 * Prints or exports note via printer dialog
 */
export function exportNoteToPrint(note: Note, folderTitle: string = 'Qalam Note'): void {
  if (!note) return;

  const htmlBody = markdownToHtml(note.body || '', 'light');

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
  <title>${note.title || 'Catatan Qalam'}</title>
  <style>
    @page { margin: 15mm; size: auto; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
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
    pre, code { font-family: monospace; background: #f1f5f9; border-radius: 4px; }
    pre { padding: 12px; border: 1px solid #cbd5e1; overflow-x: auto; }
    code:not(pre code) { padding: 2px 5px; font-size: 12px; }
    blockquote { border-left: 4px solid #3b82f6; margin: 12px 0; padding: 6px 16px; color: #475569; background: #f8fafc; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
    th { background: #f1f5f9; font-weight: 600; }
    img { max-width: 100%; height: auto; border-radius: 6px; }
    .print-footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="print-header">
    <h1 class="print-title">${note.title || 'Catatan Tanpa Judul'}</h1>
    <div class="print-meta">
      <span>📂 <strong>Folder:</strong> ${folderTitle}</span>
      <span>🕒 <strong>Diperbarui:</strong> ${new Date(note.updated_time).toLocaleString()}</span>
      ${note.tags && note.tags.length > 0 ? `<span>🏷️ <strong>Tag:</strong> #${note.tags.join(', #')}</span>` : ''}
    </div>
  </div>
  <div class="print-body">
    ${htmlBody}
  </div>
  <div class="print-footer">
    Dicetak dari Qalam Note &bull; Local-First & Encrypted Notes
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
 * Backward compatibility alias: defaults to direct PDF export
 */
export async function exportNoteToPdf(note: Note, folderTitle: string = 'Qalam Note'): Promise<void> {
  await exportNoteToPdfDirect(note, folderTitle);
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
    let baseTitle = sanitizeFileName(note.title, `catatan-${i + 1}`);
    
    // Deduplicate filename if multiple notes have the same title
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
        const htmlBody = markdownToHtml(note.body || '', 'light');
        const standaloneHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${note.title || 'Catatan'}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 20px; color: #0f172a; }
    h1 { border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
    pre { background: #f1f5f9; padding: 12px; border-radius: 6px; overflow-x: auto; }
    code { font-family: monospace; }
  </style>
</head>
<body>
  <h1>${note.title || 'Catatan Tanpa Judul'}</h1>
  <p style="font-size: 12px; color: #64748b;">Folder: ${folderTitle} | Diperbarui: ${new Date(note.updated_time).toLocaleString()}</p>
  <div>${htmlBody}</div>
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
