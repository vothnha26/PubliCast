const EventEmitter = require('events');

class AppEventEmitter extends EventEmitter {}

const eventEmitter = new AppEventEmitter();

// Event names constants to avoid magic strings
const EVENTS = {
  POST: {
    CREATED: 'post.created',
    UPDATED: 'post.updated',
    DELETED: 'post.deleted',
    RESTORED: 'post.restored',
    BULK_DELETED: 'post.bulk_deleted',
    BULK_RESTORED: 'post.bulk_restored'
  },
  USER: {
    REGISTERED: 'user.registered'
  },
  AUTOLIST: {
    CREATED: 'autolist.created',
    UPDATED: 'autolist.updated',
    TOGGLED: 'autolist.toggled'
  },
  SOCIAL: {
    CONNECTED: 'social.connected',
    DISCONNECTED: 'social.disconnected',
    METRICS_SYNCED: 'social.metrics_synced',
    METRICS_SYNC_FAILED: 'social.metrics_sync_failed'
  }
};

module.exports = {
  eventEmitter,
  EVENTS
};
