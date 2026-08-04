const { Worker } = require('bullmq');
const { defaultConnection } = require('../config/bullmq');
const { QUEUE_CONFIG } = require('../constants/help-center.constants');
const helpCenterPrisma = require('../config/help-center-prisma');
const { chunkContent } = require('../services/help-center/chunking.service');
const { embedText, toPgvectorLiteral } = require('../services/help-center/embedding.service');
const logger = require('../utils/logger');

/**
 * BullMQ Worker for Help Center article embedding.
 * Triggered when an admin publishes/republishes an article: chunks the
 * content, embeds each chunk via OpenAI, and stores the vectors in the
 * Help Center PostgreSQL database (pgvector column) for RAG retrieval.
 */
const helpCenterEmbeddingWorker = new Worker(QUEUE_CONFIG.HELP_CENTER_EMBEDDING.NAME, async (job) => {
  if (job.name !== QUEUE_CONFIG.HELP_CENTER_EMBEDDING.JOB_EMBED_ARTICLE) {
    throw new Error(`Unhandled job type: ${job.name} in Help Center Embedding Worker`);
  }

  const { articleId } = job.data;
  logger.debug(`[HelpCenter Embedding Worker] Starting job ${job.id} for article: ${articleId}`);

  try {
    const article = await helpCenterPrisma.helpArticle.findUnique({ where: { id: articleId } });
    if (!article) {
      throw new Error(`Help article ${articleId} not found`);
    }

    const chunks = chunkContent(article.contentHtml);

    // Drop previous chunks/vectors before re-embedding — avoids stale
    // vectors lingering after an edit removes or rewords content.
    await helpCenterPrisma.helpArticleChunk.deleteMany({ where: { articleId } });

    for (let i = 0; i < chunks.length; i += 1) {
      const text = chunks[i];
      const embedding = await embedText(text);
      const vectorLiteral = toPgvectorLiteral(embedding);

      // Prisma doesn't generate a field for Unsupported("vector") columns,
      // so the insert (including the embedding column) goes through a
      // parameterized raw query — safe from injection since values are
      // bound, not string-concatenated into the SQL itself.
      await helpCenterPrisma.$executeRaw`
        INSERT INTO "HelpArticleChunk" (id, "articleId", "chunkIndex", text, embedding, "createdAt")
        VALUES (gen_random_uuid()::text, ${articleId}, ${i}, ${text}, ${vectorLiteral}::vector, now())
      `;
    }

    logger.debug(`[HelpCenter Embedding Worker] Embedded ${chunks.length} chunks for article: ${articleId}`);
  } catch (err) {
    console.error(`[HelpCenter Embedding Worker] Failed to embed article: ${articleId}. Error: ${err.message}`);
    throw err;
  }
}, {
  ...defaultConnection,
  concurrency: 2
});

helpCenterEmbeddingWorker.on('completed', (job) => {
  logger.debug(`[HelpCenter Embedding Worker] Job ${job.id} completed!`);
});

helpCenterEmbeddingWorker.on('failed', (job, err) => {
  console.error(`[HelpCenter Embedding Worker] Job ${job.id} failed. Error: ${err.message}`);
});

module.exports = helpCenterEmbeddingWorker;
