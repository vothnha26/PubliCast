const assert = require('assert');
const oauthCodeStore = require('./oauth-code-store');

describe('OAuthCodeStore (PubliCast)', () => {
  it('should generate a 64-character hex code and consume it successfully once', () => {
    const code = oauthCodeStore.createCode('user-1', 'brand-1');
    assert.strictEqual(code.length, 64);

    const payload = oauthCodeStore.consumeCode(code);
    assert.deepStrictEqual(payload, { userId: 'user-1', brandId: 'brand-1' });

    // Single-use: second consumption returns null
    const secondTry = oauthCodeStore.consumeCode(code);
    assert.strictEqual(secondTry, null);
  });

  it('should return null for expired code', (done) => {
    const code = oauthCodeStore.createCode('user-2', 'brand-2', 10); // 10ms TTL

    setTimeout(() => {
      const payload = oauthCodeStore.consumeCode(code);
      assert.strictEqual(payload, null);
      done();
    }, 20);
  });
});
