class AutoReplyStrategy {
  /**
   * Trả về kết quả tự động phản hồi (nếu khớp hoặc sinh được text từ AI)
   * @param {string} commentText - Nội dung bình luận của người dùng
   * @param {any} config - Cấu hình cài đặt (keywordsConfig hoặc aiPrompt)
   * @returns {Promise<string|null>} - Câu trả lời tự động, hoặc null nếu không phản hồi
   */
  async reply(commentText, config) {
    throw new Error('Method "reply" must be implemented');
  }
}

module.exports = AutoReplyStrategy;
