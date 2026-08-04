const helpCenterPrisma = require('../../config/help-center-prisma');
const { toPgvectorLiteral } = require('../../services/help-center/embedding.service');

class HelpArticleReadRepository {
  async listPublished({ category } = {}) {
    return helpCenterPrisma.helpArticle.findMany({
      where: {
        status: 'PUBLISHED',
        ...(category ? { category } : {})
      },
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        category: true,
        tags: true,
        publishedAt: true
      }
    });
  }

  async findPublishedBySlug(slug) {
    return helpCenterPrisma.helpArticle.findFirst({
      where: { slug, status: 'PUBLISHED' }
    });
  }

  /**
   * Similarity search over published article chunks using pgvector cosine
   * distance (`<=>` — smaller is closer). Raw SQL is required because
   * HelpArticleChunk.embedding is an Unsupported() Prisma type.
   */
  async findSimilarChunks(embedding, limit = 5) {
    const vectorLiteral = toPgvectorLiteral(embedding);

    return helpCenterPrisma.$queryRaw`
      SELECT c.id, c."articleId", c.text, a.title, a.slug, a.category,
             1 - (c.embedding <=> ${vectorLiteral}::vector) AS similarity
      FROM "HelpArticleChunk" c
      JOIN "HelpArticle" a ON a.id = c."articleId"
      WHERE a.status = 'PUBLISHED'
      ORDER BY c.embedding <=> ${vectorLiteral}::vector
      LIMIT ${limit}
    `;
  }
}

module.exports = new HelpArticleReadRepository();
