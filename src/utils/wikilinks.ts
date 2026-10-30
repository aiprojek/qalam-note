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

  // Primary: standard [[Target]], [[Target|Alias]], [[Target#Heading]], [[Target.md]]
  const regex = /\[\[([^\]\|]+)(?:\|([^\]]+))?\]\]/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const rawTarget = match[1].trim();
    const baseTarget = rawTarget.replace(/\.md$/i, '').split('#')[0].trim();
    if (baseTarget) {
      const norm = normalizeTitle(baseTarget);
      if (!seenTargets.has(norm)) {
        seenTargets.add(norm);
        matches.push({
          raw: match[0],
          target: baseTarget,
          alias: match[2]?.trim(),
          index: match.index,
        });
      }
    }
  }

  // Secondary fallback: [Alias](#wikilink-Target), data-wikilink="Target", href="#wikilink-Target", href="#note-Target"
  const htmlFallbackRegex = /(?:href=["']#(?:wikilink-|note-)?([^"']+)["']|data-wikilink=["']([^"']+)["']|\[([^\]]*)\]\(#(?:wikilink-|note-)?([^\)]+)\))/g;
  let fallbackMatch: RegExpExecArray | null;
  while ((fallbackMatch = htmlFallbackRegex.exec(text)) !== null) {
    const rawTarget = fallbackMatch[1] || fallbackMatch[2] || fallbackMatch[4];
    const rawAlias = fallbackMatch[3];
    if (rawTarget) {
      let decoded = rawTarget;
      try {
        decoded = decodeURIComponent(rawTarget).trim();
      } catch {
        decoded = rawTarget.trim();
      }
      const baseTarget = decoded.replace(/\.md$/i, '').split('#')[0].trim();
      const norm = normalizeTitle(baseTarget);
      if (baseTarget && !seenTargets.has(norm)) {
        seenTargets.add(norm);
        matches.push({
          raw: fallbackMatch[0],
          target: baseTarget,
          alias: rawAlias?.replace(/^🔗\s*/, '').trim(),
          index: fallbackMatch.index,
        });
      }
    }
  }

  return matches;
}

/**
 * Tests whether a raw WikiLink target string matches a given Note with comprehensive fallback heuristics
 */
export function isWikiTargetMatch(rawTarget: string, note: Note): boolean {
  if (!rawTarget || !note) return false;
  let decoded = rawTarget;
  try {
    decoded = decodeURIComponent(rawTarget).trim();
  } catch {
    decoded = rawTarget.trim();
  }

  const cleanTarget = decoded.replace(/\.md$/i, '').split('#')[0].trim();
  if (!cleanTarget) return false;

  // 1. Direct ID match
  if (cleanTarget === note.id) return true;

  // 2. Exact Title match
  if (cleanTarget === note.title) return true;

  // 3. Case-insensitive normalized title
  const targetNorm = normalizeTitle(cleanTarget);
  const noteNorm = normalizeTitle(note.title || '');
  if (targetNorm && targetNorm === noteNorm) return true;

  // 4. Clean Key (stripped emojis/symbols)
  const targetClean = cleanTitleKey(cleanTarget);
  const noteClean = cleanTitleKey(note.title || '');
  if (targetClean && targetClean === noteClean) return true;

  // 5. Alphanumeric / No punctuation match
  const targetNoPunct = targetNorm.replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();
  const noteNoPunct = noteNorm.replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();
  if (targetNoPunct && targetNoPunct === noteNoPunct) return true;

  // 6. Substring / Prefix match if sufficiently specific (>= 4 chars)
  if (targetNorm.length >= 4 && noteNorm.length >= 4) {
    if (noteNorm.startsWith(targetNorm) || targetNorm.startsWith(noteNorm)) return true;
    if (targetClean.length >= 4 && noteClean.length >= 4) {
      if (noteClean.startsWith(targetClean) || targetClean.startsWith(noteClean)) return true;
    }
    if (targetNoPunct.length >= 5 && noteNoPunct.length >= 5) {
      if (noteNoPunct.startsWith(targetNoPunct) || targetNoPunct.startsWith(noteNoPunct)) return true;
    }
  }

  return false;
}

/**
 * Finds all notes that link to the specified target note (Backlinks)
 */
export function findBacklinks(targetNote: Note, allNotes: Note[]): BacklinkInfo[] {
  if (!targetNote) return [];
  const backlinks: BacklinkInfo[] = [];

  for (const note of allNotes) {
    if (note.id === targetNote.id || note.is_deleted) continue;

    const fullContent = (note.body || '') + ' ' + (note.body_html || '');
    const links = extractWikiLinks(fullContent);
    const matchedLink = links.find((l) => isWikiTargetMatch(l.target, targetNote)) ||
      (fullContent.includes(`[[${targetNote.title}`) ||
       (cleanTitleKey(targetNote.title) && fullContent.includes(`[[${cleanTitleKey(targetNote.title)}`))
        ? { target: targetNote.title, raw: `[[${targetNote.title}]]`, index: 0 }
        : undefined);

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
 * Resolves all bidirectional links across notes for Knowledge Graph representation
 */
export function resolveAllGraphLinks(notes: Note[]): {
  links: { sourceId: string; targetId: string }[];
  connectionCounts: Map<string, number>;
} {
  const validNotes = notes.filter((n) => !n.is_deleted);
  const links: { sourceId: string; targetId: string }[] = [];
  const connectionCounts = new Map<string, number>();
  const seenLinks = new Set<string>();

  validNotes.forEach((n) => {
    connectionCounts.set(n.id, 0);
  });

  validNotes.forEach((sourceNote) => {
    const fullText = (sourceNote.body || '') + ' ' + (sourceNote.body_html || '');
    const wikiLinks = extractWikiLinks(fullText);

    validNotes.forEach((targetNote) => {
      if (targetNote.id === sourceNote.id) return;

      const backlinks = findBacklinks(targetNote, [sourceNote]);
      const isLinked =
        backlinks.length > 0 ||
        wikiLinks.some((wl) => isWikiTargetMatch(wl.target, targetNote)) ||
        (cleanTitleKey(targetNote.title).length >= 3 && fullText.toLowerCase().includes(`[[${cleanTitleKey(targetNote.title)}`)) ||
        (targetNote.title && fullText.includes(`[[${targetNote.title}`));

      if (isLinked) {
        const linkKey = [sourceNote.id, targetNote.id].sort().join(':::');
        if (!seenLinks.has(linkKey)) {
          seenLinks.add(linkKey);
          links.push({ sourceId: sourceNote.id, targetId: targetNote.id });
        }
        connectionCounts.set(sourceNote.id, (connectionCounts.get(sourceNote.id) || 0) + 1);
        connectionCounts.set(targetNote.id, (connectionCounts.get(targetNote.id) || 0) + 1);
      }
    });
  });

  return { links, connectionCounts };
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
