-- Restores the hand-added HNSW indexes that migration 20260805074146_init
-- accidentally dropped. Prisma's shadow-db diffing doesn't understand
-- `Unsupported("vector(768)")` columns, so `migrate dev` treated these
-- hand-added indexes as drift and generated a DROP INDEX migration.
-- See 20260804141340_init and 20260804160000_add_question_embedding_cache
-- for the original CREATE INDEX statements.

CREATE INDEX "HelpArticleChunk_embedding_idx"
  ON "HelpArticleChunk" USING hnsw ("embedding" vector_cosine_ops);

CREATE INDEX "HelpQuestionLog_questionEmbedding_idx"
  ON "HelpQuestionLog" USING hnsw ("questionEmbedding" vector_cosine_ops);
