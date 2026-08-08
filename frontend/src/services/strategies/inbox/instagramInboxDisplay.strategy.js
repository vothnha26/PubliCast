import { BaseInboxDisplayStrategy } from './baseInboxDisplay.strategy';

/**
 * InstagramInboxDisplayStrategy
 * Platform display strategy for Instagram in Unified Inbox.
 */
export class InstagramInboxDisplayStrategy extends BaseInboxDisplayStrategy {
  get platform() {
    return 'INSTAGRAM';
  }

  getPostKey(post) {
    if (!post) return null;
    return post.id || post.platformItemId || post.videoContext?.id;
  }

  getPostUrl(post) {
    if (!post) return null;
    return post.postUrl || post.permalinkUrl || post.videoContext?.postUrl || null;
  }

  buildThumbnail(post) {
    if (!post) return null;
    return post.thumbnailUrl || post.mediaUrl || post.videoContext?.thumbnailUrl || null;
  }

  supportsAutoReply() {
    return true;
  }

  normalizePost(post, index = 0) {
    const key = this.getPostKey(post);
    const thumb = this.buildThumbnail(post);
    const postUrl = this.getPostUrl(post);
    const title = post.title || post.caption || post.videoContext?.title || `Instagram Post #${index + 1}`;

    return {
      id: key,
      title,
      thumbnailUrl: thumb,
      mediaUrl: thumb,
      postUrl,
      platform: 'INSTAGRAM',
      commentCount: post.commentCount || post.comments || 0,
      unreadCount: post.unreadCount || 0,
      latestCommentAt: post.latestCommentAt || post.publishedAt || post.createdAt || null,
      videoContext: {
        id: key,
        title,
        thumbnailUrl: thumb,
        channelTitle: post.videoContext?.channelTitle || 'Instagram Account',
        postUrl
      }
    };
  }
}
