const crypto = require('crypto');

/**
 * Single-use OAuth Code Manager for PubliCast.
 * In-memory store backed by automatic TTL cleanup, with single-use consumption semantics.
 */
class OAuthCodeStore {
  constructor() {
    this.codes = new Map();
  }

  /**
   * Generates a single-use authorization code bound to a specific user and brand.
   * @param {string} userId
   * @param {string} brandId
   * @param {number} [ttlMs=300000] Default 5 minutes TTL
   * @returns {string} Crypto-random hex authorization code
   */
  createCode(userId, brandId, ttlMs = 5 * 60 * 1000) {
    const code = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + ttlMs;

    this.codes.set(code, {
      userId,
      brandId,
      expiresAt,
    });

    // Automatic TTL cleanup
    setTimeout(() => {
      this.codes.delete(code);
    }, ttlMs);

    return code;
  }

  /**
   * Atomically consumes an authorization code (single-use).
   * Returns the code payload if valid & non-expired, or null if invalid/already used/expired.
   * @param {string} code
   * @returns {{ userId: string, brandId: string } | null}
   */
  consumeCode(code) {
    const entry = this.codes.get(code);
    if (!entry) {
      return null;
    }

    // Single-use: remove code immediately
    this.codes.delete(code);

    if (Date.now() > entry.expiresAt) {
      return null;
    }

    return {
      userId: entry.userId,
      brandId: entry.brandId,
    };
  }
}

module.exports = new OAuthCodeStore();
