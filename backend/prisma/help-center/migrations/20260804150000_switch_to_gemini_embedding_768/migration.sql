-- Switch embedding provider from OpenAI (text-embedding-3-small, 1536 dims)
-- to Gemini (text-embedding-004, 768 dims). The HNSW index must be dropped
-- before the column type change and recreated after — pgvector indexes are
-- built for a fixed dimensionality and don't auto-adjust.
--
-- Apply with `prisma migrate deploy`, not `migrate dev` — see the note in
-- the initial migration about the shadow database lacking the vector
-- extension.

DROP INDEX IF EXISTS "HelpArticleChunk_embedding_idx";

ALTER TABLE "HelpArticleChunk" ALTER COLUMN "embedding" TYPE vector(768);

CREATE INDEX "HelpArticleChunk_embedding_idx" ON "HelpArticleChunk" USING hnsw ("embedding" vector_cosine_ops);
