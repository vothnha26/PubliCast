const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'publicast_test_266ou0@gmail.com';
  console.log(`Finding user with email: ${email}...`);

  const user = await prisma.user.findUnique({
    where: { email },
    include: { brands: true }
  });

  if (!user) {
    console.error(`User with email ${email} not found. Please create it first.`);
    process.exit(1);
  }

  const brand = user.brands[0];
  if (!brand) {
    console.error(`No brand found for user ${email}.`);
    process.exit(1);
  }

  console.log(`Found brand: "${brand.name}" (ID: ${brand.id}).`);
  console.log('Cleaning up existing posts for this brand to start fresh...');
  await prisma.post.deleteMany({
    where: { brandId: brand.id }
  });

  // Mock post metadata lists for generation
  const postCategories = [
    {
      title: 'Giới thiệu sản phẩm mới',
      caption: '🚀 Hôm nay chúng tôi xin trân trọng giới thiệu dòng sản phẩm mới nhất của PubliCast! Độc đáo, hiệu năng vượt trội và đặc biệt hướng tới trải nghiệm người dùng tối ưu. Link đăng ký thử nghiệm miễn phí có ở phần bio hoặc bình luận phía dưới! #newrelease #product #innovation',
      type: 'IMAGE',
      media: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80'
    },
    {
      title: 'Bí quyết tăng trưởng kênh mạng xã hội',
      caption: '📈 Bạn đang đau đầu vì lượng tương tác sụt giảm? Đừng bỏ qua 5 nguyên tắc vàng này:\n1. Nhất quán trong khung giờ đăng bài.\n2. Tập trung vào nội dung Short-form Video.\n3. Phản hồi comment trong 15 phút đầu tiên.\n4. Sử dụng SmartLinks tối ưu bio.\n5. Đo lường chỉ số hàng tuần bằng PubliCast Analytics.\n#socialmedia #marketingtips #growthhacking',
      type: 'CAROUSEL',
      media: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=600&auto=format&fit=crop&q=80|https://images.unsplash.com/photo-1434626881859-194d67b2b86f?w=600&auto=format&fit=crop&q=80'
    },
    {
      title: 'Chia sẻ kiến thức SOLID và Design Pattern',
      caption: '💻 Code sạch không chỉ là code chạy được, đó còn là nghệ thuật tổ chức hệ thống để dễ bảo trì và mở rộng. Tại PubliCast, chúng tôi luôn ưu tiên áp dụng SOLID & Strategy Pattern để tích hợp đa nền tảng một cách mượt mà nhất. #solid #designpatterns #cleancode #softwareengineering',
      type: 'TEXT',
      media: null
    },
    {
      title: 'Vlog Hậu trường làm việc tại văn phòng',
      caption: '🎬 Một ngày làm việc sôi động và ngập tràn tiếng cười của đội ngũ kỹ sư và thiết kế tại PubliCast. Chúng tôi không chỉ xây dựng công cụ, chúng tôi kiến tạo giải pháp! Xem ngay để khám phá nét văn hoá doanh nghiệp độc đáo của chúng tôi. #vlog #officelife #behindthescenes #startup',
      type: 'VIDEO',
      media: 'https://www.w3schools.com/html/mov_bbb.mp4'
    },
    {
      title: 'Thông báo Chương trình khuyến mãi hè',
      caption: '🔥 DEAL HOT CHÀO HÈ! Giảm ngay 30% cho tất cả các gói nâng cấp PRO và AGENCY khi thanh toán qua VietQR trong tuần này. Cơ hội vàng để sở hữu tính năng Tự động hóa lên lịch và Inbox hợp nhất. Đừng bỏ lỡ! #sale #summerdeal #voucher',
      type: 'IMAGE',
      media: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80'
    },
    {
      title: 'Mini game đoán chữ nhận quà',
      caption: '🎁 MINI GAME CUỐI TUẦN: Hãy đoán xem tính năng ẩn nào tiếp theo sẽ được PubliCast ra mắt vào tháng 8? \n💡 Gợi ý: Gồm 6 chữ cái, liên quan đến trí tuệ nhân tạo.\n3 người đoán đúng và nhanh nhất sẽ được tặng ngay 1 tháng trải nghiệm gói PRO miễn phí! #minigame #giveaway #ai',
      type: 'IMAGE',
      media: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80'
    },
    {
      title: 'Infographic: Xu hướng Social Media 2026',
      caption: '📊 Tổng hợp những xu hướng truyền thông mạng xã hội dẫn đầu năm 2026. Sự lên ngôi của nội dung tương tác, trợ lý AI thông minh cá nhân hóa, và việc tối ưu SEO trên các nền tảng video ngắn như TikTok/Reels. Lưu lại ngay để lên chiến lược cho thương hiệu của bạn! #trends2026 #infographic #socialtrends',
      type: 'CAROUSEL',
      media: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80'
    }
  ];

  const platformsList = [
    'FACEBOOK',
    'INSTAGRAM',
    'YOUTUBE',
    'TIKTOK',
    'FACEBOOK,INSTAGRAM',
    'YOUTUBE,TIKTOK',
    'FACEBOOK,INSTAGRAM,TIKTOK'
  ];

  const today = new Date();
  let count = 0;

  // Generate posts spread across -15 days to +25 days
  for (let offset = -15; offset <= 25; offset++) {
    // Determine number of posts for this day (between 0 and 2 posts, some days have more to look dense)
    let numPosts = 1;
    if (Math.abs(offset) % 3 === 0) numPosts = 2;
    if (offset === 0) numPosts = 3; // make today busy!
    if (Math.abs(offset) % 5 === 0 && offset !== 0) numPosts = 0; // rest days

    for (let pIdx = 0; pIdx < numPosts; pIdx++) {
      const scheduledTime = new Date(today);
      scheduledTime.setDate(today.getDate() + offset);
      // set random hours: 9AM, 11AM, 2PM, 5PM, 8PM
      const hours = [9, 11, 14, 17, 20];
      const selectedHour = hours[(offset + pIdx + 15) % hours.length];
      scheduledTime.setHours(selectedHour, 0, 0, 0);

      // Determine status based on relation to "today"
      let status = 'SCHEDULED';
      let publishedAt = null;
      let failureReason = null;

      if (offset < 0) {
        // Past posts: mostly published, a few failed or draft
        const rand = Math.random();
        if (rand < 0.85) {
          status = 'PUBLISHED';
          publishedAt = scheduledTime;
        } else if (rand < 0.95) {
          status = 'FAILED';
          failureReason = 'API Connection timed out due to social provider downtime.';
        } else {
          status = 'DRAFT';
        }
      } else if (offset === 0) {
        // Today: some published (earlier hours), some scheduled (later hours), some drafts
        if (selectedHour < today.getHours()) {
          status = 'PUBLISHED';
          publishedAt = scheduledTime;
        } else {
          status = Math.random() > 0.3 ? 'SCHEDULED' : 'DRAFT';
        }
      } else {
        // Future posts: scheduled, pending approval, or draft
        const rand = Math.random();
        if (rand < 0.7) {
          status = 'SCHEDULED';
        } else if (rand < 0.85) {
          status = 'PENDING_APPROVAL';
        } else {
          status = 'DRAFT';
        }
      }

      // Pick random category metadata
      const cat = postCategories[(offset + pIdx + 15) % postCategories.length];
      const targetPlatforms = platformsList[(offset + pIdx + 15) % platformsList.length];

      await prisma.post.create({
        data: {
          brandId: brand.id,
          createdByUserId: user.id,
          title: `${cat.title} [Day ${offset > 0 ? '+' : ''}${offset}]`,
          caption: cat.caption,
          type: cat.type,
          status: status,
          targetPlatforms: targetPlatforms,
          mediaUrls: cat.media,
          scheduledAt: status !== 'DRAFT' ? scheduledTime : null,
          publishedAt: publishedAt,
          failureReason: failureReason,
          createdAt: new Date(scheduledTime.getTime() - 2 * 24 * 60 * 60 * 1000)
        }
      });
      count++;
    }
  }

  console.log(`\n==============================================`);
  console.log(`✅ Thành công! Đã tạo ${count} bài viết mẫu.`);
  console.log(`📅 Trải đều lịch từ ngày ${new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000).toLocaleDateString('vi-VN')} đến ${new Date(today.getTime() + 25 * 24 * 60 * 60 * 1000).toLocaleDateString('vi-VN')}.`);
  console.log(`👤 Tài khoản: ${email}`);
  console.log('==============================================\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
