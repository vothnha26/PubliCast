import { useQuery, useQueryClient } from '@tanstack/react-query';
import channelGroupService from '../../services/channel-group.service';
import { QUERY_KEYS } from '../../constants/query-keys.constants';
import { CACHE_CONFIG } from '../../constants/cache-config.constants';

/**
 * Custom Hook: Channel groups for a brand.
 *
 * ChannelsList.jsx (the global sidebar, mounted on every workspace page)
 * previously fetched this itself on every mount via a plain useEffect, with
 * no cache — so navigating between pages re-fired /social/channel-groups
 * every time despite the data rarely changing. This is also embedded inside
 * channel-insights-summary's response for the insights page specifically;
 * this hook is for every other consumer that just needs the plain list.
 */
export function useChannelGroupsQuery(brandId) {
  return useQuery({
    queryKey: QUERY_KEYS.channelGroups(brandId),
    queryFn: async () => {
      const res = await channelGroupService.list(brandId);
      return res?.data || res || [];
    },
    enabled: Boolean(brandId),
    staleTime: CACHE_CONFIG.METRICS_STALE_TIME_MS,
    gcTime: CACHE_CONFIG.DEFAULT_GC_TIME_MS
  });
}

export function useInvalidateChannelGroups() {
  const queryClient = useQueryClient();
  return (brandId) => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.channelGroups(brandId) });
}
