const socketManager = require('../workspace/socket/socket.manager');
const { SOCKET_EVENTS, ROOM_PREFIXES } = require('../../utils/socket-constants');
const logger = require('../../utils/logger');

/**
 * Service Facade: Broadcasts realtime cache-invalidation events over Socket.io
 * so connected clients know to refetch stale data for a brand.
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

    // Broadcast DATA_INVALIDATE event to brand socket room
    const roomName = `${ROOM_PREFIXES.BRAND}${brandId}`;
    socketManager.emitToRoom(roomName, SOCKET_EVENTS.DATA_INVALIDATE, payload);
    logger.debug(`[SocketInvalidationService] Broadcasted DATA_INVALIDATE for scope '${scope}' to room '${roomName}'`);
  }
}

module.exports = new SocketInvalidationService();
