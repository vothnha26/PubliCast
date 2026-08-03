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
      const url = GEMINI_CONFIG.API_URL_TEMPLATE.replace('{model}', options.model || GEMINI_CONFIG.MODEL);

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
        headers: {
          'x-goog-api-key': apiKey
        },
        timeout: 45000  // 45s – cho Gemini API đủ thời gian sinh nội dung dài
      });

      // Gemini can return a candidate with no `content.parts` at all (e.g.
      // finishReason: 'SAFETY' blocking the response) — indexing straight
      // into candidates[0].content.parts[0].text threw an uncaught TypeError
      // instead of a clear, catchable error (#108 I5).
      const candidate = response.data?.candidates?.[0];
      let text = candidate?.content?.parts?.[0]?.text;
      if (typeof text !== 'string') {
        const finishReason = candidate?.finishReason || 'UNKNOWN';
        throw new Error(`Gemini returned no usable content (finishReason: ${finishReason})`);
      }

      try {
        // Remove markdown formatting if the model accidentally included it despite responseMimeType
        text = text.replace(/^```json\n?/i, '').replace(/```$/i, '').trim();
        return JSON.parse(text);
      } catch (parseError) {
        console.error('[GeminiProvider] Failed to parse JSON. Raw text from Gemini:', text);
        throw new Error(`Gemini generated invalid JSON: ${parseError.message}. This is an AI hallucination, please try generating again.`);
      }
    } catch (error) {
      // Do NOT fall back to MockAiProvider here. Returning fabricated mock
      // content on a real API/parse failure silently hands the user made-up
      // copy as if it were genuine AI output — and the caller still charges a
      // credit for it (ai.service increments creditsUsed only on success).
      // Propagate the error so the caller aborts and no credit is consumed.
      // MockAiProvider remains a legitimate *configured* provider (AI_PROVIDER=MOCK
      // / missing key) via the factory; it is not a runtime fallback. See #105.
      console.error('[GeminiProvider] API call failed:', error.response?.data || error.message);
      throw new Error(`Gemini API call failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }
}

module.exports = GeminiProvider;
