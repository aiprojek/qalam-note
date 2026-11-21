/**
 * Qalam Note - Obsidian & Joplin Compatible Vault Exporter & Importer
 * Supports bidirectional lossless sync with Obsidian vaults:
 * - Nested folder hierarchy
 * - Standard YAML Frontmatter (title, tags, created, updated, favorite, pinned)
 * - Wikilinks [[Note Title]] and attachments
 * - Pure client-side via JSZip and FileReader
 */

import JSZip from 'jszip';
import type { Note, Folder, Tag, Attachment } from '../types';
import { db } from '../db';
import { saveAttachment, getAttachmentBlob } from './attachments';
import { APP_VERSION } from '../constants/version';



/**
 * Sanitizes file and directory names for zip filesystem safety
 */
function sanitizePathName(name: string, fallback: string = 'Untitled'): string {
  if (!name || !name.trim()) return fallback;
  return name.trim().replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').slice(0, 100);
}

/**
 * Formats frontmatter array or string for YAML
 */
function formatYamlTags(tags: string[] = []): string {
  if (!tags || tags.length === 0) return '[]';
  return '\n' + tags.map((t) => `  - ${t.replace(/^#/, '')}`).join('\n');
}

/**
 * Generates an Obsidian-compatible Markdown document with YAML frontmatter
 */
export function generateObsidianMarkdown(note: Note, folderPath: string = ''): string {
  const frontmatter = [
    '---',
    `title: "${(note.title || 'Untitled').replace(/"/g, '\\"')}"`,
    `created: ${new Date(note.created_time).toISOString()}`,
    `updated: ${new Date(note.updated_time).toISOString()}`,
    `tags:${formatYamlTags(note.tags)}`,
    `is_todo: ${!!note.is_todo}`,
    note.is_todo && note.todo_completed ? `completed: ${new Date(note.todo_completed).toISOString()}` : null,
    note.is_favorite ? 'favorite: true' : null,
    note.is_pinned ? 'pinned: true' : null,
    note.is_encrypted ? 'is_encrypted: true' : null,
    folderPath ? `folder: "${folderPath.replace(/"/g, '\\"')}"` : null,
    'source: "Qalam Note"',
    '---',
    '',
  ]
    .filter((line) => line !== null)
    .join('\n');

  let noteBody = note.body || '';
  if (note.is_encrypted && note.encrypted_data && !noteBody) {
    noteBody = `-----BEGIN QALAM ENCRYPTED PAYLOAD-----\n${note.encrypted_data.ciphertext}\n-----END QALAM ENCRYPTED PAYLOAD-----`;
  }

  return `${frontmatter}\n${noteBody}\n`;
}

/**
 * Exports all or selected notes as an Obsidian Vault ZIP archive
 */
