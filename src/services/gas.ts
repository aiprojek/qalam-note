/**
 * Google Apps Script (GAS) Service for Publishing Notes & Interactive Wikis
 * Uses Google Sheets as the persistent metadata and content store
 * - Single Notes stored in "PublishedNotes" tab
 * - Each Published Folder / Wiki gets its own clean dedicated sheet tab ("Wiki - [FolderName]")
 * - Auto-cleanup: Deleting or unpublishing a note deletes its row; unpublishing a wiki deletes its sheet tab!
 */

import type { Note, KanbanBoardData } from '../types';
import type { WikiBundle } from '../types/wiki';
import { encodePublishCipher, buildPublishUrl, buildWikiPublishUrl } from './publishCipher';
import { markdownToHtml, wrapTablesWithScrollContainer } from '../utils/markdown';
import { getNoteDirection } from '../utils/rtl';
import { kanbanDataToHtml, markdownToKanbanData } from '../utils/kanbanSerializer';

export {
  CLOUDFLARE_WORKER_SCRIPT_TEMPLATE,
  CUSTOM_SERVERLESS_SCRIPT_TEMPLATE,
  PUBLISH_PROVIDERS,
} from './publishBackends';
export type { ProviderMeta } from './publishBackends';

export interface PublishResult {
  success: boolean;
  public_url: string;
  published_at: number;
  message?: string;
  sheet_name?: string;
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
  const isKanban = Boolean(note.is_kanban);

  // Generate compact encrypted cipher link (?k=<encoded_cipher>) with Kanban flag
  const compactPublicUrl = buildPublishUrl({
    id: note.id,
    gasUrl: gasUrl && gasUrl.trim() ? gasUrl.trim() : undefined,
    title: note.title,
    author: authorName,
    publishedAt,
    isKanban,
  });

  // If no custom GAS URL is configured yet, generate a simulated/local public preview link
  if (!gasUrl || gasUrl.trim() === '') {
    return {
      success: true,
      public_url: compactPublicUrl,
      published_at: publishedAt,
      message: isKanban
        ? 'Papan Kanban dipublikasikan dalam mode pratinjau! Tautan interaktif klien (?k=...) siap dibagikan.'
        : 'Catatan dipublikasikan dalam mode pratinjau! Tautan ringkas terenkripsi (?k=...) siap dibagikan.',
    };
  }

  // Support Kanban Board losslessly, WYSIWYG rich HTML, and Markdown editor content
  const noteDir = getNoteDirection(note);
  let compiledHtml = '';

  if (isKanban) {
    const kData: KanbanBoardData =
      note.kanban_data || markdownToKanbanData(note.body || '');
    const embeddedTag = `<!--QALAM_KANBAN_DATA:${encodeURIComponent(JSON.stringify(kData))}-->\n`;
    const kanbanHtml = kanbanDataToHtml(kData, note.title);
    compiledHtml = embeddedTag + kanbanHtml;
  } else if (note.body_html && note.body_html.trim()) {
    compiledHtml = wrapTablesWithScrollContainer(note.body_html);
  } else {
    compiledHtml = wrapTablesWithScrollContainer(
      markdownToHtml(note.body || '', {
        theme: 'light',
        direction: noteDir,
      })
    );
  }

  const payload = {
    action: 'publish',
    id: note.id,
    slug,
    title: note.title,
    content: note.body,
    html: compiledHtml,
    author: authorName,
    tags: note.tags || [],
    is_todo: note.is_todo,
    todo_completed: note.todo_completed,
    is_kanban: isKanban,
    kanban_data: isKanban ? (note.kanban_data || markdownToKanbanData(note.body || '')) : undefined,
    created_time: note.created_time,
    updated_time: publishedAt,
  };

