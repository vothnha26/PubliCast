import { useQuery, useQueryClient } from '@tanstack/react-query';
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
 * Version-check-first on every mount: fetch the cheap `/metrics/version`
 * signal (max(fetchedAt) across every platform's snapshot table, see
 * social-account.repository.js's getMetricsVersion) before the full metrics
 * payload. If it matches the version the cached (and IndexedDB-persisted)
 * payload was last fetched at, skip the full payload fetch entirely and
 * serve the cache as-is — closing the same multi-device staleness gap the
 * old `refetchOnMount: 'always'` did, but without paying for a full metrics
 * re-fetch when nothing actually changed. The version travels inside the
 * cached payload itself (`{ version, accounts }`) rather than a separate
 * in-memory map, so it survives a reload via the IndexedDB persister same as
 * the data it describes — a page refresh (fresh in-memory state, persisted
 * cache present) still gets the fast path instead of always falling back to
 * a full fetch.
 *
 * @param {string} brandId - ID of active brand/workspace
 * @param {string} [startDate] - Cache key scoping only
 * @param {string} [endDate] - Cache key scoping only
 */
export function useMetricsQuery(brandId, startDate, endDate) {
  const queryClient = useQueryClient();
  const queryKey = QUERY_KEYS.metrics(brandId, startDate, endDate);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!brandId) return { version: 0, accounts: [] };

      const versionRes = await socialService.getMetricsVersion(brandId).catch(() => null);
      const serverVersion = versionRes?.version;
      const cached = queryClient.getQueryData(queryKey);

      // Cache is still current — server hasn't seen anything newer since we
      // last fetched, so serve the persisted payload without a full refetch.
      if (
        cached &&
        typeof serverVersion === 'number' &&
        typeof cached.version === 'number' &&
        serverVersion <= cached.version
      ) {
        return cached;
      }

      const res = await socialService.getMetrics(brandId);
      return { version: typeof serverVersion === 'number' ? serverVersion : 0, accounts: res.data || res };
    },
    enabled: Boolean(brandId),
    staleTime: CACHE_CONFIG.METRICS_STALE_TIME_MS,
    gcTime: CACHE_CONFIG.DEFAULT_GC_TIME_MS,
    // Every mount still runs queryFn (which now starts with the cheap
    // version-check above) instead of trusting staleTime blindly — this is
    // what closes the multi-device gap where Browser B was offline when
    // Browser A's change fired `data_invalidate`.
    refetchOnMount: 'always',
  });

  // Unwrap the {version, accounts} envelope so existing consumers
  // (useChannelInsights, Dashboard.jsx) keep reading `.data` as the plain
  // accounts array they already expect — the version is an internal
  // implementation detail of the cache, not part of this hook's public shape.
  return { ...query, data: query.data?.accounts };
}
