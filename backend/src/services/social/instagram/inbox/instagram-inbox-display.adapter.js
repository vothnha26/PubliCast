const BaseInboxDisplayAdapter = require('../../../../core/inbox/base-inbox-display.adapter');
const { PLATFORMS } = require('../../../../utils/constants');

class InstagramInboxDisplayAdapter extends BaseInboxDisplayAdapter {
  get platform() {
    return PLATFORMS.INSTAGRAM;
  }

  normalizeThread(thread) {
    const raw = typeof thread.rawJson === 'string' ? JSON.parse(thread.rawJson) : thread.rawJson || {};
    return {
      id: thread.id || thread.platformThreadId,
      platform: this.platform,
      itemType: thread.itemType || 'DIRECT_MESSAGE',
      senderName: thread.senderName || 'Instagram User',
      senderAvatar: raw.from?.profile_picture_url || null,
      lastMessage: thread.content || '',
      updatedAt: thread.timestamp || thread.updatedAt,
      isRead: thread.isRead || false,
      raw: thread
    };
  }
}

module.exports = InstagramInboxDisplayAdapter;
