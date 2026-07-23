const BaseAiProvider = require('./base.provider');

class MockAiProvider extends BaseAiProvider {
  async generate(prompt, options = {}) {
    const tone = (options.tone || 'PROFESSIONAL').toUpperCase();
    const platform = (options.platform || 'General').toUpperCase();
    const hasImage = !!options.image;

    let baseText = `Đây là bài viết được tạo tự động bởi PubliCast AI Assistant dựa trên chủ đề: "${prompt}".`;
    if (hasImage) {
      baseText += ` (Đã phân tích hình ảnh đính kèm thành công để cá nhân hóa nội dung).`;
    }

    const tonesMap = {
      CASUAL: {
        intro: "Chào mọi người! ✨",
        body: "Hôm nay mình muốn chia sẻ một chút về điều này. Hy vọng sẽ mang lại nguồn năng lượng tích cực cho ngày mới của bạn! Đừng ngần ngại để lại cảm nghĩ bên dưới nhé.",
        hashtags: ["#chill", "#lifestyle", "#goodvibes"]
      },
      FUNNY: {
        intro: "Cảnh báo: Đọc bài này có thể gây cười cực mạnh! 😂",
        body: "Định không nói gì đâu nhưng mà phải nói ra mới chịu được. Xem xong nhớ thả tim chứ đừng xem chùa nha cả nhà thân yêu!",
        hashtags: ["#funnymoments", "#humor", "#cuoibebung"]
      },
      INSPIRATIONAL: {
        intro: "Hãy tin vào bản thân và hành trình của chính bạn. 🌟",
        body: "Mỗi bước đi nhỏ hôm nay đều góp phần xây dựng nên thành công lớn của ngày mai. Đừng bao giờ bỏ cuộc khi bạn vẫn còn mục tiêu để hướng tới.",
        hashtags: ["#inspiration", "#motivation", "#growth"]
      },
      URGENT: {
        intro: "🚨 THÔNG BÁO KHẨN CẤP — CHỈ CÒN HÔM NAY!",
        body: "Cơ hội có một không hai đang trôi qua rất nhanh. Hành động ngay lập tức để không phải hối tiếc. Click vào link dưới đây!",
        hashtags: ["#urgent", "#limitedtime", "#dontmissout"]
      },
      EDUCATIONAL: {
        intro: "💡 BẠN CÓ BIẾT?",
        body: "Dưới đây là một số kiến thức bổ ích giúp bạn tối ưu hóa công việc hàng ngày của mình. Lưu lại ngay để áp dụng nhé!",
        hashtags: ["#learning", "#knowledge", "#tipsandtricks"]
      },
      PROFESSIONAL: {
        intro: "Kính chào quý anh/chị và các đối tác. 💼",
        body: "Chúng tôi xin trân trọng giới thiệu giải pháp tối ưu giúp nâng cao hiệu quả vận hành doanh nghiệp. Mọi thắc mắc xin vui lòng gửi tin nhắn trực tiếp để nhận tư vấn chi tiết nhất.",
        hashtags: ["#business", "#professional", "#strategy"]
      }
    };

    const selectedTone = tonesMap[tone] || tonesMap.PROFESSIONAL;
    const finalCaption = `${selectedTone.intro}\n\n${baseText}\n\n${selectedTone.body}`;

    return {
      caption: finalCaption,
      suggestedHashtags: [...selectedTone.hashtags, `#${platform.toLowerCase()}`, "#publicast"],
      platformSpecificAdjustments: {
        facebook: `${finalCaption}\n\n👉 Chi tiết truy cập link sinh học!`,
        instagram: `${finalCaption}\n\n📸 Link in bio!`,
        tiktok: `${selectedTone.intro} 🔥 ${selectedTone.body.slice(0, 100)}`
      }
    };
  }
}

module.exports = MockAiProvider;
