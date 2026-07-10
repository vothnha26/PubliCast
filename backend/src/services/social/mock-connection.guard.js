class MockConnectionGuard {
  /**
   * Kiểm tra xem kết nối này có phải là giả lập (mock) hay không.
   * Ưu tiên kiểm tra biến môi trường SOCIAL_API_MODE hoặc MOCK_SOCIAL_API.
   * Nếu không, kiểm tra các từ khóa 'mock' trong token hoặc platformAccountId.
   * 
   * @param {string} token Access token cần kiểm tra
   * @param {string} platformAccountId Platform Account ID cần kiểm tra
   * @returns {boolean} True nếu là kết nối giả lập
   */
  static isMock(token, platformAccountId = null) {
    // 1. Kiểm tra cấu hình biến môi trường toàn cục
    if (process.env.SOCIAL_API_MODE === 'mock' || process.env.MOCK_SOCIAL_API === 'true') {
      return true;
    }

    // 2. Hàm phụ trợ kiểm tra chuỗi chứa từ khóa mock
    const isMockStr = (str) => {
      if (!str || typeof str !== 'string') return false;
      const lower = str.toLowerCase();
      return lower.startsWith('mock-') || lower.includes('mock');
    };

    return isMockStr(token) || isMockStr(platformAccountId);
  }
}

module.exports = MockConnectionGuard;
