import { useQuery } from '@tanstack/react-query';
import socialService from '../../services/social.service';
import { QUERY_KEYS } from '../../constants/query-keys.constants';
import { CACHE_CONFIG } from '../../constants/cache-config.constants';

/**
 * Custom Hook: Batched read for the channel detail/insights page.
 *
 * Replaces what used to be 5 independent fetches on that page — metrics,
 * posting-usage, published-videos, channel-groups, platform-limits — each
 * its own component/hook calling its own endpoint on mount. On a remote DB
 * with real network latency, 5 concurrent round-trips racing for the same
 * connection pool made a single page load take several seconds. This hook
 * calls the one aggregated backend endpoint (channel-insights-summary.
 * service.js) instead, and every consumer on the page reads off this same
 * cached result rather than each firing its own request.
 *
 * @param {string} brandId
 * @param {string|null} socialAccountId - Omit to get the 4 brand-wide
 *   fields only (publishedVideos comes back null).
 * @param {{ pageToken?: string, limit?: number, startDate?: string, endDate?: string }} [options]
 */
export function useChannelInsightsSummaryQuery(brandId, socialAccountId, options = {}) {
  const { pageToken, limit, startDate, endDate } = options;

  return useQuery({
    queryKey: QUERY_KEYS.channelInsightsSummary(brandId, socialAccountId),
    queryFn: async () => {
      const res = await socialService.getChannelInsightsSummary(brandId, socialAccountId, {
        pageToken, limit, startDate, endDate
      });
      return res.data || res;
    },
    enabled: Boolean(brandId),
    staleTime: CACHE_CONFIG.METRICS_STALE_TIME_MS,
    gcTime: CACHE_CONFIG.DEFAULT_GC_TIME_MS
  });
}
