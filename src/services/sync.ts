/**
 * Qalam Note - Sync Engine (WebDAV & Dropbox)
 */

import { db } from '../db';
import type { Note, Folder, SyncConfig } from '../types';

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
export function serializeNoteItem(item: Note | Folder, type: 'note' | 'folder'): string {
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
    meta.parent_id = note.folder_id;
    meta.is_todo = note.is_todo ? 1 : 0;
    meta.todo_completed = note.todo_completed;
    meta.todo_due = note.todo_due;
    meta.is_favorite = note.is_favorite ? 1 : 0;
    meta.is_pinned = note.is_pinned ? 1 : 0;
    meta.is_encrypted = note.is_encrypted ? 1 : 0;
    meta.tags = (note.tags || []).join(',');
    body = `${note.title}\n\n${note.body}`;
  } else {
    const folder = item as Folder;
    meta.parent_id = folder.parent_id;
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
 * Main Synchronisation Execution
 */
export async function executeSync(
  syncConfig: SyncConfig,
  onProgress?: (status: SyncStatus) => void
): Promise<SyncStatus> {
  const startTime = Date.now();
  const status: SyncStatus = {
    inProgress: true,
    lastSync: startTime,
    message: 'Starting synchronization...',
    itemsUploaded: 0,
    itemsDownloaded: 0,
  };

  if (onProgress) onProgress(status);

  if (syncConfig.target === 'disabled') {
    status.inProgress = false;
    status.message = 'Sync is disabled. Configure WebDAV or Dropbox in Settings.';
    if (onProgress) onProgress(status);
    return status;
  }

  try {
    // 1. Fetch local items needing sync
    const allNotes = await db.notes.toArray();
    const allFolders = await db.folders.toArray();

    // 2. Perform target-specific sync
    if (syncConfig.target === 'webdav') {
      const webdav = syncConfig.webdav;
      const cleanUrl = webdav.url.replace(/\/+$/, '');
      const authHeader = 'Basic ' + window.btoa(`${webdav.username}:${webdav.password}`);

      status.message = `Connecting to WebDAV at ${cleanUrl}...`;
      if (onProgress) onProgress(status);

      // Attempt to push modified notes
      let uploadedCount = 0;
      for (const note of allNotes) {
        if (!note.sync_time || note.updated_time > note.sync_time) {
          const content = serializeNoteItem(note, 'note');
          const fileUrl = `${cleanUrl}/${note.id}.md`;

          try {
            await fetch(fileUrl, {
              method: 'PUT',
              headers: {
                'Authorization': authHeader,
                'Content-Type': 'text/markdown; charset=utf-8',
              },
              body: content,
            });
            uploadedCount++;
            await db.notes.update(note.id, { sync_time: Date.now(), sync_status: 'synced' });
          } catch (e) {
            console.warn(`Could not sync note ${note.id} via WebDAV:`, e);
          }
        }
      }

      status.itemsUploaded = uploadedCount;
      status.message = `Sync completed! Uploaded ${uploadedCount} items to WebDAV.`;
    } else if (syncConfig.target === 'dropbox') {
      let token = syncConfig.dropbox.access_token;
      status.message = 'Syncing with Dropbox...';
      if (onProgress) onProgress(status);

      // Check if token needs refresh or is expired
      if (syncConfig.dropbox.refresh_token && syncConfig.dropbox.app_key) {
        const testRes = await testDropboxConnection(token);
        if (!testRes.success) {
          const refreshRes = await refreshDropboxToken(syncConfig.dropbox.app_key, syncConfig.dropbox.refresh_token);
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

      let uploadedCount = 0;
      for (const note of allNotes) {
        if (!note.sync_time || note.updated_time > note.sync_time) {
          const content = serializeNoteItem(note, 'note');
          const dropboxPath = `${syncConfig.dropbox.path || '/QalamNote'}/${note.id}.md`;

          try {
            await fetch('https://content.dropboxapi.com/2/files/upload', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Dropbox-API-Arg': JSON.stringify({
                  path: dropboxPath,
                  mode: 'overwrite',
                  autorename: false,
                  mute: true,
                }),
                'Content-Type': 'application/octet-stream',
              },
              body: content,
            });
            uploadedCount++;
            await db.notes.update(note.id, { sync_time: Date.now(), sync_status: 'synced' });
          } catch (e) {
            console.warn(`Could not upload ${note.id} to Dropbox:`, e);
          }
        }
      }

      status.itemsUploaded = uploadedCount;
      status.message = `Sync completed! Uploaded ${uploadedCount} items to Dropbox.`;
    }

    status.inProgress = false;
    status.lastSync = Date.now();

    // Log sync event
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
    status.message = `Sync encountered an issue: ${err.message}`;
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
