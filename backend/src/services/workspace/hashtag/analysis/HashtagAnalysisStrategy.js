class HashtagAnalysisStrategy {
  /**
   * Phương thức trừu tượng thực thi phân tích hashtag.
   * Cần được override ở các lớp con.
   * @param {string} hashtag 
   * @param {Object} tracker 
   * @returns {Promise<Object>} Dữ liệu phân tích
   */
  async analyze(hashtag, tracker) {
    throw new Error('Method analyze() must be implemented');
  }
}

module.exports = HashtagAnalysisStrategy;
