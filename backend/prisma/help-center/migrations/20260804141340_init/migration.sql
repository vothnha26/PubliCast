-- Hand-edited after `prisma migrate dev --create-only`: Prisma cannot
-- express the pgvector extension or HNSW index natively, so this migration
-- adds them manually (extension at the top, index at the bottom).
--
-- NOTE: apply with `prisma migrate deploy`, not `migrate dev` — `migrate dev`
-- validates against a throwaway shadow database that doesn't have the
-- vector extension installed, and fails with "type vector does not exist"
-- even though the real target database applies cleanly.
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "HelpArticleStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "HelpArticle" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contentJson" JSONB NOT NULL,
    "contentHtml" TEXT NOT NULL,
    "status" "HelpArticleStatus" NOT NULL DEFAULT 'DRAFT',
    "authorId" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HelpArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HelpArticleChunk" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HelpArticleChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HelpQuestionLog" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "citedArticleIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "userId" TEXT,
    "latencyMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HelpQuestionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HelpArticle_slug_key" ON "HelpArticle"("slug");

-- CreateIndex
CREATE INDEX "HelpArticle_status_idx" ON "HelpArticle"("status");

-- CreateIndex
CREATE INDEX "HelpArticle_category_idx" ON "HelpArticle"("category");

-- CreateIndex
CREATE INDEX "HelpArticleChunk_articleId_idx" ON "HelpArticleChunk"("articleId");

-- CreateIndex
CREATE INDEX "HelpQuestionLog_createdAt_idx" ON "HelpQuestionLog"("createdAt");

-- AddForeignKey
ALTER TABLE "HelpArticleChunk" ADD CONSTRAINT "HelpArticleChunk_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "HelpArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex (HNSW, cosine distance) — hand-added, Prisma has no vector index syntax
CREATE INDEX "HelpArticleChunk_embedding_idx" ON "HelpArticleChunk" USING hnsw ("embedding" vector_cosine_ops);
