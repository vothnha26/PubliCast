const helpCenterPrisma = require('../../config/help-center-prisma');
const { toPgvectorLiteral } = require('../../services/help-center/embedding.service');

class HelpQuestionLogRepository {
  // questionEmbedding is an Unsupported("vector") column, so the whole
  // insert goes through $executeRaw — mirrors help-center-embedding.worker.js's
  // chunk insert. Prisma Client's .create() can't write a raw vector column.
  async create({ question, answer, citedArticleIds, userId, latencyMs, questionEmbedding }) {
    const vectorLiteral = questionEmbedding ? toPgvectorLiteral(questionEmbedding) : null;

    await helpCenterPrisma.$executeRaw`
      INSERT INTO "HelpQuestionLog"
        (id, question, answer, "citedArticleIds", "userId", "latencyMs", "questionEmbedding", "createdAt")
      VALUES (
        gen_random_uuid()::text, ${question}, ${answer}, ${citedArticleIds}::text[],
        ${userId}, ${latencyMs},
        ${vectorLiteral}::vector, now()
      )
    `;
  }

  // Nearest previously-logged question by cosine similarity. Only returns
  // a hit above `threshold`; ties/near-ties broken by recency so a stale
  // cached answer loses to a more recent one (e.g. after an article edit).
  async findSimilarQuestion(embedding, threshold) {
    const vectorLiteral = toPgvectorLiteral(embedding);

    const rows = await helpCenterPrisma.$queryRaw`
      SELECT id, question, answer, "citedArticleIds", "createdAt",
             1 - ("questionEmbedding" <=> ${vectorLiteral}::vector) AS similarity
      FROM "HelpQuestionLog"
      WHERE "questionEmbedding" IS NOT NULL
      ORDER BY "questionEmbedding" <=> ${vectorLiteral}::vector, "createdAt" DESC
      LIMIT 5
    `;

    return rows.find((r) => r.similarity >= threshold) || null;
  }
}

module.exports = new HelpQuestionLogRepository();
