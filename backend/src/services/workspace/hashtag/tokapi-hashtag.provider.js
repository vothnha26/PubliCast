const logger = require('../../../utils/logger');
const quotaService = require('../../social/quota-tracker.singleton');
const { QUOTA_TTL_STRATEGY } = require('../../../utils/constants');

const QUOTA_SERVICE_NAME = 'tokapi-hashtag';
const TOKAPI_HOST = 'tokapi-mobile-version.p.rapidapi.com';

/**
 * Looks up a TikTok hashtag by name via TokApi (RapidAPI) and returns its real
 * post/reach counters. TokApi's BASIC plan has a very tight monthly quota, so
 * calls are hard-capped per day (see QUOTA_TTL_STRATEGY.TOKAPI_HASHTAG) —
 * callers should treat a null return as "couldn't fetch right now", not as
 * "hashtag has zero posts".
 */
class TokApiHashtagProvider {
  async searchHashtag(keyword) {
    if (!process.env.RAPIDAPI_KEY) {
      logger.warn('[TokApiHashtagProvider] RAPIDAPI_KEY not configured, skipping lookup');
      return null;
    }

    if (await this._isQuotaBudgetExceeded()) {
      logger.warn(`[TokApiHashtagProvider] Daily quota exhausted, skipping lookup for "${keyword}"`);
      return null;
    }

    const cleanKeyword = keyword.replace(/^#/, '');
    const url = `https://${TOKAPI_HOST}/v1/search/hashtag?keyword=${encodeURIComponent(cleanKeyword)}&count=1&offset=0`;

    try {
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'x-rapidapi-host': TOKAPI_HOST,
          'x-rapidapi-key': process.env.RAPIDAPI_KEY
        }
      });

      await this._recordQuotaUsage();

      if (!res.ok) {
        logger.warn(`[TokApiHashtagProvider] Non-OK response (${res.status}) for "${keyword}"`);
        return null;
      }

      const data = await res.json();
      const match = data?.challenge_list?.[0]?.challenge_info;
      if (!match) return null;

      return {
        platformHashtagId: match.cid,
        name: match.cha_name,
        totalPosts: match.use_count ?? null,
        totalReach: match.view_count ?? null
      };
    } catch (err) {
      logger.error(`[TokApiHashtagProvider] Lookup failed for "${keyword}": ${err.message}`, err);
      return null;
    }
  }

  async _isQuotaBudgetExceeded() {
    try {
      const usage = await quotaService.getCurrentUsage(QUOTA_SERVICE_NAME);
      return usage >= QUOTA_TTL_STRATEGY.TOKAPI_HASHTAG.DAILY_LIMIT;
    } catch (err) {
      logger.error(`[TokApiHashtagProvider] Quota check failed, proceeding without guard: ${err.message}`);
      return false;
    }
  }

  async _recordQuotaUsage() {
    try {
      await quotaService.incrementAndGet(QUOTA_SERVICE_NAME, 1);
    } catch (err) {
      logger.error(`[TokApiHashtagProvider] Failed to record quota usage: ${err.message}`);
    }
  }
}

module.exports = new TokApiHashtagProvider();
