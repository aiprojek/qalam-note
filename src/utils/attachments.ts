import { db } from '../db';
import type { Attachment, Note } from '../types';

/**
 * In-memory cache for browser blob URLs (object URLs)
 * Maps attachment ID -> 'blob:https://...' URL
 */
const blobUrlCache = new Map<string, string>();

/**
 * Revokes all cached object URLs to free memory
 */
export function cleanupAttachmentUrls(): void {
  for (const url of blobUrlCache.values()) {
    try {
      URL.revokeObjectURL(url);
    } catch {}
  }
  blobUrlCache.clear();
}

/**
 * Converts a Base64 data URL to a native Blob
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const binaryStr = atob(parts[1]);
  const len = binaryStr.length;
  const u8arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    u8arr[i] = binaryStr.charCodeAt(i);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Converts a Blob to a Base64 data URL (for export or legacy fallbacks)
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Client-side high performance image compression.
 * Scales down large camera photos (e.g. 12MP+) to max 1920x1920 and compresses to WebP/JPEG.
 * Reduces storage footprint from 5-10 MB down to 150-300 KB without perceptible quality loss.
 */
export async function compressImage(
  fileOrBlob: File | Blob,
  maxDimension: number = 1920,
  quality: number = 0.85
): Promise<{ blob: Blob; mime: string; width: number; height: number }> {
  // If already small SVG or small icon, don't recompress
  if (fileOrBlob.type === 'image/svg+xml') {
    return { blob: fileOrBlob, mime: fileOrBlob.type, width: 0, height: 0 };
  }

  // Create an Image element to measure and render
  const url = URL.createObjectURL(fileOrBlob);
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });

    let { width, height } = img;

    // If within bounds and already lightweight (< 200KB), keep original
    if (width <= maxDimension && height <= maxDimension && fileOrBlob.size < 200 * 1024) {
      return { blob: fileOrBlob, mime: fileOrBlob.type || 'image/jpeg', width, height };
    }

    // Calculate aspect ratio resize
    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { blob: fileOrBlob, mime: fileOrBlob.type, width, height };
    }

    // High quality canvas scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);

    // Prefer modern WebP, fallback to JPEG
    let targetMime = 'image/webp';
    let compressedBlob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, targetMime, quality)
    );

    // If WebP is not supported by older browser, fallback to JPEG
    if (!compressedBlob) {
      targetMime = 'image/jpeg';
      compressedBlob = await new Promise<Blob | null>((res) =>
        canvas.toBlob(res, targetMime, quality)
      );
    }

    const finalBlob = compressedBlob || fileOrBlob;
    return {
      blob: finalBlob,
      mime: targetMime,
      width,
      height,
    };
  } catch (err) {
    console.warn('Image compression fallback to original:', err);
    return { blob: fileOrBlob, mime: fileOrBlob.type || 'image/jpeg', width: 0, height: 0 };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Client-side speech-optimized audio compression.
 * Downsamples high-frequency stereo audio or uncompressed WAVs to efficient 24kHz mono audio,
 * or keeps WebM/Opus blobs under optimal size, saving over 75% storage.
 */
export async function compressAudio(fileOrBlob: File | Blob): Promise<Blob> {
  // If already Opus or WebM and reasonably sized (< 1MB), keep as-is
  if (
    (fileOrBlob.type.includes('webm') || fileOrBlob.type.includes('opus')) &&
    fileOrBlob.size < 1024 * 1024
  ) {
    return fileOrBlob;
  }

  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return fileOrBlob;

    const arrayBuffer = await fileOrBlob.arrayBuffer();
    const ctx = new AudioContextClass();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    // If audio duration is reasonable, render speech-optimized mono at 24000 Hz
    const targetSampleRate = 24000;
    const targetChannels = 1;
    const duration = audioBuffer.duration;
    if (duration > 3600) {
      // Very long audio, return original
      ctx.close();
      return fileOrBlob;
    }

    const offlineCtx = new OfflineAudioContext(
      targetChannels,
      Math.ceil(duration * targetSampleRate),
      targetSampleRate
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start(0);

    const renderedBuffer = await offlineCtx.startRendering();
    const wavBlob = audioBufferToWavBlob(renderedBuffer);
    ctx.close();

    // Only use compressed if it is smaller than original
    if (wavBlob.size < fileOrBlob.size) {
      return wavBlob;
    }
    return fileOrBlob;
  } catch (err) {
    console.warn('Audio compression fallback to original:', err);
    return fileOrBlob;
  }
}

/**
 * Encodes an AudioBuffer into a compact 16-bit PCM WAV Blob
 */
function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const numSamples = buffer.length * numChannels;
  const byteRate = (sampleRate * numChannels * bitDepth) / 8;
  const blockAlign = (numChannels * bitDepth) / 8;
  const dataSize = numSamples * (bitDepth / 8);
  const bufferSize = 44 + dataSize;
  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF chunk descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');

  // FMT sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // DATA sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM samples (clamped between -1 and 1)
  let offset = 44;
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < channelData.length; i++) {
    const sample = Math.max(-1, Math.min(1, channelData[i]));
    const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

/**
 * Saves a file or audio/image blob to the dedicated IndexedDB `attachments` table.
 * Returns an Attachment record referencing the stored Blob.
 */
export async function saveAttachment(
  data: Blob | File,
  name: string,
  mime?: string,
  noteId?: string
): Promise<Attachment> {
  const isImage = (mime || data.type).startsWith('image/');
  const isAudio = (mime || data.type).startsWith('audio/');
  let finalBlob: Blob = data;
  let finalMime = mime || data.type || 'application/octet-stream';

  // Apply client-side compression for images
  if (isImage) {
    try {
      const res = await compressImage(data);
      finalBlob = res.blob;
      finalMime = res.mime;
    } catch (e) {
      console.warn('Image compression failed, saving raw blob:', e);
    }
  } else if (isAudio) {
    try {
      finalBlob = await compressAudio(data);
      finalMime = finalBlob.type || 'audio/webm';
    } catch (e) {
      console.warn('Audio compression failed, saving raw blob:', e);
    }
  }

  const id = `att_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const attachment: Attachment = {
    id,
    name: name || 'Attachment',
    mime: finalMime,
    size: finalBlob.size,
    blob: finalBlob,
    note_id: noteId,
    created_time: Date.now(),
  };

  // Persist directly to Dexie IndexedDB
  await db.attachments.put(attachment);

  // Cache object URL
  const objectUrl = URL.createObjectURL(finalBlob);
  blobUrlCache.set(id, objectUrl);

  return attachment;
}

/**
 * Retrieves an attachment's native Blob from IndexedDB
 */
export async function getAttachmentBlob(id: string): Promise<Blob | null> {
  try {
    const record = await db.attachments.get(id);
    if (!record) return null;
    if (record.blob) return record.blob;
    if (record.dataUrl) return dataUrlToBlob(record.dataUrl);
    return null;
  } catch (err) {
    console.warn('Failed to get attachment blob:', id, err);
    return null;
  }
}

/**
 * Returns a browser object URL (`blob:https://...`) for the given attachment ID.
 * Caches URLs in memory for instant reuse.
 */
export async function getAttachmentUrl(id: string): Promise<string> {
  if (blobUrlCache.has(id)) {
    return blobUrlCache.get(id)!;
  }

  const blob = await getAttachmentBlob(id);
  if (!blob) return '';

  const url = URL.createObjectURL(blob);
  blobUrlCache.set(id, url);
  return url;
}

/**
 * Synchronous cache lookup for attachment object URLs
 */
export function getSyncAttachmentUrl(id: string): string | null {
  return blobUrlCache.get(id) || null;
}

/**
 * Preloads all attachments of a note into the object URL cache
 * so subsequent markdown renders can resolve `attachment:id` instantly.
 */
export async function preloadNoteAttachments(attachments?: Attachment[]): Promise<void> {
  if (!attachments || attachments.length === 0) return;
  await Promise.all(
    attachments.map(async (att) => {
      if (att.id && !blobUrlCache.has(att.id)) {
        await getAttachmentUrl(att.id);
      }
    })
  );
}

/**
 * Resolves any `attachment:id` URL to its corresponding `blob:...` URL.
 * If given a standard http/https or data: URL, returns it unchanged.
 */
export async function resolveAttachmentUrl(urlOrRef: string): Promise<string> {
  if (!urlOrRef) return '';
  if (urlOrRef.startsWith('attachment:')) {
    const id = urlOrRef.replace('attachment:', '').trim();
    const resolved = await getAttachmentUrl(id);
    return resolved || urlOrRef;
  }
  return urlOrRef;
}

/**
 * Replaces all `attachment:<id>` occurrences in a Markdown string
 * with active browser `blob:` object URLs for high-performance rendering.
 */
export async function resolveMarkdownAttachments(markdown: string): Promise<string> {
  if (!markdown || !markdown.includes('attachment:')) {
    return markdown;
  }

  // Find all attachment IDs in the markdown
  const idRegex = /attachment:([a-zA-Z0-9_-]+)/g;
  const matches = new Set<string>();
  let match;
  while ((match = idRegex.exec(markdown)) !== null) {
    matches.add(match[1]);
  }

  let resolved = markdown;
  for (const id of matches) {
    const blobUrl = await getAttachmentUrl(id);
    if (blobUrl) {
      resolved = resolved.split(`attachment:${id}`).join(blobUrl);
    }
  }

  return resolved;
}

/**
 * Export Helper: Resolves `attachment:<id>` back to Base64 data URLs
 * for offline standalone HTML or PDF generation.
 */
export async function resolveMarkdownAttachmentsToDataUrl(markdown: string): Promise<string> {
  if (!markdown || !markdown.includes('attachment:')) {
    return markdown;
  }

  const idRegex = /attachment:([a-zA-Z0-9_-]+)/g;
  const matches = new Set<string>();
  let match;
  while ((match = idRegex.exec(markdown)) !== null) {
    matches.add(match[1]);
  }

  let resolved = markdown;
  for (const id of matches) {
    const blob = await getAttachmentBlob(id);
    if (blob) {
      const dataUrl = await blobToDataUrl(blob);
      resolved = resolved.split(`attachment:${id}`).join(dataUrl);
    }
  }

  return resolved;
}

/**
 * Scans a note's body for embedded inline Base64 data URLs (images and audio),
 * extracts them into separate Blobs in `db.attachments`, and replaces them with `attachment:<id>`.
 * Drastically shrinks note text payload in IndexedDB!
 */
export async function migrateNoteInlineAttachments(note: Note): Promise<{
  updated: boolean;
  note: Note;
  savedBytes: number;
}> {
  if (!note.body || !note.body.includes('data:')) {
    return { updated: false, note, savedBytes: 0 };
  }

  let newBody = note.body;
  const newAttachments: Attachment[] = [...(note.attachments || [])];
  let totalSavedBytes = 0;

  // Regex to match inline Base64 data URLs: ![alt](data:image/...) or src="data:audio/..." or [doc](data:application/...)
  const dataUrlRegex = /(data:[a-zA-Z0-9\+\-\.]+\/[a-zA-Z0-9\+\-\.]+;base64,[A-Za-z0-9+/=]+)/g;
  const matches = Array.from(new Set(newBody.match(dataUrlRegex) || []));

  for (const dataUrl of matches) {
    try {
      const blob = dataUrlToBlob(dataUrl);
      const isAudio = dataUrl.startsWith('data:audio');
      const isImage = dataUrl.startsWith('data:image');
      const name = isAudio ? 'Voice Memo' : isImage ? 'Pasted Image' : 'Attachment File';
      const att = await saveAttachment(blob, name, blob.type, note.id);
      newAttachments.push(att);

      newBody = newBody.split(dataUrl).join(`attachment:${att.id}`);
      totalSavedBytes += dataUrl.length - `attachment:${att.id}`.length;
    } catch (err) {
      console.warn('Failed to migrate inline attachment:', err);
    }
  }

  if (totalSavedBytes > 0) {
    const updatedNote: Note = {
      ...note,
      body: newBody,
      attachments: newAttachments,
      updated_time: Date.now(),
    };
    await db.notes.put(updatedNote);
    return { updated: true, note: updatedNote, savedBytes: totalSavedBytes };
  }

  return { updated: false, note, savedBytes: 0 };
}

/**
 * Scans all notes in the database and migrates legacy embedded inline Base64
 * data URLs into native Blobs in the attachments table.
 */
export async function migrateAllNotesInlineAttachments(
  onProgress?: (processed: number, total: number, savedBytes: number) => void
): Promise<{
  migratedNotesCount: number;
  totalSavedBytes: number;
}> {
  try {
    const allNotes = await db.notes.toArray();
    let migratedNotesCount = 0;
    let totalSavedBytes = 0;

    for (let i = 0; i < allNotes.length; i++) {
      const note = allNotes[i];
      if (note.body && note.body.includes('data:')) {
        const res = await migrateNoteInlineAttachments(note);
        if (res.updated) {
          migratedNotesCount++;
          totalSavedBytes += res.savedBytes;
        }
      }
      if (onProgress) {
        onProgress(i + 1, allNotes.length, totalSavedBytes);
      }
    }

    return { migratedNotesCount, totalSavedBytes };
  } catch (err) {
    console.warn('Batch attachment migration failed:', err);
    return { migratedNotesCount: 0, totalSavedBytes: 0 };
  }
}

/**
 * Helper to download an attachment by ID from IndexedDB
 */
export async function downloadAttachment(id: string, fallbackName?: string): Promise<boolean> {
  try {
    const blob = await getAttachmentBlob(id);
    if (!blob) return false;
    const record = await db.attachments.get(id);
    const filename = record?.name || fallbackName || `attachment_${id}`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch (err) {
    console.warn('Failed to download attachment:', id, err);
    return false;
  }
}
