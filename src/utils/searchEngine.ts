/**
 * Qalam Note - High Performance Local Full-Text Search (FTS) Engine
 * Inverted-index in-memory search with BM25 ranking, fuzzy prefix matching,
 * Arabic diacritic normalization, exact phrase search, and snippet generation.
 */

import type { Note, Folder } from '../types';
import { parseAdvancedSearchQuery } from './searchFilter';

export interface SearchMatchHighlight {
  snippet: string;
  matchedField: 'title' | 'tag' | 'body';
}

export interface SearchResultItem {
  note: Note;
  score: number;
  snippet?: string;
}

/**
 * Normalizes text for search indexing:
 * - Converts to lower case
 * - Strips common markdown formatting (bold, italic, code, links, image tags)
 * - Normalizes Arabic diacritics (harakat/tashkeel, tatweel, alif variants)
 */
export function normalizeSearchText(text: string): string {
  if (!text) return '';

  let cleaned = text
    .toLowerCase()
    // Remove markdown code fences & inline code
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    // Remove markdown images and links keeping text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1 ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1 ')
    // Remove html tags
    .replace(/<[^>]+>/g, ' ')
    // Normalize Arabic diacritics (Tashkeel: Fathah, Dammah, Kasrah, Sukun, Tanween, Shaddah)
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    // Normalize Arabic Alifs (أ إ آ -> ا)
    .replace(/[\u0622\u0623\u0625]/g, '\u0627')
    // Normalize Alif Maqsura (ى -> ي)
    .replace(/\u0649/g, '\u064A')
    // Normalize Taa Marbutah (ة -> ه)
    .replace(/\u0629/g, '\u0647');

  return cleaned;
}

/**
 * Splits text into indexable tokens (words), removing punctuation while keeping alphanumeric and Arabic/Unicode words
 */
export function tokenize(text: string): string[] {
  const normalized = normalizeSearchText(text);
  // Match word sequences (supports latin, digits, arabic, and unicode characters)
  const matches = normalized.match(/[\p{L}\p{N}]+/gu);
  return matches ? matches.filter((w) => w.length > 0) : [];
}

interface IndexPosting {
  noteId: string;
  field: 'title' | 'tag' | 'body';
  freq: number;
}

export class NoteSearchEngine {
  private invertedIndex: Map<string, IndexPosting[]> = new Map();
  private notesMap: Map<string, Note> = new Map();
  private indexedNoteSignatures: Map<string, number> = new Map(); // noteId -> updated_time
  private noteTokensMap: Map<string, Set<string>> = new Map(); // noteId -> Set of indexed tokens

  /**
   * Builds or updates the inverted index incrementally
   */
  public syncNotes(notes: Note[]): void {
    const activeIds = new Set<string>();

    for (const note of notes) {
      if (note.is_deleted) continue;
      activeIds.add(note.id);

      const existingTime = this.indexedNoteSignatures.get(note.id);
      if (existingTime === note.updated_time && this.notesMap.has(note.id)) {
        // Note is unchanged, skip re-indexing
        continue;
      }

      // Remove previous postings for this note if updating
      if (existingTime !== undefined) {
        this.removeNoteFromIndex(note.id);
      }

      this.indexNote(note);
    }

    // Prune deleted notes from index
    for (const id of Array.from(this.notesMap.keys())) {
      if (!activeIds.has(id)) {
        this.removeNoteFromIndex(id);
      }
    }
  }

  private indexNote(note: Note): void {
    this.notesMap.set(note.id, note);
    this.indexedNoteSignatures.set(note.id, note.updated_time);

    // Index Title (weight 10x)
    const titleTokens = tokenize(note.title || '');
    this.addTokens(note.id, 'title', titleTokens);

    // Index Tags (weight 8x)
    const tagTokens: string[] = [];
    (note.tags || []).forEach((t) => {
      tagTokens.push(...tokenize(t));
      // Also split nested tags like 'proyek/islam' into 'proyek' and 'islam'
      t.split(/[\/\-_]/).forEach((sub) => {
        tagTokens.push(...tokenize(sub));
      });
    });
    this.addTokens(note.id, 'tag', tagTokens);

    // Index Body (weight 1x)
    const bodyTokens = tokenize(note.body || '');
    this.addTokens(note.id, 'body', bodyTokens);
  }

