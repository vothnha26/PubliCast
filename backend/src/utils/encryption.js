const crypto = require('crypto');

// Generate 32-byte key from ENCRYPTION_KEY env var. scryptSync is
// deliberately CPU-expensive (~80ms/call measured locally — it's a KDF
// meant to resist brute-forcing, not a cheap hash) and was being re-run on
// EVERY encrypt()/decrypt() call — every _decryptAccount() call (accessToken
// + refreshToken = 2 calls) on every socialAccount row read anywhere in the
// app. Since ENCRYPTION_KEY + the salt are both constant for the process
// lifetime, the derived key is always identical — deriving it once and
// reusing it is safe and removes ~80ms of synchronous, event-loop-blocking
// work from every token encrypt/decrypt (measured: 5 concurrent
// getPublishedVideos() calls that should overlap via Promise.all instead
// serialized to ~465ms each because this blocked the event loop between
// them — #inbox-getInboxPosts-N-plus-1, 2026-08-10).
let cachedEncryptionKey = null;
const getEncryptionKey = () => {
  if (cachedEncryptionKey) return cachedEncryptionKey;
  const rawKey = process.env.ENCRYPTION_KEY;
  if (!rawKey) {
    throw new Error('ENCRYPTION_KEY environment variable is not defined.');
  }
  cachedEncryptionKey = crypto.scryptSync(rawKey, 'publicast-salt', 32);
  return cachedEncryptionKey;
};

/**
 * Encrypt a plaintext string using AES-256-GCM
 * @param {string} text - Plaintext to encrypt
 * @returns {string} Encrypted format "iv:authTag:ciphertext" (hex encoded)
 */
function encrypt(text) {
  if (!text) return text;
  
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(12); // 12 bytes IV is standard for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    const ivHex = iv.toString('hex');
    
    return `${ivHex}:${authTag}:${encrypted}`;
  } catch (error) {
    console.error('[Encryption] Encryption failed:', error);
    throw error;
  }
}

/**
 * Decrypt an encrypted string (formatted as "iv:authTag:ciphertext") using AES-256-GCM
 * Supports safe fallback for unencrypted tokens.
 * @param {string} encryptedData - Hex string in "iv:authTag:ciphertext" format
 * @returns {string} Decrypted plaintext
 */
function decrypt(encryptedData) {
  if (!encryptedData) return encryptedData;
  
  // Quick structural check: must have exactly 3 parts separated by colons
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    // If not matching pattern, return as is (fallback for unencrypted legacy tokens)
    return encryptedData;
  }
  
  try {
    const [ivHex, authTagHex, encryptedTextHex] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedTextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    // If decryption fails, log a warning and return the raw input to prevent breaking existing data
    console.warn('[Encryption] Decryption failed, returning raw data:', error.message);
    return encryptedData;
  }
}

module.exports = {
  encrypt,
  decrypt,
  // Test-only: clears the cached derived key so a test can simulate
  // ENCRYPTION_KEY changing/disappearing between calls (real process
  // lifetime never does this — the env var is read once at startup).
  _resetKeyCacheForTests: () => { cachedEncryptionKey = null; }
};
