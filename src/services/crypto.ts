/**
 * Qalam Note - End-to-End Encryption (E2EE)
 * Uses Web Crypto API: PBKDF2 + AES-GCM 256-bit
 */

import { db } from '../db';
import type { Note } from '../types';

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

/**
 * Encrypts arbitrary plaintext with a standalone passphrase (PBKDF2 + AES-GCM 256)
 * Ideal for password-protected published notes or digital garden wikis.
 */
export async function encryptWithPassword(
  plaintext: string,
  passphrase: string
): Promise<{ ciphertext: string; iv: string; salt: string }> {
  const salt = generateSalt();
  const key = await deriveKey(passphrase, base64ToUint8Array(salt));
  const res = await encryptText(plaintext, key);
  return { ...res, salt };
}

export function getSessionMasterKey(): CryptoKey | null {
  return sessionMasterKey;
}

export function setSessionMasterKey(key: CryptoKey, passphrase?: string): void {
  sessionMasterKey = key;
  if (passphrase) sessionPassphrase = passphrase;
}

export interface EncryptedNotePayload {
  title: string;
  body: string;
  tags?: string[];
  attachments?: any[];
  is_kanban?: boolean;
  kanban_data?: any;
}

/**
 * Encrypt a note's sensitive fields (title, body, tags, attachments, kanban) into AES-GCM 256 ciphertext.
 */
export async function encryptNotePayloadForSync(
  note: {
    title: string;
    body: string;
    tags?: string[];
    attachments?: any[];
    is_kanban?: boolean;
    kanban_data?: any;
  },
  saltBase64: string,
  customKey?: CryptoKey
): Promise<{
  ciphertext: string;
  iv: string;
  salt: string;
}> {
  const payload: EncryptedNotePayload = {
    title: note.title || '',
    body: note.body || '',
    tags: note.tags,
    attachments: note.attachments,
    is_kanban: note.is_kanban,
    kanban_data: note.kanban_data,
  };
  const json = JSON.stringify(payload);
  const { ciphertext, iv } = await encryptText(json, customKey);
  return { ciphertext, iv, salt: saltBase64 };
}

/**
 * Decrypt a note's AES-GCM 256 ciphertext back into { title, body, attachments, kanban }
 */
export async function decryptNotePayloadFromSync(
  ciphertextBase64: string,
  ivBase64: string,
  customKey?: CryptoKey
): Promise<EncryptedNotePayload> {
  const json = await decryptText(ciphertextBase64, ivBase64, customKey);
  return JSON.parse(json) as EncryptedNotePayload;
}

/**
 * Decrypts ciphertext with a standalone passphrase (PBKDF2 + AES-GCM 256)
 */
export async function decryptWithPassword(
  ciphertextBase64: string,
  ivBase64: string,
  saltBase64: string,
  passphrase: string
): Promise<string> {
  const key = await deriveKey(passphrase, base64ToUint8Array(saltBase64));
  return decryptText(ciphertextBase64, ivBase64, key);
}

/**
 * Decrypt all encrypted notes in IndexedDB when vault is unlocked with master key.
 */
export async function decryptAllEncryptedNotesInDb(): Promise<{
  decryptedCount: number;
  updatedNotes: Note[];
}> {
  if (!isVaultUnlocked() || !sessionMasterKey) {
    const currentNotes = await db.notes.toArray();
    return { decryptedCount: 0, updatedNotes: currentNotes };
  }

  const allNotes = await db.notes.toArray();
  let decryptedCount = 0;
  const updatedNotes: Note[] = [];

  for (const n of allNotes) {
    if (n.is_encrypted && n.encrypted_data?.ciphertext && n.encrypted_data?.iv) {
      try {
        const decrypted = await decryptNotePayloadFromSync(
          n.encrypted_data.ciphertext,
          n.encrypted_data.iv,
          sessionMasterKey
        );
        n.title = decrypted.title || n.title;
        n.body = decrypted.body || '';
        if (decrypted.tags) n.tags = decrypted.tags;
        if (decrypted.attachments) n.attachments = decrypted.attachments;
        if (decrypted.is_kanban !== undefined) n.is_kanban = decrypted.is_kanban;
        if (decrypted.kanban_data) n.kanban_data = decrypted.kanban_data;
        await db.notes.put(n);
        decryptedCount++;
      } catch (err) {
        console.warn(`Could not decrypt note ${n.id} in batch:`, err);
      }
    }
    updatedNotes.push(n);
  }

  return { decryptedCount, updatedNotes };
}
