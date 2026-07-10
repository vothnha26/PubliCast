const RefineStrategy = require('../refine.strategy');

class ShortenStrategy extends RefineStrategy {
  buildPrompt(text, option) {
    return `Viết ngắn gọn, cô đọng văn bản sau đây mà vẫn truyền tải đầy đủ thông điệp chính:\n\n"${text}"`;
  }
}

module.exports = ShortenStrategy;
