/**
 * Qalam Note - Sync Engine (WebDAV & Dropbox)
 */

import { db } from '../db';
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
 * Format a note into standard markdown serialization
 */
/**
 * Helper to parse timestamps from numeric values or ISO 8601 strings
 */
export function parseSyncTimestamp(val: any): number {
  if (!val) return Date.now();
  if (typeof val === 'number') return isNaN(val) ? Date.now() : val;
  const num = Number(val);
  if (!isNaN(num) && num > 0) return num;
  const parsed = Date.parse(val);
  return isNaN(parsed) ? Date.now() : parsed;
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
  else type = 'note';

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
  } else {
    return { type, meta, title: rawBody, body: '' };
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
async function listDropboxFiles(token: string, targetPath: string): Promise<RemoteSyncFile[]> {
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
    }
  }

  return (result.entries || [])
    .filter((e) => e['.tag'] === 'file' && typeof e.name === 'string' && e.name.toLowerCase().endsWith('.md'))
    .map((e) => ({
      name: e.name,
      pathOrUrl: e.path_display || e.path_lower || (normPath ? `${normPath}/${e.name}` : `/${e.name}`),
    }));
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
 * Main Two-Way Synchronisation Execution (Bi-directional Sync for Dropbox & WebDAV)
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
      listRemote = () => listDropboxFiles(token, basePath);
      downloadRemote = (rf: RemoteSyncFile) =>
        downloadDropboxFile(token, rf.pathOrUrl || (basePath ? `${basePath}/${rf.name}` : `/${rf.name}`));
      uploadRemote = (filename: string, content: string) => {
        const fullPath = basePath ? `${basePath}/${filename}` : `/${filename}`;
        return uploadDropboxFile(token, fullPath, content);
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
      const cleanId = rf.name.replace(/\.md$/i, '');
      remoteIdMap.set(cleanId, rf);
    }

    const downloadedItemIds = new Set<string>();
    const syncErrors: string[] = [];
    let downloadedCount = 0;
    let uploadedCount = 0;

    // Step 3: Two-Way Reconcile - Download remote files that are missing locally or updated remotely
    if (remoteFiles.length > 0) {
      status.message = isId
        ? `Ditemukan ${remoteFiles.length} berkas di cloud. Mengunduh data...`
        : `Found ${remoteFiles.length} cloud files. Downloading data...`;
      if (onProgress) onProgress(status);

      for (let i = 0; i < remoteFiles.length; i++) {
        const rf = remoteFiles[i];
        const itemId = rf.name.replace(/\.md$/i, '');
        const localNote = localNotesMap.get(itemId);
        const localFolder = localFoldersMap.get(itemId);
        const localTag = localTagsMap.get(itemId);

        status.message = isId
          ? `Mengunduh berkas (${i + 1}/${remoteFiles.length})...`
          : `Downloading item (${i + 1}/${remoteFiles.length})...`;
        if (onProgress) onProgress(status);

        try {
          const rawContent = await downloadRemote(rf);
          const parsed = parseSyncItem(rawContent);

          if (parsed.type === 'folder') {
            const folderTitle = (parsed.title || parsed.meta.title || parsed.meta.name || '').trim();
            const remoteFolder: Folder = {
              id: parsed.meta.id || itemId,
              title: folderTitle || (isId ? 'Buku Catatan' : 'Notebook'),
              parent_id: parsed.meta.parent_id || '',
              created_time: parseSyncTimestamp(parsed.meta.created_time),
              updated_time: parseSyncTimestamp(parsed.meta.updated_time),
              sync_time: Date.now(),
              is_deleted: parsed.meta.is_deleted === '1',
              order: Number(parsed.meta.order || 0),
            };
            if (!localFolder || remoteFolder.updated_time >= (localFolder.updated_time || 0) || (remoteFolder.title && remoteFolder.title !== localFolder.title)) {
              await db.folders.put(remoteFolder);
              localFoldersMap.set(remoteFolder.id, remoteFolder);
              downloadedCount++;
              downloadedItemIds.add(remoteFolder.id);
            }
          } else if (parsed.type === 'tag') {
            const remoteTag: Tag = {
              id: parsed.meta.id || itemId,
              title: parsed.title || 'tag',
              created_time: parseSyncTimestamp(parsed.meta.created_time),
              updated_time: parseSyncTimestamp(parsed.meta.updated_time),
            };
            if (!localTag || remoteTag.updated_time >= (localTag.updated_time || 0) || remoteTag.title !== localTag.title) {
              await db.tags.put(remoteTag);
              localTagsMap.set(remoteTag.id, remoteTag);
              downloadedCount++;
              downloadedItemIds.add(remoteTag.id);
            }
          } else {
            // Default: Note item (type_ === 1)
            let attachmentsParsed = undefined;
            if (parsed.meta.attachments) {
              try {
                attachmentsParsed = JSON.parse(parsed.meta.attachments);
              } catch {}
            }
            let encryptedDataParsed = undefined;
            if (parsed.meta.encrypted_data) {
              try {
                encryptedDataParsed = JSON.parse(parsed.meta.encrypted_data);
              } catch {}
            }

            // If remote note mentions a folder ID and folder title from parent device, register it immediately
            const inferredFolderTitle = (parsed.meta.parent_title || parsed.meta.folder_title || '').trim();
            if (parsed.meta.parent_id && !localFoldersMap.has(parsed.meta.parent_id) && inferredFolderTitle) {
              const inheritedFolder: Folder = {
                id: parsed.meta.parent_id,
                title: inferredFolderTitle,
                parent_id: '',
                created_time: parseSyncTimestamp(parsed.meta.created_time),
                updated_time: parseSyncTimestamp(parsed.meta.updated_time),
                sync_time: Date.now(),
                is_deleted: false,
                order: (localFoldersMap.size || 0) + 1,
              };
              await db.folders.put(inheritedFolder);
              localFoldersMap.set(inheritedFolder.id, inheritedFolder);
            }

            const remoteNote: Note = {
              id: parsed.meta.id || itemId,
              folder_id:
                parsed.meta.parent_id ||
                localNote?.folder_id ||
                (localFolders.length > 0 ? localFolders[0].id : 'folder-welcome-01'),
              title: parsed.title || (isId ? 'Catatan Tanpa Judul' : 'Untitled Note'),
              body: parsed.body || '',
              body_html: '',
              is_todo: parsed.meta.is_todo === '1',
              todo_completed: Number(parsed.meta.todo_completed || 0),
              todo_due: Number(parsed.meta.todo_due || 0),
              tags: parsed.meta.tags ? parsed.meta.tags.split(',').filter(Boolean) : [],
              is_favorite: parsed.meta.is_favorite === '1',
              is_pinned: parsed.meta.is_pinned === '1',
              is_rtl: parsed.meta.is_rtl === '1',
              text_direction:
                (parsed.meta.text_direction as any) || (parsed.meta.is_rtl === '1' ? 'rtl' : 'ltr'),
              is_deleted: parsed.meta.is_deleted === '1',
              is_encrypted: parsed.meta.is_encrypted === '1',
              encrypted_data: encryptedDataParsed || localNote?.encrypted_data,
              attachments: attachmentsParsed || localNote?.attachments || [],
              created_time: parseSyncTimestamp(parsed.meta.created_time),
              updated_time: parseSyncTimestamp(parsed.meta.updated_time),
              sync_time: Date.now(),
              sync_status: 'synced',
              order: Number(parsed.meta.order || 0),
            };

            if (!localNote) {
              // Brand new note from remote storage
              await db.notes.put(remoteNote);
              localNotesMap.set(remoteNote.id, remoteNote);
              downloadedCount++;
              downloadedItemIds.add(remoteNote.id);
            } else {
              // Local note already exists. Determine if remote note should overwrite local:
              const isLocalClean = localNote.sync_status !== 'pending';
              const isRemoteNewer = remoteNote.updated_time >= (localNote.updated_time || 0);
              const isRemoteModifiedSinceLastSync = localNote.sync_time
                ? remoteNote.updated_time > localNote.sync_time
                : true;
              const hasContentDifference =
                remoteNote.title !== localNote.title ||
                remoteNote.body !== localNote.body ||
                remoteNote.folder_id !== localNote.folder_id ||
                remoteNote.is_todo !== localNote.is_todo ||
                remoteNote.todo_completed !== localNote.todo_completed ||
                remoteNote.is_deleted !== localNote.is_deleted ||
                remoteNote.is_favorite !== localNote.is_favorite ||
                remoteNote.is_pinned !== localNote.is_pinned;

              if (
                isRemoteNewer ||
                (isLocalClean && hasContentDifference) ||
                (isRemoteModifiedSinceLastSync && hasContentDifference)
              ) {
                await db.notes.put({
                  ...localNote,
                  ...remoteNote,
                  sync_time: Date.now(),
                  sync_status: 'synced',
                });
                localNotesMap.set(remoteNote.id, remoteNote);
                downloadedCount++;
                downloadedItemIds.add(remoteNote.id);
              } else if (remoteNote.updated_time === localNote.updated_time || !hasContentDifference) {
                await db.notes.update(localNote.id, { sync_time: Date.now(), sync_status: 'synced' });
                downloadedItemIds.add(remoteNote.id);
              }
            }
          }
        } catch (dlErr: any) {
          const errDetail = dlErr?.message || String(dlErr);
          console.warn(`Error processing remote file ${rf.name}:`, errDetail);
          syncErrors.push(`${rf.name}: ${errDetail}`);
        }
      }
    }

    // Step 4: Two-Way Reconcile - Upload local items that are new or modified
    // 4a. Upload Folders
    const currentFolders = await db.folders.toArray();
    for (const folder of currentFolders) {
      if (downloadedItemIds.has(folder.id)) continue;
      const isNewToRemote = !remoteIdMap.has(folder.id);
      const isLocallyModified = !folder.sync_time || folder.updated_time > folder.sync_time;
      if (isNewToRemote || isLocallyModified) {
        status.message = isId
          ? `Mengunggah folder "${folder.title}"...`
          : `Uploading notebook "${folder.title}"...`;
        if (onProgress) onProgress(status);

        try {
          const content = serializeNoteItem(folder, 'folder');
          await uploadRemote(`${folder.id}.md`, content);
          uploadedCount++;
          await db.folders.update(folder.id, { sync_time: Date.now() });
        } catch (e: any) {
          const errDetail = e?.message || String(e);
          console.warn(`Could not upload folder ${folder.id}:`, errDetail);
          syncErrors.push(`Folder "${folder.title}": ${errDetail}`);
        }
      }
    }

    // 4b. Upload Notes
    const currentNotes = await db.notes.toArray();
    for (const note of currentNotes) {
      if (downloadedItemIds.has(note.id)) continue;

      const isNewToRemote = !remoteIdMap.has(note.id);
      const hasLocalPendingEdits = note.sync_status === 'pending';
      const isLocallyModified = !note.sync_time || note.updated_time > note.sync_time;

      const needsUpload = isNewToRemote || hasLocalPendingEdits || isLocallyModified;

      if (needsUpload) {
        status.message = isId
          ? `Mengunggah catatan "${(note.title || '').slice(0, 24)}"...`
          : `Uploading note "${(note.title || '').slice(0, 24)}"...`;
        if (onProgress) onProgress(status);

        try {
          const parentFolder = currentFolders.find((f) => f.id === note.folder_id);
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

    // 4c. Upload Tags
    const currentTags = await db.tags.toArray();
    for (const tag of currentTags) {
      if (downloadedItemIds.has(tag.id)) continue;
      if (!remoteIdMap.has(tag.id)) {
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

    // Step 5: Integrity Check - ensure notes with folder_id have an existing folder
    const allRefreshedNotes = await db.notes.toArray();
    const existingFolders = await db.folders.toArray();
    const existingFolderMap = new Map<string, Folder>(existingFolders.map((f) => [f.id, f]));
    const primaryFolder = existingFolders.find((f) => !f.is_deleted) || existingFolders[0];
    const fallbackFolderId = primaryFolder?.id || 'folder-welcome-01';

    for (const n of allRefreshedNotes) {
      if (!n.folder_id) {
        await db.notes.update(n.id, { folder_id: fallbackFolderId });
      } else if (!existingFolderMap.has(n.folder_id)) {
        // Adopt the primary device's naming or fallback to primary notebook, NEVER create a dummy "Folder Sinkron"
        const adoptedTitle = primaryFolder?.title || (isId ? 'Buku Catatan Utama' : 'Main Notebook');
        const recoveredFolder: Folder = {
          id: n.folder_id,
          title: adoptedTitle,
          parent_id: '',
          created_time: Date.now(),
          updated_time: Date.now(),
          sync_time: Date.now(),
          is_deleted: false,
          order: existingFolders.length + 1,
        };
        await db.folders.put(recoveredFolder);
        existingFolderMap.set(n.folder_id, recoveredFolder);
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
        ? `Sinkronisasi berhasil! ${downloadedCount} data diunduh, ${uploadedCount} data diunggah.`
        : `Sync completed! ${downloadedCount} item(s) downloaded, ${uploadedCount} item(s) uploaded.`;
    } else {
      status.message = isId
        ? 'Sinkronisasi berhasil! Semua data lokal dan cloud sudah selaras.'
        : 'Sync completed! All local and cloud notes are fully up to date.';
    }

    // Log sync event in IndexedDB
    await db.sync_logs.add({
      id: 'sync-' + Date.now(),
      timestamp: Date.now(),
      type: syncConfig.target,
      message: status.message,
      details: { uploaded: status.itemsUploaded, downloaded: status.itemsDownloaded },
    });

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
