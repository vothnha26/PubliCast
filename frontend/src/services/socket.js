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
  }

  /**
   * Connect to Socket.io Server
   * @param {string} token - User JWT Token for authentication
   */
  connect(token) {
    if (this.socket?.connected) return;

    // If socket exists but is not connected, disconnect it first
    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(socketURL, {
      auth: { token },
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
  }

  /**
   * Emit event to server
   */
  emit(event, data) {
    if (!this.socket?.connected) {
      console.warn(`⚠️ [SocketClient] Cannot emit event "${event}". Socket not connected.`);
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
