const RefineStrategy = require('../refine.strategy');

class StructureStrategy extends RefineStrategy {
  buildPrompt(text, option) {
    return `Thay đổi cấu trúc trình bày của văn bản sau đây (Ví dụ: chia nhỏ thành các gạch đầu dòng, thêm tiêu đề phụ) để người đọc dễ theo dõi:\n\n"${text}"`;
  }
}

module.exports = StructureStrategy;
