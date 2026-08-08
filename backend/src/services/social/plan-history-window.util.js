const brandRepository = require('../../repositories/workspace/brand.repository');

// Fallback when a brand has no active subscription — same conservative
// (FREE-tier) default every caller of this used to hardcode independently.
const DEFAULT_HISTORY_WINDOW_MONTHS = 1;

/**
 * How many months back a brand's plan allows fetching platform history for
 * (published posts, channel analytics, etc). Single source of truth — this
 * used to be copy-pasted as `_getHistoryWindowMonths` in facebook-post,
 * threads/index, tiktok-video, and instagram-post services (and missing
 * entirely from qstash.controller.js's connect-time sync, which hardcoded
 * 90 days regardless of plan).
 */
async function getHistoryWindowMonths(brandId) {
  const brand = await brandRepository.findBrandWithSubscription(brandId);
  const planLimit = brand?.subscription?.status === 'ACTIVE' ? brand.subscription.plan?.planLimit : null;
  return planLimit?.historyWindowMonths || DEFAULT_HISTORY_WINDOW_MONTHS;
}

module.exports = { getHistoryWindowMonths, DEFAULT_HISTORY_WINDOW_MONTHS };
