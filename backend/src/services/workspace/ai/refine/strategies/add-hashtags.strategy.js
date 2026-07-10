const RefineStrategy = require('../refine.strategy');

class AddHashtagsStrategy extends RefineStrategy {
  buildPrompt(text, option) {
    return `Gợi ý và thêm bộ hashtag phù hợp nhất vào cuối bài viết sau:\n\n"${text}"`;
  }
}

module.exports = AddHashtagsStrategy;
