/**
 * BaseInboxSyncAdapter
 * Abstract Template Method Class cho luồng Đồng bộ (Sync) & Phản hồi (Reply/Comment) Inbox.
 */
class BaseInboxSyncAdapter {
  get platform() {
    throw new Error('Abstract property platform must be implemented');
  }

  supports(platform) {
    if (!platform) return false;
    return platform.toUpperCase() === this.platform;
  }

  supportsReply(item) {
    if (!item || !item.platform) return false;
    return item.platform.toUpperCase() === this.platform;
  }

  supportsNewComment(platform) {
    if (!platform) return false;
    return platform.toUpperCase() === this.platform;
  }

  /**
   * Sync inbox item/comments từ API nền tảng về hệ thống
   * @param {string} brandId
   * @param {object} inbox
   * @returns {Promise<Array>}
   */
  async sync(brandId, inbox) {
    throw new Error('Abstract method sync must be implemented');
  }

  /**
   * Sync bình luận cho 1 bài viết/video cụ thể
   * @param {string} brandId
   * @param {string} postId
   * @param {object} inbox
   * @returns {Promise<Array>}
   */
  async syncPostComments(brandId, postId, inbox) {
    return [];
  }

  /**
   * Phản hồi một bình luận/tin nhắn đã có
   * @param {string} brandId
   * @param {string} parentPlatformItemId
   * @param {string} text
   * @param {string} [socialAccountId]
   * @param {string} [attachmentUrl]
   * @returns {Promise<object>}
   */
  async reply(brandId, parentPlatformItemId, text, socialAccountId = null, attachmentUrl = null) {
    throw new Error('Abstract method reply must be implemented');
  }

  /**
   * Tạo bình luận đầu tiên (Top-level comment) trên bài viết/video
   * @param {string} brandId
   * @param {string} postId
   * @param {string} text
   * @param {string} [socialAccountId]
   * @param {string} [attachmentUrl]
   * @returns {Promise<object>}
   */
  async createComment(brandId, postId, text, socialAccountId = null, attachmentUrl = null) {
    throw new Error('Abstract method createComment must be implemented');
  }

  /**
   * Cập nhật nội dung trả lời
   */
  async updateReply(brandId, platformItemId, text, socialAccountId = null) {
    throw new Error('Abstract method updateReply must be implemented');
  }

  /**
   * Xóa nội dung trả lời
   */
  async deleteReply(brandId, platformItemId, socialAccountId = null) {
    throw new Error('Abstract method deleteReply must be implemented');
  }
}

module.exports = BaseInboxSyncAdapter;
