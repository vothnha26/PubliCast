import { BaseInboxDisplayStrategy } from './baseInboxDisplay.strategy';

export class FacebookInboxDisplayStrategy extends BaseInboxDisplayStrategy {
  get platform() {
    return 'FACEBOOK';
  }

  getPostKey(post) {
    if (!post) return null;
    return post.id || post.videoId || post.relatedPostId || post.videoContext?.id || post.platformItemId;
  }

  getPostUrl(post) {
    const key = this.getPostKey(post);
    if (key) {
      return `https://www.facebook.com/${key}`;
    }
    return post?.postUrl || post?.videoContext?.postUrl || null;
  }

  buildThumbnail(post) {
    if (!post) return null;
    let thumb = post.thumbnailUrl || post.mediaUrl || post.videoContext?.thumbnailUrl;
    if (thumb && (thumb.includes('dicebear') || thumb.includes('avataaars') || thumb === post.avatar)) {
      thumb = null;
    }
    return thumb;
  }

  supportsAutoReply() {
    return true;
  }
}
