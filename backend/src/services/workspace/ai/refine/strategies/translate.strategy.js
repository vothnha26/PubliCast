const RefineStrategy = require('../refine.strategy');

class TranslateStrategy extends RefineStrategy {
  buildPrompt(text, option) {
    const targetLang = option?.targetLanguage || 'English';
    return `Dịch văn bản sau đây sang ngôn ngữ "${targetLang}". Hãy giữ nguyên ý nghĩa và phong cách viết bài:\n\n"${text}"`;
  }
}

module.exports = TranslateStrategy;
