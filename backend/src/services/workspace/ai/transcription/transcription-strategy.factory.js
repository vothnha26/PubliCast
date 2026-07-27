const { VIDEO_EDITOR } = require('../../../../utils/constants');
const { GeminiTranscriptionStrategy, MockTranscriptionStrategy } = require('./transcription.strategy');

class TranscriptionStrategyFactory {
  /**
   * Create a transcription strategy based on the configured AI provider
   * @param {string} providerOverride - Optional override for the provider
   * @returns {BaseTranscriptionStrategy} Concrete strategy implementation
   */
  static getStrategy(providerOverride = null) {
    const provider = (providerOverride || process.env.AI_PROVIDER || VIDEO_EDITOR.PROVIDERS.GEMINI).toUpperCase();

    switch (provider) {
      case VIDEO_EDITOR.PROVIDERS.GEMINI:
        if (!process.env.GEMINI_API_KEY) {
          console.warn('[TranscriptionStrategyFactory] GEMINI requested but GEMINI_API_KEY is missing. Falling back to MOCK.');
          return new MockTranscriptionStrategy();
        }
        return new GeminiTranscriptionStrategy();
      
      case VIDEO_EDITOR.PROVIDERS.MOCK:
      default:
        return new MockTranscriptionStrategy();
    }
  }
}

module.exports = TranscriptionStrategyFactory;
