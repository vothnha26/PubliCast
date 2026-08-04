-- Adds a pgvector column to HelpQuestionLog so semantic-cache lookups
-- (nearest-neighbour search against previously answered questions) can
-- reuse the existing pgvector extension instead of a separate cache layer.
--
-- Apply with `prisma migrate deploy`, not `migrate dev` — the shadow
-- database used by `migrate dev` lacks the vector extension (see the
-- init migration's note).

ALTER TABLE "HelpQuestionLog" ADD COLUMN "questionEmbedding" vector(768);

CREATE INDEX "HelpQuestionLog_questionEmbedding_idx"
  ON "HelpQuestionLog" USING hnsw ("questionEmbedding" vector_cosine_ops);
