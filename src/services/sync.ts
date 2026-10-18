/**
 * Qalam Note - Sync Engine (WebDAV & Dropbox)
 */

import {
  db,
  cleanNoteForDb,
  cleanFolderForDb,
  cleanTagForDb,
  getDeletedSyncIds,
  removeDeletedSyncId,
} from '../db';
import type { Note, Folder, SyncConfig, Tag } from '../types';

export interface SyncStatus {
  inProgress: boolean;
  lastSync: number;
  message: string;
  error?: string;
  itemsUploaded: number;
  itemsDownloaded: number;
}

/**
 * Helper to parse timestamps from numeric values or ISO 8601 strings.
 * CRITICAL: Returns 0 for missing or invalid timestamps so stale remote items never
 * erroneously appear "newer" than recently saved local changes.
 */
export function parseSyncTimestamp(val: any): number {
  if (!val) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const num = Number(val);
  if (!isNaN(num) && num > 0) return num;
  if (typeof val === 'string') {
    const cleaned = val.trim().replace(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/, '$1T$2');
    const parsed = Date.parse(cleaned);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 0;
}


export function serializeNoteItem(item: Note | Folder, type: 'note' | 'folder', folderTitle?: string): string {
  const meta: Record<string, any> = {
    id: item.id,
    type_: type === 'note' ? 1 : 2,
    created_time: item.created_time,
    updated_time: item.updated_time,
    is_deleted: item.is_deleted ? 1 : 0,
  };

  let body = '';

  if (type === 'note') {
    const note = item as Note;
    meta.parent_id = note.folder_id || '';
    if (folderTitle) {
      meta.parent_title = folderTitle;
      meta.folder_title = folderTitle;
    }
    meta.is_todo = note.is_todo ? 1 : 0;
    meta.todo_completed = note.todo_completed || 0;
    meta.todo_due = note.todo_due || 0;
    meta.is_favorite = note.is_favorite ? 1 : 0;
    meta.is_pinned = note.is_pinned ? 1 : 0;
    meta.is_encrypted = note.is_encrypted ? 1 : 0;
    meta.tags = (note.tags || []).join(',');
    if (note.is_rtl) meta.is_rtl = 1;
    if (note.text_direction) meta.text_direction = note.text_direction;
    if (note.order !== undefined) meta.order = note.order;
    if (note.encrypted_data) meta.encrypted_data = JSON.stringify(note.encrypted_data);
    if (note.attachments && note.attachments.length > 0) {
      meta.attachments = JSON.stringify(note.attachments);
    }
    body = `${note.title}\n\n${note.body}`;
  } else {
    const folder = item as Folder;
    meta.parent_id = folder.parent_id || '';
    meta.title = folder.title; // Explicitly preserve folder title in metadata for cross-device fidelity
    if (folder.order !== undefined) meta.order = folder.order;
    body = folder.title;
  }

  const metaString = Object.entries(meta)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');

  return `${body}\n\n${metaString}`;
}

export const serializeSyncItem = serializeNoteItem;
export const serializeJoplinItem = serializeNoteItem; // legacy alias

/**
 * Format a Tag into standard serialization
 */
export function serializeTagItem(tag: Tag): string {
  const meta: Record<string, any> = {
    id: tag.id,
    type_: 5,
    created_time: tag.created_time,
    updated_time: tag.updated_time,
  };
  const metaString = Object.entries(meta)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
  return `${tag.title}\n\n${metaString}`;
}

/**
 * Robust parser for serialized sync items (compatible with Joplin/Qalam format)
 */
export function parseSyncItem(rawContent: string): {
  type: 'note' | 'folder' | 'tag' | 'unknown';
  meta: Record<string, string>;
  title: string;
  body: string;
} {
  const lines = rawContent.replace(/\r\n/g, '\n').split('\n');
  const metaLines: string[] = [];
  let splitIndex = lines.length;

  // Scan backwards from bottom to detect trailing metadata block
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (line.trim() === '') {
      if (metaLines.length === 0) {
        // Skip trailing blank lines
        continue;
      }
      // Blank line before metadata marks the end of body
      splitIndex = i;
      break;
    }
    const match = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
    if (match) {
      metaLines.unshift(line);
    } else {
      splitIndex = i + 1;
      break;
    }
  }

  const meta: Record<string, string> = {};
  for (const line of metaLines) {
    const match = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
    if (match) {
      meta[match[1]] = match[2];
    }
  }

  const contentLines = lines.slice(0, splitIndex);
  const rawBody = contentLines.join('\n').trim();

  const typeNum = parseInt(meta.type_ || '1', 10);
  let type: 'note' | 'folder' | 'tag' | 'unknown' = 'unknown';
  if (typeNum === 1) type = 'note';
  else if (typeNum === 2) type = 'folder';
  else if (typeNum === 5) type = 'tag';
  else type = 'unknown';

  if (type === 'note') {
    const firstNewline = rawBody.indexOf('\n');
    let title = '';
    let body = '';
    if (firstNewline === -1) {
      title = rawBody;
      body = '';
    } else {
      title = rawBody.substring(0, firstNewline).trim();
      body = rawBody.substring(firstNewline + 1).replace(/^\n+/, '');
    }
    return { type, meta, title, body };
  } else if (type === 'folder') {
    const folderTitle = (rawBody || meta.title || meta.name || '').trim();
    return { type, meta, title: folderTitle, body: '' };
  } else if (type === 'tag') {
    return { type, meta, title: (rawBody || meta.title || 'tag').trim(), body: '' };
  } else {
    return { type: 'unknown', meta, title: '', body: '' };
  }
}

/**
 * Test WebDAV Connection
 */
