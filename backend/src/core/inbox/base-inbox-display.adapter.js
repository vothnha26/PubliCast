/**
 * BaseInboxDisplayAdapter
 * Abstract Template Method Class cho luồng Lấy danh sách bài viết, Thumbnail và Permalink URL.
 */
class BaseInboxDisplayAdapter {
  get platform() {
    throw new Error('Abstract property platform must be implemented');
  }

  /**
   * Lấy danh sách bài viết đã xuất bản trực tiếp từ Platform API
   * @param {string} brandId
   * @param {string[]} socialAccountIds
   * @param {object} options
   * @returns {Promise<Array>}
   */
  async fetchPlatformPosts(brandId, socialAccountIds = [], options = {}) {
    throw new Error('Abstract method fetchPlatformPosts must be implemented');
  }

  /**
   * Xây dựng URL hình ảnh xem trước (Thumbnail) cho bài viết/video
   * @param {object} item - InboxItem
   * @param {object} dbPost - Post
   * @param {object} trackedVideo - TrackedVideo
   * @returns {string|null}
   */
  buildThumbnail(item, dbPost, trackedVideo) {
    throw new Error('Abstract method buildThumbnail must be implemented');
  }

  /**
   * Xây dựng đường dẫn bài viết trực tiếp trên nền tảng (Permalink)
   * @param {string} postId
   * @returns {string|null}
   */
  buildPostUrl(postId) {
    throw new Error('Abstract method buildPostUrl must be implemented');
  }
}

module.exports = BaseInboxDisplayAdapter;