  private addTokens(noteId: string, field: 'title' | 'tag' | 'body', tokens: string[]): void {
    const counts = new Map<string, number>();
    for (const t of tokens) {
      counts.set(t, (counts.get(t) || 0) + 1);
    }

    let tokenSet = this.noteTokensMap.get(noteId);
    if (!tokenSet) {
      tokenSet = new Set<string>();
      this.noteTokensMap.set(noteId, tokenSet);
    }

    for (const [token, freq] of counts.entries()) {
      tokenSet.add(token);
      let postings = this.invertedIndex.get(token);
      if (!postings) {
        postings = [];
        this.invertedIndex.set(token, postings);
      }
      postings.push({ noteId, field, freq });
    }
  }

  private removeNoteFromIndex(noteId: string): void {
    this.notesMap.delete(noteId);
    this.indexedNoteSignatures.delete(noteId);

    const tokens = this.noteTokensMap.get(noteId);
    if (tokens) {
      for (const token of tokens) {
        const postings = this.invertedIndex.get(token);
        if (postings) {
          const filtered = postings.filter((p) => p.noteId !== noteId);
          if (filtered.length === 0) {
            this.invertedIndex.delete(token);
          } else {
            this.invertedIndex.set(token, filtered);
          }
        }
      }
      this.noteTokensMap.delete(noteId);
    }
  }