export async function testWebDAVConnection(config: SyncConfig['webdav']): Promise<{ success: boolean; message: string }> {
  if (!config.url || !config.username) {
    return { success: false, message: 'Server URL and Username are required.' };
  }

  const cleanUrl = config.url.replace(/\/+$/, '');
  const authHeader = 'Basic ' + window.btoa(`${config.username}:${config.password}`);

  try {
    const response = await fetch(cleanUrl, {
      method: 'PROPFIND',
      headers: {
        'Authorization': authHeader,
        'Depth': '0',
      },
    });

    if (response.ok || response.status === 207 || response.status === 405) {
      return { success: true, message: 'WebDAV server responded successfully!' };
    } else if (response.status === 401) {
      return { success: false, message: 'Authentication failed. Please verify username and password.' };
    } else {
      return { success: false, message: `Server returned HTTP status ${response.status} ${response.statusText}` };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Network/CORS error: ${err.message || 'Could not connect'}. Ensure your WebDAV server allows CORS (Access-Control-Allow-Origin).`,
    };
  }
}

/**
 * Dropbox OAuth PKCE Helper Utilities (Official OAuth Flow)
 */
export function generateDropboxCodeVerifier(): string {
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => ('0' + (byte & 0xff).toString(16)).slice(-2)).join('');
}

export async function generateDropboxCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(digest);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function buildDropboxAuthorizeUrl(appKey: string, codeChallenge: string): string {
  const cleanKey = appKey.trim();
  const params = new URLSearchParams({
    client_id: cleanKey,
    response_type: 'code',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    token_access_type: 'offline',
  });
  return `https://www.dropbox.com/oauth2/authorize?${params.toString()}`;
}

export async function exchangeDropboxCodeForToken(
  appKey: string,
  code: string,
  codeVerifier: string
): Promise<{
  success: boolean;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  account_id?: string;
  message: string;
}> {
  const cleanKey = appKey.trim();
  const cleanCode = code.trim();
  if (!cleanKey) {
    return { success: false, message: 'App Key Dropbox diperlukan.' };
  }
  if (!cleanCode) {
    return { success: false, message: 'Kode otorisasi dari Dropbox diperlukan.' };
  }

  try {
    const body = new URLSearchParams({
      code: cleanCode,
      grant_type: 'authorization_code',
      client_id: cleanKey,
      code_verifier: codeVerifier,
    });

    const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const data = await res.json();
    if (res.ok && data.access_token) {
      return {
        success: true,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        account_id: data.account_id,
        message: 'Otorisasi Dropbox berhasil! Token akses didapatkan.',
      };
    } else {
      const errDesc = data.error_description || data.error || 'Gagal menukarkan kode otorisasi.';
      return { success: false, message: errDesc };
    }
  } catch (err: any) {
    return { success: false, message: `Koneksi gagal: ${err.message}` };
  }
}

export async function refreshDropboxToken(
  appKey: string,
  refreshToken: string
): Promise<{ success: boolean; access_token?: string; message: string }> {
  try {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: appKey,
    });

    const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const data = await res.json();
    if (res.ok && data.access_token) {
      return {
        success: true,
        access_token: data.access_token,
        message: 'Token Dropbox berhasil diperbarui.',
      };
    } else {
      return { success: false, message: data.error_description || 'Gagal memperbarui token.' };
    }
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

/**
 * Test Dropbox Connection
 */
export async function testDropboxConnection(accessToken: string): Promise<{
  success: boolean;
  message: string;
  user?: string;
  email?: string;
  account_id?: string;
}> {
  if (!accessToken || accessToken.trim() === '') {
    return { success: false, message: 'Dropbox Access Token is required.' };
  }

  try {
    const response = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.trim()}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      const displayName = data.name?.display_name || data.email || 'Pengguna Dropbox';
      return {
        success: true,
        message: `Terhubung sebagai ${displayName} (${data.email || ''})`,
        user: displayName,
        email: data.email,
        account_id: data.account_id,
      };
    } else {
      return { success: false, message: 'Token akses Dropbox tidak valid atau sudah kedaluwarsa.' };
    }
  } catch (err: any) {
    return { success: false, message: `Dropbox API connection error: ${err.message}` };
  }
}

/**
 * Helper to normalize Dropbox paths
 */
function normalizeDropboxPath(p?: string): string {
  if (!p) return '/QalamNote';
  const trimmed = p.trim().replace(/\/+$/, '');
  if (!trimmed || trimmed === '/') return '';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

/**
 * Escapes characters for Dropbox-API-Arg to be HTTP header safe
 */
function safeDropboxArg(obj: any): string {
  return JSON.stringify(obj).replace(/[\u007f-\uffff]/g, (c) =>
    '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4)
  );
}

interface RemoteSyncFile {
  name: string;
  pathOrUrl: string;
}

/**
 * List files in Dropbox target directory with pagination and fallback
 */
async function listDropboxFiles(token: string, targetPath: string): Promise<{ files: RemoteSyncFile[]; activeBasePath: string }> {
  const normPath = normalizeDropboxPath(targetPath);

  const fetchEntriesForPath = async (
    pathStr: string,
    recursive: boolean = true
  ): Promise<{ entries: any[]; notFound: boolean }> => {
    const res = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: pathStr,
        recursive,
        include_deleted: false,
      }),
    });

    if (res.status === 409) {
      return { entries: [], notFound: true };
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error_summary || `Dropbox list error: HTTP ${res.status}`);
    }

    const data = await res.json();
    let entries: any[] = data.entries || [];
    let cursor = data.cursor;
    let hasMore = data.has_more;

    while (hasMore && cursor) {
      const contRes = await fetch('https://api.dropboxapi.com/2/files/list_folder/continue', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cursor }),
      });
      if (!contRes.ok) break;
      const contData = await contRes.json();
      if (Array.isArray(contData.entries)) {
        entries = entries.concat(contData.entries);
      }
      cursor = contData.cursor;
      hasMore = contData.has_more;
    }

    return { entries, notFound: false };
  };

  // 1. Try target path (e.g. /QalamNote) with recursive search
  let chosenBasePath = normPath;
  let result = await fetchEntriesForPath(normPath, true);
  let mdEntries = (result.entries || []).filter(
    (e) => e['.tag'] === 'file' && typeof e.name === 'string' && e.name.toLowerCase().endsWith('.md')
  );

  // 2. Fallback check: If target path had no .md files, check alternative location (root '' or '/QalamNote')
  if (mdEntries.length === 0) {
    const altPath = normPath === '' ? '/QalamNote' : '';
    const altResult = await fetchEntriesForPath(altPath, true);
    const altMd = (altResult.entries || []).filter(
      (e) => e['.tag'] === 'file' && typeof e.name === 'string' && e.name.toLowerCase().endsWith('.md')
    );
    if (altMd.length > 0) {
      result = altResult;
      chosenBasePath = altPath;
    }
  }

  const files = (result.entries || [])
    .filter((e) => e['.tag'] === 'file' && typeof e.name === 'string' && e.name.toLowerCase().endsWith('.md'))
    .map((e) => ({
      name: e.name,
      pathOrUrl: e.path_display || e.path_lower || (chosenBasePath ? `${chosenBasePath}/${e.name}` : `/${e.name}`),
    }));

  return { files, activeBasePath: chosenBasePath };
}

