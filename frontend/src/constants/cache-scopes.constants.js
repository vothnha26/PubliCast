/**
 * Centralized Cache Scopes Enum.
 * Following Open/Closed Principle (OCP): Add new cache scope here when adding new feature areas.
 */
export const CACHE_SCOPES = Object.freeze({
  METRICS: 'metrics',
  POSTS: 'posts',
  INBOX: 'inbox',
  CONNECTIONS: 'connections',
  SMART_LINKS: 'smart_links',
  COMPETITORS: 'competitors',
  BILLING: 'billing'
});
