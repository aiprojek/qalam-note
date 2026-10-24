import { db } from '../db';
import type { Note, SRSCard, SRSRating } from '../types';

/**
 * Deterministic lightweight string hash for card ID generation
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Extracts flashcards from note Markdown body:
 * 1. Inline double-colon syntax: "Question text :: Answer text"
 * 2. Question / Answer blocks:
 *    Q: Question here
 *    A: Answer here
 * 3. Card block syntax:
 *    :::card
 *    Front: Question
 *    Back: Answer
 *    :::
 * 4. Cloze deletions: "Sentence with {{hidden keyword}}"
 */
export function parseFlashcardsFromNote(note: Note): Omit<SRSCard, 'repetition' | 'interval' | 'ease_factor' | 'due_date'>[] {
  if (!note || !note.body || note.is_deleted) return [];

  const cards: Omit<SRSCard, 'repetition' | 'interval' | 'ease_factor' | 'due_date'>[] = [];
  const lines = note.body.split('\n');

  // 1. Check for :::card ... ::: blocks
  const cardBlockRegex = /:::card\s*([\s\S]*?):::/gi;
  let matchBlock: RegExpExecArray | null;
  while ((matchBlock = cardBlockRegex.exec(note.body)) !== null) {
    const blockContent = matchBlock[1] || '';
    const frontMatch = blockContent.match(/(?:Front|Tanya|Soal):\s*([\s\S]*?)(?=(?:Back|Jawab):|$)/i);
    const backMatch = blockContent.match(/(?:Back|Jawab):\s*([\s\S]*)/i);

    if (frontMatch && backMatch) {
      const front = frontMatch[1].trim();
      const back = backMatch[1].trim();
      if (front && back) {
        cards.push({
          id: `card_${note.id}_${hashString(front)}`,
          note_id: note.id,
          note_title: note.title,
          front,
          back,
        });
      }
    }
  }

  // 2. Line by line parsing for Inline "::", Q&A, and Cloze
  let pendingQ = '';
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Skip code block fences
    if (line.startsWith('```') || line.startsWith(':::')) {
      pendingQ = '';
      continue;
    }

    // 2a. Q: and A: block detection
    const qMatch = line.match(/^(?:Q|Tanya|Soal):\s*(.+)$/i);
    if (qMatch) {
      pendingQ = qMatch[1].trim();
      continue;
    }

    const aMatch = line.match(/^(?:A|Jawab|Jawaban):\s*(.+)$/i);
    if (aMatch && pendingQ) {
      const front = pendingQ;
      const back = aMatch[1].trim();
      if (front && back) {
        cards.push({
          id: `card_${note.id}_${hashString(front)}`,
          note_id: note.id,
          note_title: note.title,
          front,
          back,
        });
      }
      pendingQ = '';
      continue;
    }

    // 2b. Inline "::" syntax (e.g. "Ibu kota Jepang :: Tokyo")
    // Ensure "::" is not part of a URL (e.g. https://)
    if (line.includes('::') && !line.includes('http://') && !line.includes('https://')) {
      const parts = line.split('::');
      if (parts.length >= 2) {
        const front = parts[0].replace(/^[-*+]\s*/, '').trim();
        const back = parts.slice(1).join('::').trim();
        if (front && back && front.length > 1 && back.length > 0) {
          cards.push({
            id: `card_${note.id}_${hashString(front)}`,
            note_id: note.id,
            note_title: note.title,
            front,
            back,
          });
          continue;
        }
      }
    }

    // 2c. Cloze deletion: {{answer}}
    const clozeRegex = /\{\{(.+?)\}\}/g;
    if (clozeRegex.test(line)) {
      const front = line.replace(/\{\{(.+?)\}\}/g, '[...]');
      const answers: string[] = [];
      let cm: RegExpExecArray | null;
      const re = /\{\{(.+?)\}\}/g;
      while ((cm = re.exec(line)) !== null) {
        answers.push(cm[1].trim());
      }
      if (answers.length > 0) {
        cards.push({
          id: `card_${note.id}_${hashString(front)}`,
          note_id: note.id,
          note_title: note.title,
          front,
          back: answers.join(', '),
        });
      }
    }
  }

  // Deduplicate by ID
  const seen = new Set<string>();
  return cards.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}

/**
 * Calculates next review date and parameters using SuperMemo-2 (SM-2) algorithm
 */
