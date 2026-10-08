import type { Note } from '../types';

export interface WikiLinkMatch {
  raw: string;
  target: string;
  alias?: string;
  index: number;
}

export interface BacklinkInfo {
  sourceNote: Note;
  targetTitle: string;
  contextSnippet: string;
}

/**
 * Normalizes title for case-insensitive matching
 */
export function normalizeTitle(title: string): string {
  return (title || '').trim().toLowerCase();
}

/**
 * Strips leading emojis, special symbol prefixes, and normalizes title for fuzzy/emoji-resilient matching
 */
export function cleanTitleKey(title: string): string {
  if (!title) return '';
  return title
    .replace(/^[\p{Emoji}\p{Extended_Pictographic}\u200d\uFE0F\s]+/u, '')
    .trim()
    .toLowerCase();
}

/**
 * Extracts all [[WikiLinks]] or [[WikiLink|Alias]] from markdown or text
 */
export function extractWikiLinks(text: string): WikiLinkMatch[] {
  if (!text) return [];
  const matches: WikiLinkMatch[] = [];
  const seenTargets = new Set<string>();

  // Primary: standard [[Target]] or [[Target|Alias]]
  const regex = /\[\[([^\]\|]+)(?:\|([^\]]+))?\]\]/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const target = match[1].trim();
    if (target) {
      matches.push({
        raw: match[0],
        target,
        alias: match[2]?.trim(),
        index: match.index,
      });
      seenTargets.add(normalizeTitle(target));
    }
  }

  // Secondary fallback: [Alias](#wikilink-Target) or data-wikilink="Target"
  const htmlFallbackRegex = /(?:href="#wikilink-([^"]+)"|data-wikilink="([^"]+)"|\[([^\]]*)\]\(#wikilink-([^\)]+)\))/g;
  let fallbackMatch: RegExpExecArray | null;
  while ((fallbackMatch = htmlFallbackRegex.exec(text)) !== null) {
    const rawTarget = fallbackMatch[1] || fallbackMatch[2] || fallbackMatch[4];
    const rawAlias = fallbackMatch[3];
    if (rawTarget) {
      const decoded = decodeURIComponent(rawTarget).trim();
      const norm = normalizeTitle(decoded);
      if (decoded && !seenTargets.has(norm)) {
        seenTargets.add(norm);
        matches.push({
          raw: fallbackMatch[0],
          target: decoded,
          alias: rawAlias?.replace(/^🔗\s*/, '').trim(),
          index: fallbackMatch.index,
        });
      }
    }
  }

  return matches;
}

/**
 * Finds all notes that link to the specified target note (Backlinks)
 */
export function findBacklinks(targetNote: Note, allNotes: Note[]): BacklinkInfo[] {
  if (!targetNote || !targetNote.title) return [];
  const targetNorm = normalizeTitle(targetNote.title);
  const targetClean = cleanTitleKey(targetNote.title);
  const backlinks: BacklinkInfo[] = [];

  for (const note of allNotes) {
    if (note.id === targetNote.id || note.is_deleted) continue;

    const fullContent = (note.body || '') + ' ' + (note.body_html || '');
    const links = extractWikiLinks(fullContent);
    const matchedLink = links.find((l) => {
      const linkNorm = normalizeTitle(l.target);
      return linkNorm === targetNorm || (targetClean && cleanTitleKey(l.target) === targetClean);
    });

    if (matchedLink) {
      // Extract a snippet of text surrounding the link
      const body = note.body || '';
      const start = Math.max(0, matchedLink.index - 50);
      const end = Math.min(body.length, matchedLink.index + matchedLink.raw.length + 50);
      let snippet = body.slice(start, end).replace(/\n+/g, ' ').trim();
      if (start > 0) snippet = '...' + snippet;
      if (end < body.length) snippet = snippet + '...';

      backlinks.push({
        sourceNote: note,
        targetTitle: matchedLink.target,
        contextSnippet: snippet,
      });
    }
  }

  return backlinks;
}

/**
 * Finds all note title matches for an autocomplete query after `[[`
 */
export function searchWikiLinkSuggestions(
  query: string,
  allNotes: Note[],
  currentNoteId?: string
): Note[] {
  // Strip any leading and trailing brackets and whitespace (e.g. [[title]] -> title)
  const cleanQuery = (query || '')
    .replace(/^\[+/, '')
    .replace(/\]+$/, '')
    .trim();
  const normQuery = normalizeTitle(cleanQuery);
  const cleanQueryKey = cleanTitleKey(cleanQuery);

  const validNotes = (allNotes || []).filter((n) => !n.is_deleted);
  if (!normQuery) {
    // If query is empty, return up to 8 recent notes (exclude current note if possible)
    return validNotes
      .filter((n) => !currentNoteId || n.id !== currentNoteId)
      .slice(0, 8);
  }

  // Filter notes that match the query in title (handles emoji prefixes gracefully)
  const matches = validNotes.filter((n) => {
    const titleNorm = normalizeTitle(n.title);
    const titleClean = cleanTitleKey(n.title);
    return titleNorm.includes(normQuery) || (cleanQueryKey && titleClean.includes(cleanQueryKey));
  });

  // Sort matches: exact match first, then startsWith, then general includes
  matches.sort((a, b) => {
    const aNorm = normalizeTitle(a.title);
    const bNorm = normalizeTitle(b.title);
    const aClean = cleanTitleKey(a.title);
    const bClean = cleanTitleKey(b.title);

    if (aNorm === normQuery || aClean === cleanQueryKey) return -1;
    if (bNorm === normQuery || bClean === cleanQueryKey) return 1;

    const aStarts = aNorm.startsWith(normQuery) || aClean.startsWith(cleanQueryKey);
    const bStarts = bNorm.startsWith(normQuery) || bClean.startsWith(cleanQueryKey);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    return 0;
  });

  return matches.slice(0, 8);
}