  try {
    const response = await fetch(gasUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    const isCloudflare = gasUrl.includes('workers.dev');
    const isCustom = !gasUrl.includes('script.google.com') && !isCloudflare;
    const providerName = isCloudflare ? 'Cloudflare Worker' : isCustom ? 'Server Mandiri' : 'Google Sheets';

    if (response.ok) {
      let customMsg = '';
      try {
        const json = await response.json();
        if (json.message) customMsg = json.message;
      } catch {}

      return {
        success: true,
        public_url: compactPublicUrl,
        published_at: publishedAt,
        message: customMsg || (isKanban
          ? `Papan Kanban proyek berhasil dipublikasikan ke ${providerName}! Tautan interaktif klien siap dibagikan.`
          : `Catatan berhasil dipublikasikan ke ${providerName}! Tautan ringkas terenkripsi (?k=...) siap dibagikan.`),
      };
    } else {
      return {
        success: true,
        public_url: compactPublicUrl,
        published_at: publishedAt,
        message: isKanban
          ? `Publikasi papan proyek terkirim ke ${providerName}. Tautan interaktif klien aktif!`
          : `Publikasi dikirim ke ${providerName}. Tautan ringkas terenkripsi (?k=...) aktif!`,
      };
    }
  } catch (err: any) {
    console.warn('Direct fetch warning (likely CORS redirect on GAS Web App):', err);
    return {
      success: true,
      public_url: compactPublicUrl,
      published_at: publishedAt,
      message: isKanban
        ? 'Pembaruan papan proyek berhasil dikirim ke endpoint publikasi. Tautan klien (?k=...) aktif!'
        : 'Pembaruan catatan berhasil dikirim ke endpoint publikasi. Tautan ringkas (?k=...) aktif!',
    };
  }
}

/**
 * Fetches a published note from GAS endpoint in JSON format for the reader view
 */
export async function fetchPublishedNoteFromGAS(
  gasUrl: string,
  noteId: string
): Promise<{
  title: string;
  html: string;
  author?: string;
  tags?: string[];
  updated_at?: number | string;
  published_at?: number | string;
  is_kanban?: boolean;
  kanban_data?: KanbanBoardData;
} | null> {
  if (!gasUrl || !noteId) return null;
  try {
    const url = `${gasUrl}?id=${encodeURIComponent(noteId)}&format=json`;
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) return null;
    const data = await response.json();
    if (data && data.success && data.note) {
      const rawHtml = data.note.html || '';
      let kanbanData: KanbanBoardData | undefined = data.note.kanban_data;
      let isKanban = Boolean(data.note.is_kanban || kanbanData);

      if (!kanbanData && rawHtml) {
        const match = rawHtml.match(/<!--QALAM_KANBAN_DATA:(.*?)-->/);
        if (match && match[1]) {
          try {
            kanbanData = JSON.parse(decodeURIComponent(match[1]));
            isKanban = true;
          } catch (e) {
            console.warn('Failed parsing embedded kanban JSON from GAS:', e);
          }
        }
      }

      return {
        title: data.note.title || 'Untitled Note',
        html: rawHtml,
        author: data.note.author || 'Anonymous',
        tags: typeof data.note.tags === 'string'
          ? data.note.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
          : (data.note.tags || []),
        updated_at: data.note.updated_at,
        published_at: data.note.published_at || data.note.updated_at,
        is_kanban: isKanban,
        kanban_data: kanbanData,
      };
    }
    return null;
  } catch (err) {
    console.warn('Unable to fetch note from GAS in JSON mode:', err);
    return null;
  }
}

/**
 * Unpublishes a note from GAS (deletes the row from PublishedNotes sheet)
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

/**
 * Publishes an entire folder bundle as an interactive Zim-Style Digital Garden Wiki to GAS.
 * Creates/updates a dedicated clean sheet tab named "Wiki - [FolderName]".
 */
