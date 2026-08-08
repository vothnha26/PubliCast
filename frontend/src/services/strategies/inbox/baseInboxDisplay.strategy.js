/**
 * BaseInboxDisplayStrategy
 * Abstract Class cho định dạng bài viết & liên kết đặc thù theo Nền tảng ở Frontend.
 */
export class BaseInboxDisplayStrategy {
  get platform() {
    return 'UNKNOWN';
  }

  /**
   * Lấy khóa duy nhất đại diện cho Bài viết/Video
   * @param {object} post 
   * @returns {string}
   */
  getPostKey(post) {
    if (!post) return null;
    return post.id || post.videoId || post.videoContext?.id || post.platformItemId;
  }

  /**
   * Lấy đường dẫn trực tiếp tới bài viết trên nền tảng
   * @param {object} post 
   * @returns {string|null}
   */
  getPostUrl(post) {
    if (!post) return null;
    return post.postUrl || post.videoContext?.postUrl || null;
  }

  /**
   * Lấy Thumbnail chuẩn cho bài viết
   * @param {object} post 
   * @returns {string|null}
   */
  buildThumbnail(post) {
    if (!post) return null;
    return post.thumbnailUrl || post.mediaUrl || post.videoContext?.thumbnailUrl || null;
  }

  /**
   * Kiểm tra nền tảng có hỗ trợ cấu hình Tự động phản hồi hay không
   * @returns {boolean}
   */
  supportsAutoReply() {
    return false;
  }

  /**
   * Chuẩn hóa đối tượng Post cho UI Sidebar
   * @param {object} post 
   * @param {number} index 
   * @returns {object}
   */
  normalizePost(post, index = 0) {
    const key = this.getPostKey(post);
    const thumb = this.buildThumbnail(post);
    const postUrl = this.getPostUrl(post);
    const title = post.title || post.caption || post.videoContext?.title || `Bài viết #${index + 1}`;

    return {
      id: key,
      title,
      thumbnailUrl: thumb,
      mediaUrl: thumb,
      videoContext: post.videoContext || {
        id: key,
        title,
        thumbnailUrl: thumb,
        channelTitle: `${this.platform} Channel`,
        postUrl
      },
      platform: this.platform,
      socialAccountId: post.socialAccountId || null,
      commentCount: post.commentCount || post.comments || 0,
      unreadCount: post.unreadCount || 0,
      rawItem: post.rawItem || null,
    };
  }
}
