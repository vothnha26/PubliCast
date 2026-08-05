const helpArticleRepository = require('../../repositories/workspace/help-article.repository');
const helpQuestionLogRepository = require('../../repositories/workspace/help-question-log.repository');
const { embedText } = require('../help-center/embedding.service');
const { buildHelpCenterSystemInstruction } = require('../../config/help-center-ai.config');
const AiProviderFactory = require('./ai/providers/provider.factory');
const { SEMANTIC_CACHE_THRESHOLD } = require('../../constants/help-center.constants');

const TOP_K = 5;

class HelpCenterService {
  async listArticles(filters) {
    return helpArticleRepository.listPublished(filters);
  }

  async getArticleBySlug(slug) {
    const article = await helpArticleRepository.findPublishedBySlug(slug);
    if (!article) {
      const err = new Error('Help article not found');
      err.statusCode = 404;
      throw err;
    }
    return article;
  }

  async askQuestion(question, userId) {
    if (!question || !question.trim()) {
      const err = new Error('question is required');
      err.statusCode = 400;
      throw err;
    }

    const startedAt = Date.now();

    const questionEmbedding = await embedText(question);

    // Semantic cache: skip the AI provider call entirely on a high-confidence
    // hit against a previously logged question+answer pair.
    const cacheHit = await helpQuestionLogRepository.findSimilarQuestion(questionEmbedding, SEMANTIC_CACHE_THRESHOLD);
    if (cacheHit) {
      return { answer: cacheHit.answer, sources: [], matchedTopK: 0, cached: true };
    }

    const chunks = await helpArticleRepository.findSimilarChunks(questionEmbedding, TOP_K);

    const systemInstruction = buildHelpCenterSystemInstruction(chunks);
    const provider = AiProviderFactory.getProvider();
    const result = await provider.generate(question, { systemInstruction });

    const citedArticleIds = Array.isArray(result?.citedArticleIds) ? result.citedArticleIds : [];
    const sources = chunks
      .filter((chunk) => citedArticleIds.includes(chunk.articleId))
      .reduce((acc, chunk) => {
        if (!acc.some((s) => s.articleId === chunk.articleId)) {
          acc.push({ articleId: chunk.articleId, title: chunk.title, slug: chunk.slug, category: chunk.category });
        }
        return acc;
      }, []);

    const latencyMs = Date.now() - startedAt;
    const answer = result?.answer || '';

    try {
      await helpQuestionLogRepository.create({
        question,
        answer,
        citedArticleIds: sources.map((s) => s.articleId),
        userId: userId || null,
        latencyMs,
        questionEmbedding
      });
    } catch (err) {
      console.error('[HelpCenterService] Failed to log question (non-fatal):', err.message);
    }

    return { answer, sources, matchedTopK: chunks.length, cached: false };
  }
}

module.exports = new HelpCenterService();
