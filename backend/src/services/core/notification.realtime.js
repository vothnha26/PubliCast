class NotificationRealtimeService {
  constructor() {
    this.clientsByUser = new Map();
  }

  subscribe(userId, res) {
    const key = String(userId);
    const clients = this.clientsByUser.get(key) || new Set();
    clients.add(res);
    this.clientsByUser.set(key, clients);

    this._send(res, 'notification.connected', { connected: true });
    const heartbeat = setInterval(() => {
      this._send(res, 'notification.heartbeat', { now: new Date().toISOString() });
    }, 30000);

    return () => {
      clearInterval(heartbeat);
      clients.delete(res);
      if (clients.size === 0) {
        this.clientsByUser.delete(key);
      }
    };
  }

  publishToUser(userId, event, payload = {}) {
    const clients = this.clientsByUser.get(String(userId));
    if (!clients) return;

    clients.forEach((res) => this._send(res, event, payload));
  }

  broadcast(event, payload = {}) {
    this.clientsByUser.forEach((clients) => {
      clients.forEach((res) => this._send(res, event, payload));
    });
  }

  _send(res, event, payload) {
    if (res.destroyed || res.writableEnded) return;

    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  }
}

module.exports = new NotificationRealtimeService();
