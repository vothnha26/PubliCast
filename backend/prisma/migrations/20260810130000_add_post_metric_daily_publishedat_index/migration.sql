-- CreateIndex
-- Feeds the age-tiered sync cooldown (findDueForPostsSync/
-- findDueForMetricsSync) — needs an efficient "most recent publishedAt per
-- socialAccountId" lookup, which the existing (socialAccountId,
-- platformPostId) index doesn't serve.
CREATE INDEX `post_metrics_daily_socialAccountId_publishedAt_idx` ON `post_metrics_daily`(`socialAccountId`, `publishedAt`);