/**
 * Download a file from Dropbox
 */
async function downloadDropboxFile(token: string, path: string): Promise<string> {
  const res = await fetch('https://content.dropboxapi.com/2/files/download', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Dropbox-API-Arg': safeDropboxArg({ path }),
    },
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Failed to download ${path} from Dropbox (${res.status}): ${errText}`);
  }
  return await res.text();
}

/**
 * Upload a file to Dropbox
 */
async function uploadDropboxFile(token: string, path: string, content: string): Promise<void> {
  const res = await fetch('https://content.dropboxapi.com/2/files/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Dropbox-API-Arg': safeDropboxArg({
        path,
        mode: 'overwrite',
        autorename: false,
        mute: true,
      }),
      'Content-Type': 'application/octet-stream',
    },
    body: new TextEncoder().encode(content),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error_summary || `Dropbox upload failed (${res.status})`);
  }
}

/**
 * List files on WebDAV server
 */
async function listWebDAVFiles(cleanUrl: string, authHeader: string): Promise<RemoteSyncFile[]> {
  try {
    const res = await fetch(cleanUrl + '/', {
      method: 'PROPFIND',
      headers: {
        'Authorization': authHeader,
        'Depth': '1',
      },
    });
    if (!res.ok && res.status !== 207) return [];
    const text = await res.text();
    const hrefMatches = Array.from(text.matchAll(/<[a-zA-Z0-9:]*href[^>]*>([^<]+)<\/[a-zA-Z0-9:]*href>/gi));
    const files: RemoteSyncFile[] = [];
    for (const match of hrefMatches) {
      const href = match[1].trim();
      const cleanHref = href.split('?')[0].split('#')[0];
      const decoded = decodeURIComponent(cleanHref);
      const filename = decoded.split('/').filter(Boolean).pop() || '';
      if (filename.toLowerCase().endsWith('.md')) {
        let fileUrl = cleanHref;
        if (!fileUrl.startsWith('http://') && !fileUrl.startsWith('https://')) {
          if (cleanHref.startsWith('/')) {
            const origin = new URL(cleanUrl).origin;
            fileUrl = `${origin}${cleanHref}`;
          } else {
            fileUrl = `${cleanUrl}/${cleanHref.replace(/^\.\//, '')}`;
          }
        }
        files.push({ name: filename, pathOrUrl: fileUrl });
      }
    }
    return files;
  } catch (err) {
    console.warn('WebDAV list error:', err);
    return [];
  }
}

/**
 * Download a file from WebDAV
 */
async function downloadWebDAVFile(url: string, authHeader: string): Promise<string> {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': authHeader,
    },
  });
  if (!res.ok) throw new Error(`WebDAV download error (${res.status})`);
  return await res.text();
}

/**
 * Upload a file to WebDAV
 */
async function uploadWebDAVFile(url: string, authHeader: string, content: string): Promise<void> {
  let res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'text/markdown; charset=utf-8',
    },
    body: content,
  });

  // If directory not found, attempt to create directory via MKCOL and retry
  if (res.status === 404 || res.status === 409) {
    try {
      const parentUrl = url.substring(0, url.lastIndexOf('/'));
      await fetch(parentUrl, { method: 'MKCOL', headers: { 'Authorization': authHeader } });
      res = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'text/markdown; charset=utf-8',
        },
        body: content,
      });
    } catch {}
  }

  if (!res.ok && res.status !== 201 && res.status !== 204) {
    throw new Error(`WebDAV upload error (${res.status})`);
  }
}

/**
 * Delete a file on Dropbox
 */
async function deleteDropboxFile(token: string, path: string): Promise<void> {
  try {
    await fetch('https://api.dropboxapi.com/2/files/delete_v2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path }),
    });
  } catch (err) {
    console.warn('Dropbox delete error:', err);
  }
}

/**
 * Delete a file on WebDAV
 */
async function deleteWebDAVFile(url: string, authHeader: string): Promise<void> {
  try {
    await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': authHeader,
      },
    });
  } catch (err) {
    console.warn('WebDAV delete error:', err);
  }
}

/**
 * Main Two-Way Synchronisation Execution (Bi-directional Sync for Dropbox & WebDAV)
 * Implements strict Local-First reconciliation: pending local edits/renames are ALWAYS
 * uploaded first so cloud never reverts active user work.
 */
