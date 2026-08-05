const axios = require('axios');
const { EMBEDDING_CONFIG } = require('../../constants/help-center.constants');

/**
 * Calls Gemini's embedContent API directly. Kept separate from
 * providers/gemini.provider.js, which only implements chat-completion
 * generate() — Help Center embeddings always use Gemini regardless of
 * AI_PROVIDER, since that's a separate concern from answer generation.
 */
async function embedText(text) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured — required for Help Center embeddings');
  }

  try {
    const url = EMBEDDING_CONFIG.API_URL_TEMPLATE.replace('{model}', EMBEDDING_CONFIG.MODEL);

    const response = await axios.post(url, {
      model: `models/${EMBEDDING_CONFIG.MODEL}`,
      content: { parts: [{ text }] },
      outputDimensionality: EMBEDDING_CONFIG.DIMENSIONS
    }, {
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    const embedding = response.data?.embedding?.values;
    if (!Array.isArray(embedding)) {
      throw new Error('Gemini embedContent API returned no usable embedding vector');
    }
    return embedding;
  } catch (error) {
    console.error('[EmbeddingService] API call failed:', error.response?.data || error.message);
    throw new Error(`Gemini embedContent API call failed: ${error.response?.data?.error?.message || error.message}`);
  }
}

/**
 * Formats a JS number array as a pgvector literal for use inside raw SQL
 * tagged templates, e.g. "[0.123,0.456,...]" cast with `::vector`.
 */
function toPgvectorLiteral(embedding) {
  return `[${embedding.join(',')}]`;
}

module.exports = { embedText, toPgvectorLiteral };
