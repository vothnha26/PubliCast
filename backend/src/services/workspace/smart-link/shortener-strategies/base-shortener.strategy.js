class BaseShortenerStrategy {
  /**
   * Shorten a target URL for a given brand
   * @param {string} url - Original URL
   * @param {string} brandId - Brand ID
   * @returns {Promise<string>} Shortened URL
   */
  async shorten(url, brandId) {
    throw new Error('Method shorten() must be implemented');
  }
}

module.exports = BaseShortenerStrategy;
