/**
 * Encrypted Publish URL Cipher Utility for Qalam Note
 * Encodes note ID or Wiki ID and Google Apps Script endpoint into a compact, encrypted, URL-safe parameter:
 * - Single Note: ?k=<encoded_cipher>
 * - Interactive Wiki: ?w=<encoded_cipher> or ?k=<encoded_cipher> (with isWiki: true)
 */

export interface PublishCipherPayload {
  id: string; // Note ID or Folder/Wiki ID
  gasUrl?: string;
  title?: string;
  author?: string;
  publishedAt?: number;
  isKanban?: boolean;
  isWiki?: boolean; // Zim-Style Digital Garden interactive wiki
  landingNoteId?: string; // Default landing note for Wiki
}

// Dedicated keystream seed for public published note link encryption
const CIPHER_KEY = [
  0x51, 0x61, 0x6c, 0x61, 0x6d, 0x4e, 0x6f, 0x74, 0x65, 0x50, 0x75, 0x62, 0x32, 0x30, 0x32, 0x36,
  0x73, 0x65, 0x63, 0x75, 0x72, 0x65, 0x6c, 0x69, 0x6e, 0x6b, 0x39, 0x39, 0x31, 0x38, 0x32, 0x37,
];

/**
 * Encodes publish payload into a compact URL-safe encrypted cipher string
 * Minimizes payload size by stripping common prefixes and omitting redundant metadata when GAS endpoint is present.
 */