export async function executeSync(
  syncConfig: SyncConfig,
  onProgress?: (status: SyncStatus) => void,
  lang: 'id' | 'en' = 'id'
): Promise<SyncStatus> {
  const startTime = Date.now();
  const isId = lang === 'id';
  const status: SyncStatus = {
    inProgress: true,
    lastSync: startTime,
    message: isId ? 'Memulai sinkronisasi...' : 'Starting synchronization...',
    itemsUploaded: 0,
    itemsDownloaded: 0,
  };

  if (onProgress) onProgress(status);

  if (syncConfig.target === 'disabled') {
    status.inProgress = false;
    status.message = isId
      ? 'Sinkronisasi dinonaktifkan. Atur WebDAV atau Dropbox di Pengaturan.'
      : 'Sync is disabled. Configure WebDAV or Dropbox in Settings.';
    if (onProgress) onProgress(status);
    return status;
  }

  try {
    let listRemote: () => Promise<RemoteSyncFile[]>;
    let downloadRemote: (file: RemoteSyncFile) => Promise<string>;
    let uploadRemote: (filename: string, content: string) => Promise<void>;
    let deleteRemote: (filename: string) => Promise<void>;

    if (syncConfig.target === 'dropbox') {
      let token = syncConfig.dropbox.access_token;
      if (!token) {
        throw new Error(isId ? 'Token akses Dropbox belum diatur.' : 'Dropbox access token is missing.');
      }

      status.message = isId ? 'Menghubungkan ke Dropbox...' : 'Connecting to Dropbox...';
      if (onProgress) onProgress(status);

      // Verify or refresh token if needed
      if (syncConfig.dropbox.refresh_token && syncConfig.dropbox.app_key) {
        const testRes = await testDropboxConnection(token);
        if (!testRes.success) {
          status.message = isId ? 'Memperbarui token Dropbox...' : 'Refreshing Dropbox token...';
          if (onProgress) onProgress(status);
          const refreshRes = await refreshDropboxToken(
            syncConfig.dropbox.app_key,
            syncConfig.dropbox.refresh_token
          );
          if (refreshRes.success && refreshRes.access_token) {
            token = refreshRes.access_token;
            syncConfig.dropbox.access_token = token;
            const currentSettings = await db.settings.get('app_settings');
            if (currentSettings?.value?.sync?.dropbox) {
              currentSettings.value.sync.dropbox.access_token = token;
              await db.settings.put(currentSettings);
            }
          }
        }
      }

      const basePath = normalizeDropboxPath(syncConfig.dropbox.path);
      let dropboxActiveBasePath = basePath;

      listRemote = async () => {
        const res = await listDropboxFiles(token, basePath);
        dropboxActiveBasePath = res.activeBasePath;
        return res.files;
      };
      downloadRemote = (rf: RemoteSyncFile) =>
        downloadDropboxFile(token, rf.pathOrUrl || (dropboxActiveBasePath ? `${dropboxActiveBasePath}/${rf.name}` : `/${rf.name}`));
      uploadRemote = (filename: string, content: string) => {
        const fullPath = dropboxActiveBasePath ? `${dropboxActiveBasePath}/${filename}` : `/${filename}`;
        return uploadDropboxFile(token, fullPath, content);
      };
      deleteRemote = (filename: string) => {
        const fullPath = dropboxActiveBasePath ? `${dropboxActiveBasePath}/${filename}` : `/${filename}`;
        return deleteDropboxFile(token, fullPath);
      };
    } else if (syncConfig.target === 'webdav') {
      const webdav = syncConfig.webdav;
      const cleanUrl = webdav.url.replace(/\/+$/, '');
      const authHeader = 'Basic ' + window.btoa(`${webdav.username}:${webdav.password}`);

      status.message = isId
        ? `Menghubungkan ke WebDAV (${cleanUrl})...`
        : `Connecting to WebDAV (${cleanUrl})...`;
      if (onProgress) onProgress(status);

      listRemote = () => listWebDAVFiles(cleanUrl, authHeader);
      downloadRemote = (rf: RemoteSyncFile) =>
        downloadWebDAVFile(rf.pathOrUrl || `${cleanUrl}/${rf.name}`, authHeader);
      uploadRemote = (filename: string, content: string) =>
        uploadWebDAVFile(`${cleanUrl}/${filename}`, authHeader, content);
      deleteRemote = (filename: string) =>
        deleteWebDAVFile(`${cleanUrl}/${filename}`, authHeader);
    } else {
      throw new Error(`Target sinkronisasi tidak didukung: ${syncConfig.target}`);
    }

    // Step 1: List all remote files in the cloud storage
    status.message = isId ? 'Memeriksa berkas di cloud...' : 'Checking cloud files...';
    if (onProgress) onProgress(status);
    const remoteFiles = await listRemote();

    // Step 2: Fetch all local items from Dexie
    const localNotes = await db.notes.toArray();
    const localFolders = await db.folders.toArray();
    const localTags = await db.tags.toArray();

    const localNotesMap = new Map<string, Note>(localNotes.map((n) => [n.id, n]));
    const localFoldersMap = new Map<string, Folder>(localFolders.map((f) => [f.id, f]));
    const localTagsMap = new Map<string, Tag>(localTags.map((t) => [t.id, t]));

    const remoteIdMap = new Map<string, RemoteSyncFile>();
    for (const rf of remoteFiles) {
      const cleanId = rf.name.replace(/\.md$/i, '').trim().toLowerCase();
      remoteIdMap.set(cleanId, rf);
    }

    // Load permanently deleted item tombstones
    const deletedIds = await getDeletedSyncIds();
    const deletedIdsSet = new Set<string>(deletedIds.map((x) => x.trim().toLowerCase()));

    const handledLocalIds = new Set<string>();
    const syncErrors: string[] = [];
    let downloadedCount = 0;
    let uploadedCount = 0;

    // =========================================================================
    // STEP 3: UPLOAD LOCAL ITEMS (LOCAL-FIRST PRESERVATION)
    // Local modifications on the active device must be preserved and pushed to cloud.
    // They MUST NEVER be overwritten by older cloud snapshots.
    // =========================================================================

    // 3.0 Propagate permanently deleted tombstones to cloud
    for (const delId of deletedIds) {
      const lower = delId.trim().toLowerCase();
      handledLocalIds.add(lower);
      if (remoteIdMap.has(lower)) {
        try {
          await deleteRemote(`${delId}.md`);
          await removeDeletedSyncId(delId);
        } catch (e: any) {
          console.warn(`Could not delete remote tombstone ${delId}:`, e);
        }
      }
    }

    // 3a. Upload Local Folders (New, Modified, Renamed, or Soft-Deleted)
    for (const folder of localFolders) {
      const lowerId = folder.id.trim().toLowerCase();
      const isNewToRemote = !remoteIdMap.has(lowerId);
      const isLocallyModified =
        folder.sync_status === 'pending' ||
        !folder.sync_time ||
        folder.updated_time > (folder.sync_time || 0);

      if (isNewToRemote || isLocallyModified) {
        // ALWAYS mark handled so Step 4 will NEVER overwrite this local folder with cloud data!
        handledLocalIds.add(lowerId);

        if (folder.is_deleted) {
          // Propagate folder deletion to cloud
          try {
            await deleteRemote(`${folder.id}.md`);
            await db.folders.update(folder.id, { sync_time: Date.now(), sync_status: 'synced' });
          } catch (e: any) {
            console.warn(`Could not delete remote folder ${folder.id}:`, e);
          }
        } else {
          status.message = isId
            ? `Mengunggah folder "${folder.title}"...`
            : `Uploading notebook "${folder.title}"...`;
          if (onProgress) onProgress(status);

          try {
            const content = serializeNoteItem(folder, 'folder');
            await uploadRemote(`${folder.id}.md`, content);
            uploadedCount++;
            await db.folders.update(folder.id, { sync_time: Date.now(), sync_status: 'synced' });
          } catch (e: any) {
            const errDetail = e?.message || String(e);
            console.warn(`Could not upload folder ${folder.id}:`, errDetail);
            syncErrors.push(`Folder "${folder.title}": ${errDetail}`);
          }
        }
      }
    }

    // 3b. Upload Local Notes (New, Pending Edits, Modified, or Trashed)
    for (const note of localNotes) {
      const lowerId = note.id.trim().toLowerCase();
      const isNewToRemote = !remoteIdMap.has(lowerId);
      const hasLocalPendingEdits = note.sync_status === 'pending';
      const isLocallyModified = !note.sync_time || note.updated_time > (note.sync_time || 0);

      const needsUpload = isNewToRemote || hasLocalPendingEdits || isLocallyModified;

      if (needsUpload) {
        // ALWAYS mark handled so Step 4 will NEVER overwrite this local note with cloud data!
        handledLocalIds.add(lowerId);

        if (note.is_deleted) {
          try {
            await deleteRemote(`${note.id}.md`);
            await db.notes.update(note.id, { sync_time: Date.now(), sync_status: 'synced' });
          } catch (e: any) {
            console.warn(`Could not delete remote note ${note.id}:`, e);
          }
        } else {
          status.message = isId
            ? `Mengunggah catatan "${(note.title || '').slice(0, 24)}"...`
            : `Uploading note "${(note.title || '').slice(0, 24)}"...`;
          if (onProgress) onProgress(status);

          try {
            const parentFolder = localFolders.find((f) => f.id === note.folder_id);
            const content = serializeNoteItem(note, 'note', parentFolder?.title);
            await uploadRemote(`${note.id}.md`, content);
            uploadedCount++;
            await db.notes.update(note.id, { sync_time: Date.now(), sync_status: 'synced' });
          } catch (e: any) {
            const errDetail = e?.message || String(e);
            console.warn(`Could not upload note ${note.id}:`, errDetail);
            syncErrors.push(`Catatan "${(note.title || note.id).slice(0, 24)}": ${errDetail}`);
          }
        }
      }
    }

    // 3c. Upload Local Tags
    for (const tag of localTags) {
      const lowerId = tag.id.toLowerCase();
      if (!remoteIdMap.has(lowerId)) {
        handledLocalIds.add(lowerId);
        try {
          const content = serializeTagItem(tag);
          await uploadRemote(`${tag.id}.md`, content);
          uploadedCount++;
        } catch (e: any) {
          const errDetail = e?.message || String(e);
          console.warn(`Could not upload tag ${tag.id}:`, errDetail);
          syncErrors.push(`Tag "${tag.title}": ${errDetail}`);
        }
      }
    }

    // =========================================================================
    // STEP 4: DOWNLOAD REMAINING REMOTE FILES (CREATED/MODIFIED ON OTHER DEVICES)
    // Only downloads files that were NOT just modified and uploaded on this device.
    // =========================================================================
    if (remoteFiles.length > 0) {
      status.message = isId
        ? `Memeriksa pembaruan cloud (${remoteFiles.length} berkas)...`
        : `Checking cloud updates (${remoteFiles.length} files)...`;
      if (onProgress) onProgress(status);

      interface ParsedRemoteItem {
        rf: RemoteSyncFile;
        itemId: string;
        parsed: ReturnType<typeof parseSyncItem>;
      }

      const downloadedItems: ParsedRemoteItem[] = [];

      for (let i = 0; i < remoteFiles.length; i++) {
        const rf = remoteFiles[i];
        const itemId = rf.name.replace(/\.md$/i, '').trim();
        const lowerId = itemId.toLowerCase();

        // Skip items already handled during upload or marked as deleted tombstones
        if (handledLocalIds.has(lowerId) || deletedIdsSet.has(lowerId)) {
          continue;
        }

        try {
          const rawContent = await downloadRemote(rf);
          const parsed = parseSyncItem(rawContent);

          // Skip unknown types (Joplin resource metadata type 4, note-tags type 6, revisions type 13, etc.)
          if (parsed.type === 'unknown') {
            continue;
          }

          const parsedId = String(parsed.meta.id || itemId).trim().toLowerCase();
          if (handledLocalIds.has(parsedId) || deletedIdsSet.has(parsedId)) {
            continue;
          }

          downloadedItems.push({ rf, itemId, parsed });
        } catch (dlErr: any) {
          const errDetail = dlErr?.message || String(dlErr);
          console.warn(`Error downloading remote file ${rf.name}:`, errDetail);
          syncErrors.push(`${rf.name}: ${errDetail}`);
        }
      }

      // 4a. Process Remote Folders FIRST so notebooks exist before notes reference them
      const remoteFoldersList = downloadedItems.filter((x) => x.parsed.type === 'folder');
      for (const item of remoteFoldersList) {
        const { itemId, parsed } = item;
        const lowerId = itemId.toLowerCase();
        const folderTitle = (parsed.title || parsed.meta.title || parsed.meta.name || '').trim();
        const folderId = String(parsed.meta.id || itemId).trim();
        if (!folderId) continue;
        const lowerFolderId = folderId.toLowerCase();

        if (
          handledLocalIds.has(lowerId) ||
          handledLocalIds.has(lowerFolderId) ||
          deletedIdsSet.has(lowerId) ||
          deletedIdsSet.has(lowerFolderId)
        ) {
          continue;
        }

        const remoteFolder: Folder = cleanFolderForDb({
          id: folderId,
          title: folderTitle || (isId ? 'Buku Catatan' : 'Notebook'),
          parent_id: String(parsed.meta.parent_id || '').trim(),
          created_time: parseSyncTimestamp(parsed.meta.created_time),
          updated_time: parseSyncTimestamp(parsed.meta.updated_time),
          sync_time: Date.now(),
          sync_status: 'synced',
          is_deleted: parsed.meta.is_deleted === '1',
          order: Number(parsed.meta.order || 0),
        });

        const localFolder = localFoldersMap.get(folderId) || localFoldersMap.get(itemId);

        if (!localFolder) {
          // Brand new folder created on another device
          if (!remoteFolder.is_deleted && !deletedIdsSet.has(lowerId) && !deletedIdsSet.has(lowerFolderId)) {
            await db.folders.put(remoteFolder);
            localFoldersMap.set(remoteFolder.id, remoteFolder);
            downloadedCount++;
          }
        } else {
          // Existing local folder: NEVER overwrite if local has pending edits or changes
          const isLocalPending =
            localFolder.sync_status === 'pending' ||
            !localFolder.sync_time ||
            localFolder.updated_time > (localFolder.sync_time || 0);

          if (isLocalPending) {
            // Local active device changes ALWAYS win!
            continue;
          }

          if (localFolder.is_deleted) {
            // Local folder was deleted on this device: NEVER resurrect from cloud
            continue;
          }

          // Overwrite ONLY if remote is strictly newer than local
          if (remoteFolder.updated_time > (localFolder.updated_time || 0)) {
            if (remoteFolder.is_deleted) {
              await db.folders.update(localFolder.id, {
                is_deleted: true,
                updated_time: remoteFolder.updated_time,
                sync_time: Date.now(),
                sync_status: 'synced',
              });
            } else {
              const safeFolder = cleanFolderForDb({
                ...localFolder,
                ...remoteFolder,
                sync_time: Date.now(),
                sync_status: 'synced',
              });
              await db.folders.put(safeFolder);
              localFoldersMap.set(safeFolder.id, safeFolder);
            }
            downloadedCount++;
          }
        }
      }

      // 4b. Process Remote Tags SECOND
      const remoteTagsList = downloadedItems.filter((x) => x.parsed.type === 'tag');
      for (const item of remoteTagsList) {
        const { itemId, parsed } = item;
        const tagId = String(parsed.meta.id || itemId).trim();
        if (!tagId) continue;
        const lowerTagId = tagId.toLowerCase();
        if (handledLocalIds.has(lowerTagId) || deletedIdsSet.has(lowerTagId)) continue;

        const remoteTag: Tag = cleanTagForDb({
          id: tagId,
          title: parsed.title || 'tag',
          created_time: parseSyncTimestamp(parsed.meta.created_time),
          updated_time: parseSyncTimestamp(parsed.meta.updated_time),
        });

        const localTag = localTagsMap.get(tagId) || localTagsMap.get(itemId);
        if (!localTag || remoteTag.updated_time > (localTag.updated_time || 0)) {
          await db.tags.put(remoteTag);
          localTagsMap.set(remoteTag.id, remoteTag);
          downloadedCount++;
        }
      }

      // 4c. Process Remote Notes THIRD
      const remoteNotesList = downloadedItems.filter((x) => x.parsed.type === 'note');
      for (const item of remoteNotesList) {
        const { itemId, parsed } = item;
        const lowerId = itemId.toLowerCase();
        const noteId = String(parsed.meta.id || itemId).trim();
        if (!noteId) continue;
        const lowerNoteId = noteId.toLowerCase();

        if (
          handledLocalIds.has(lowerId) ||
          handledLocalIds.has(lowerNoteId) ||
          deletedIdsSet.has(lowerId) ||
          deletedIdsSet.has(lowerNoteId)
        ) {
          continue;
        }

        let attachmentsParsed: any = undefined;
        if (parsed.meta.attachments) {
          try {
            attachmentsParsed = JSON.parse(parsed.meta.attachments);
          } catch {}
        }
        let encryptedDataParsed: any = undefined;
        if (parsed.meta.encrypted_data) {
          try {
            encryptedDataParsed = JSON.parse(parsed.meta.encrypted_data);
          } catch {}
        }

        const localNote = localNotesMap.get(noteId) || localNotesMap.get(itemId);

        // Verify or inherit parent notebook
        let targetFolderId = String(parsed.meta.parent_id || localNote?.folder_id || '').trim();
        const parentFolder = localFoldersMap.get(targetFolderId);

        if (!targetFolderId || !parentFolder || parentFolder.is_deleted) {
          const inferredFolderTitle = (parsed.meta.parent_title || parsed.meta.folder_title || '').trim();
          if (targetFolderId && inferredFolderTitle && !deletedIdsSet.has(targetFolderId.toLowerCase())) {
            const inheritedFolder = cleanFolderForDb({
              id: targetFolderId,
              title: inferredFolderTitle,
              parent_id: '',
              created_time: parseSyncTimestamp(parsed.meta.created_time),
              updated_time: parseSyncTimestamp(parsed.meta.updated_time),
              sync_time: Date.now(),
              sync_status: 'synced',
              is_deleted: false,
              order: (localFoldersMap.size || 0) + 1,
            });
            await db.folders.put(inheritedFolder);
            localFoldersMap.set(inheritedFolder.id, inheritedFolder);
          } else {
            const activeFolder = Array.from(localFoldersMap.values()).find((f) => !f.is_deleted);
            targetFolderId = activeFolder?.id || 'folder-welcome-01';
          }
        }

        const remoteNote: Note = cleanNoteForDb({
          id: noteId,
          folder_id: targetFolderId,
          title: parsed.title || (isId ? 'Catatan Tanpa Judul' : 'Untitled Note'),
          body: parsed.body || '',
          body_html: '',
          is_todo: parsed.meta.is_todo === '1',
          todo_completed: Number(parsed.meta.todo_completed || 0),
          todo_due: Number(parsed.meta.todo_due || 0),
          tags: parsed.meta.tags
            ? parsed.meta.tags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)
            : [],
          is_favorite: parsed.meta.is_favorite === '1',
          is_pinned: parsed.meta.is_pinned === '1',
          is_rtl: parsed.meta.is_rtl === '1',
          text_direction:
            (parsed.meta.text_direction as any) || (parsed.meta.is_rtl === '1' ? 'rtl' : 'ltr'),
          is_deleted: parsed.meta.is_deleted === '1',
          is_encrypted: parsed.meta.is_encrypted === '1',
          encrypted_data: encryptedDataParsed || localNote?.encrypted_data,
          attachments: Array.isArray(attachmentsParsed) ? attachmentsParsed : (localNote?.attachments || []),
          created_time: parseSyncTimestamp(parsed.meta.created_time),
          updated_time: parseSyncTimestamp(parsed.meta.updated_time),
          sync_time: Date.now(),
          sync_status: 'synced',
          order: Number(parsed.meta.order || 0),
        });

        if (!localNote) {
          // Brand new note from remote storage
          if (!remoteNote.is_deleted && !deletedIdsSet.has(lowerId) && !deletedIdsSet.has(lowerNoteId)) {
            await db.notes.put(remoteNote);
            localNotesMap.set(remoteNote.id, remoteNote);
            downloadedCount++;
          }
        } else {
          // Existing local note: NEVER overwrite if local has pending edits or changes
          const isLocalPending =
            localNote.sync_status === 'pending' ||
            !localNote.sync_time ||
            localNote.updated_time > (localNote.sync_time || 0);

          if (isLocalPending) {
            // Local active device changes ALWAYS win!
            continue;
          }

          if (localNote.is_deleted) {
            // Local note was deleted on this device (moved to trash): NEVER resurrect from cloud
            continue;
          }

          // Overwrite ONLY if remote is strictly newer than local
          if (remoteNote.updated_time > (localNote.updated_time || 0)) {
            if (remoteNote.is_deleted) {
              await db.notes.update(localNote.id, {
                is_deleted: true,
                updated_time: remoteNote.updated_time,
                sync_time: Date.now(),
                sync_status: 'synced',
              });
            } else {
              const mergedNote = cleanNoteForDb({
                ...localNote,
                ...remoteNote,
                folder_id: targetFolderId,
                sync_time: Date.now(),
                sync_status: 'synced',
              });
              await db.notes.put(mergedNote);
              localNotesMap.set(mergedNote.id, mergedNote);
            }
            downloadedCount++;
          } else if (remoteNote.updated_time === localNote.updated_time && localNote.sync_status !== 'synced') {
            await db.notes.update(localNote.id, { sync_time: Date.now(), sync_status: 'synced' });
          }
        }
      }
    }

    // =========================================================================
    // STEP 5: INTEGRITY CHECK - Ensure active notes have an existing folder
    // =========================================================================
    const allRefreshedNotes = await db.notes.toArray();
    const allRefreshedFolders = await db.folders.toArray();
    const activeFolders = allRefreshedFolders.filter((f) => !f.is_deleted);
    const activeFolderMap = new Map<string, Folder>(activeFolders.map((f) => [f.id, f]));
    const primaryFolder = activeFolders[0] || allRefreshedFolders[0];
    const fallbackFolderId = primaryFolder?.id || 'folder-welcome-01';

    for (const n of allRefreshedNotes) {
      if (!n.is_deleted && (!n.folder_id || !activeFolderMap.has(n.folder_id))) {
        await db.notes.update(n.id, { folder_id: fallbackFolderId });
      }
    }

    // Step 6: Finalize sync status
    status.itemsDownloaded = downloadedCount;
    status.itemsUploaded = uploadedCount;
    status.inProgress = false;
    status.lastSync = Date.now();

    if (syncErrors.length > 0) {
      status.error = syncErrors.join('; ');
      status.message = isId
        ? `Sinkronisasi selesai dengan ${syncErrors.length} kendala: ${syncErrors[0]}`
        : `Sync completed with ${syncErrors.length} issue(s): ${syncErrors[0]}`;
    } else if (downloadedCount > 0 || uploadedCount > 0) {
      status.message = isId
        ? `Sinkronisasi berhasil! ${uploadedCount} data diunggah, ${downloadedCount} data diunduh.`
        : `Sync completed! ${uploadedCount} item(s) uploaded, ${downloadedCount} item(s) downloaded.`;
    } else {
      status.message = isId
        ? 'Sinkronisasi berhasil! Semua data lokal dan cloud sudah selaras.'
        : 'Sync completed! All local and cloud notes are fully up to date.';
    }

    // Log sync event in IndexedDB
    try {
      await db.sync_logs.add({
        id: 'sync-' + Date.now(),
        timestamp: Date.now(),
        type: syncConfig.target,
        message: status.message,
        details: { uploaded: status.itemsUploaded, downloaded: status.itemsDownloaded },
      });
    } catch {}

    if (onProgress) onProgress(status);
    return status;
  } catch (err: any) {
    status.inProgress = false;
    status.error = err.message || 'Sync failed';
    status.message = isId
      ? `Sinkronisasi mengalami kendala: ${err.message}`
      : `Sync encountered an issue: ${err.message}`;
    if (onProgress) onProgress(status);
    return status;
  }
}

