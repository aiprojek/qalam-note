/**
 * Qalam Note - RTL (Right-to-Left) Utilities
 * Handles bidirectional text detection and direction resolution for Arabic, Hebrew, Persian, Urdu, etc.
 */

export const RTL_REGEX = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;

/**
 * Checks if the given string contains RTL script characters (Arabic, Hebrew, Persian, Urdu, etc.)
 */
export function isRTLText(text?: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (!trimmed) return false;
  // Test sample
  const sample = trimmed.slice(0, 200);
  return RTL_REGEX.test(sample);
}

/**
 * Resolves the direction for a note.
 * If `is_rtl` is explicitly set (true or false), it takes precedence.
 * Otherwise, checks whether the title or body contains RTL text.
 */
export function getNoteDirection(note?: {
  is_rtl?: boolean;
  text_direction?: 'ltr' | 'rtl';
  title?: string;
  body?: string;
}): 'rtl' | 'ltr' {
  if (!note) return 'ltr';
  if (note.text_direction) {
    return note.text_direction;
  }
  if (typeof note.is_rtl === 'boolean') {
    return note.is_rtl ? 'rtl' : 'ltr';
  }
  if (isRTLText(note.title) || isRTLText(note.body)) {
    return 'rtl';
  }
  return 'ltr';
}
