const socketManager = require('../workspace/socket/socket.manager');
const { SOCKET_EVENTS, ROOM_PREFIXES, CACHE_SCOPES } = require('../../utils/socket-constants');
const redisClient = require('../../config/redis');

/**
 * Service Facade: Manages Realtime Cache Invalidation broadcasting over Socket.io
 * and Redis Cache purging.
 * 
 * Following SOLID Principles:
 * - SRP: Single Responsibility for cache invalidation propagation.
 * - OCP: Open for new cache scopes without modifying socket transport logic.
 */
class SocketInvalidationService {
  /**
   * Invalidate a cache scope for a brand across all connected client browsers
   * @param {string} brandId - Target Brand ID
   * @param {string} scope - Cache scope from CACHE_SCOPES enum
   * @param {object} [extraPayload={}] - Additional metadata (e.g. resourceId, timestamp)
   */
  async invalidateBrandScope(brandId, scope, extraPayload = {}) {
    if (!brandId || !scope) return;

    const payload = {
      scope,
      brandId,
      timestamp: Date.now(),
      ...extraPayload
    };

    // 1. Purge Redis Cache if applicable
    if (scope === CACHE_SCOPES.METRICS && redisClient.isOpen) {
      try {
        const pattern = `sync:metrics:${brandId}:*`;
        const keys = await redisClient.keys(pattern).catch(() => []);
        if (keys && keys.length > 0) {
          await redisClient.del(...keys);
        }
      } catch (err) {
        console.warn(`[SocketInvalidationService] Failed to purge Redis keys for ${brandId}:`, err.message);
      }
    }

    // 2. Broadcast DATA_INVALIDATE event to brand socket room
    const roomName = `${ROOM_PREFIXES.BRAND}${brandId}`;
    socketManager.emitToRoom(roomName, SOCKET_EVENTS.DATA_INVALIDATE, payload);
    console.log(`[SocketInvalidationService] Broadcasted DATA_INVALIDATE for scope '${scope}' to room '${roomName}'`);
  }
}

module.exports = new SocketInvalidationService();
