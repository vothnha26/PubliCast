const RefineStrategy = require('../refine.strategy');

class CorrectStrategy extends RefineStrategy {
  buildPrompt(text, option) {
    return `Kiểm tra và sửa toàn bộ lỗi chính tả, ngữ pháp, dấu câu trong văn bản sau đây, đảm bảo văn bản trôi chảy và chuyên nghiệp:\n\n"${text}"`;
  }
}

module.exports = CorrectStrategy;
