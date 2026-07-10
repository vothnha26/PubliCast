const InstagramTrendingStrategy = require('./InstagramTrendingStrategy');

// Dùng chung nguồn dữ liệu trending từ TokAPI (qua InstagramTrendingStrategy)
// cho tab General - không có API trending riêng cho General
class MockTrendingStrategy extends InstagramTrendingStrategy {}

module.exports = MockTrendingStrategy;
