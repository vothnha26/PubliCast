const RefineStrategy = require('../refine.strategy');

class AddCtaStrategy extends RefineStrategy {
  buildPrompt(text, option) {
    return `Thêm câu kêu gọi hành động (Call-to-Action) phù hợp, tự nhiên vào cuối văn bản sau đây:\n\n"${text}"`;
  }
}

module.exports = AddCtaStrategy;