export function calculateNextSRSReview(
  card: SRSCard,
  rating: SRSRating
): { repetition: number; interval: number; ease_factor: number; due_date: number } {
  let { repetition, interval, ease_factor } = card;
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;

  switch (rating) {
    case 'again': {
      // Failed card: reset repetition, review again soon (e.g. in 10 mins or tomorrow)
      repetition = 0;
      interval = 1;
      ease_factor = Math.max(1.3, ease_factor - 0.2);
      // Due in 10 minutes so it can be re-tested in the current session
      return {
        repetition,
        interval,
        ease_factor,
        due_date: now + 10 * 60 * 1000,
      };
    }
    case 'hard': {
      // Remembered with effort: small increase, decrease ease
      repetition = Math.max(1, repetition);
      interval = Math.max(1, Math.round((interval || 1) * 1.2));
      ease_factor = Math.max(1.3, ease_factor - 0.15);
      return {
        repetition,
        interval,
        ease_factor,
        due_date: now + interval * ONE_DAY,
      };
    }
    case 'good': {
      // Standard successful recall
      if (repetition === 0) {
        interval = 1;
      } else if (repetition === 1) {
        interval = 3;
      } else {
        interval = Math.max(1, Math.round(interval * ease_factor));
      }
      repetition += 1;
      return {
        repetition,
        interval,
        ease_factor,
        due_date: now + interval * ONE_DAY,
      };
    }
    case 'easy': {
      // Effortless recall: bonus interval and increased ease factor
      if (repetition === 0) {
        interval = 3;
      } else if (repetition === 1) {
        interval = 6;
      } else {
        interval = Math.max(1, Math.round(interval * ease_factor * 1.3));
      }
      repetition += 1;
      ease_factor = Number((ease_factor + 0.15).toFixed(2));
      return {
        repetition,
        interval,
        ease_factor,
        due_date: now + interval * ONE_DAY,
      };
    }
  }
}

/**
 * Synchronizes parsed cards from a note into Dexie table, preserving review progress
 */
export async function syncNoteCardsWithDb(note: Note): Promise<SRSCard[]> {
  const parsedCards = parseFlashcardsFromNote(note);
  const existingCards = await db.srs_cards.where('note_id').equals(note.id).toArray();
  const existingMap = new Map(existingCards.map((c) => [c.id, c]));

  const updatedCards: SRSCard[] = [];
  const validIds = new Set<string>();

  for (const pc of parsedCards) {
    validIds.add(pc.id);
    const existing = existingMap.get(pc.id);

    if (existing) {
      // Update text while keeping repetition and schedule
      const updated: SRSCard = {
        ...existing,
        front: pc.front,
        back: pc.back,
        note_title: note.title,
      };
      await db.srs_cards.put(updated);
      updatedCards.push(updated);
    } else {
      // Brand new card
      const newCard: SRSCard = {
        ...pc,
        repetition: 0,
        interval: 0,
        ease_factor: 2.5,
        due_date: Date.now(), // Due immediately for initial learning
      };
      await db.srs_cards.put(newCard);
      updatedCards.push(newCard);
    }
  }

  // Remove cards that were deleted from the note text
  for (const ec of existingCards) {
    if (!validIds.has(ec.id)) {
      await db.srs_cards.delete(ec.id);
    }
  }

  return updatedCards;
}

/**
 * Retrieves all cards due for review (now or in the past)
 */
export async function getDueCards(noteId?: string): Promise<SRSCard[]> {
  const now = Date.now();
  let allCards: SRSCard[] = [];

  if (noteId) {
    allCards = await db.srs_cards.where('note_id').equals(noteId).toArray();
  } else {
    allCards = await db.srs_cards.toArray();
  }

  // A card is due if due_date <= now
  return allCards.filter((c) => c.due_date <= now);
}

/**
 * Gets all cards (due and not due)
 */
export async function getAllCards(noteId?: string): Promise<SRSCard[]> {
  if (noteId) {
    return db.srs_cards.where('note_id').equals(noteId).toArray();
  }
  return db.srs_cards.toArray();
}

/**
 * Records a user review rating for a card and updates Dexie
 */
export async function recordCardReview(card: SRSCard, rating: SRSRating): Promise<SRSCard> {
  const next = calculateNextSRSReview(card, rating);
  const updated: SRSCard = {
    ...card,
    ...next,
    last_reviewed: Date.now(),
  };
  await db.srs_cards.put(updated);
  return updated;
}
