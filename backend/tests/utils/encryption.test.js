const crypto = require('crypto');
const encryption = require('../../src/utils/encryption');

describe('Encryption Utility Unit Tests', () => {
  const originalEnv = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    // Set a consistent test encryption key. Also reset encryption.js's
    // derived-key cache (see its own comment) so tests that delete
    // ENCRYPTION_KEY mid-test still exercise the "key missing" path instead
    // of transparently reusing a previously cached key.
    process.env.ENCRYPTION_KEY = 'test-secret-key-12345';
    encryption._resetKeyCacheForTests();
  });

  afterAll(() => {
    process.env.ENCRYPTION_KEY = originalEnv;
  });

  describe('encrypt()', () => {
    it('should return falsy value as is if input is empty or null', () => {
      expect(encryption.encrypt(null)).toBeNull();
      expect(encryption.encrypt('')).toBe('');
      expect(encryption.encrypt(undefined)).toBeUndefined();
    });

    it('should encrypt a plaintext string into GCM format "iv:authTag:ciphertext"', () => {
      const plaintext = 'hello-world-secret-123';
      const encrypted = encryption.encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3); // iv, authTag, ciphertext

      // Verify each part is hex
      const [iv, authTag, ciphertext] = parts;
      expect(/^[0-9a-fA-F]+$/.test(iv)).toBe(true);
      expect(/^[0-9a-fA-F]+$/.test(authTag)).toBe(true);
      expect(/^[0-9a-fA-F]+$/.test(ciphertext)).toBe(true);
    });

    it('should throw an error if ENCRYPTION_KEY environment variable is not defined', () => {
      delete process.env.ENCRYPTION_KEY;
      expect(() => encryption.encrypt('secret')).toThrow('ENCRYPTION_KEY environment variable is not defined.');
    });
  });

  describe('decrypt()', () => {
    it('should return falsy value as is if input is empty or null', () => {
      expect(encryption.decrypt(null)).toBeNull();
      expect(encryption.decrypt('')).toBe('');
      expect(encryption.decrypt(undefined)).toBeUndefined();
    });

    it('should successfully decrypt a valid AES-256-GCM encrypted string', () => {
      const plaintext = 'super-secret-password-123';
      const encrypted = encryption.encrypt(plaintext);
      const decrypted = encryption.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should fall back to raw input if the structure does not match "iv:authTag:ciphertext"', () => {
      const legacyToken = 'unencrypted_legacy_token';
      const decrypted = encryption.decrypt(legacyToken);
      expect(decrypted).toBe(legacyToken);
    });

    it('should fall back to raw input and log a warning if decryption fails (e.g. tampered data)', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const plaintext = 'secret';
      const encrypted = encryption.encrypt(plaintext);
      
      // Tamper with ciphertext
      const parts = encrypted.split(':');
      parts[2] = parts[2].slice(0, -2) + '00'; // Alter last byte
      const tamperedEncrypted = parts.join(':');

      const decrypted = encryption.decrypt(tamperedEncrypted);
      
      expect(decrypted).toBe(tamperedEncrypted);
      expect(consoleWarnSpy).toHaveBeenCalled();
      
      consoleWarnSpy.mockRestore();
    });

    it('should fall back to raw input if ENCRYPTION_KEY is missing during decryption', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const plaintext = 'secret';
      const encrypted = encryption.encrypt(plaintext);

      delete process.env.ENCRYPTION_KEY;
      encryption._resetKeyCacheForTests();
      const decrypted = encryption.decrypt(encrypted);

      expect(decrypted).toBe(encrypted);
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });
});
