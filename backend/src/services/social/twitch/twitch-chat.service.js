const { EventSubWsListener } = require('@twurple/eventsub-ws');

class TwitchChatService {
  constructor() {
    this.listeners = new Map();
  }

  startChatListener(broadcasterId, apiClient, ioSocketServer) {
    if (this.listeners.has(broadcasterId)) return;

    const listener = new EventSubWsListener({ apiClient });
    listener.start();

    listener.onChannelChatMessage(broadcasterId, broadcasterId, (event) => {
      const chatPayload = {
        platform: 'TWITCH',
        broadcasterId,
        messageId: event.messageId,
        user: {
          id: event.chatterId,
          name: event.chatterDisplayName,
          color: event.color
        },
        text: event.messageText,
        badges: event.badges
      };

      if (ioSocketServer && ioSocketServer.to) {
        ioSocketServer.to(`livestream:${broadcasterId}`).emit('chat:message', chatPayload);
        ioSocketServer.to(`livestream:${broadcasterId}`).emit('twitch:chat_message', chatPayload);
      }
    });

    this.listeners.set(broadcasterId, listener);
  }

  stopChatListener(broadcasterId) {
    const listener = this.listeners.get(broadcasterId);
    if (listener) {
      listener.stop();
      this.listeners.delete(broadcasterId);
    }
  }
}

module.exports = new TwitchChatService();
