const internalSmartLinkStrategy = require('./smart-link/shortener-strategies/internal-smart-link.strategy');

class UrlShortenerService {
  constructor(strategy = internalSmartLinkStrategy) {
    this.strategy = strategy;
  }

  setStrategy(strategy) {
    this.strategy = strategy;
  }

  /**
   * Scan text and shorten all URLs found using the active strategy
   * @param {string} text - Input string (caption or comment)
   * @param {string} brandId - Target Brand ID
   * @returns {Promise<string>} Text with shortened URLs
   */
  async shortenUrlsInText(text, brandId) {
    if (!text || typeof text !== 'string' || !brandId) return text;

    // Matches http:// or https:// URLs
    const urlRegex = /(https?:\/\/[^\s<]+)/g;
    const matches = Array.from(new Set(text.match(urlRegex) || []));

    if (matches.length === 0) return text;

    let updatedText = text;
    for (const originalUrl of matches) {
      try {
        // Skip shortening if URL is already a publicast / smartlink URL
        if (originalUrl.includes('/sl/')) continue;

        const shortUrl = await this.strategy.shorten(originalUrl, brandId);
        if (shortUrl && shortUrl !== originalUrl) {
          updatedText = updatedText.split(originalUrl).join(shortUrl);
        }
      } catch (err) {
        console.error(`[UrlShortenerService] Failed to shorten URL "${originalUrl}":`, err.message);
      }
    }

    return updatedText;
  }
}

module.exports = new UrlShortenerService();
