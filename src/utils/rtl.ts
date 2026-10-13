/**
 * Qalam Note - RTL (Right-to-Left) Utilities
 * Handles bidirectional text detection and direction resolution for Arabic, Hebrew, Persian, Urdu, etc.
 */

export const RTL_REGEX = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;

/**
 * Checks if the given string contains any RTL script characters (Arabic, Hebrew, Persian, Urdu, etc.)
 */
export function isRTLText(text?: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (!trimmed) return false;
  const sample = trimmed.slice(0, 300);
  return RTL_REGEX.test(sample);
}

/**
 * Checks if the first strong directional character in the text is RTL.
 * Strong directional characters are letters (ignoring numbers, punctuation, markdown syntax, and whitespace).
 */
export function startsWithRTL(text?: string): boolean {
  if (!text) return false;
  // Strip HTML tags and markdown symbols at start
  const clean = text
    .replace(/<[^>]+>/g, '')
    .replace(/^[\s#*>\-_`\[\]()~^|0-9.:\u2000-\u206F]+/g, '')
    .trim();
  if (!clean) return false;
  const match = clean.match(/[A-Za-z\u00C0-\u024F\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/);
  if (!match) return false;
  return RTL_REGEX.test(match[0]);
}

/**
 * Determines if RTL characters represent the dominant language in the text sample.
 * Prevents a single Arabic phrase in an Indonesian or English note from flipping
 * the entire document layout into right-to-left.
 */
export function isDominantRTL(text?: string): boolean {
  if (!text) return false;
  const sample = text.slice(0, 2000);
  let rtlCount = 0;
  let ltrCount = 0;

  for (let i = 0; i < sample.length; i++) {
    const code = sample.charCodeAt(i);
    // RTL ranges: Arabic, Hebrew, Syriac, Thaana, Samaritan, etc.
    if (
      (code >= 0x0591 && code <= 0x07ff) ||
      (code >= 0xfb1d && code <= 0xfdfd) ||
      (code >= 0xfe70 && code <= 0xfefc)
    ) {
      rtlCount++;
    } else if (
      (code >= 65 && code <= 90) ||
      (code >= 97 && code <= 122) ||
      (code >= 0x00c0 && code <= 0x024f)
    ) {
      ltrCount++;
    }
  }

  return rtlCount > 0 && rtlCount >= ltrCount * 0.45;
}

/**
 * Determines whether an individual block (paragraph, heading, list item, or blockquote)
 * should be rendered with explicit RTL attributes (`dir="rtl"` and `text-right`).
 * A block is RTL if:
 * 1. Its first strong character is RTL (e.g. starts with Arabic)
 * OR
 * 2. It is predominantly RTL (>45% Arabic letters)
 * 
 * If a block starts with Indonesian/English/Latin and only contains an embedded Arabic phrase,
 * it returns false (LTR) so the sentence remains left-aligned while browser BiDi smoothly
 * handles the inline Arabic characters without flipping the whole block.
 */
export function isBlockRTL(text?: string): boolean {
  if (!text) return false;
  const clean = text.replace(/<[^>]+>/g, '').trim();
  if (!clean) return false;
  return startsWithRTL(clean) || isDominantRTL(clean);
}

/**
 * Resolves the primary direction for an entire note document.
 * If `text_direction` is explicitly set, it takes precedence.
 * Otherwise, evaluates whether RTL text is dominant.
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

  const combined = `${note.title || ''} ${note.body || ''}`.trim();
  if (isDominantRTL(combined)) {
    return 'rtl';
  }
  return 'ltr';
}