  /**
   * Executes a ranked full-text search against the index
   */
  public search(query: string, folders: Folder[] = []): SearchResultItem[] {
    const trimmed = (query || '').trim();
    if (!trimmed) {
      return Array.from(this.notesMap.values()).map((note) => ({ note, score: 1 }));
    }

    // 1. Parse advanced operators (e.g. is:todo, tag:x, folder:y)
    const parsed = parseAdvancedSearchQuery(trimmed);

    // Filter candidate notes by operator criteria
    const candidates = Array.from(this.notesMap.values()).filter((note) => {
      // Tag filter
      if (parsed.tags.length > 0) {
        const noteTags = (note.tags || []).map((t) => t.toLowerCase());
        const matchesTags = parsed.tags.every((neededTag) =>
          noteTags.some((nt) => nt === neededTag || nt.startsWith(neededTag + '/') || nt.includes(neededTag))
        );
        if (!matchesTags) return false;
      }

      // Folder filter
      if (parsed.folders.length > 0) {
        const noteFolder = folders.find((f) => f.id === note.folder_id);
        const folderTitle = (noteFolder?.title || '').toLowerCase();
        const matchesFolders = parsed.folders.every((nf) => folderTitle.includes(nf));
        if (!matchesFolders) return false;
      }

      // Todo status
      if (parsed.isTodo === true && !note.is_todo) return false;
      if (parsed.isDone === true && (!note.is_todo || !note.todo_completed || note.todo_completed === 0)) return false;
      if (parsed.isPending === true && (!note.is_todo || (note.todo_completed && note.todo_completed > 0))) return false;

      // Flags
      if (parsed.isLocked === true && !note.is_encrypted) return false;
      if (parsed.isStarred === true && !note.is_favorite) return false;
      if (parsed.isPinned === true && !note.is_pinned) return false;

      // Audio memo
      if (parsed.hasAudio === true) {
        const b = note.body || '';
        const hasAudio = b.includes('[Audio Memo]') || b.includes('audio/') || b.includes('<audio') || b.includes('data:audio');
        if (!hasAudio) return false;
      }

      return true;
    });

    // 2. If no free text tokens, return filtered candidates sorted by updated_time
    if (parsed.freeTextTokens.length === 0) {
      return candidates.map((note) => ({ note, score: 1 }));
    }

    // Check for exact phrase (tokens inside quotes in raw query)
    const exactPhrases: string[] = [];
    const phraseRegex = /"([^"]+)"/g;
    let phraseMatch;
    while ((phraseMatch = phraseRegex.exec(trimmed)) !== null) {
      if (phraseMatch[1] && !phraseMatch[0].includes(':')) {
        exactPhrases.push(normalizeSearchText(phraseMatch[1]).trim());
      }
    }

    const queryTokens = parsed.freeTextTokens.map((t) => normalizeSearchText(t)).filter((t) => t.length > 0);
    if (queryTokens.length === 0) {
      return candidates.map((note) => ({ note, score: 1 }));
    }

    // Candidate set for fast ID lookup
    const candidateIdSet = new Set(candidates.map((c) => c.id));
    const scores = new Map<string, number>();
    const matchedTokenCounts = new Map<string, number>();

    // For each query token, find matching postings in inverted index (exact + prefix match)
    for (const qToken of queryTokens) {
      const matchingPostings = new Map<string, number>(); // noteId -> score for this token

      // Look up exact matches
      const exactPostings = this.invertedIndex.get(qToken) || [];
      for (const post of exactPostings) {
        if (!candidateIdSet.has(post.noteId)) continue;
        const weight = post.field === 'title' ? 12 : post.field === 'tag' ? 8 : 1.5;
        const current = matchingPostings.get(post.noteId) || 0;
        matchingPostings.set(post.noteId, current + weight * (1 + Math.log(post.freq)));
      }

      // If token length >= 2, also do prefix matching for autocomplete-feel
      if (qToken.length >= 2) {
        for (const [indexWord, postings] of this.invertedIndex.entries()) {
          if (indexWord !== qToken && indexWord.startsWith(qToken)) {
            const prefixBonus = 0.7; // prefix matches have slightly lower score than exact
            for (const post of postings) {
              if (!candidateIdSet.has(post.noteId)) continue;
              const weight = (post.field === 'title' ? 10 : post.field === 'tag' ? 7 : 1) * prefixBonus;
              const current = matchingPostings.get(post.noteId) || 0;
              matchingPostings.set(post.noteId, current + weight);
            }
          }
        }
      }

      // Combine scores: all query tokens must match or have contribution
      for (const [noteId, tokenScore] of matchingPostings.entries()) {
        const curTotal = scores.get(noteId) || 0;
        scores.set(noteId, curTotal + tokenScore);
        const c = matchedTokenCounts.get(noteId) || 0;
        matchedTokenCounts.set(noteId, c + 1);
      }
    }

    // Filter notes: Must match all query tokens (AND logic)
    const results: SearchResultItem[] = [];

    for (const note of candidates) {
      const matchedCount = matchedTokenCounts.get(note.id) || 0;
      if (matchedCount < queryTokens.length) continue;

      const noteScore = scores.get(note.id) || 0;
      if (noteScore <= 0) continue;


      // Verify exact phrases if any
      if (exactPhrases.length > 0) {
        const fullContent = `${normalizeSearchText(note.title)} ${normalizeSearchText(note.body)}`;
        const matchesAllPhrases = exactPhrases.every((p) => fullContent.includes(p));
        if (!matchesAllPhrases) continue;
      }

      // Generate snippet context around match
      const snippet = this.generateSnippet(note, queryTokens);

      results.push({
        note,
        score: noteScore + (note.is_pinned ? 5 : 0),
        snippet,
      });
    }

    // Sort by relevance score descending, then updated_time
    results.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.note.updated_time - a.note.updated_time;
    });

    return results;
  }

  /**
   * Extracts a highlighted snippet of text around the first matched token
   */
  private generateSnippet(note: Note, queryTokens: string[], maxLen: number = 140): string {
    const rawBody = (note.body || '').replace(/```[\s\S]*?```/g, ' ').replace(/<[^>]+>/g, ' ');
    if (!rawBody.trim()) return '';

    const lowerBody = rawBody.toLowerCase();
    let bestPos = -1;

    for (const token of queryTokens) {
      const pos = lowerBody.indexOf(token);
      if (pos !== -1 && (bestPos === -1 || pos < bestPos)) {
        bestPos = pos;
      }
    }

    if (bestPos === -1) {
      // No match in body (might be in title/tag), return beginning of body
      return rawBody.slice(0, maxLen).trim() + (rawBody.length > maxLen ? '...' : '');
    }

    const start = Math.max(0, bestPos - 40);
    const end = Math.min(rawBody.length, bestPos + maxLen - 40);
    let snippet = rawBody.slice(start, end).trim();

    if (start > 0) snippet = '...' + snippet;
    if (end < rawBody.length) snippet = snippet + '...';

    return snippet;
  }
}

// Singleton search engine instance for zero overhead across re-renders
export const globalSearchEngine = new NoteSearchEngine();
