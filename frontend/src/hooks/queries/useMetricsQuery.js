import { useQuery } from '@tanstack/react-query';
import socialService from '../../services/social.service';
import { QUERY_KEYS } from '../../constants/query-keys.constants';
import { CACHE_CONFIG } from '../../constants/cache-config.constants';

/**
 * Custom Hook: Fetch & Cache Brand Aggregated Metrics
 * Following Single Responsibility Principle (SRP).
 *
 * The backend never syncs a platform's live API on this call anymore (only
 * the cron scheduler and initial connect do) — it's a DB read, so startDate/
 * endDate here only scope the React Query cache key, not the request itself.
 *
 * @param {string} brandId - ID of active brand/workspace
 * @param {string} [startDate] - Cache key scoping only
 * @param {string} [endDate] - Cache key scoping only
 */
export function useMetricsQuery(brandId, startDate, endDate) {
  return useQuery({
    queryKey: QUERY_KEYS.metrics(brandId, startDate, endDate),
    queryFn: async () => {
      if (!brandId) return [];
      const res = await socialService.getMetrics(brandId);
      return res.data || res;
    },
    enabled: Boolean(brandId),
    staleTime: CACHE_CONFIG.METRICS_STALE_TIME_MS,
    gcTime: CACHE_CONFIG.DEFAULT_GC_TIME_MS,
    // Forces a refetch every time this hook mounts, even if the persisted
    // IndexedDB cache is still within staleTime — closes the multi-device
    // gap where Browser B was offline when Browser A's change fired
    // `data_invalidate`. Browser B renders the (possibly stale) persisted
    // value instantly on mount, then this corrects it within one round
    // trip instead of waiting up to staleTime for a background refetch.
    refetchOnMount: 'always',
  });
}
