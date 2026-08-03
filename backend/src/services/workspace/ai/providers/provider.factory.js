const MockAiProvider = require('./mock.provider');
const OpenAiProvider = require('./openai.provider');
const GeminiProvider = require('./gemini.provider');

class AiProviderFactory {
  /**
   * @param {string|null} brandProviderOverride - AIAssistant.aiProvider for
   *   the requesting brand ('OPENAI'/'GEMINI'), if the brand chose to use a
   *   different already-configured provider than the app-wide default. Only
   *   picks between providers the platform already holds API keys for —
   *   never a brand-supplied key.
   */
  static getProvider(brandProviderOverride = null) {
    const providerEnv = (brandProviderOverride || process.env.AI_PROVIDER || 'MOCK').toUpperCase();

    if (providerEnv === 'OPENAI') {
      if (process.env.OPENAI_API_KEY) {
        return new OpenAiProvider();
      }
      console.warn('[AiProviderFactory] OPENAI requested but OPENAI_API_KEY is missing. Falling back to MOCK.');
    } else if (providerEnv === 'GEMINI') {
      if (process.env.GEMINI_API_KEY) {
        return new GeminiProvider();
      }
      console.warn('[AiProviderFactory] GEMINI requested but GEMINI_API_KEY is missing. Falling back to MOCK.');
    }

    return new MockAiProvider();
  }
}

module.exports = AiProviderFactory;
