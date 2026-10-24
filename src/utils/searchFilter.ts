import type { Note, Folder } from '../types';

export interface ParsedSearchQuery {
  raw: string;
  tags: string[];
  folders: string[];
  isTodo: boolean | null;
  isDone: boolean | null;
  isPending: boolean | null;
  hasAudio: boolean | null;
  isLocked: boolean | null;
  isStarred: boolean | null;
  isPinned: boolean | null;
  freeTextTokens: string[];
}

/**
 * Parses search query string containing advanced filter operators:
 * - tag:belajar or tag:"kuliah data"
 * - folder:projek or folder:"Catatan Kantor"
 * - is:todo
 * - is:done / is:completed
 * - is:pending / is:open
 * - has:audio / has:voice
 * - is:locked / is:vault
 * - is:starred / is:favorite
 * - is:pinned
 */
export function parseAdvancedSearchQuery(query: string): ParsedSearchQuery {
  const result: ParsedSearchQuery = {
    raw: query,
    tags: [],
    folders: [],
    isTodo: null,
    isDone: null,
    isPending: null,
    hasAudio: null,
    isLocked: null,
    isStarred: null,
    isPinned: null,
    freeTextTokens: [],
  };

  if (!query || !query.trim()) {
    return result;
  }

  // Regex to match operators like tag:value, folder:"multi word", is:todo, etc.
  const operatorRegex = /\b([a-zA-Z_-]+):(?:"([^"]+)"|([^\s]+))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = operatorRegex.exec(query)) !== null) {
    // Collect any free text between operators
    if (match.index > lastIndex) {
      const freePiece = query.slice(lastIndex, match.index).trim();
      if (freePiece) {
        result.freeTextTokens.push(...freePiece.split(/\s+/).filter(Boolean));
      }
    }
    lastIndex = operatorRegex.lastIndex;

    const opKey = match[1].toLowerCase();
    const opValue = (match[2] !== undefined ? match[2] : match[3] || '').trim().toLowerCase();

    switch (opKey) {
      case 'tag':
        if (opValue) result.tags.push(opValue);
        break;

      case 'folder':
      case 'notebook':
        if (opValue) result.folders.push(opValue);
        break;

      case 'is':
        if (opValue === 'todo' || opValue === 'task') {
          result.isTodo = true;
        } else if (opValue === 'done' || opValue === 'completed' || opValue === 'finished') {
          result.isDone = true;
        } else if (opValue === 'pending' || opValue === 'open' || opValue === 'undone') {
          result.isPending = true;
        } else if (opValue === 'locked' || opValue === 'vault' || opValue === 'encrypted') {
          result.isLocked = true;
        } else if (opValue === 'starred' || opValue === 'favorite' || opValue === 'star') {
          result.isStarred = true;
        } else if (opValue === 'pinned' || opValue === 'pin') {
          result.isPinned = true;
        }
        break;

      case 'has':
        if (opValue === 'audio' || opValue === 'voice' || opValue === 'sound') {
          result.hasAudio = true;
        }
        break;

      default:
        // Unknown operator: treat as regular token
        result.freeTextTokens.push(match[0]);
        break;
    }
  }

  // Trailing free text after the last operator
  if (lastIndex < query.length) {
    const trailing = query.slice(lastIndex).trim();
    if (trailing) {
      result.freeTextTokens.push(...trailing.split(/\s+/).filter(Boolean));
    }
  }

  return result;
}

/**
 * Checks if a given note matches the parsed advanced search query.
 */
export function matchesAdvancedSearch(
  note: Note,
  query: string,
  folders: Folder[] = []
): boolean {
  if (!query || !query.trim()) return true;

  const parsed = parseAdvancedSearchQuery(query);

  // 1. Tag filter (e.g. tag:belajar)
  if (parsed.tags.length > 0) {
    const noteTags = (note.tags || []).map((t) => t.toLowerCase());
    const matchesAllTags = parsed.tags.every((neededTag) =>
      noteTags.some((nt) => nt === neededTag || nt.includes(neededTag))
    );
    if (!matchesAllTags) return false;
  }

  // 2. Folder / Notebook filter (e.g. folder:projek)
  if (parsed.folders.length > 0) {
    const noteFolder = folders.find((f) => f.id === note.folder_id);
    const folderTitle = (noteFolder?.title || '').toLowerCase();
    const matchesAllFolders = parsed.folders.every((neededFolder) =>
      folderTitle.includes(neededFolder)
    );
    if (!matchesAllFolders) return false;
  }

  // 3. is:todo filter
  if (parsed.isTodo === true && !note.is_todo) {
    return false;
  }

  // 4. is:done / is:completed filter
  if (parsed.isDone === true && (!note.is_todo || !note.todo_completed || note.todo_completed === 0)) {
    return false;
  }

  // 5. is:pending / is:open filter
  if (parsed.isPending === true && (!note.is_todo || (note.todo_completed && note.todo_completed > 0))) {
    return false;
  }

  // 6. is:locked / is:vault filter
  if (parsed.isLocked === true && !note.is_encrypted) {
    return false;
  }

  // 7. is:starred / is:favorite filter
  if (parsed.isStarred === true && !note.is_favorite) {
    return false;
  }

  // 8. is:pinned filter
  if (parsed.isPinned === true && !note.is_pinned) {
    return false;
  }

  // 9. has:audio filter (checks for voice recordings, audio attachments, or audio markdown in body)
  if (parsed.hasAudio === true) {
    const body = note.body || '';
    const hasAudioMemo =
      body.includes('[Audio Memo]') ||
      body.includes('audio/') ||
      body.includes('<audio') ||
      body.includes('data:audio') ||
      body.includes('voice_note_');
    if (!hasAudioMemo) return false;
  }

  // 10. Free text tokens match
  if (parsed.freeTextTokens.length > 0) {
    const noteTitle = (note.title || '').toLowerCase();
    const noteBody = (note.body || '').toLowerCase();
    const noteTags = (note.tags || []).map((t) => t.toLowerCase()).join(' ');

    const matchesAllTokens = parsed.freeTextTokens.every((token) => {
      const lowerToken = token.toLowerCase();
      return (
        noteTitle.includes(lowerToken) ||
        noteBody.includes(lowerToken) ||
        noteTags.includes(lowerToken)
      );
    });

    if (!matchesAllTokens) return false;
  }

  return true;
}
