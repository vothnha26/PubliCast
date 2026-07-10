const RefineStrategy = require('../refine.strategy');

class LengthenStrategy extends RefineStrategy {
  buildPrompt(text, option) {
    return `Kéo dài và chi tiết hóa văn bản sau đây để cung cấp thêm giá trị cho người đọc, giữ nguyên ý chính:\n\n"${text}"`;
  }
}

module.exports = LengthenStrategy;
