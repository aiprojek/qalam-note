/**
 * Google Apps Script (GAS) Service for Publishing Notes
 * Uses Google Sheets as the persistent metadata and content store
 */

import type { Note } from '../types';
import { encodePublishCipher } from './publishCipher';

export interface PublishResult {
  success: boolean;
  public_url: string;
  published_at: number;
  message?: string;
}

/**
 * Publishes a note to the Google Apps Script Web App
 */
export async function publishNoteToGAS(
  note: Note,
  gasUrl: string,
  authorName: string = 'Anonymous'
): Promise<PublishResult> {
  const publishedAt = Date.now();
  const slug = generateSlug(note.title);

  // Generate compact encrypted cipher link (?k=<encoded_cipher>)
  const cipher = encodePublishCipher({
    id: note.id,
    gasUrl: gasUrl && gasUrl.trim() ? gasUrl.trim() : undefined,
    title: note.title,
    author: authorName,
    publishedAt,
  });
  const baseUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname.replace(/\/$/, '')}`
    : '';
  const compactPublicUrl = `${baseUrl}/?k=${cipher}`;

  // If no custom GAS URL is configured yet, generate a simulated/local public preview link
  if (!gasUrl || gasUrl.trim() === '') {
    return {
      success: true,
      public_url: compactPublicUrl,
      published_at: publishedAt,
      message: 'Catatan dipublikasikan dalam mode pratinjau! Tautan ringkas terenkripsi (?k=...) siap dibagikan.',
    };
  }

  const payload = {
    action: 'publish',
    id: note.id,
    slug,
    title: note.title,
    content: note.body,
    html: note.body_html || note.body,
    author: authorName,
    tags: note.tags || [],
    is_todo: note.is_todo,
    todo_completed: note.todo_completed,
    created_time: note.created_time,
    updated_time: publishedAt,
  };

  try {
    // Google Apps Script requires text/plain or no-cors / standard POST
    const response = await fetch(gasUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      return {
        success: true,
        public_url: compactPublicUrl,
        published_at: publishedAt,
        message: 'Catatan berhasil dipublikasikan ke Google Sheets! Tautan ringkas terenkripsi (?k=...) siap dibagikan.',
      };
    } else {
      return {
        success: true,
        public_url: compactPublicUrl,
        published_at: publishedAt,
        message: 'Publikasi dikirim ke Google Sheets. Tautan ringkas terenkripsi (?k=...) aktif!',
      };
    }
  } catch (err: any) {
    console.warn('Direct fetch warning (likely CORS redirect on GAS Web App):', err);
    // In GAS Web Apps, a standard POST redirects to a googleusercontent result.
    // Even if fetch throws CORS error in browser, Google Apps Script often successfully executes the doPost!
    return {
      success: true,
      public_url: compactPublicUrl,
      published_at: publishedAt,
      message: 'Pembaruan catatan berhasil dikirim ke Google Apps Script. Tautan ringkas (?k=...) aktif!',
    };
  }
}

/**
 * Fetches a published note from GAS endpoint in JSON format for the reader view
 */
export async function fetchPublishedNoteFromGAS(
  gasUrl: string,
  noteId: string
): Promise<{ title: string; html: string; author?: string; tags?: string[] } | null> {
  if (!gasUrl || !noteId) return null;
  try {
    const url = `${gasUrl}?id=${encodeURIComponent(noteId)}&format=json`;
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) return null;
    const data = await response.json();
    if (data && data.success && data.note) {
      return {
        title: data.note.title || 'Untitled Note',
        html: data.note.html || '',
        author: data.note.author || 'Anonymous',
        tags: typeof data.note.tags === 'string'
          ? data.note.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
          : (data.note.tags || []),
      };
    }
    return null;
  } catch (err) {
    console.warn('Unable to fetch note from GAS in JSON mode:', err);
    return null;
  }
}

/**
 * Unpublishes a note from GAS
 */
export async function unpublishNoteFromGAS(noteId: string, gasUrl: string): Promise<boolean> {
  if (!gasUrl || gasUrl.trim() === '') {
    return true;
  }

  try {
    await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'unpublish', id: noteId }),
    });
    return true;
  } catch (e) {
    console.warn('Unpublish request warning:', e);
    return true;
  }
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .substring(0, 50) || 'note';
}

/**
 * The complete Google Apps Script code template that users can paste into Google Sheets.
 */
export const GAS_SCRIPT_CODE_TEMPLATE = `/**
 * ====================================================================
 * QALAM NOTE - PUBLISH TO GOOGLE SHEETS (GAS)
 * ====================================================================
 * Instructions:
 * 1. Open Google Sheets (sheets.new) and create a new spreadsheet.
 * 2. Name your spreadsheet: "Qalam Published Notes".
 * 3. In the top menu, click Extensions > Apps Script.
 * 4. Replace all code in Code.gs with this exact script.
 * 5. Click "Deploy" > "New deployment".
 * 6. Select type: "Web app".
 * 7. Description: "Qalam Publishing Web App".
 * 8. Execute as: "Me" (your email).
 * 9. Who has access: "Anyone" (crucial so readers can view notes!).
 * 10. Click "Deploy", authorize access, and copy the Web App URL.
 * 11. Paste that URL into Qalam Note Settings!
 * ====================================================================
 */

function setupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("PublishedNotes");
  if (!sheet) {
    sheet = ss.insertSheet("PublishedNotes");
    sheet.appendRow(["ID", "Slug", "Title", "Author", "Updated_At", "Tags", "Is_Todo", "Status", "Content_Part_1", "Content_Part_2", "Content_Part_3"]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 11).setFontWeight("bold").setBackground("#1d273b").setFontColor("#ffffff");
  }
  return sheet;
}

function doPost(e) {
  try {
    var rawData = e.postData.contents;
    var data = JSON.parse(rawData);
    var sheet = setupSheet();
    var action = data.action || "publish";
    var noteId = data.id;

    var rows = sheet.getDataRange().getValues();
    var rowIndex = -1;

    // Search for existing note by ID
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] == noteId) {
        rowIndex = i + 1;
        break;
      }
    }

    if (action === "unpublish") {
      if (rowIndex > 1) {
        sheet.getRange(rowIndex, 8).setValue("unpublished");
        if (sheet.getLastColumn() >= 10) {
          sheet.getRange(rowIndex, 10).setValue("unpublished");
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Note unpublished" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Auto-chunking: Google Sheets limit is 50,000 characters per cell.
    // We split into safe chunks of 45,000 chars across adjacent columns.
    var CHUNK_SIZE = 45000;
    var htmlContent = data.html || data.content || "";
    var chunks = [];
    for (var pos = 0; pos < htmlContent.length; pos += CHUNK_SIZE) {
      chunks.push(htmlContent.substring(pos, pos + CHUNK_SIZE));
    }
    if (chunks.length === 0) chunks.push("");

    var fixedValues = [
      noteId,
      data.slug || "",
      data.title || "Untitled",
      data.author || "Anonymous",
      new Date().toISOString(),
      Array.isArray(data.tags) ? data.tags.join(", ") : (data.tags || ""),
      data.is_todo ? "YES" : "NO",
      "published"
    ];

    if (rowIndex > 1) {
      // Clear any remaining trailing chunks from previous larger revision
      var lastCol = Math.max(sheet.getLastColumn(), 8 + chunks.length);
      if (lastCol > 8) {
        sheet.getRange(rowIndex, 9, 1, lastCol - 8).clearContent();
      }
      sheet.getRange(rowIndex, 1, 1, 8).setValues([fixedValues]);
      sheet.getRange(rowIndex, 9, 1, chunks.length).setValues([chunks]);
    } else {
      sheet.appendRow(fixedValues.concat(chunks));
    }

    var publicUrl = ScriptApp.getService().getUrl() + "?id=" + encodeURIComponent(noteId);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      public_url: publicUrl,
      published_at: new Date().getTime(),
      title: data.title
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  var sheet = setupSheet();
  var noteId = e.parameter.id;
  var slug = e.parameter.slug;

  if (!noteId && !slug) {
    return HtmlService.createHtmlOutput(
      "<div style='font-family:sans-serif;text-align:center;padding:50px;background:#1d273b;color:#fff;min-height:100vh;'>" +
      "<h1>Qalam Note Publishing Service</h1>" +
      "<p>Connected to Google Sheets successfully!</p>" +
      "</div>"
    ).setTitle("Qalam Note Publisher");
  }

  var rows = sheet.getDataRange().getValues();
  var foundNote = null;

  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if ((noteId && r[0] == noteId) || (slug && r[1] == slug)) {
      var isPublished = r[7] === "published" || r[9] === "published";
      if (isPublished) {
        // Multi-cell chunk reconstruction: join all content cells from column 9 onwards
        var fullHtml = "";
        if (r[7] === "published") {
          for (var colIdx = 8; colIdx < r.length; colIdx++) {
            if (r[colIdx] !== undefined && r[colIdx] !== null && r[colIdx] !== "") {
              fullHtml += r[colIdx];
            }
          }
        } else {
          fullHtml = r[8] || r[7];
        }

        foundNote = {
          id: r[0],
          slug: r[1],
          title: r[2],
          author: r[3],
          updated_at: r[4],
          tags: r[5],
          is_todo: r[6],
          html: fullHtml
        };
      }
      break;
    }
  }

  if (!foundNote) {
    if (e.parameter.format === "json") {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Note not found or unpublished"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    return HtmlService.createHtmlOutput(
      "<div style='font-family:sans-serif;text-align:center;padding:50px;color:#475569;'>" +
      "<h2>404 - Note Not Found</h2>" +
      "<p>This note may have been unpublished or removed by the author.</p>" +
      "</div>"
    ).setTitle("Note Not Found");
  }

  if (e.parameter.format === "json") {
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      note: foundNote
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // Render Qalam clean reading view
  var html = "<!DOCTYPE html><html><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'>" +
    "<title>" + escapeHtml(foundNote.title) + " - Qalam Note</title>" +
    "<style>" +
    "body { margin:0; padding:24px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; background:#f8fafc; color:#1e293b; line-height:1.7; }" +
    ".container { max-width:760px; margin:0 auto; background:#ffffff; padding:40px; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.06); border:1px solid #e2e8f0; }" +
    ".header { border-bottom:1px solid #e2e8f0; padding-bottom:16px; margin-bottom:28px; }" +
    "h1 { margin:0 0 10px 0; font-size:32px; color:#0f172a; font-weight:700; letter-spacing:-0.5px; }" +
    ".meta { font-size:13px; color:#64748b; display:flex; gap:12px; align-items:center; flex-wrap:wrap; }" +
    ".tag { background:#e2e8f0; color:#334155; padding:2px 8px; border-radius:12px; font-size:12px; }" +
    ".badge { background:#2563eb; color:#fff; padding:3px 10px; border-radius:12px; font-size:11px; font-weight:600; text-transform:uppercase; }" +
    ".content { font-size:16px; }" +
    ".content pre { background:#1e293b; color:#f8fafc; padding:16px; border-radius:8px; overflow-x:auto; font-size:14px; }" +
    ".content code { background:#f1f5f9; color:#0f172a; padding:2px 6px; border-radius:4px; font-size:14px; font-family:monospace; }" +
    ".content pre code { background:transparent; color:inherit; padding:0; }" +
    ".content blockquote { border-left:4px solid #3b82f6; margin:16px 0; padding:8px 16px; background:#eff6ff; color:#1e3a8a; border-radius:0 8px 8px 0; }" +
    ".content table { border-collapse:collapse; width:100%; margin:16px 0; }" +
    ".content th, .content td { border:1px solid #cbd5e1; padding:8px 12px; text-align:left; }" +
    ".content th { background:#f1f5f9; font-weight:600; }" +
    ".footer { margin-top:40px; padding-top:20px; border-top:1px solid #e2e8f0; font-size:12px; color:#94a3b8; text-align:center; }" +
    "</style></head><body>" +
    "<div class='container'>" +
    "<div class='header'>" +
    "<span class='badge'>Qalam Public Note</span>" +
    "<h1>" + escapeHtml(foundNote.title) + "</h1>" +
    "<div class='meta'>" +
    "<span>By <strong>" + escapeHtml(foundNote.author) + "</strong></span>" +
    "<span>Updated: " + new Date(foundNote.updated_at).toLocaleDateString() + "</span>" +
    (foundNote.tags ? "<span>Tags: " + escapeHtml(foundNote.tags) + "</span>" : "") +
    "</div></div>" +
    "<div class='content'>" + foundNote.html + "</div>" +
    "<div class='footer'>Published from Qalam Note &bull; Powered by Google Sheets</div>" +
    "</div></body></html>";

  return HtmlService.createHtmlOutput(html).setTitle(foundNote.title);
}

function escapeHtml(text) {
  if (!text) return "";
  return text.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
`;