/**
 * Export all data as standard JSON backup
 */
export async function exportAllData(): Promise<string> {
  const notes = await db.notes.toArray();
  const folders = await db.folders.toArray();
  const tags = await db.tags.toArray();

  const exportPayload = {
    version: '1.0.0',
    app: 'Qalam Note',
    exported_at: new Date().toISOString(),
    folders,
    notes,
    tags,
  };

  return JSON.stringify(exportPayload, null, 2);
}

/**
 * Import data from JSON backup
 */
export async function importData(jsonString: string): Promise<{ notesImported: number; foldersImported: number }> {
  const data = JSON.parse(jsonString);
  let notesCount = 0;
  let foldersCount = 0;

  if (Array.isArray(data.folders)) {
    for (const f of data.folders) {
      const exists = await db.folders.get(f.id);
      if (!exists) {
        await db.folders.add(f);
        foldersCount++;
      }
    }
  }

  if (Array.isArray(data.notes)) {
    for (const n of data.notes) {
      const exists = await db.notes.get(n.id);
      if (!exists) {
        await db.notes.add(n);
        notesCount++;
      } else {
        await db.notes.put(n);
        notesCount++;
      }
    }
  }

  if (Array.isArray(data.tags)) {
    for (const t of data.tags) {
      const exists = await db.tags.get(t.id);
      if (!exists) {
        await db.tags.add(t);
      }
    }
  }

  return { notesImported: notesCount, foldersImported: foldersCount };
}