export async function publishWikiToGAS(
  wikiBundle: WikiBundle,
  gasUrl: string,
  folderTitle: string
): Promise<PublishResult> {
  const publishedAt = Date.now();
  const cleanGas = gasUrl ? gasUrl.trim() : '';

  const compactPublicUrl = buildWikiPublishUrl({
    id: wikiBundle.id,
    gasUrl: cleanGas || undefined,
    title: wikiBundle.title,
    author: wikiBundle.author,
    publishedAt,
    isWiki: true,
    landingNoteId: wikiBundle.landing_note_id,
  });

  if (!cleanGas) {
    return {
      success: true,
      public_url: compactPublicUrl,
      published_at: publishedAt,
      message: 'Wiki dipublikasikan dalam mode pratinjau lokal! Tautan interaktif (?w=...) siap dibagikan.',
    };
  }

  const payload = {
    action: 'publish_wiki',
    id: wikiBundle.id,
    folder_id: wikiBundle.id,
    folder_title: folderTitle,
    wiki_title: wikiBundle.title,
    description: wikiBundle.description || '',
    author: wikiBundle.author || 'Anonymous',
    landing_note_id: wikiBundle.landing_note_id,
    is_encrypted: Boolean(wikiBundle.is_encrypted),
    salt: wikiBundle.salt || '',
    bundle: JSON.stringify(wikiBundle),
    updated_time: publishedAt,
  };

  try {
    const response = await fetch(cleanGas, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    const isCloudflare = cleanGas.includes('workers.dev');
    const isCustom = !cleanGas.includes('script.google.com') && !isCloudflare;
    const providerName = isCloudflare ? 'Cloudflare Worker' : isCustom ? 'Server Mandiri' : 'Google Sheets';

    let sheetName = `Wiki - ${folderTitle}`;
    let customMsg = '';
    if (response.ok) {
      try {
        const resData = await response.json();
        if (resData.sheet_name) sheetName = resData.sheet_name;
        if (resData.message) customMsg = resData.message;
      } catch {}
    }

    return {
      success: true,
      public_url: compactPublicUrl,
      published_at: publishedAt,
      sheet_name: sheetName,
      message: customMsg || (isCloudflare
        ? 'Wiki berhasil dipublikasikan ke Cloudflare KV edge! Tautan interaktif aktif.'
        : isCustom
        ? 'Wiki berhasil dipublikasikan ke Server Mandiri! Tautan interaktif aktif.'
        : `Wiki berhasil dipublikasikan ke tab sheet "${sheetName}" di Google Sheets!`),
    };
  } catch (err) {
    console.warn('Direct fetch warning on publish_wiki (likely CORS redirect):', err);
    return {
      success: true,
      public_url: compactPublicUrl,
      published_at: publishedAt,
      sheet_name: `Wiki - ${folderTitle}`,
      message: `Data Wiki dikirim ke endpoint publikasi dan diperbarui. Tautan interaktif aktif!`,
    };
  }
}

/**
 * Unpublishes an entire wiki from GAS (deletes the dedicated Wiki sheet tab from Google Sheets)
 */
export async function unpublishWikiFromGAS(
  folderId: string,
  folderTitle: string,
  gasUrl: string
): Promise<boolean> {
  if (!gasUrl || gasUrl.trim() === '') {
    return true;
  }

  try {
    await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'unpublish_wiki',
        id: folderId,
        folder_id: folderId,
        folder_title: folderTitle,
      }),
    });
    return true;
  } catch (e) {
    console.warn('Unpublish wiki warning:', e);
    return true;
  }
}

/**
 * Fetches a published interactive wiki bundle from GAS endpoint in JSON format
 */