export async function exportToObsidianVaultZip(
  notes: Note[],
  folders: Folder[],
  tags: Tag[] = []
): Promise<Blob> {
  const zip = new JSZip();

  // Map folder IDs to paths
  const folderPathMap = new Map<string, string>();

  function getFolderPath(folderId: string): string {
    if (!folderId) return '';
    if (folderPathMap.has(folderId)) return folderPathMap.get(folderId)!;

    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return '';

    let path = sanitizePathName(folder.title, 'Folder');
    if (folder.parent_id) {
      const parentPath = getFolderPath(folder.parent_id);
      if (parentPath) {
        path = `${parentPath}/${path}`;
      }
    }
    folderPathMap.set(folderId, path);
    return path;
  }

  // Pre-calculate folder paths
  for (const f of folders) {
    getFolderPath(f.id);
  }

  // Set to avoid duplicate filenames within the same folder
  const usedPaths = new Set<string>();

  // Map of attachmentId -> fileName in attachments/
  const attachmentFileMap = new Map<string, string>();
  const exportedAttachmentsFolder = zip.folder('attachments');

  // Find all attachments referenced in active notes
  const referencedAttachmentIds = new Set<string>();
  for (const note of notes) {
    if (note.is_deleted) continue;
    if (note.attachments) {
      note.attachments.forEach((a) => referencedAttachmentIds.add(a.id));
    }
    const matches = (note.body || '').match(/attachment:([a-zA-Z0-9_-]+)/g);
    if (matches) {
      matches.forEach((m) => referencedAttachmentIds.add(m.replace('attachment:', '')));
    }
  }

  // Pack attachments into attachments/ folder
  for (const attId of Array.from(referencedAttachmentIds)) {
    try {
      const record = await db.attachments.get(attId);
      const blob = await getAttachmentBlob(attId);
      if (blob && exportedAttachmentsFolder) {
        let attName = sanitizePathName(record?.name || `attachment_${attId}`);
        if (!attName.includes('.')) {
          const ext = record?.mime === 'image/png' ? '.png' : record?.mime === 'image/webp' ? '.webp' : record?.mime === 'image/jpeg' ? '.jpg' : '';
          attName += ext;
        }
        exportedAttachmentsFolder.file(attName, blob);
        attachmentFileMap.set(attId, attName);
      }
    } catch (e) {
      console.warn('Failed to pack attachment into vault zip:', attId, e);
    }
  }

  for (const note of notes) {
    if (note.is_deleted) continue;

    const folderPath = note.folder_id ? getFolderPath(note.folder_id) : '';
    const baseName = sanitizePathName(note.title, 'Untitled');

    let fileName = `${baseName}.md`;
    let fullPath = folderPath ? `${folderPath}/${fileName}` : fileName;

    let counter = 1;
    while (usedPaths.has(fullPath)) {
      counter++;
      fileName = `${baseName} (${counter}).md`;
      fullPath = folderPath ? `${folderPath}/${fileName}` : fileName;
    }
    usedPaths.add(fullPath);

    // Rewrite attachment references: attachment:att_xxx -> attachments/fileName
    let noteToExport = note;
    if (attachmentFileMap.size > 0 && note.body) {
      let rewrittenBody = note.body;
      for (const [attId, attFileName] of attachmentFileMap.entries()) {
        rewrittenBody = rewrittenBody.split(`attachment:${attId}`).join(`attachments/${attFileName}`);
      }
      noteToExport = { ...note, body: rewrittenBody };
    }

    const mdContent = generateObsidianMarkdown(noteToExport, folderPath);
    zip.file(fullPath, mdContent);
  }


  // Include .obsidian folder metadata for smooth opening in Obsidian
  const obsidianConfig = {
    vaultName: 'Qalam Note Vault',
    createdWith: `Qalam Note v${APP_VERSION}`,
    exportDate: new Date().toISOString(),
  };

  zip.file('.obsidian/app.json', JSON.stringify({ legacyEditor: false, livePreview: true }, null, 2));

  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

/**
 * Parses YAML frontmatter and markdown body from an imported file
 */
export function parseObsidianMarkdown(fileContent: string): {
  title?: string;
  tags: string[];
  body: string;
  createdTime?: number;
  updatedTime?: number;
  isTodo?: boolean;
  todoCompleted?: number;
  isFavorite?: boolean;
  isPinned?: boolean;
} {
  const result = {
    title: undefined as string | undefined,
    tags: [] as string[],
    body: fileContent,
    createdTime: undefined as number | undefined,
    updatedTime: undefined as number | undefined,
    isTodo: false,
    todoCompleted: 0,
    isFavorite: false,
    isPinned: false,
  };

  const frontmatterMatch = fileContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!frontmatterMatch) {
    // If no YAML frontmatter, check for # Title at the beginning
    const titleMatch = fileContent.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      result.title = titleMatch[1].trim();
    }
    return result;
  }

  const rawYaml = frontmatterMatch[1];
  result.body = frontmatterMatch[2];

  const lines = rawYaml.split(/\r?\n/);
  let inTagsList = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Check if exiting tag list
    if (inTagsList && (trimmed.startsWith('-') || trimmed.startsWith('*'))) {
      const tagVal = trimmed.replace(/^[-*]\s*/, '').replace(/['"]/g, '').trim();
      if (tagVal) result.tags.push(tagVal);
      continue;
    } else if (inTagsList && trimmed && !trimmed.startsWith('-')) {
      inTagsList = false;
    }

    if (trimmed.startsWith('title:')) {
      result.title = trimmed.replace(/^title:\s*/, '').replace(/^["']|["']$/g, '').trim();
    } else if (trimmed.startsWith('tags:')) {
      const inlineTags = trimmed.replace(/^tags:\s*/, '').trim();
      if (inlineTags.startsWith('[') && inlineTags.endsWith(']')) {
        const parsed = inlineTags
          .slice(1, -1)
          .split(',')
          .map((t) => t.trim().replace(/^["']|["']$/g, '').replace(/^#/, ''))
          .filter(Boolean);
        result.tags.push(...parsed);
      } else if (!inlineTags || inlineTags === '') {
        inTagsList = true;
      }
    } else if (trimmed.startsWith('created:')) {
      const d = Date.parse(trimmed.replace(/^created:\s*/, '').replace(/^["']|["']$/g, '').trim());
      if (!isNaN(d)) result.createdTime = d;
    } else if (trimmed.startsWith('updated:')) {
      const d = Date.parse(trimmed.replace(/^updated:\s*/, '').replace(/^["']|["']$/g, '').trim());
      if (!isNaN(d)) result.updatedTime = d;
    } else if (trimmed.startsWith('is_todo:')) {
      result.isTodo = trimmed.includes('true');
    } else if (trimmed.startsWith('favorite:')) {
      result.isFavorite = trimmed.includes('true');
    } else if (trimmed.startsWith('pinned:')) {
      result.isPinned = trimmed.includes('true');
    }
  }

  // Also collect any inline #tag mentions inside markdown body (like #riset/islam)
  const inlineTagMatches = result.body.match(/(?:^|\s)#[a-zA-Z\u0600-\u06FF0-9_\-\/]+/g);
  if (inlineTagMatches) {
    for (const match of inlineTagMatches) {
      const tag = match.trim().replace(/^#/, '');
      // Exclude markdown headings (e.g. ##, ###)
      if (tag && !/^[#\s]+$/.test(tag) && !result.tags.includes(tag)) {
        result.tags.push(tag);
      }
    }
  }

  return result;
}

export interface ImportVaultResult {
  success: boolean;
  importedNotesCount: number;
  importedFoldersCount: number;
  importedTagsCount: number;
  message: string;
}

/**
 * Imports an Obsidian or Joplin ZIP vault into local Dexie database
 */
export async function importVaultZip(zipFile: File | Blob): Promise<ImportVaultResult> {
  try {
    const zip = await JSZip.loadAsync(zipFile);
    const existingFolders = await db.folders.toArray();
    const existingTags = await db.tags.toArray();

    const folderMapByPath = new Map<string, string>(); // path -> folderId
    for (const f of existingFolders) {
      folderMapByPath.set(f.title.toLowerCase(), f.id);
    }

    let notesCount = 0;
    let foldersCount = 0;
    const newTagsSet = new Set<string>();

    // Helper to get or create folder by path
    async function resolveFolder(folderPath: string): Promise<string | undefined> {
      if (!folderPath) return undefined;
      const normalizedPath = folderPath.trim().toLowerCase();
      if (folderMapByPath.has(normalizedPath)) {
        return folderMapByPath.get(normalizedPath);
      }

      const parts = folderPath.split('/').filter(Boolean);
      let parentId: string | undefined = undefined;
      let currentPath = '';

      for (const part of parts) {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        const currentLower = currentPath.toLowerCase();

        if (folderMapByPath.has(currentLower)) {
          parentId = folderMapByPath.get(currentLower);
        } else {
          const newFolderId = `folder_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
          await db.folders.put({
            id: newFolderId,
            title: part,
            parent_id: parentId || '',
            is_deleted: false,
            order: Date.now(),
            created_time: Date.now(),
            updated_time: Date.now(),
          });
          folderMapByPath.set(currentLower, newFolderId);
          parentId = newFolderId;
          foldersCount++;
        }
      }

      return parentId;
    }

    // Process all files in ZIP
    const fileEntries = Object.entries(zip.files);

    // 1. First Pass: Import images and attachments from ZIP into attachments table
    const attachmentIdByName = new Map<string, Attachment>();
    for (const [relativePath, zipEntry] of fileEntries) {
      if (zipEntry.dir || relativePath.startsWith('.obsidian/') || relativePath.startsWith('__MACOSX/')) {
        continue;
      }
      if (relativePath.match(/\.(png|jpe?g|webp|gif|svg|pdf|wav|mp3|m4a|ogg)$/i)) {
        try {
          const blob = await zipEntry.async('blob');
          const fileName = relativePath.split('/').pop() || 'attachment';
          const ext = fileName.split('.').pop()?.toLowerCase() || '';
          const mime =
            ext === 'png' ? 'image/png' :
            ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
            ext === 'webp' ? 'image/webp' :
            ext === 'svg' ? 'image/svg+xml' :
            ext === 'gif' ? 'image/gif' :
            ext === 'pdf' ? 'application/pdf' :
            ext === 'wav' ? 'audio/wav' :
            ext === 'mp3' ? 'audio/mpeg' :
            blob.type || 'application/octet-stream';
          const att = await saveAttachment(blob, fileName, mime);
          attachmentIdByName.set(fileName, att);
          attachmentIdByName.set(relativePath, att);
        } catch (e) {
          console.warn('Failed to import attachment from zip:', relativePath, e);
        }
      }
    }

    // 2. Second Pass: Process markdown files
    for (const [relativePath, zipEntry] of fileEntries) {
      if (zipEntry.dir || relativePath.startsWith('.obsidian/') || relativePath.startsWith('__MACOSX/')) {
        continue;
      }

      // Check if markdown file
      if (relativePath.endsWith('.md') || relativePath.endsWith('.markdown') || relativePath.endsWith('.txt')) {
        const content = await zipEntry.async('string');
        const parsed = parseObsidianMarkdown(content);

        // Derive folder from path
        const pathParts = relativePath.split('/');
        const fileNameWithExt = pathParts.pop() || '';
        const folderPath = pathParts.join('/');

        const folderId = folderPath ? await resolveFolder(folderPath) : '';
        const fallbackTitle = fileNameWithExt.replace(/\.(md|markdown|txt)$/i, '');
        const finalTitle = parsed.title || fallbackTitle || 'Catatan Impor';

        // Rewrite attachment links: ![[image.png]] or ![](attachments/image.png) -> attachment:id
        let noteBody = parsed.body;
        const noteAttachments: Attachment[] = [];

        if (attachmentIdByName.size > 0) {
          for (const [attKey, att] of attachmentIdByName.entries()) {
            const escaped = attKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Obsidian wiki-embed: ![[image.png]] or ![[image.png|alt]]
            noteBody = noteBody.replace(new RegExp(`!\\[\\[${escaped}(?:\\|[^\\]]*)?\\]\\]`, 'g'), `![${att.name}](attachment:${att.id})`);
            // Markdown link: ![](attachments/image.png) or ![](image.png)
            noteBody = noteBody.replace(new RegExp(`\\]\\((?:attachments\\/)?${escaped}\\)`, 'g'), `](attachment:${att.id})`);

            if (noteBody.includes(`attachment:${att.id}`)) {
              if (!noteAttachments.some((a) => a.id === att.id)) {
                noteAttachments.push(att);
              }
            }
          }
        }

        // Collect tags
        parsed.tags.forEach((t) => newTagsSet.add(t));

        const noteId = `note_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`;
        await db.notes.put({
          id: noteId,
          folder_id: folderId || '',
          title: finalTitle,
          body: noteBody,
          attachments: noteAttachments.length > 0 ? noteAttachments : undefined,
          tags: parsed.tags,
          is_todo: !!parsed.isTodo,
          todo_completed: parsed.todoCompleted || 0,
          todo_due: 0,
          is_favorite: !!parsed.isFavorite,
          is_pinned: !!parsed.isPinned,
          is_deleted: false,
          is_encrypted: false,
          order: Date.now(),
          sync_status: 'pending',
          created_time: parsed.createdTime || Date.now(),
          updated_time: parsed.updatedTime || Date.now(),
        });
        notesCount++;
      }
    }


    // Persist any new tags into tags table
    const existingTagTitles = new Set(existingTags.map((t) => t.title.toLowerCase()));
    let tagsCount = 0;
    for (const tagTitle of Array.from(newTagsSet)) {
      if (!existingTagTitles.has(tagTitle.toLowerCase())) {
        await db.tags.put({
          id: `tag_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          title: tagTitle,
          created_time: Date.now(),
          updated_time: Date.now(),
        });
        tagsCount++;
      }
    }


    return {
      success: true,
      importedNotesCount: notesCount,
      importedFoldersCount: foldersCount,
      importedTagsCount: tagsCount,
      message: `Berhasil mengimpor ${notesCount} catatan${attachmentIdByName.size > 0 ? `, ${attachmentIdByName.size} lampiran media` : ''}, ${foldersCount} folder baru, dan ${tagsCount} tag baru.`,
    };

  } catch (err: any) {
    console.error('Failed to import vault zip:', err);
    return {
      success: false,
      importedNotesCount: 0,
      importedFoldersCount: 0,
      importedTagsCount: 0,
      message: `Gagal membaca arsip berkas: ${err?.message || 'Format tidak valid'}`,
    };
  }
}
