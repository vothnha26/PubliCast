import { io } from 'socket.io-client';

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
      console.log('⚡ [SocketClient] Connected to websocket server');
      // Flush anything queued while we were disconnected/connecting.
      const queued = this.pendingEmits;
      this.pendingEmits = [];
      queued.forEach(({ event, data }) => this.socket.emit(event, data));
    });

    this.socket.on('connect_error', (err) => {
      console.error('❌ [SocketClient] Connection error:', err.message);
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('🔌 [SocketClient] Disconnected:', reason);
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
