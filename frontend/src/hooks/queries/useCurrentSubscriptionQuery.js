import { useQuery } from '@tanstack/react-query';
import billingService from '../../services/billing.service';
import { QUERY_KEYS } from '../../constants/query-keys.constants';
import { CACHE_CONFIG } from '../../constants/cache-config.constants';

/**
 * Custom Hook: Current subscription/plan for a brand.
 *
 * Previously fetched independently by AccountMenu.jsx, SidebarWorkspace.jsx,
 * Pricing.jsx, and Settings.jsx — each its own useEffect + useState with no
 * cache, so switching pages (or just having the topbar/sidebar mounted
 * alongside a page that also needs it) fired the same
 * /billing/subscriptions/current request multiple times. This hook is the
 * single cached source all 4 now read from.
 */
export function useCurrentSubscriptionQuery(brandId) {
  return useQuery({
    queryKey: QUERY_KEYS.currentSubscription(brandId),
    queryFn: () => billingService.getCurrentSubscription(brandId),
    enabled: Boolean(brandId),
    staleTime: CACHE_CONFIG.METRICS_STALE_TIME_MS,
    gcTime: CACHE_CONFIG.DEFAULT_GC_TIME_MS
  });
}
