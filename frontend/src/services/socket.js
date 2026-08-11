import { io } from 'socket.io-client';
import logger from '../utils/logger';
import { CACHE_SCOPES } from '../constants/cache-scopes.constants';

let socketURL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
// Nếu socket URL lấy từ VITE_API_BASE_URL, nó chứa hậu tố /api gây lỗi Invalid Namespace của Socket.io
if (socketURL.endsWith('/api')) {
  socketURL = socketURL.substring(0, socketURL.length - 4);
}
if (!socketURL) {
  socketURL = 'http://localhost:3000';
}

class SocketClient {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    // Events emitted before the socket reports `connected` (e.g. a
    // component's mount effect calling emit('join_room') before
    // useAuthStore's connect() finishes its handshake) were silently
    // dropped by the old guard in emit() below — queued here and flushed
    // once 'connect' fires instead (#112 K6).
    this.pendingEmits = [];
    // brandIds any component has asked to join (see emit('join_room', ...)
    // below) — kept so a reconnect can reconcile each of them, not just the
    // one active at reconnect time.
    this.joinedBrandIds = new Set();
    // Last-known metrics version per brandId, captured from `data_invalidate`
    // payloads' dataVersion field. Used only to detect a missed event on
    // reconnect — see _reconcileAfterReconnect.
    this.lastKnownMetricsVersion = new Map();
    this.wasDisconnected = false;
  }

  /**
   * Connect to Socket.io Server. Authentication is cookie-based by default —
   * withCredentials sends the HttpOnly accessToken cookie automatically,
   * which the backend's socketAuthMiddleware reads from the handshake
   * headers as its fallback when no explicit auth token is provided.
   *
   * @param {string} [token] - Only needed for browser contexts that don't
   *   share the user's cookie jar, e.g. ObsChatOverlay.jsx running inside
   *   OBS Studio's isolated CEF browser source — everywhere else should
   *   call connect() with no argument.
   */
  connect(token) {
    if (this.socket?.connected) return;

    // If socket exists but is not connected, disconnect it first
    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(socketURL, {
      auth: token ? { token } : undefined,
      transports: ['websocket'],
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000
    });

    // Re-apply any active listeners to the new socket instance once during initialization
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach(cb => {
        this.socket.off(event, cb); // Ensure no duplicate on this new instance
        this.socket.on(event, cb);
      });
    });

    this.socket.on('connect', () => {
      logger.debug('⚡ [SocketClient] Connected to websocket server');
      // Flush anything queued while we were disconnected/connecting.
      const queued = this.pendingEmits;
      this.pendingEmits = [];
      queued.forEach(({ event, data }) => this.socket.emit(event, data));

      // A missed `data_invalidate` (e.g. emitted server-side during the gap
      // between disconnect and this reconnect) leaves this tab on stale
      // cache indefinitely — nothing else would ever trigger a refetch since
      // staleTime hasn't elapsed and the tab never remounts. Only run this
      // on an actual reconnect, not the very first connect of the session.
      if (this.wasDisconnected) {
        this.wasDisconnected = false;
        this._reconcileAfterReconnect();
      }
    });

    // Realtime Hybrid Cache Invalidation Handler
    this.socket.on('data_invalidate', ({ scope, brandId, dataVersion }) => {
      logger.debug(`⚡ [SocketClient] Received data_invalidate for scope '${scope}', brandId '${brandId}'`);
      if (scope && brandId) {
        if (scope === CACHE_SCOPES.METRICS && typeof dataVersion === 'number') {
          this.lastKnownMetricsVersion.set(brandId, dataVersion);
        }
        import('../App').then(({ queryClient }) => {
          queryClient.invalidateQueries({ queryKey: [scope, brandId] });
          // channel_insights_summary embeds its own copy of metrics
          // (see channel-insights-summary.service.js) instead of reading
          // useMetricsQuery's cache, so a metrics invalidation must also
          // reach it explicitly — the [scope, brandId] prefix match above
          // only covers ['metrics', brandId, ...] keys.
          if (scope === CACHE_SCOPES.METRICS) {
            queryClient.invalidateQueries({ queryKey: [CACHE_SCOPES.CHANNEL_INSIGHTS_SUMMARY, brandId] });
          }
        }).catch(err => {
          console.warn('[SocketClient] Failed to import queryClient for invalidation:', err.message);
        });
      }
    });

    this.socket.on('connect_error', (err) => {
      console.error('❌ [SocketClient] Connection error:', err.message);
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('🔌 [SocketClient] Disconnected:', reason);
      this.wasDisconnected = true;
    });
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.pendingEmits = [];
  }

  /**
   * Emit event to server. If the socket exists but hasn't finished
   * connecting yet, the event is queued and flushed once 'connect' fires
   * instead of being silently dropped (#112 K6) — this is what let a
   * mount-time `emit('join_room')` race the initial handshake and lose the
   * room join with no realtime delivery and no visible error.
   */
  emit(event, data) {
    if (event === 'join_room' && data?.brandId) {
      this.joinedBrandIds.add(data.brandId);
    }
    if (!this.socket) {
      console.warn(`⚠️ [SocketClient] Cannot emit event "${event}". Socket not initialized (connect() not called yet).`);
      return;
    }
    if (!this.socket.connected) {
      this.pendingEmits.push({ event, data });
      return;
    }
    this.socket.emit(event, data);
  }

  /**
   * Reconcile every joined brand's metrics cache against the server after a
   * reconnect, in case a `data_invalidate` was emitted while this tab was
   * disconnected and so never arrived. Compares the last dataVersion we
   * actually observed against the server's current version — only
   * invalidates brands that are actually behind, not every joined brand.
   */
  async _reconcileAfterReconnect() {
    if (this.joinedBrandIds.size === 0) return;
    try {
      const [{ default: socialService }, { queryClient }] = await Promise.all([
        import('./social.service'),
        import('../App')
      ]);

      await Promise.all(Array.from(this.joinedBrandIds).map(async (brandId) => {
        try {
          const res = await socialService.getMetricsVersion(brandId);
          const serverVersion = (res.data || res)?.version;
          const knownVersion = this.lastKnownMetricsVersion.get(brandId) || 0;
          if (typeof serverVersion === 'number' && serverVersion > knownVersion) {
            logger.debug(`⚡ [SocketClient] Reconcile found stale metrics for brand '${brandId}', invalidating`);
            this.lastKnownMetricsVersion.set(brandId, serverVersion);
            queryClient.invalidateQueries({ queryKey: ['metrics', brandId] });
          }
        } catch (err) {
          console.warn(`[SocketClient] Reconcile failed for brand '${brandId}':`, err.message);
        }
      }));
    } catch (err) {
      console.warn('[SocketClient] Reconcile-after-reconnect failed:', err.message);
    }
  }

  /**
   * Listen for events from server
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    if (this.socket) {
      this.socket.off(event, callback);
      this.socket.on(event, callback);
    }
  }

  /**
   * Remove listener
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    }

    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

const socketClient = new SocketClient();
export default socketClient;
export { socketClient };
