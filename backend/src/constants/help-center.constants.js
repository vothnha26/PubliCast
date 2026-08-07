const EMBEDDING_CONFIG = Object.freeze({
  // gemini-embedding-001 defaults to 3072 dims but supports truncating via
  // outputDimensionality — 768 matches the HelpArticleChunk.embedding
  // column (vector(768)) and its HNSW index. text-embedding-004, the older
  // fixed-768-dim model, is no longer available on this API key/version
  // (404 NOT_FOUND as of 2026), so this is not just a size preference.
  MODEL: process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001',
  DIMENSIONS: 768,
  API_URL_TEMPLATE: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:embedContent'
});

const CHUNKING_CONFIG = Object.freeze({
  CHUNK_SIZE: 500,
  CHUNK_OVERLAP: 50
});

// Cosine similarity threshold for the semantic answer cache (HelpQuestionLog).
// Kept deliberately high — a false-positive cache hit (returning a stale/
// wrong-context answer) is worse than a false negative (one extra AI call,
// which is already today's baseline for every question).
const SEMANTIC_CACHE_THRESHOLD = 0.95;

module.exports = {
  EMBEDDING_CONFIG,
  CHUNKING_CONFIG,
  SEMANTIC_CACHE_THRESHOLD
};
