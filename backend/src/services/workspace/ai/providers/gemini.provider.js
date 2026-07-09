const axios = require('axios');
const BaseAiProvider = require('./base.provider');
const MockAiProvider = require('./mock.provider');
const { compileResponseSchemaInstruction, GEMINI_CONFIG } = require('../../../../config/ai.config');

class GeminiProvider extends BaseAiProvider {
  async generate(prompt, options = {}) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in environment variables');
    }

    const systemPrompt = options.systemInstruction || `You are a social media copywriter AI assistant. Generate engaging copy.\n${compileResponseSchemaInstruction()}`;

    const contents = [];

    if (options.image) {
      const base64Data = options.image.includes('base64,') ? options.image.split('base64,')[1] : options.image;
      contents.push({
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Data
            }
          }
        ]
      });
    } else {
      contents.push({
        parts: [
          { text: prompt }
        ]
      });
    }

    try {
      const url = GEMINI_CONFIG.API_URL_TEMPLATE
        .replace('{model}', GEMINI_CONFIG.MODEL)
        .replace('{apiKey}', apiKey);

      const response = await axios.post(url, {
        contents,
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7
        }
      }, {
        timeout: 45000  // 45s – cho Gemini API đủ thời gian sinh nội dung dài
      });

      const text = response.data.candidates[0].content.parts[0].text;
      return JSON.parse(text);
    } catch (error) {
      console.warn('[GeminiProvider] API call failed, falling back to MockAiProvider. Error details:', error.response?.data || error.message);
      try {
        const mockProvider = new MockAiProvider();
        return await mockProvider.generate(prompt, options);
      } catch (fallbackError) {
        console.error('[GeminiProvider] Fallback to MockAiProvider also failed:', fallbackError.message);
        throw new Error(`Gemini API call failed: ${error.response?.data?.error?.message || error.message}`);
      }
    }
  }
}

module.exports = GeminiProvider;
