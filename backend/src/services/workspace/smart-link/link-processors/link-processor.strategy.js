class LinkProcessorStrategy {
  /**
   * Process a link item (e.g. format URL, assign default emoji or icon).
   * @param {Object} linkItem - The link item to process.
   * @returns {Object} - The processed link item.
   */
  process(linkItem) {
    throw new Error("Method 'process(linkItem)' must be implemented.");
  }
  
  /**
   * Helper to normalize URLs (ensure it starts with http/https)
   */
  normalizeUrl(url) {
    if (!url) return '';
    let normalized = url.trim();
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = `https://${normalized}`;
    }
    return normalized;
  }
}

module.exports = LinkProcessorStrategy;
