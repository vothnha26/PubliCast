import { useQuery } from '@tanstack/react-query';
import socialService from '../../services/social.service';
import { QUERY_KEYS } from '../../constants/query-keys.constants';
import { CACHE_CONFIG } from '../../constants/cache-config.constants';

/**
 * Custom Hook: Fetch & Cache Brand Aggregated Metrics
 * Following Single Responsibility Principle (SRP).
 * 
 * @param {string} brandId - ID of active brand/workspace
 * @param {string} [startDate] - Filter start date
 * @param {string} [endDate] - Filter end date
 * @param {boolean} [force=false] - Force fresh sync from social APIs
 */
export function useMetricsQuery(brandId, startDate, endDate, force = false) {
  return useQuery({
    queryKey: QUERY_KEYS.metrics(brandId, startDate, endDate),
    queryFn: async () => {
      if (!brandId) return [];
      const res = await socialService.getMetrics(brandId, startDate, endDate, force);
      return res.data || res;
    },
    enabled: Boolean(brandId),
    staleTime: CACHE_CONFIG.METRICS_STALE_TIME_MS,
    gcTime: CACHE_CONFIG.DEFAULT_GC_TIME_MS,
  });
}
