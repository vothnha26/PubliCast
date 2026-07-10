const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'publicast_test_266ou0@gmail.com';
  console.log(`[Seed] Finding user: ${email}...`);

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      brands: {
        include: {
          socialAccounts: true
        }
      }
    }
  });

  if (!user) {
    console.error(`[Error] User ${email} not found!`);
    process.exit(1);
  }

  const brand = user.brands[0];
  if (!brand) {
    console.error(`[Error] Brand not found for user ${email}!`);
    process.exit(1);
  }

  console.log(`[Seed] Found Brand: ${brand.name} (${brand.id})`);

  // Helper function to find or create social account
  async function upsertSocialAccount(platform, data, relationData) {
    const platformAccountId = data.platformAccountId;
    const existing = brand.socialAccounts.find(sa => sa.platform === platform && sa.platformAccountId === platformAccountId);
    
    let accountId;
    if (existing) {
      console.log(`[Seed] SocialAccount for ${platform} already exists. Updating...`);
      const updated = await prisma.socialAccount.update({
        where: { id: existing.id },
        data: {
          username: data.username,
          displayName: data.displayName,
          profilePictureUrl: data.profilePictureUrl || existing.profilePictureUrl,
          accessToken: data.accessToken,
          isConnected: true
        }
      });
      accountId = updated.id;
    } else {
      console.log(`[Seed] Creating new SocialAccount for ${platform}...`);
      const created = await prisma.socialAccount.create({
        data: {
          brandId: brand.id,
          platform,
          platformAccountId,
          username: data.username,
          displayName: data.displayName,
          profilePictureUrl: data.profilePictureUrl || '',
          accessToken: data.accessToken,
          scopes: data.scopes || '',
          isConnected: true,
          connectedAt: new Date()
        }
      });
      accountId = created.id;
    }

    // Now upsert the platform specific model
    const modelName = platform.toLowerCase();
    if (platform === 'YOUTUBE') {
      await prisma.youTubeChannel.upsert({
        where: { socialAccountId: accountId },
        create: { socialAccountId: accountId, ...relationData },
        update: relationData
      });
    } else if (platform === 'FACEBOOK') {
      await prisma.facebookPage.upsert({
        where: { socialAccountId: accountId },
        create: { socialAccountId: accountId, ...relationData },
        update: relationData
      });
    } else if (platform === 'TIKTOK') {
      await prisma.tikTokAccount.upsert({
        where: { socialAccountId: accountId },
        create: { socialAccountId: accountId, ...relationData },
        update: relationData
      });
    } else if (platform === 'INSTAGRAM') {
      await prisma.instagramAccount.upsert({
        where: { socialAccountId: accountId },
        create: { socialAccountId: accountId, ...relationData },
        update: relationData
      });
    } else if (platform === 'LINKEDIN') {
      await prisma.linkedInAccount.upsert({
        where: { socialAccountId: accountId },
        create: { socialAccountId: accountId, ...relationData },
        update: relationData
      });
    }

    return accountId;
  }

  // 1. YouTube Channel
  console.log('[Seed] Seeding YouTube Channel...');
  const ytAccountId = await upsertSocialAccount('YOUTUBE', {
    platformAccountId: 'yt_channel_266ou0',
    username: '@yt_channel_266ou0',
    displayName: 'YouTube channel 266OU0',
    accessToken: '90c2149d1ae071cf79cf9df8:0c432eb1d2cd8d4e1b54e6f8c9648540:1b2b1c960921af1776f02926e1',
    scopes: 'youtube.readonly,youtube.upload',
    profilePictureUrl: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=150&auto=format&fit=crop&q=60'
  }, {
    channelId: 'yt_channel_266ou0',
    customUrl: '@yt_channel_266ou0',
    uploadsPlaylistId: 'mock-uploads-playlist-id',
    subscribersCount: 15400,
    totalVideosCount: 42,
    totalViewsCount: 120500
  });

  // 2. Facebook Page
  console.log('[Seed] Seeding Facebook Page...');
  const fbAccountId = await upsertSocialAccount('FACEBOOK', {
    platformAccountId: 'fb_page_266ou0',
    username: 'fb_page_266ou0',
    displayName: 'Facebook Page 266OU0',
    accessToken: '75138ed680dc94ebfa5972cf:861758d464010f5b0e7e667cc6b88f9f:e89170ccd28d69d443dd6f7fe8',
    scopes: 'pages_read_engagement,pages_manage_posts',
    profilePictureUrl: 'https://images.unsplash.com/photo-1614680376593-902f74fa0d41?w=150&auto=format&fit=crop&q=60'
  }, {
    pageId: 'fb_page_266ou0',
    category: 'Social Page',
    likesCount: 8200,
    followersCount: 8900,
    about: 'Fanpage of Brand 266OU0',
    website: 'https://publicast.com',
    isPublished: true
  });

  // 3. TikTok Account
  console.log('[Seed] Seeding TikTok Account...');
  const ttAccountId = await upsertSocialAccount('TIKTOK', {
    platformAccountId: 'tt_acc_266ou0',
    username: 'tt_acc_266ou0',
    displayName: 'TikTok Account 266OU0',
    accessToken: 'tt_mock_token',
    scopes: 'tiktok.read,tiktok.write'
  }, {
    followersCount: 22400,
    followingCount: 120,
    likesCount: 654000,
    videoCount: 112,
    isVerified: false
  });

  // 4. Instagram Account
  console.log('[Seed] Seeding Instagram Account...');
  const igAccountId = await upsertSocialAccount('INSTAGRAM', {
    platformAccountId: 'ig_acc_266ou0',
    username: 'ig_acc_266ou0',
    displayName: 'Instagram Account 266OU0',
    accessToken: 'f6607fc7b8298fa88a1f49fb:0b2a6fc75781abe90067be8880246415:2860421ae644f279808b041bae',
    scopes: 'instagram.read,instagram.write'
  }, {
    accountType: 'BUSINESS',
    businessCategoryName: 'Creator',
    followersCount: 5120,
    followingCount: 350,
    mediaCount: 78,
    biography: 'Mock Instagram account of Brand 266OU0',
    website: 'https://publicast.com'
  });

  // 5. LinkedIn Account
  console.log('[Seed] Seeding LinkedIn Account...');
  const liAccountId = await upsertSocialAccount('LINKEDIN', {
    platformAccountId: 'li_acc_266ou0',
    username: 'li_acc_266ou0',
    displayName: 'LinkedIn Account 266OU0',
    accessToken: 'li_mock_token',
    scopes: 'w_member_social profile openid email'
  }, {
    accountType: 'PERSONAL',
    connectionsCount: 500,
    followersCount: 1200,
    industry: 'Technology',
    isPremiumRequired: false,
    supportsCarousels: true
  });

  // 6. Seeding Historical Growth Data for Dashboard Chart
  console.log('[Seed] Seeding analytics data for all platforms...');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targets = [
    { platform: 'YOUTUBE', accountId: ytAccountId, currentSub: 15400, type: 'YOUTUBE_DETAILED' },
    { platform: 'FACEBOOK', accountId: fbAccountId, currentSub: 8900, type: 'FACEBOOK_DETAILED' },
    { platform: 'TIKTOK', accountId: ttAccountId, currentSub: 22400, type: 'TIKTOK_DETAILED' },
    { platform: 'INSTAGRAM', accountId: igAccountId, currentSub: 5120, type: 'INSTAGRAM_DETAILED' },
    { platform: 'LINKEDIN', accountId: liAccountId, currentSub: 1200, type: 'LINKEDIN_DETAILED' }
  ];

  // Delete old Analytics records
  const accountIds = targets.map(t => t.accountId);
  await prisma.analytics.deleteMany({
    where: {
      socialAccountId: { in: accountIds }
    }
  });

  for (const item of targets) {
    console.log(`[Seed] Generating 30 days of growth for ${item.platform}...`);
    // Create 30 days of growth data
    const growthArray = [];
    let subTracker = item.currentSub - 600; // start 600 subs lower
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - (29 - i));
      const dateStr = d.toISOString().split('T')[0];

      const gained = Math.round(15 + Math.random() * 30);
      const lost = Math.round(1 + Math.random() * 5);
      subTracker += (gained - lost);

      growthArray.push({
        date: dateStr,
        subscribersGained: gained,
        subscribersLost: lost,
        views: Math.round(500 + Math.random() * 1500),
        reach: Math.round(400 + Math.random() * 1200),
        likes: Math.round(30 + Math.random() * 90),
        comments: Math.round(5 + Math.random() * 15),
        shares: Math.round(2 + Math.random() * 8),
        totalClicks: Math.round(10 + Math.random() * 30),
        totalContent: Math.random() > 0.85 ? 1 : 0
      });
    }

    const demogData = {
      growth: growthArray.map(g => ({
        date: g.date,
        subscribersGained: g.subscribersGained,
        subscribersLost: g.subscribersLost,
        views: g.views,
        reach: g.reach,
        likes: g.likes,
        comments: g.comments,
        shares: g.shares,
        totalClicks: g.totalClicks,
        totalContent: g.totalContent
      })),
      demographics: [
        ['18-24', 'female', 12.5],
        ['18-24', 'male', 28.3],
        ['25-34', 'female', 18.2],
        ['25-34', 'male', 41.0]
      ],
      trafficSource: [
        ['Search', 45, 360],
        ['Suggested', 30, 270],
        ['Direct', 15, 75],
        ['Browse', 10, 70]
      ],
      geographic: [
        ['VN', 70],
        ['US', 15],
        ['JP', 8],
        ['SG', 7]
      ]
    };

    const analyticsEntry = await prisma.analytics.create({
      data: {
        brandId: brand.id,
        socialAccountId: item.accountId,
        dateFrom: new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000),
        dateTo: today,
        granularity: 'DAY',
        fetchedAt: new Date(),
        analyticsType: item.type
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

  // 7. Seeding some published/failed posts for the user
  console.log('[Seed] Seeding sample posts for brand...');
  
  // Clear any mock posts first to prevent duplicates
  await prisma.post.deleteMany({
    where: {
      brandId: brand.id,
      title: { startsWith: '[Mock]' }
    }
  });

  // Draft Post
  await prisma.post.create({
    data: {
      brandId: brand.id,
      createdByUserId: user.id,
      title: '[Mock] Bài viết Nháp - Chiến dịch mùa hè',
      caption: 'Hãy sẵn sàng đón nhận những chương trình khuyến mãi bùng nổ nhất!',
      type: 'IMAGE',
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
      title: '[Mock] Lịch ra mắt tính năng AI mới',
      caption: 'PubliCast chuẩn bị tích hợp tính năng tự động tối ưu hóa hashtag bằng AI!',
      type: 'TEXT',
      status: 'SCHEDULED',
      targetPlatforms: 'FACEBOOK,LINKEDIN',
      scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    }
  });

  // Published Post
  const publishedPost = await prisma.post.create({
    data: {
      brandId: brand.id,
      createdByUserId: user.id,
      title: '[Mock] Giới thiệu giao diện Dashboard',
      caption: 'Theo dõi trực quan và chi tiết hiệu quả các kênh truyền thông của bạn.',
      type: 'VIDEO',
      status: 'PUBLISHED',
      targetPlatforms: 'YOUTUBE,FACEBOOK,INSTAGRAM,LINKEDIN,TIKTOK',
      publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      platformPostId: JSON.stringify({
        YOUTUBE: 'yt_vid_266ou0',
        FACEBOOK: 'fb_post_266ou0',
        INSTAGRAM: 'ig_post_266ou0',
        LINKEDIN: 'li_post_266ou0',
        TIKTOK: 'tt_vid_266ou0'
      }),
      createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
    }
  });

  // Post Metric History for the published post
  console.log('[Seed] Seeding PostMetricHistory snapshot records...');
  await prisma.postMetricHistory.deleteMany({
    where: { postId: publishedPost.id }
  });

  const historyPlatforms = ['YOUTUBE', 'FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'TIKTOK'];
  for (const plat of historyPlatforms) {
    await prisma.postMetricHistory.create({
      data: {
        brandId: brand.id,
        postId: publishedPost.id,
        platform: plat,
        platformPostId: `mock_${plat.toLowerCase()}_post_id`,
        views: Math.round(1200 + Math.random() * 800),
        likes: Math.round(80 + Math.random() * 50),
        comments: Math.round(15 + Math.random() * 10),
        shares: Math.round(5 + Math.random() * 5),
        saves: plat === 'INSTAGRAM' ? 8 : 0
      }
    });
  }

  // Failed Post
  await prisma.post.create({
    data: {
      brandId: brand.id,
      createdByUserId: user.id,
      title: '[Mock] Quảng bá sản phẩm mới',
      caption: 'Thiết kế tinh tế mang lại trải nghiệm tối ưu nhất.',
      type: 'VIDEO',
      status: 'FAILED',
      targetPlatforms: 'TIKTOK',
      failureReason: 'Mock Upload API simulated error',
      createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
    }
  });

  console.log('\n==============================================');
  console.log(`✅ Seeded mock database successfully for:`);
  console.log(`📧 User: ${email}`);
  console.log(`💼 Brand ID: ${brand.id}`);
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
