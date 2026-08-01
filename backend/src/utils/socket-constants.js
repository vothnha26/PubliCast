/**
 * Socket Constants to prevent magic strings in the application.
 */

const SOCKET_EVENTS = {
  // Connection Events
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  ERROR: 'socket_error',

  // Authentication Events
  AUTHENTICATED: 'authenticated',
  UNAUTHORIZED: 'unauthorized',

  // Room Events
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  JOINED_ROOM: 'joined_room',
  LEFT_ROOM: 'left_room',

  // Chat Support Events
  SEND_MESSAGE: 'send_message',
  NEW_MESSAGE: 'new_message',
  TICKET_STATUS_UPDATED: 'ticket_status_updated',
  TICKET_ASSIGNED: 'ticket_assigned',
  TYPING: 'typing',
  STOP_TYPING: 'stop_typing',

  // Real-time System Notification Events
  NOTIFICATION_CREATED: 'notification_created',
  NOTIFICATION_READ: 'notification_read',
  NOTIFICATIONS_READ_ALL: 'notifications_read_all'
};

const ROOM_PREFIXES = {
  USER: 'user_room_',
  TICKET: 'ticket_room_',
  BRAND: 'brand_room_'
};

const MESSAGE_TYPES = {
  TEXT: 'TEXT',
  IMAGE: 'IMAGE',
  FILE: 'FILE'
};

module.exports = {
  SOCKET_EVENTS,
  ROOM_PREFIXES,
  MESSAGE_TYPES
};
