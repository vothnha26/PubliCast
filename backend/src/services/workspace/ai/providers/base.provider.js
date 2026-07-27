class BaseAiProvider {
  /**
   * Generate content using prompt and options.
   * @param {string} prompt - The prompt text.
   * @param {Object} options - Options containing platform, tone, image (multimodal), etc.
   * @returns {Promise<{caption: string, suggestedHashtags: string[], platformSpecificAdjustments: Object}>}
   */
  async generate(prompt, options = {}) {
    throw new Error('Method "generate" must be implemented by subclasses');
  }
}

module.exports = BaseAiProvider;
