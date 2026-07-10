const RefineStrategy = require('../refine.strategy');

class AdjustStrategy extends RefineStrategy {
  buildPrompt(text, option) {
    const instructions = option?.customInstructions || '';
    return `Điều chỉnh văn bản sau đây theo hướng dẫn cụ thể này: "${instructions}". Văn bản cần điều chỉnh:\n\n"${text}"`;
  }
}

module.exports = AdjustStrategy;
