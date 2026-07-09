const AutoReplyStrategy = require('./auto-reply.strategy');

class KeywordAutoReplyStrategy extends AutoReplyStrategy {
  async reply(commentText, config) {
    if (!commentText || !config || !Array.isArray(config)) {
      return null;
    }

    const cleanComment = commentText.toLowerCase().trim();

    for (const rule of config) {
      const keywords = rule.keywords || [];
      const replyText = rule.reply || '';

      // Kiểm tra xem bình luận có chứa bất kỳ từ khóa nào trong danh sách không
      const isMatched = keywords.some(keyword => 
        cleanComment.includes(keyword.toLowerCase().trim())
      );

      if (isMatched && replyText) {
        return replyText;
      }
    }

    return null;
  }
}

module.exports = KeywordAutoReplyStrategy;