export function encodePublishCipher(payload: PublishCipherPayload): string {
  // 1. ID compression: compress standard prefix 'note-' to '~', and 'folder-' to '@'
  let compactId = payload.id;
  if (compactId.startsWith('note-')) {
    compactId = '~' + compactId.slice(5);
  } else if (compactId.startsWith('folder-')) {
    compactId = '@' + compactId.slice(7);
  }

  // 2. Compress standard Google Apps Script URLs to save 43+ characters
  let compressedGas = payload.gasUrl ? payload.gasUrl.trim() : '';
  let isGasCompressed = false;

  const gasMatch = compressedGas.match(/^https:\/\/script\.google\.com\/macros\/s\/([a-zA-Z0-9_-]+)\/exec$/);
  if (gasMatch && gasMatch[1]) {
    compressedGas = gasMatch[1];
    isGasCompressed = true;
  }

  const packed: Record<string, any> = {
    i: compactId,
  };

  if (compressedGas) {
    packed.g = isGasCompressed ? `^${compressedGas}` : compressedGas;
  }

  // If there is no GAS URL (simulated local preview), retain concise title for reader fallback
  if (!compressedGas && payload.title) {
    packed.t = payload.title.length > 40 ? payload.title.slice(0, 40) : payload.title;
  }

  // Only include author if custom and no GAS URL (GAS database stores author in column 4)
  if (!compressedGas && payload.author && payload.author !== 'Anonymous') {
    packed.a = payload.author;
  }

  // Preserve Kanban Project Board flag (1 = Kanban, 0/omit = Document)
  if (payload.isKanban) {
    packed.k = 1;
  }

  // Wiki flag & landing note
  if (payload.isWiki) {
    packed.w = 1;
    if (payload.landingNoteId) {
      let compactLanding = payload.landingNoteId;
      if (compactLanding.startsWith('note-')) {
        compactLanding = '~' + compactLanding.slice(5);
      }
      packed.l = compactLanding;
    }
  }

  const jsonStr = JSON.stringify(packed);
  const encoder = new TextEncoder();
  const plainBytes = encoder.encode(jsonStr);

  // Generate 2-byte random salt for variability and cipher diffusion
  const salt0 = Math.floor(Math.random() * 256);
  const salt1 = Math.floor(Math.random() * 256);

  const cipherBytes = new Uint8Array(plainBytes.length + 2);
  cipherBytes[0] = salt0;
  cipherBytes[1] = salt1;

  for (let idx = 0; idx < plainBytes.length; idx++) {
    const keyByte = CIPHER_KEY[(idx + salt0 + salt1) % CIPHER_KEY.length];
    cipherBytes[idx + 2] = plainBytes[idx] ^ keyByte ^ ((salt0 * 3 + idx) & 0xff);
  }

  // Convert to URL-safe Base64 (base64url without padding)
  let binary = '';
  for (let idx = 0; idx < cipherBytes.length; idx++) {
    binary += String.fromCharCode(cipherBytes[idx]);
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Decodes an encrypted cipher string (?k=... or ?w=...) back to PublishCipherPayload
 */
export function decodePublishCipher(cipher: string): PublishCipherPayload | null {
  if (!cipher || typeof cipher !== 'string') return null;

  try {
    let clean = cipher.trim();
    // Strip leading ?k=, k=, #k=, ?w=, w=, or #w= if passed directly
    clean = clean.replace(/^[?&#]*(?:k|w)=/, '');

    // Restore standard base64 padding
    let base64 = clean.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }

    const binary = atob(base64);
    if (binary.length <= 2) return null;

    const cipherBytes = new Uint8Array(binary.length);
    for (let idx = 0; idx < binary.length; idx++) {
      cipherBytes[idx] = binary.charCodeAt(idx);
    }

    const salt0 = cipherBytes[0];
    const salt1 = cipherBytes[1];
    const plainBytes = new Uint8Array(cipherBytes.length - 2);

    for (let idx = 0; idx < plainBytes.length; idx++) {
      const keyByte = CIPHER_KEY[(idx + salt0 + salt1) % CIPHER_KEY.length];
      plainBytes[idx] = cipherBytes[idx + 2] ^ keyByte ^ ((salt0 * 3 + idx) & 0xff);
    }

    const decoder = new TextDecoder();
    const jsonStr = decoder.decode(plainBytes);
    const parsed = JSON.parse(jsonStr);

    if (!parsed || !parsed.i) return null;

    // Restore ID prefix if compressed with '~' or '@'
    let id = parsed.i;
    if (typeof id === 'string') {
      if (id.startsWith('~')) {
        id = 'note-' + id.slice(1);
      } else if (id.startsWith('@')) {
        id = 'folder-' + id.slice(1);
      }
    }

    let fullGasUrl = '';
    if (parsed.g && typeof parsed.g === 'string') {
      if (parsed.g.startsWith('^')) {
        fullGasUrl = `https://script.google.com/macros/s/${parsed.g.slice(1)}/exec`;
      } else {
        fullGasUrl = parsed.g;
      }
    }

    let landingNoteId = parsed.l;
    if (typeof landingNoteId === 'string' && landingNoteId.startsWith('~')) {
      landingNoteId = 'note-' + landingNoteId.slice(1);
    }

    return {
      id,
      gasUrl: fullGasUrl || undefined,
      title: parsed.t || undefined,
      author: parsed.a || undefined,
      isKanban: parsed.k === 1,
      isWiki: parsed.w === 1,
      landingNoteId: landingNoteId || undefined,
    };
  } catch (err) {
    console.warn('Unable to decode publish cipher parameter:', err);
    return null;
  }
}

/**
 * Builds the canonical public reader URL with ?k=<encoded_cipher>
 */
export function buildPublishUrl(payload: PublishCipherPayload): string {
  const cipher = encodePublishCipher(payload);
  const baseUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname.replace(/\/$/, '')}`
    : '';
  return `${baseUrl}/?k=${cipher}`;
}

/**
 * Builds the canonical public wiki reader URL with ?w=<encoded_cipher>
 */
export function buildWikiPublishUrl(payload: PublishCipherPayload): string {
  const cipher = encodePublishCipher({ ...payload, isWiki: true });
  const baseUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname.replace(/\/$/, '')}`
    : '';
  return `${baseUrl}/?w=${cipher}`;
}
