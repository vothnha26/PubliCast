import { CACHE_SCOPES } from './cache-scopes.constants';

/**
 * Centralized Query Keys Factory.
 * Prevents magic strings and ensures deterministic cache keys across React Query.
 */
export const QUERY_KEYS = Object.freeze({
  metrics: (brandId, startDate, endDate) => [
    CACHE_SCOPES.METRICS,
    brandId,
    startDate || 'all',
    endDate || 'all'
  ],
  posts: (brandId, status) => [
    CACHE_SCOPES.POSTS,
    brandId,
    status || 'all'
  ],
  inbox: (brandId) => [
    CACHE_SCOPES.INBOX,
    brandId
  ],
  connections: (brandId) => [
    CACHE_SCOPES.CONNECTIONS,
    brandId
  ]
});
