const VietQRGateway = require('../../src/services/billing/payment-gateway/vietqr-gateway');

/**
 * Regression tests for SePay webhook verification (issue #116).
 * Covers: fail-closed on missing/empty key, constant-time comparison,
 * and rejection of malformed/empty presented tokens.
 */
describe('VietQRGateway.verifyWebhook (#116)', () => {
  const KEY = 'sepay_secret_key_abc123';

  function gatewayWithKey(key) {
    const g = new VietQRGateway();
    g.sepayApiKey = key; // override env-derived value for deterministic tests
    return g;
  }

  test('accepts a correct Apikey header', () => {
    const g = gatewayWithKey(KEY);
    expect(g.verifyWebhook({ authorization: `Apikey ${KEY}` })).toBe(true);
    // Case-variant header name is also honored.
    expect(g.verifyWebhook({ Authorization: `Apikey ${KEY}` })).toBe(true);
  });

  test('rejects a wrong key', () => {
    const g = gatewayWithKey(KEY);
    expect(g.verifyWebhook({ authorization: 'Apikey wrong_key' })).toBe(false);
  });

  test('fail-closed when SEPAY_API_KEY is undefined', () => {
    const g = gatewayWithKey(undefined);
    // Any header, including a matching-looking empty one, must be rejected.
    expect(g.verifyWebhook({ authorization: 'Apikey ' })).toBe(false);
    expect(g.verifyWebhook({ authorization: 'Apikey anything' })).toBe(false);
  });

  test('fail-closed when SEPAY_API_KEY is an empty string (the core #116 bug)', () => {
    const g = gatewayWithKey('');
    // Old code did `'' === ''` → true. Must now be false.
    expect(g.verifyWebhook({ authorization: 'Apikey ' })).toBe(false);
    expect(g.verifyWebhook({ authorization: 'Apikey' })).toBe(false);
    expect(g.verifyWebhook({})).toBe(false);
  });

  test('rejects a missing/empty presented token even with a valid key', () => {
    const g = gatewayWithKey(KEY);
    expect(g.verifyWebhook({})).toBe(false);
    expect(g.verifyWebhook({ authorization: '' })).toBe(false);
    expect(g.verifyWebhook({ authorization: 'Apikey ' })).toBe(false);
  });

  test('rejects a token that is a prefix of the key (length-guarded timingSafeEqual)', () => {
    const g = gatewayWithKey(KEY);
    expect(g.verifyWebhook({ authorization: `Apikey ${KEY.slice(0, -1)}` })).toBe(false);
    expect(g.verifyWebhook({ authorization: `Apikey ${KEY}extra` })).toBe(false);
  });
});
