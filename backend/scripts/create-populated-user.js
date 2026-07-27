const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function main() {
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const email = `publicast_test_${randomSuffix}@gmail.com`;
  const plainPassword = `Password123!`;
  const passwordHash = bcrypt.hashSync(plainPassword, 10);
  const userName = `Test User ${randomSuffix.toUpperCase()}`;

  console.log(`Creating user: ${email}...`);

  // 1. Create User
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: userName,
      role: 'OWNER',
      isActive: true,
      isEmailVerified: true,
      settings: { create: { language: 'vi', timezone: 'Asia/Ho_Chi_Minh' } },
      accounts: { create: [{ provider: 'LOCAL', passwordHash }] }
    }
  });

  // 2. Fetch PRO Plan
  const proPlan = await prisma.plan.findFirst({
    where: { name: 'PRO' }
  });

  if (!proPlan) {
    throw new Error('PRO plan not found in database. Please run npm run seed first.');
  }

  // 3. Create Subscription
  const subscription = await prisma.subscription.create({
    data: {
      planId: proPlan.id,
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  });

  // 4. Create Brand
  const brand = await prisma.brand.create({
    data: {
      name: `Brand ${userName}`,
      timezone: 'Asia/Ho_Chi_Minh',
      defaultLanguage: 'vi',
      ownerId: user.id,
      subscriptionId: subscription.id,
      isActive: true
    }
  });

  // 5. Create Team membership
  await prisma.team.create({
    data: {
      brandId: brand.id,
      userId: user.id,
      role: 'OWNER',
      invitedByUserId: user.id,
      status: 'ACTIVE',
      acceptedAt: new Date()
    }
  });

  // 6. Connect Social Accounts
  console.log('Connecting mock social accounts...');

  const socialYT = await prisma.socialAccount.create({
    data: {
      brandId: brand.id,
      platform: 'YOUTUBE',
      platformAccountId: `yt_channel_${randomSuffix}`,
      username: `@yt_channel_${randomSuffix}`,
      displayName: `YouTube channel ${randomSuffix.toUpperCase()}`,
      accessToken: 'yt_mock_token',
      scopes: 'youtube.readonly,youtube.upload',
      isConnected: true,
      connectedAt: new Date()
    }
  });

  await prisma.youTubeChannel.create({
    data: {
      socialAccountId: socialYT.id,
      channelId: `yt_channel_${randomSuffix}`,
      subscribersCount: 15400,
      totalVideosCount: 42,
      totalViewsCount: 120500
    }
  });

  const socialFB = await prisma.socialAccount.create({
    data: {
      brandId: brand.id,
      platform: 'FACEBOOK',
      platformAccountId: `fb_page_${randomSuffix}`,
      username: `fb_page_${randomSuffix}`,
      displayName: `Facebook Page ${randomSuffix.toUpperCase()}`,
      accessToken: 'fb_mock_token',
      scopes: 'pages_read_engagement,pages_manage_posts',
      isConnected: true,
      connectedAt: new Date()
    }
  });

  await prisma.facebookPage.create({
    data: {
      socialAccountId: socialFB.id,
      pageId: `fb_page_${randomSuffix}`,
      likesCount: 8200,
      followersCount: 8900,
      about: `Fanpage of Brand ${randomSuffix.toUpperCase()}`
    }
  });

  const socialTT = await prisma.socialAccount.create({
    data: {
      brandId: brand.id,
      platform: 'TIKTOK',
      platformAccountId: `tt_acc_${randomSuffix}`,
      username: `tt_acc_${randomSuffix}`,
      displayName: `TikTok Account ${randomSuffix.toUpperCase()}`,
      accessToken: 'tt_mock_token',
      scopes: 'tiktok.read,tiktok.write',
      isConnected: true,
      connectedAt: new Date()
    }
  });

  await prisma.tikTokAccount.create({
    data: {
      socialAccountId: socialTT.id,
      followersCount: 22400,
      likesCount: 654000,
      videoCount: 112
    }
  });

  const socialIG = await prisma.socialAccount.create({
    data: {
      brandId: brand.id,
      platform: 'INSTAGRAM',
      platformAccountId: `ig_acc_${randomSuffix}`,
      username: `ig_acc_${randomSuffix}`,
      displayName: `Instagram Account ${randomSuffix.toUpperCase()}`,
      accessToken: 'ig_mock_token',
      scopes: 'instagram.read,instagram.write',
      isConnected: true,
      connectedAt: new Date()
    }
  });

  await prisma.instagramAccount.create({
    data: {
      socialAccountId: socialIG.id,
      accountType: 'BUSINESS',
      followersCount: 5120,
      mediaCount: 78
    }
  });

  // 7. Seeding Historical Growth Data for Dashboard Chart
  console.log('Seeding historical growth data...');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const platforms = [
    { platform: 'YOUTUBE', account: socialYT, subField: 'subscribersCount', currentSub: 15400 },
    { platform: 'FACEBOOK', account: socialFB, subField: 'followersCount', currentSub: 8900 },
    { platform: 'TIKTOK', account: socialTT, subField: 'followersCount', currentSub: 22400 },
    { platform: 'INSTAGRAM', account: socialIG, subField: 'followersCount', currentSub: 5120 }
  ];

  for (const item of platforms) {
    let subTracker = item.currentSub;
    
    // Tạo data tăng trưởng trong 7 ngày
    const growthArray = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];

      const gained = Math.round(50 + Math.random() * 80);
      const lost = Math.round(5 + Math.random() * 15);
      growthArray.push({
        date: dateStr,
        subscribersGained: gained,
        subscribersLost: lost
      });
    }

    const demogData = {
      growth: growthArray
    };

    // Tạo record Analytics & SocialAnalytics
    const analyticsEntry = await prisma.analytics.create({
      data: {
        brandId: brand.id,
        socialAccountId: item.account.id,
        dateFrom: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000),
        dateTo: today,
        granularity: 'DAY',
        fetchedAt: new Date(),
        analyticsType: `${item.platform}_DETAILED`
      }
    });

    await prisma.socialAnalytics.create({
      data: {
        analyticsId: analyticsEntry.id,
        followersTotal: item.currentSub,
        followersGain: growthArray.reduce((sum, row) => sum + row.subscribersGained, 0),
        followersLost: growthArray.reduce((sum, row) => sum + row.subscribersLost, 0),
        impressions: item.currentSub * 3,
        reach: item.currentSub * 2,
        engagements: Math.round(item.currentSub * 0.1),
        likes: Math.round(item.currentSub * 0.08),
        comments: Math.round(item.currentSub * 0.015),
        shares: Math.round(item.currentSub * 0.005),
        saves: 0,
        clicks: Math.round(item.currentSub * 0.03),
        engagementRate: 10.0,
        audienceDemographicsJson: JSON.stringify(demogData)
      }
    });
  }

  // 8. Seeding Posts (DRAFT, SCHEDULED, PUBLISHED, FAILED)
  console.log('Seeding posts...');

  // Draft Post
  await prisma.post.create({
    data: {
      brandId: brand.id,
      createdByUserId: user.id,
      title: 'Bài viết Nháp - Ý tưởng tuần tới',
      caption: 'Tìm hiểu cách xây dựng hệ thống quy mô lớn bằng Node.js và RabbitMQ.',
      type: 'TEXT',
      status: 'DRAFT',
      targetPlatforms: 'FACEBOOK,INSTAGRAM',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    }
  });

  // Scheduled Post
  await prisma.post.create({
    data: {
      brandId: brand.id,
      createdByUserId: user.id,
      title: 'Chia sẻ kiến thức SOLID',
      caption: 'SOLID là gì? Làm thế nào áp dụng SOLID hiệu quả nhất trong lập trình JavaScript / ReactJS.',
      type: 'IMAGE',
      status: 'SCHEDULED',
      targetPlatforms: 'FACEBOOK,INSTAGRAM',
      scheduledAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    }
  });

  // Published Post
  await prisma.post.create({
    data: {
      brandId: brand.id,
      createdByUserId: user.id,
      title: 'Hệ thống tự động hóa PubliCast',
      caption: 'PubliCast giúp bạn quản lý tất cả kênh mạng xã hội tập trung, tiện lợi và tiết kiệm thời gian nhất.',
      type: 'VIDEO',
      status: 'PUBLISHED',
      targetPlatforms: 'YOUTUBE,FACEBOOK',
      publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      platformPostId: JSON.stringify({ YOUTUBE: `yt_vid_${randomSuffix}`, FACEBOOK: `fb_post_${randomSuffix}` }),
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    }
  });

  // Failed Post
  await prisma.post.create({
    data: {
      brandId: brand.id,
      createdByUserId: user.id,
      title: 'Đăng tải video TikTok Shorts',
      caption: 'Khoảnh khắc thú vị tại văn phòng làm việc PubliCast!',
      type: 'VIDEO',
      status: 'FAILED',
      targetPlatforms: 'TIKTOK',
      failureReason: 'Connection timeout. Please retry.',
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
    }
  });

  console.log('\n==============================================');
  console.log(`✅ Tạo tài khoản thành công!`);
  console.log(`📧 Email: ${email}`);
  console.log(`🔑 Mật khẩu: ${plainPassword}`);
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
