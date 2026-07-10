const logger = require('../../../utils/logger');

class HashtagAnalysisGenerator {
  /**
   * Sinh dữ liệu phân tích chi tiết giả lập nhưng có cấu trúc và logic chặt chẽ cho một hashtag.
   * Dữ liệu sinh ra nhất quán theo tên hashtag và platform.
   * @param {string} hashtag 
   * @param {string} platform 
   * @returns {Object} Dữ liệu phân tích chi tiết
   */
  generate(hashtag, platform) {
    const cleanTag = hashtag.replace('#', '');
    
    // Tạo seed đơn giản dựa trên chuỗi hashtag để dữ liệu có tính nhất quán tương đối giữa các lần gọi
    let seed = 0;
    for (let i = 0; i < cleanTag.length; i++) {
      seed += cleanTag.charCodeAt(i);
    }

    const pseudoRandom = (min, max, offset = 0) => {
      const x = Math.sin(seed + offset) * 10000;
      const r = x - Math.floor(x);
      return Math.floor(r * (max - min + 1)) + min;
    };

    // 1. Chỉ số tổng quan
    const totalPosts = pseudoRandom(15000, 85000, 1);
    const participants = Math.floor(totalPosts * (pseudoRandom(15, 30, 2) / 100));
    const pictures = Math.floor(totalPosts * (pseudoRandom(25, 45, 3) / 100));
    const impressions = totalPosts * pseudoRandom(8000, 15000, 4);

    const postsPerHour = parseFloat((totalPosts / 24).toFixed(2));
    const picturesPerHour = parseFloat((pictures / 24).toFixed(2));
    const impressionsPerHour = Math.floor(impressions / 24);
    const postsPerParticipant = parseFloat((totalPosts / participants).toFixed(2));
    const picturesPerParticipant = parseFloat((pictures / participants).toFixed(2));
    const impressionsPerParticipant = Math.floor(impressions / participants);

    // 2. Evolution (24 giờ)
    const evolution = [];
    const hours = [
      '5:00 AM', '8:00 AM', '11:00 AM', '2:00 PM', '5:00 PM', '8:00 PM', '11:00 PM', '2:00 AM'
    ];
    hours.forEach((time, index) => {
      const factor = pseudoRandom(5, 20, index + 10) / 10;
      evolution.push({
        time,
        posts: Math.floor(postsPerHour * factor),
        participants: Math.floor((participants / 24) * factor),
        pictures: Math.floor(picturesPerHour * factor),
        impressions: Math.floor(impressionsPerHour * factor)
      });
    });

    // 3. Distributions
    const languages = [
      { name: 'English', value: pseudoRandom(65, 80, 5) },
      { name: 'Spanish', value: pseudoRandom(8, 15, 6) },
      { name: 'French', value: pseudoRandom(3, 7, 7) },
      { name: 'Italian', value: pseudoRandom(2, 4, 8) },
      { name: 'German', value: pseudoRandom(1, 3, 9) },
      { name: 'Undefined', value: pseudoRandom(1, 4, 10) }
    ];
    // Chuẩn hóa tổng = 100%
    const totalLang = languages.reduce((acc, curr) => acc + curr.value, 0);
    languages.forEach(l => l.value = parseFloat(((l.value / totalLang) * 100).toFixed(1)));

    const sources = [
      { name: 'iPhone', value: pseudoRandom(45, 55, 11) },
      { name: 'Android', value: pseudoRandom(20, 30, 12) },
      { name: 'Web Client', value: pseudoRandom(10, 18, 13) },
      { name: 'Sprout Social', value: pseudoRandom(3, 6, 14) },
      { name: 'HubSpot', value: pseudoRandom(2, 5, 15) },
      { name: 'Instagram', value: pseudoRandom(1, 3, 16) }
    ];
    const totalSrc = sources.reduce((acc, curr) => acc + curr.value, 0);
    sources.forEach(s => s.value = parseFloat(((s.value / totalSrc) * 100).toFixed(1)));

    const types = [
      { name: 'Images', value: pseudoRandom(40, 50, 17) },
      { name: 'Videos', value: pseudoRandom(25, 35, 18) },
      { name: 'Text', value: pseudoRandom(15, 25, 19) }
    ];
    const totalType = types.reduce((acc, curr) => acc + curr.value, 0);
    types.forEach(t => t.value = parseFloat(((t.value / totalType) * 100).toFixed(1)));

    // 4. Countries
    const countries = [
      { countryCode: 'US', countryName: 'United States', participants: Math.floor(participants * 0.54), percent: 54.51 },
      { countryCode: 'GB', countryName: 'United Kingdom', participants: Math.floor(participants * 0.087), percent: 8.72 },
      { countryCode: 'CA', countryName: 'Canada', participants: Math.floor(participants * 0.06), percent: 6.08 },
      { countryCode: 'AU', countryName: 'Australia', participants: Math.floor(participants * 0.041), percent: 4.10 },
      { countryCode: 'IN', countryName: 'India', participants: Math.floor(participants * 0.027), percent: 2.79 },
      { countryCode: 'ZA', countryName: 'South Africa', participants: Math.floor(participants * 0.019), percent: 1.90 },
      { countryCode: 'IE', countryName: 'Ireland', participants: Math.floor(participants * 0.019), percent: 1.90 },
      { countryCode: 'FR', countryName: 'France', participants: Math.floor(participants * 0.017), percent: 1.73 }
    ];

    // 5. Used Tags (Word Cloud)
    const usedTags = [
      { text: cleanTag, value: 100 },
      { text: 'marketing', value: pseudoRandom(45, 60, 20) },
      { text: 'socialmedia', value: pseudoRandom(35, 50, 21) },
      { text: 'startups', value: pseudoRandom(30, 45, 22) },
      { text: 'seo', value: pseudoRandom(25, 40, 23) },
      { text: 'contentmarketing', value: pseudoRandom(20, 35, 24) },
      { text: 'sales', value: pseudoRandom(18, 30, 25) },
      { text: 'tech', value: pseudoRandom(15, 28, 26) },
      { text: 'business', value: pseudoRandom(15, 25, 27) },
      { text: 'growthhacking', value: pseudoRandom(10, 20, 28) },
      { text: 'networking', value: pseudoRandom(8, 18, 29) },
      { text: 'strategy', value: pseudoRandom(8, 15, 30) }
    ];

    // 6. Top Pictures Grid (25 items)
    // Các ảnh Unsplash thật chất lượng cao để hiển thị lung linh
    const mockImageUrls = [
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=300&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1531403009284-440f080d1e12?q=80&w=300&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=300&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=300&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=300&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=300&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1507537297725-24a1c029d3ca?q=80&w=300&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=300&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=300&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=300&auto=format&fit=crop'
    ];

    const topPictures = [];
    for (let i = 1; i <= 25; i++) {
      const imgIdx = (seed + i) % mockImageUrls.length;
      topPictures.push({
        id: i,
        url: mockImageUrls[imgIdx],
        impressions: pseudoRandom(10000, 5000000, i * 2),
        likes: pseudoRandom(500, 15000, i * 3),
        reposts: pseudoRandom(50, 2000, i * 4),
        followers: pseudoRandom(1000, 100000, i * 5)
      });
    }

    // 7. Top Participants (100 items)
    const firstNames = ['John', 'Sarah', 'Alex', 'Emily', 'David', 'Jessica', 'Michael', 'Sophia', 'Chris', 'Amanda'];
    const lastNames = ['Hub', 'Tech', 'Growth', 'Social', 'Creator', 'Media', 'Expert', 'Marketing', 'Biz', 'Strategy'];
    const topParticipants = [];
    for (let i = 1; i <= 100; i++) {
      const fName = firstNames[(seed + i) % firstNames.length];
      const lName = lastNames[(seed + i * 7) % lastNames.length];
      const screenName = `@${fName.toLowerCase()}${lName.toLowerCase()}`;
      const name = `${fName} ${lName}`;
      
      topParticipants.push({
        rank: i,
        name,
        screenName,
        followers: pseudoRandom(1000, 1500000, i * 2),
        posts: pseudoRandom(5, 500, i * 3),
        pictures: pseudoRandom(2, 200, i * 4),
        impressions: pseudoRandom(5000, 20000000, i * 5),
        interactions: pseudoRandom(100, 80000, i * 6),
        likes: pseudoRandom(50, 50000, i * 7),
        reposts: pseudoRandom(10, 15000, i * 8),
        mentions: pseudoRandom(5, 10000, i * 9)
      });
    }

    // 8. Top Posts (100 items)
    const captions = [
      `Sự phát triển vượt bậc của công nghệ số trong kỷ nguyên mới. Hãy đón nhận nó! #${cleanTag}`,
      `Làm sao để tối ưu hóa chiến dịch Marketing hiệu quả với ngân sách nhỏ? Hãy xem ngay bài viết. #${cleanTag}`,
      `Bí quyết thành công của các startup kỳ lân thế giới nằm ở đâu? #${cleanTag}`,
      `Thiết kế trải nghiệm người dùng tuyệt hảo chính là chìa khóa giữ chân khách hàng. #${cleanTag}`,
      `Hành trình khám phá xu hướng mới nhất tại sự kiện #${cleanTag} năm nay!`,
      `Một góc nhìn hoàn toàn mới về cách vận hành doanh nghiệp thời đại 4.0. #${cleanTag}`
    ];
    const topPosts = [];
    for (let i = 1; i <= 100; i++) {
      const authorIdx = (seed + i) % topParticipants.length;
      const author = topParticipants[authorIdx];
      const capIdx = (seed + i * 3) % captions.length;
      
      const likes = pseudoRandom(10, 15000, i * 2);
      const reposts = pseudoRandom(2, 5000, i * 3);
      const replies = pseudoRandom(1, 3000, i * 4);
      const impressions = pseudoRandom(1000, 800000, i * 5);
      
      // Engagement Rate
      const engagement = parseFloat(((likes + reposts + replies) / Math.max(impressions, 1) * 100).toFixed(2));

      topPosts.push({
        rank: i,
        date: `Jul ${10 - Math.floor(i / 10)}, 2026 ${pseudoRandom(1, 12, i)}:${pseudoRandom(10, 59, i)} PM`,
        authorName: author.name,
        authorHandle: author.screenName,
        caption: captions[capIdx],
        impressions,
        followers: author.followers,
        likes,
        reposts,
        replies,
        engagement
      });
    }

    return {
      summary: {
        posts: totalPosts,
        participants,
        pictures,
        impressions,
        averages: {
          postsPerHour,
          picturesPerHour,
          impressionsPerHour,
          postsPerParticipant,
          picturesPerParticipant,
          impressionsPerParticipant
        }
      },
      evolution,
      distributions: {
        languages,
        sources,
        types
      },
      countries,
      usedTags,
      topPictures,
      topParticipants,
      topPosts
    };
  }
}

module.exports = new HashtagAnalysisGenerator();
