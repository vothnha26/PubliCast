import { BaseInboxDisplayStrategy } from './baseInboxDisplay.strategy';

export class YouTubeInboxDisplayStrategy extends BaseInboxDisplayStrategy {
  get platform() {
    return 'YOUTUBE';
  }

  getPostKey(post) {
    if (!post) return null;
    let ytId = post.videoContext?.id || post.videoId || post.relatedPostId;
    if (!ytId && typeof post.id === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(post.id)) {
      ytId = post.id;
    }
    return ytId || post.id || post.platformItemId;
  }

  getPostUrl(post) {
    const key = this.getPostKey(post);
    if (key && typeof key === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(key)) {
      return `https://www.youtube.com/watch?v=${key}`;
    }
    return post?.postUrl || post?.videoContext?.postUrl || null;
  }

  buildThumbnail(post) {
    if (!post) return null;
    let thumb = post.thumbnailUrl || post.mediaUrl || post.videoContext?.thumbnailUrl;
    if (thumb && (thumb.includes('dicebear') || thumb.includes('avataaars') || thumb === post.avatar)) {
      thumb = null;
    }

    const key = this.getPostKey(post);
    if (!thumb && key && typeof key === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(key)) {
      thumb = `https://i.ytimg.com/vi/${key}/hqdefault.jpg`;
    }

    return thumb;
  }

  supportsAutoReply() {
    return false;
  }
}
