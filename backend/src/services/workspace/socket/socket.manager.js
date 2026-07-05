const { Server } = require('socket.io');
const { SOCKET_EVENTS, ROOM_PREFIXES } = require('../../../utils/socket-constants');
const socketAuthMiddleware = require('./socket.auth');
const messageProcessorFactory = require('./message-strategies/message-processor.factory');
const prisma = require('../../../config/prisma');

class SocketManager {
  constructor() {
    this.io = null;
    this.userSockets = new Map(); // Map<userId, Set<socketId>>
  }

  /**
   * Initialize Socket.io Server
   * @param {Object} httpServer - HTTP Server instance
   * @param {Object} corsOptions - CORS options configuration
   */
  init(httpServer, corsOptions) {
    this.io = new Server(httpServer, {
      cors: corsOptions,
      pingTimeout: 60000,
      pingInterval: 25000
    });

    // Apply Authentication Middleware
    this.io.use(socketAuthMiddleware);

    // Setup Connection Handler
    this.io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
      this._handleConnection(socket);
    });

    console.log('⚡ [SocketManager] Socket.io Server initialized successfully');
  }

  /**
   * Broadcast an event to a specific room
   */
  emitToRoom(roomName, event, data) {
    if (!this.io) return;
    this.io.to(roomName).emit(event, data);
  }

  /**
   * Emit event directly to a specific user across all their active devices/connections
   */
  emitToUser(userId, event, data) {
    const userRoom = `${ROOM_PREFIXES.USER}${userId}`;
    this.emitToRoom(userRoom, event, data);
  }

  /**
   * Private handler for socket connection
   */
  _handleConnection(socket) {
    const userId = socket.user.id;
    const socketId = socket.id;

    // Join personal user room to support multi-device push
    const userRoom = `${ROOM_PREFIXES.USER}${userId}`;
    socket.join(userRoom);

    // Register active sockets
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(socketId);

    console.log(`🔌 [SocketManager] Client connected: ${socket.user.name} (${userId}) | socketId: ${socketId}`);

    // Setup event listeners
    socket.on(SOCKET_EVENTS.JOIN_ROOM, (payload) => this._handleJoinRoom(socket, payload));
    socket.on(SOCKET_EVENTS.LEAVE_ROOM, (payload) => this._handleLeaveRoom(socket, payload));
    socket.on(SOCKET_EVENTS.SEND_MESSAGE, (payload) => this._handleSendMessage(socket, payload));
    socket.on(SOCKET_EVENTS.DISCONNECT, () => this._handleDisconnect(socket));
  }

  /**
   * Handle joining ticket or brand rooms
   */
  _handleJoinRoom(socket, payload) {
    const { ticketId, brandId } = payload;
    
    if (ticketId) {
      const room = `${ROOM_PREFIXES.TICKET}${ticketId}`;
      socket.join(room);
      socket.emit(SOCKET_EVENTS.JOINED_ROOM, { room, ticketId });
      console.log(`👥 [SocketManager] ${socket.user.name} joined room ${room}`);
    }

    if (brandId) {
      const room = `${ROOM_PREFIXES.BRAND}${brandId}`;
      socket.join(room);
      socket.emit(SOCKET_EVENTS.JOINED_ROOM, { room, brandId });
    }
  }

  /**
   * Handle leaving rooms
   */
  _handleLeaveRoom(socket, payload) {
    const { ticketId, brandId } = payload;

    if (ticketId) {
      const room = `${ROOM_PREFIXES.TICKET}${ticketId}`;
      socket.leave(room);
      socket.emit(SOCKET_EVENTS.LEFT_ROOM, { room, ticketId });
    }

    if (brandId) {
      const room = `${ROOM_PREFIXES.BRAND}${brandId}`;
      socket.leave(room);
      socket.emit(SOCKET_EVENTS.LEFT_ROOM, { room, brandId });
    }
  }

  /**
   * Process and save incoming ticket messages, then broadcast
   */
  async _handleSendMessage(socket, payload) {
    try {
      const { ticketId, messageType = 'TEXT' } = payload;
      if (!ticketId) {
        throw new Error('ticketId is required to send message');
      }

      // Check if user has access to this ticket
      const ticket = await prisma.supportTicket.findUnique({
        where: { id: ticketId }
      });

      if (!ticket) {
        throw new Error('Support Ticket not found');
      }

      // Apply strategy to process incoming data
      const processor = messageProcessorFactory.getProcessor(messageType);
      const processed = await processor.process(payload);

      // Save Message to DB using Prisma
      const savedMessage = await prisma.ticketMessage.create({
        data: {
          ticketId,
          senderId: socket.user.id,
          messageType: processed.messageType,
          content: processed.content,
          attachmentUrl: processed.attachmentUrl
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        }
      });

      // Form formatted payload matching client layout
      const formattedMessage = {
        id: savedMessage.id,
        ticketId: savedMessage.ticketId,
        text: savedMessage.content,
        attachment: savedMessage.attachmentUrl ? {
          name: savedMessage.attachmentUrl.split('/').pop(),
          type: savedMessage.messageType.toLowerCase(),
          isImage: savedMessage.messageType === 'IMAGE',
          url: savedMessage.attachmentUrl
        } : null,
        time: savedMessage.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: savedMessage.createdAt,
        sender: (savedMessage.sender.role === 'STAFF' || savedMessage.sender.role === 'ADMIN') ? 'staff' : 'user',
        senderName: savedMessage.sender.name,
        role: savedMessage.sender.role
      };

      // Broadcast to room
      const room = `${ROOM_PREFIXES.TICKET}${ticketId}`;
      this.emitToRoom(room, SOCKET_EVENTS.NEW_MESSAGE, formattedMessage);

      // Optional: Trigger Notifications using core NotificationService if integrated
      try {
        const notificationService = require('../../core/notification.service');
        // Notify ticket owner if staff sent it, or vice versa
        const targetUserId = socket.user.id === ticket.userId ? ticket.assignedAgentId : ticket.userId;
        if (targetUserId) {
          await notificationService.create({
            brandId: ticket.brandId,
            userId: targetUserId,
            title: `Tin nhắn mới từ ${socket.user.name}`,
            message: processed.content.substring(0, 100),
            type: 'CHAT_SUPPORT',
            actionUrl: `/dashboard/chat?ticketId=${ticketId}`
          });
        }
      } catch (notifErr) {
        console.error('⚠️ [SocketManager] Error creating system notification:', notifErr.message);
      }

    } catch (err) {
      console.error('❌ [SocketManager] Send message error:', err.message);
      socket.emit(SOCKET_EVENTS.ERROR, { message: err.message });
    }
  }

  /**
   * Handle user disconnection
   */
  _handleDisconnect(socket) {
    const userId = socket.user.id;
    const socketId = socket.id;

    if (this.userSockets.has(userId)) {
      const sockets = this.userSockets.get(userId);
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }

    console.log(`🔌 [SocketManager] Client disconnected: ${socket.user.name} | socketId: ${socketId}`);
  }
}

module.exports = new SocketManager();
