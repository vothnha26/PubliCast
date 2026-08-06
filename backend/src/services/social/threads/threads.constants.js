/**
 * Threads Platform Specific Constants
 *
 * Centralized Single Source of Truth for Threads Graph API media/type
 * strings — these are Meta's own literal values (media_type on
 * createMediaContainer, container status, etc.), not values we choose, so
 * they belong here rather than in the generic PLATFORMS/constants.js enums.
 */

/**
 * media_type values accepted by POST /{threads-user-id}/threads
 * (createMediaContainer). CAROUSEL_ALBUM only shows up when reading back a
 * published post's media_type (see getThreadsMediaFeed) — it's never a
 * value we send when creating a container ourselves.
 */
const THREADS_MEDIA_TYPE = Object.freeze({
  TEXT: 'TEXT',
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO',
  CAROUSEL_ALBUM: 'CAROUSEL_ALBUM',
});

/** status values returned by GET /{container-id}?fields=status */
const THREADS_CONTAINER_STATUS = Object.freeze({
  IN_PROGRESS: 'IN_PROGRESS',
  FINISHED: 'FINISHED',
  ERROR: 'ERROR',
  EXPIRED: 'EXPIRED',
  PUBLISHED: 'PUBLISHED',
});

module.exports = {
  THREADS_MEDIA_TYPE,
  THREADS_CONTAINER_STATUS,
};