/**
 * Pairing Code Structure & Multi-Device Sync Helpers
 */
export interface SyncPairingPayload {
  v: 1;
  target: 'webdav' | 'dropbox';
  ts: number;
  webdav?: {
    url: string;
    username: string;
    password: string;
    path: string;
    cors_proxy: boolean;
  };
  dropbox?: {
    app_key?: string;
    access_token: string;
    refresh_token?: string;
    account_name?: string;
    account_email?: string;
    path: string;
  };
  auto_sync_interval?: number;
}

export function generateSyncPairingCode(syncConfig: SyncConfig): string {
  if (syncConfig.target === 'disabled') {
    throw new Error('Target sinkronisasi belum dipilih (masih Nonaktif).');
  }

  const payload: SyncPairingPayload = {
    v: 1,
    target: syncConfig.target,
    ts: Date.now(),
    auto_sync_interval: syncConfig.auto_sync_interval || 15,
  };

  if (syncConfig.target === 'webdav') {
    if (!syncConfig.webdav.url) {
      throw new Error('URL WebDAV belum diisi.');
    }
    payload.webdav = {
      url: syncConfig.webdav.url,
      username: syncConfig.webdav.username,
      password: syncConfig.webdav.password,
      path: syncConfig.webdav.path || '/qalam',
      cors_proxy: syncConfig.webdav.cors_proxy !== false,
    };
  } else if (syncConfig.target === 'dropbox') {
    if (!syncConfig.dropbox.access_token) {
      throw new Error('Dropbox belum diotorisasi / belum ada token akses.');
    }
    payload.dropbox = {
      app_key: syncConfig.dropbox.app_key || '',
      access_token: syncConfig.dropbox.access_token,
      refresh_token: syncConfig.dropbox.refresh_token || '',
      account_name: syncConfig.dropbox.account_name || '',
      account_email: syncConfig.dropbox.account_email || '',
      path: syncConfig.dropbox.path || '/QalamNote',
    };
  }

  const jsonStr = JSON.stringify(payload);
  const utf8Bytes = new TextEncoder().encode(jsonStr);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  const base64 = btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `QLMSYNC1_${base64}`;
}

