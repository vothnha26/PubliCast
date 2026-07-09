const AutoReplyStrategy = require('./auto-reply.strategy');
const AiProviderFactory = require('../../../../workspace/ai/providers/provider.factory');

class AIAutoReplyStrategy extends AutoReplyStrategy {
  async reply(commentText, config) {
    if (!commentText || !config) {
      return null;
    }

    try {
      const provider = AiProviderFactory.getProvider();
      
      const prompt = `Khách hàng bình luận: "${commentText}"`;
      const systemInstruction = `Bạn là trợ lý chăm sóc khách hàng tự động trên Facebook của thương hiệu. 
Hãy viết một câu trả lời ngắn gọn, thân thiện, lịch sự và tự nhiên dựa trên chỉ dẫn/bối cảnh sau:
"${config}"

YÊU CẦU BẮT BUỘC: Bạn PHẢI trả về câu trả lời dưới định dạng đối tượng JSON sau (không thêm văn bản nào khác ngoài JSON):
{
  "reply": "nội dung câu trả lời của bạn ở đây"
}`;

      const result = await provider.generate(prompt, {
        systemInstruction
      });

      if (result && result.reply) {
        return result.reply.trim();
      }

      return null;
    } catch (error) {
      console.error('[AIAutoReplyStrategy] Error generating AI response:', error);
      return null;
    }
  }
}

module.exports = AIAutoReplyStrategy;
