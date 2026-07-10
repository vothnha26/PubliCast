const RefineStrategy = require('../refine.strategy');

class AddEmojisStrategy extends RefineStrategy {
  buildPrompt(text, option) {
    return `Thêm các biểu tượng cảm xúc (emoji) phù hợp và sinh động vào văn bản sau đây để tăng sự thu hút:\n\n"${text}"`;
  }
}

module.exports = AddEmojisStrategy;
