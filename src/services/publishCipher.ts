/**
 * Encrypted Publish URL Cipher Utility for Qalam Note
 * Encodes note ID and Google Apps Script endpoint into a compact, encrypted, URL-safe parameter: ?k=<encoded_cipher>
 */

export interface PublishCipherPayload {
  id: string;
  gasUrl?: string;
  title?: string;
  author?: string;
  publishedAt?: number;
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
  // 1. Note ID compression: compress standard prefix 'note-' to '~'
  let compactId = payload.id;
  if (compactId.startsWith('note-')) {
    compactId = '~' + compactId.slice(5);
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
 * Decodes an encrypted cipher string (?k=...) back to PublishCipherPayload
 */
export function decodePublishCipher(cipher: string): PublishCipherPayload | null {
  if (!cipher || typeof cipher !== 'string') return null;

  try {
    let clean = cipher.trim();
    // Strip leading ?k=, k=, or #k= if passed directly
    clean = clean.replace(/^[?&#]*k=/, '');

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

    // Restore note ID prefix if compressed with '~'
    let noteId = parsed.i;
    if (typeof noteId === 'string' && noteId.startsWith('~')) {
      noteId = 'note-' + noteId.slice(1);
    }

    let fullGasUrl = '';
    if (parsed.g && typeof parsed.g === 'string') {
      if (parsed.g.startsWith('^')) {
        fullGasUrl = `https://script.google.com/macros/s/${parsed.g.slice(1)}/exec`;
      } else {
        fullGasUrl = parsed.g;
      }
    }

    return {
      id: noteId,
      gasUrl: fullGasUrl || undefined,
      title: parsed.t || undefined,
      author: parsed.a || undefined,
    };
  } catch (err) {
    console.warn('Unable to decode publish cipher k parameter:', err);
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