export function parseSyncPairingCode(code: string): SyncConfig | null {
  try {
    const clean = code.trim();
    if (!clean.startsWith('QLMSYNC1_')) {
      return null;
    }
    let base64 = clean.slice('QLMSYNC1_'.length)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const jsonStr = new TextDecoder().decode(bytes);
    const payload = JSON.parse(jsonStr) as SyncPairingPayload;

    if (payload.v !== 1) return null;

    if (payload.target === 'webdav' && payload.webdav) {
      return {
        target: 'webdav',
        auto_sync_interval: payload.auto_sync_interval || 15,
        last_sync_time: 0,
        webdav: {
          url: payload.webdav.url,
          username: payload.webdav.username || '',
          password: payload.webdav.password || '',
          path: payload.webdav.path || '/qalam',
          cors_proxy: payload.webdav.cors_proxy !== false,
        },
        dropbox: {
          app_key: '',
          access_token: '',
          refresh_token: '',
          path: '/QalamNote',
        },
      };
    } else if (payload.target === 'dropbox' && payload.dropbox) {
      return {
        target: 'dropbox',
        auto_sync_interval: payload.auto_sync_interval || 15,
        last_sync_time: 0,
        webdav: {
          url: 'https://webdav.nextcloud.com/remote.php/webdav/qalam/',
          username: '',
          password: '',
          path: '/qalam',
          cors_proxy: true,
        },
        dropbox: {
          app_key: payload.dropbox.app_key || '',
          access_token: payload.dropbox.access_token,
          refresh_token: payload.dropbox.refresh_token || '',
          account_name: payload.dropbox.account_name || '',
          account_email: payload.dropbox.account_email || '',
          path: payload.dropbox.path || '/QalamNote',
        },
      };
    }
    return null;
  } catch {
    return null;
  }
}
