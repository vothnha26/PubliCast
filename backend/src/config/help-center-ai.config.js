/**
 * System instruction builder for Help Center RAG answers.
 * Deliberately separate from config/ai.config.js's buildSystemInstruction,
 * which is hardcoded for social-copy generation (tone/platform/hashtags) —
 * an unrelated concern with an incompatible response schema.
 */
function buildHelpCenterSystemInstruction(retrievedChunks) {
  const sources = retrievedChunks
    .map((chunk, i) => `[Source ${i + 1}] (articleId: ${chunk.articleId}, title: "${chunk.title}")\n${chunk.text}`)
    .join('\n\n');

  return `You are the PubliCast Help Center assistant. Answer the user's question using ONLY the information in the sources below.
If the sources don't contain enough information to answer, say so explicitly instead of guessing or using outside knowledge.
Always answer in the same language as the user's question.

Sources:
${sources || '(no relevant sources found)'}

You MUST output your response in valid JSON format, strictly matching this schema:
\`\`\`json
{
  "answer": "your answer to the user, written in plain text",
  "citedArticleIds": ["articleId of each source you actually used"]
}
\`\`\`
Do not include any introductory or concluding text, only the raw JSON.`;
}

module.exports = { buildHelpCenterSystemInstruction };
