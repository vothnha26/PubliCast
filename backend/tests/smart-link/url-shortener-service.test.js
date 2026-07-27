const urlShortenerService = require('../../src/services/workspace/url-shortener.service');
const BaseShortenerStrategy = require('../../src/services/workspace/smart-link/shortener-strategies/base-shortener.strategy');

class MockShortenerStrategy extends BaseShortenerStrategy {
  async shorten(url, brandId) {
    return `https://publicast.link/short_${Date.now()}`;
  }
}

describe('UrlShortenerService Integration Tests', () => {
  let mockStrategy;

  beforeEach(() => {
    mockStrategy = new MockShortenerStrategy();
    urlShortenerService.setStrategy(mockStrategy);
  });

  test('should return original text if no URLs exist', async () => {
    const text = 'Hello world without any link';
    const result = await urlShortenerService.shortenUrlsInText(text, 'brand-123');
    expect(result).toBe(text);
  });

  test('should shorten URL in post caption', async () => {
    const caption = 'Check out our product at https://example.com/item/123 for discounts!';
    const result = await urlShortenerService.shortenUrlsInText(caption, 'brand-123');
    expect(result).toContain('https://publicast.link/short_');
    expect(result).not.toContain('https://example.com/item/123');
  });

  test('should shorten URL in firstComment text', async () => {
    const comment = 'Link in comment: https://myshop.com/promo-code?discount=50';
    const result = await urlShortenerService.shortenUrlsInText(comment, 'brand-123');
    expect(result).toContain('https://publicast.link/short_');
    expect(result).not.toContain('https://myshop.com/promo-code?discount=50');
  });

  test('should shorten multiple non-duplicate URLs in text', async () => {
    const text = 'Link 1: https://link1.com and Link 2: https://link2.com';
    const result = await urlShortenerService.shortenUrlsInText(text, 'brand-123');
    expect(result).toContain('https://publicast.link/short_');
    expect(result).not.toContain('https://link1.com');
    expect(result).not.toContain('https://link2.com');
  });
});