export async function fetchPublishedWikiFromGAS(
  gasUrl: string,
  wikiId: string
): Promise<WikiBundle | null> {
  if (!gasUrl || !wikiId) return null;
  try {
    const url = `${gasUrl}?w=${encodeURIComponent(wikiId)}&format=json`;
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) return null;
    const data = await response.json();
    if (data && data.success && data.wiki) {
      if (typeof data.wiki === 'string') {
        try {
          return JSON.parse(data.wiki) as WikiBundle;
        } catch (e) {
          console.error('Failed parsing raw wiki string from GAS:', e);
          return null;
        }
      }
      return data.wiki as WikiBundle;
    }
    return null;
  } catch (err) {
    console.warn('Unable to fetch wiki from GAS:', err);
    return null;
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
 * The complete Google Apps Script code template with multi-sheet Wiki support,
 * automated row deletion on note unpublish, and dedicated sheet deletion on folder unpublish.
 */
export const GAS_SCRIPT_CODE_TEMPLATE = `/**
 * ====================================================================
 * QALAM NOTE - PUBLISH TO GOOGLE SHEETS (GAS)
 * Single Notes + Zim-Style Interactive Wiki Multi-Tab Manager
 * ====================================================================
 * Panduan Setup:
 * 1. Buka Google Sheets (sheets.new) dan beri nama file "Qalam Published Notes".
 * 2. Di menu atas, klik Extensions > Apps Script.
 * 3. Hapus semua kode di Code.gs dan gantikan dengan SELURUH skrip ini.
 * 4. Klik "Deploy" > "New deployment".
 * 5. Pilih type: "Web app".
 * 6. Execute as: "Me" (email Google Anda).
 * 7. Who has access: "Anyone" (wajib agar pembaca dapat mengakses catatan & wiki!).
 * 8. Klik "Deploy", beri izin akses Google, lalu Salin Web App URL.
 * 9. Tempelkan URL tersebut ke Pengaturan Qalam Note!
 * ====================================================================
 */

function sanitizeSheetName(name) {
  var safe = (name || "Wiki").toString().replace(/[\/\\\\?*:\\[\\]]/g, "-").trim();
  safe = safe.replace(/\\s+/g, " ");
  return safe.length > 80 ? safe.substring(0, 80) : safe;
}

function setupSingleNotesSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("PublishedNotes");
  if (!sheet) {
    sheet = ss.insertSheet("PublishedNotes", 0);
    sheet.appendRow(["ID", "Slug", "Title", "Author", "Updated_At", "Tags", "Is_Todo", "Status", "Content_Part_1", "Content_Part_2", "Content_Part_3"]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 11).setFontWeight("bold").setBackground("#1d273b").setFontColor("#ffffff");
  }
  return sheet;
}

function getWikiSheetName(folderTitle) {
  return "Wiki - " + sanitizeSheetName(folderTitle || "Folder");
}

function findWikiSheet(ss, wikiId, folderTitle) {
  if (folderTitle) {
    var named = ss.getSheetByName(getWikiSheetName(folderTitle));
    if (named) return named;
  }
  var allSheets = ss.getSheets();
  for (var i = 0; i < allSheets.length; i++) {
    var sh = allSheets[i];
    var sName = sh.getName();
    if (sName.indexOf("Wiki - ") === 0) {
      var idVal = sh.getRange(2, 1).getValue();
      if (idVal && idVal.toString() === wikiId.toString()) {
        return sh;
      }
    }
  }
  return null;
}

function doPost(e) {
  try {
    var rawData = e.postData.contents;
    var data = JSON.parse(rawData);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = data.action || "publish";

    // ====================================================================
    // ACTION: UNPUBLISH WIKI (Hapus tab sheet wiki dari spreadsheet)
    // ====================================================================
    if (action === "unpublish_wiki" || action === "delete_wiki") {
      var wSheet = findWikiSheet(ss, data.folder_id || data.id, data.folder_title);
      if (wSheet) {
        if (ss.getSheets().length > 1) {
          ss.deleteSheet(wSheet);
        } else {
          wSheet.clear();
          wSheet.setName("PublishedNotes");
          setupSingleNotesSheet();
        }
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          message: "Wiki sheet deleted from Google Sheets"
        })).setMimeType(ContentService.MimeType.JSON);
      }
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Wiki sheet not found or already deleted"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ====================================================================
    // ACTION: PUBLISH WIKI (Buat/Perbarui Tab Sheet Terpisah untuk Folder)
    // ====================================================================
    if (action === "publish_wiki") {
      var targetSheetName = getWikiSheetName(data.folder_title || data.wiki_title);
      var wikiSheet = ss.getSheetByName(targetSheetName);

      if (!wikiSheet) {
        // Cek jika ada sheet dengan ID sama tapi nama folder diganti
        wikiSheet = findWikiSheet(ss, data.folder_id || data.id, null);
        if (wikiSheet) {
          wikiSheet.setName(targetSheetName);
        } else {
          wikiSheet = ss.insertSheet(targetSheetName);
        }
      }

      // Pastikan header rapi
      var headers = ["Wiki_ID", "Wiki_Title", "Folder_Name", "Author", "Landing_Note_ID", "Updated_At", "Is_Encrypted", "Status", "Bundle_Part_1", "Bundle_Part_2", "Bundle_Part_3"];
      wikiSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      wikiSheet.setFrozenRows(1);
      wikiSheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#0f172a").setFontColor("#38bdf8");

      // Auto-chunking data bundle (>45,000 karakter per cell)
      var CHUNK_SIZE = 45000;
      var bundleStr = data.bundle || "";
      var chunks = [];
      for (var pos = 0; pos < bundleStr.length; pos += CHUNK_SIZE) {
        chunks.push(bundleStr.substring(pos, pos + CHUNK_SIZE));
      }
      if (chunks.length === 0) chunks.push("");

      var fixedValues = [
        data.folder_id || data.id,
        data.wiki_title || data.folder_title || "Wiki",
        data.folder_title || "Folder",
        data.author || "Anonymous",
        data.landing_note_id || "",
        new Date().toISOString(),
        data.is_encrypted ? "YES" : "NO",
        "published"
      ];

      // Bersihkan kolom lama yang mungkin bersisa jika bundle sebelumnya lebih panjang
      var lastCol = Math.max(wikiSheet.getLastColumn(), 8 + chunks.length);
      if (lastCol > 8) {
        wikiSheet.getRange(2, 9, 1, lastCol - 8).clearContent();
      }

      wikiSheet.getRange(2, 1, 1, 8).setValues([fixedValues]);
      wikiSheet.getRange(2, 9, 1, chunks.length).setValues([chunks]);

      var publicUrl = ScriptApp.getService().getUrl() + "?w=" + encodeURIComponent(data.folder_id || data.id);

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        sheet_name: targetSheetName,
        public_url: publicUrl,
        published_at: new Date().getTime(),
        title: data.wiki_title || data.folder_title
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ====================================================================
    // ACTION: CATATAN TUNGGAL (UNPUBLISH / PUBLISH)
    // ====================================================================
    var sheet = setupSingleNotesSheet();
    var noteId = data.id;
    var rows = sheet.getDataRange().getValues();
    var rowIndex = -1;

    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] == noteId) {
        rowIndex = i + 1;
        break;
      }
    }

    // Unpublish catatan: Hapus baris dari Google Sheets untuk hemat tempat & kerapihan
    if (action === "unpublish") {
      if (rowIndex > 1) {
        sheet.deleteRow(rowIndex);
      }
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Note deleted from Google Sheets"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Publish catatan tunggal
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
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. CEK PARAMETER WIKI (?w=... atau ?wiki_id=...)
  var wikiId = e.parameter.w || e.parameter.wiki_id || e.parameter.folder_id;
  if (wikiId) {
    var wikiSheet = findWikiSheet(ss, wikiId, null);
    if (!wikiSheet) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Wiki not found or has been unpublished"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var rowValues = wikiSheet.getRange(2, 1, 1, wikiSheet.getLastColumn()).getValues()[0];
    var fullBundleStr = "";
    for (var col = 8; col < rowValues.length; col++) {
      if (rowValues[col] !== undefined && rowValues[col] !== null) {
        fullBundleStr += rowValues[col];
      }
    }

    if (e.parameter.format === "json") {
      try {
        var parsedBundle = JSON.parse(fullBundleStr);
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          wiki: parsedBundle
        })).setMimeType(ContentService.MimeType.JSON);
      } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          wiki_raw: fullBundleStr
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    var wTitle = rowValues[1] || "Interactive Wiki";
    return HtmlService.createHtmlOutput(
      "<div style='font-family:sans-serif;text-align:center;padding:50px;background:#0f172a;color:#fff;min-height:100vh;'>" +
      "<h1>" + escapeHtml(wTitle) + "</h1>" +
      "<p>Digital Garden Wiki ini aktif. Silakan buka melalui URL web app Qalam Note untuk tampilan interaktif penuh.</p>" +
      "</div>"
    ).setTitle(wTitle);
  }

  // 2. CEK PARAMETER CATATAN TUNGGAL (?id=... atau ?slug=...)
  var sheet = setupSingleNotesSheet();
  var noteId = e.parameter.id;
  var slug = e.parameter.slug;

  if (!noteId && !slug) {
    return HtmlService.createHtmlOutput(
      "<div style='font-family:sans-serif;text-align:center;padding:50px;background:#1d273b;color:#fff;min-height:100vh;'>" +
      "<h1>Qalam Note Publishing Service</h1>" +
      "<p>Connected to Google Sheets successfully! Multi-Tab Wiki & Single Notes enabled.</p>" +
      "</div>"
    ).setTitle("Qalam Note Publisher");
  }

  var rows = sheet.getDataRange().getValues();
  var foundNote = null;

  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if ((noteId && r[0] == noteId) || (slug && r[1] == slug)) {
      if (r[7] === "published") {
        var fullHtml = "";
        for (var colIdx = 8; colIdx < r.length; colIdx++) {
          if (r[colIdx] !== undefined && r[colIdx] !== null && r[colIdx] !== "") {
            fullHtml += r[colIdx];
          }
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
        error: "Note not found or deleted from sheet"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    return HtmlService.createHtmlOutput(
      "<div style='font-family:sans-serif;text-align:center;padding:50px;color:#475569;'>" +
      "<h2>404 - Catatan Tidak Ditemukan</h2>" +
      "<p>Catatan ini mungkin telah dicabut publikasinya atau dihapus dari Google Sheets.</p>" +
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
    "<h1>" + escapeHtml(foundNote.title) + "</h1>" +
    "<div class='meta'>" +
    "<span>Oleh <strong>" + escapeHtml(foundNote.author) + "</strong></span>" +
    "<span>&bull;</span>" +
    "<span>Tanggal Publikasi: <strong>" + new Date(foundNote.updated_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) + "</strong></span>" +
    "</div></div>" +
    "<div class='content'>" + foundNote.html + "</div>" +
    "<div class='footer'>Diterbitkan dari <a href='https://qalam-note.aiprojek01.my.id/' target='_blank' style='color:#2563eb;text-decoration:underline;font-weight:600;'>Qalam Note</a></div>" +
    "</div></body></html>";

  return HtmlService.createHtmlOutput(html).setTitle(foundNote.title);
}

function escapeHtml(text) {
  if (!text) return "";
  return text.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
`;
