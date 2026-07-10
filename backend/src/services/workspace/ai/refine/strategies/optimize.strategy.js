const RefineStrategy = require('../refine.strategy');

class OptimizeStrategy extends RefineStrategy {
  buildPrompt(text, option) {
    const platform = option?.targetPlatform || 'Facebook';
    return `Tối ưu hóa bài viết sau đây dành riêng cho nền tảng mạng xã hội "${platform}" (Ví dụ: Facebook, Instagram, LinkedIn, TikTok), tuân thủ các quy chuẩn và giới hạn của nền tảng đó:\n\n"${text}"`;
  }
}

module.exports = OptimizeStrategy;
