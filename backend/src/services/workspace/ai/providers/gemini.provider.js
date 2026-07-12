const axios = require('axios');
const BaseAiProvider = require('./base.provider');
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
      });

      let text = response.data.candidates[0].content.parts[0].text;
      
      try {
        // Remove markdown formatting if the model accidentally included it despite responseMimeType
        text = text.replace(/^```json\n?/i, '').replace(/```$/i, '').trim();
        return JSON.parse(text);
      } catch (parseError) {
        console.error('[GeminiProvider] Failed to parse JSON. Raw text from Gemini:', text);
        throw new Error(`Gemini generated invalid JSON: ${parseError.message}. This is an AI hallucination, please try generating again.`);
      }
    } catch (error) {
      console.error('[GeminiProvider] API call failed:', error.response?.data || error.message);
      throw new Error(`Gemini API call failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }
}

module.exports = GeminiProvider;
