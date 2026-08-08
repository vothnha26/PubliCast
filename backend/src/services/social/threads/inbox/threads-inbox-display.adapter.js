const BaseInboxDisplayAdapter = require('../../../../core/inbox/base-inbox-display.adapter');
const { PLATFORMS } = require('../../../../utils/constants');

/**
 * ThreadsInboxDisplayAdapter
 * Adapter chuẩn hóa hiển thị Threads bài viết & bình luận trong Unified Inbox.
 */
class ThreadsInboxDisplayAdapter extends BaseInboxDisplayAdapter {
  get platform() {
    return PLATFORMS.THREADS;
  }

  getPostKey(post) {
    if (!post) return null;
    return post.id || post.platformPostId || post.threadId;
  }

  getPostUrl(post) {
    if (!post) return null;
    const threadId = this.getPostKey(post);
    if (post.postUrl) return post.postUrl;
    if (threadId) return `https://www.threads.net/post/${threadId}`;
    return null;
  }

  buildThumbnail(post) {
    if (!post) return null;
    return post.thumbnailUrl || post.mediaUrl || null;
  }
}

module.exports = ThreadsInboxDisplayAdapter;
