const RefineStrategy = require('../refine.strategy');

class ChangeToneStrategy extends RefineStrategy {
  buildPrompt(text, option) {
    const tone = option?.targetTone || 'Chuyên nghiệp';
    return `Thay đổi giọng điệu của văn bản sau đây sang phong cách "${tone}" (Ví dụ: Chuyên nghiệp, thân thiện, hài hước, truyền cảm hứng):\n\n"${text}"`;
  }
}

module.exports = ChangeToneStrategy;
