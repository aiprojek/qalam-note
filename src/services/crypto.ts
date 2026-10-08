/**
 * Qalam Note - End-to-End Encryption (E2EE)
 * Uses Web Crypto API: PBKDF2 + AES-GCM 256-bit
 */

// In-memory unlocked CryptoKey (cleared on lock or tab close)
let sessionMasterKey: CryptoKey | null = null;
let sessionPassphrase: string | null = null;

// Helper: Uint8Array <-> Base64
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derives a 256-bit AES-GCM CryptoKey from a passphrase and salt using PBKDF2.
 */
export async function deriveKey(passphrase: string, saltBytes: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Creates a verification hash of the passphrase for zero-knowledge password checking.
 */
export async function createPasswordVerifier(passphrase: string, saltBase64: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = base64ToUint8Array(saltBase64);
  const combined = new Uint8Array(passphrase.length + salt.length);
  combined.set(enc.encode(passphrase), 0);
  combined.set(salt, passphrase.length);

  const hashBuffer = await window.crypto.subtle.digest('SHA-256', combined);
  return uint8ArrayToBase64(new Uint8Array(hashBuffer));
}

/**
 * Generates a random salt (16 bytes).
 */
export function generateSalt(): string {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  return uint8ArrayToBase64(salt);
}

/**
 * Set up master password for E2EE.
 */
export async function setupMasterPassword(passphrase: string): Promise<{ salt: string; verifier_hash: string }> {
  const salt = generateSalt();
  const verifier_hash = await createPasswordVerifier(passphrase, salt);
  const key = await deriveKey(passphrase, base64ToUint8Array(salt));
  sessionMasterKey = key;
  sessionPassphrase = passphrase;
  return { salt, verifier_hash };
}

/**
 * Unlock vault with master passphrase.
 */
export async function unlockVault(passphrase: string, salt: string, storedVerifier: string): Promise<boolean> {
  const computedVerifier = await createPasswordVerifier(passphrase, salt);
  if (computedVerifier !== storedVerifier) {
    return false;
  }
  const key = await deriveKey(passphrase, base64ToUint8Array(salt));
  sessionMasterKey = key;
  sessionPassphrase = passphrase;
  return true;
}

/**
 * Lock vault (clears session key from memory).
 */
export function lockVault(): void {
  sessionMasterKey = null;
  sessionPassphrase = null;
}

/**
 * Check if vault is currently unlocked in memory.
 */
export function isVaultUnlocked(): boolean {
  return sessionMasterKey !== null;
}

export function getSessionPassphrase(): string | null {
  return sessionPassphrase;
}

/**
 * Encrypts plaintext string using AES-GCM 256.
 */
export async function encryptText(
  plaintext: string,
  customKey?: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const key = customKey || sessionMasterKey;
  if (!key) {
    throw new Error('E2EE Vault is locked. Please unlock first.');
  }

  const enc = new TextEncoder();
  const encoded = enc.encode(plaintext);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const cipherBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
    },
    key,
    encoded as BufferSource
  );

  return {
    ciphertext: uint8ArrayToBase64(new Uint8Array(cipherBuffer)),
    iv: uint8ArrayToBase64(iv),
  };
}

/**
 * Decrypts AES-GCM 256 ciphertext.
 */
export async function decryptText(
  ciphertextBase64: string,
  ivBase64: string,
  customKey?: CryptoKey
): Promise<string> {
  const key = customKey || sessionMasterKey;
  if (!key) {
    throw new Error('E2EE Vault is locked. Please unlock first.');
  }

  const ciphertext = base64ToUint8Array(ciphertextBase64);
  const iv = base64ToUint8Array(ivBase64);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
    },
    key,
    ciphertext as BufferSource
  );

  const dec = new TextDecoder();
  return dec.decode(decryptedBuffer);
}
