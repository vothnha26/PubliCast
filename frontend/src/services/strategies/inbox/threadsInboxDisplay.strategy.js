import { BaseInboxDisplayStrategy } from './baseInboxDisplay.strategy';

/**
 * ThreadsInboxDisplayStrategy
 * Concrete Strategy cho giao diện Threads Inbox.
 */
export class ThreadsInboxDisplayStrategy extends BaseInboxDisplayStrategy {
  get platform() {
    return 'THREADS';
  }

  getPostKey(post) {
    if (!post) return null;
    return post.id || post.threadId || post.platformItemId;
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

  supportsAutoReply() {
    return true;
  }
}
