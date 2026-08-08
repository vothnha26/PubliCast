/**
 * InboxFacade
 * Entry Point (Facade): Cung cấp giao diện dùng chung cho Controller V2 và các service khác để tương tác với Inbox.
 */
class InboxFacade {
  /**
   * @param {import('./inbox-sync.factory')} syncFactory
   * @param {import('./inbox-display.factory')} displayFactory
   */
  constructor(syncFactory, displayFactory) {
    this.syncFactory = syncFactory;
    this.displayFactory = displayFactory;
  }

  getSyncAdapter(platform) {
    return this.syncFactory.getAdapter(platform);
  }

  getDisplayAdapter(platform) {
    return this.displayFactory.getAdapter(platform);
  }

  async syncPlatformComments(brandId, platform, inbox) {
    const adapter = this.syncFactory.getAdapter(platform);
    return adapter.sync(brandId, inbox);
  }

  async syncPostComments(brandId, platform, postId, inbox) {
    if (!this.syncFactory.isSupported(platform)) return [];
    const adapter = this.syncFactory.getAdapter(platform);
    return adapter.syncPostComments(brandId, postId, inbox);
  }

  async reply(brandId, platform, parentPlatformItemId, text, socialAccountId = null, attachmentUrl = null) {
    const adapter = this.syncFactory.getAdapter(platform);
    return adapter.reply(brandId, parentPlatformItemId, text, socialAccountId, attachmentUrl);
  }

  async createComment(brandId, platform, postId, text, socialAccountId = null, attachmentUrl = null) {
    const adapter = this.syncFactory.getAdapter(platform);
    return adapter.createComment(brandId, postId, text, socialAccountId, attachmentUrl);
  }

  async fetchPlatformPosts(brandId, platform, socialAccountIds = [], options = {}) {
    const adapter = this.displayFactory.getAdapter(platform);
    return adapter.fetchPlatformPosts(brandId, socialAccountIds, options);
  }

  buildThumbnail(platform, item, dbPost, trackedVideo) {
    if (!this.displayFactory.isSupported(platform)) return null;
    const adapter = this.displayFactory.getAdapter(platform);
    return adapter.buildThumbnail(item, dbPost, trackedVideo);
  }

  buildPostUrl(platform, postId) {
    if (!this.displayFactory.isSupported(platform)) return null;
    const adapter = this.displayFactory.getAdapter(platform);
    return adapter.buildPostUrl(postId);
  }
}

module.exports = InboxFacade;
