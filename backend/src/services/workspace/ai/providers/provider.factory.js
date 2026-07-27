const MockAiProvider = require('./mock.provider');
const OpenAiProvider = require('./openai.provider');
const GeminiProvider = require('./gemini.provider');

class AiProviderFactory {
  static getProvider() {
    const providerEnv = (process.env.AI_PROVIDER || 'MOCK').toUpperCase();

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
