const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing data...');
  // Tắt kiểm tra khóa ngoại để truncate toàn bộ các bảng sạch sẽ
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');

  const tables = [
    'audit_logs',
    'custom_role_permissions',
    'custom_roles',
    'teams',
    'ad_analytics',
    'social_analytics',
    'analytics',
    'ad_accounts',
    'tracked_videos',
    'youtube_channels',
    'instagram_accounts',
    'facebook_pages',
    'tiktok_accounts',
    'telegram_accounts',
    'social_accounts',
    'pending_payments',
    'subscription_addons',
    'addons',
    'invoices',
    'ticket_messages',
    'support_tickets',
    'inbox_items',
    'unified_inboxes',
    'facebook_story_metrics',
    'facebook_post_metrics',
    'facebook_overview_metrics',
    'competitor_analysis',
    'link_item_daily_metrics',
    'smart_link_daily_metrics',
    'link_items',
    'smart_links',
    'hashtag_sets',
    'hashtag_trackers',
    'ai_assistants',
    'media_library',
    'media_folders',
    'approval_workflows',
    'workflow_reviewers',
    'posts',
    'livestreams',
    'content_calendars',
    'best_time_slots',
    'auto_lists',
    'brands',
    'subscriptions',
    'user_settings',
    'user_accounts',
    'users',
    'plans',
    'platforms',
    'modules',
    'products',
    'plan_limits',
    'system_permissions',
    'platform_limits',
    'system_notifications',
    'notification_read_receipts'
  ];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${table}\`;`);
    } catch (e) {
      console.warn(`Truncate Table \`${table}\` failed, trying deleteMany. Error: ${e.message}`);
    }
  }

  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');
  console.log('Database cleared.');

  console.log('Seeding PlanLimits...');
  const freeLimit = await prisma.planLimit.create({
    data: {
      maxBrands: 1,
      maxSocialProfiles: 2,
      maxPostsPerMonth: 10,
      maxLivePlatforms: 1,
      maxStreamQuality: 'SD',
      maxTeamSeats: 1,
      allowCustomRoles: false,
      allowApprovalWorkflow: false
    }
  });

  const starterLimit = await prisma.planLimit.create({
    data: {
      maxBrands: 3,
      maxSocialProfiles: 5,
      maxPostsPerMonth: 50,
      maxLivePlatforms: 2,
      maxStreamQuality: 'HD_720P',
      maxTeamSeats: 3,
      allowCustomRoles: true,
      allowApprovalWorkflow: false
    }
  });

  const proLimit = await prisma.planLimit.create({
    data: {
      maxBrands: 10,
      maxSocialProfiles: 20,
      maxPostsPerMonth: 300,
      maxLivePlatforms: 5,
      maxStreamQuality: 'FHD_1080P',
      maxTeamSeats: 10,
      allowCustomRoles: true,
      allowApprovalWorkflow: true
    }
  });

  const agencyLimit = await prisma.planLimit.create({
    data: {
      maxBrands: 50,
      maxSocialProfiles: 100,
      maxPostsPerMonth: 2000,
      maxLivePlatforms: 10,
      maxStreamQuality: 'UHD_4K',
      maxTeamSeats: 50,
      allowCustomRoles: true,
      allowApprovalWorkflow: true
    }
  });

  console.log('Seeding Platforms...');
  await prisma.platform.create({ data: { id: 'YT', name: 'YouTube', color: '#FF0000' } });
  await prisma.platform.create({ data: { id: 'FB', name: 'Facebook', color: '#1877F2' } });
  await prisma.platform.create({ data: { id: 'IG', name: 'Instagram', color: '#E1306C' } });
  await prisma.platform.create({ data: { id: 'TK', name: 'TikTok', color: '#000000' } });
  await prisma.platform.create({ data: { id: 'X', name: 'X (Twitter)', color: '#000000' } });

  console.log('Seeding Modules...');
  await prisma.module.create({ data: { id: 'M1', name: 'Analytics', description: 'Channel statistics, metrics and growth tracking.' } });
  await prisma.module.create({ data: { id: 'M2', name: 'Automation', description: 'Auto-posting, scheduling and queue management.' } });
  await prisma.module.create({ data: { id: 'M3', name: 'Engagement', description: 'Inbox management, comments and direct messages.' } });
  await prisma.module.create({ data: { id: 'M4', name: 'Competitors', description: 'Tracking and benchmarking against rival channels.' } });

  console.log('Seeding Products...');
  await prisma.product.create({ data: { id: 'youtube_analytics', name: 'YouTube Analytics', category: 'Platforms', platformId: 'YT', moduleId: 'M1', sku: 'PL-YT-AN', status: 'ACTIVE' } });
  await prisma.product.create({ data: { id: 'facebook_management', name: 'Facebook Management', category: 'Platforms', platformId: 'FB', moduleId: 'M2', sku: 'PL-FB-AM', status: 'ACTIVE' } });
  await prisma.product.create({ data: { id: 'tiktok_creative', name: 'TikTok Creative Suite', category: 'Platforms', platformId: 'TK', moduleId: 'M2', sku: 'PL-TK-CR', status: 'ACTIVE' } });
  await prisma.product.create({ data: { id: 'instagram_insights', name: 'Instagram Insights', category: 'Platforms', platformId: 'IG', moduleId: 'M1', sku: 'PL-IG-IN', status: 'ACTIVE' } });
  await prisma.product.create({ data: { id: 'ai_content_engine', name: 'AI Content Engine', category: 'AI Tools', sku: 'AI-CONTENT-ENGINE', status: 'ACTIVE' } });
  await prisma.product.create({ data: { id: 'ai_best_time', name: 'AI Best Time Suggest', category: 'AI Tools', sku: 'AI-BEST-TIME', status: 'ACTIVE' } });
  await prisma.product.create({ data: { id: 'ads_manager', name: 'Ads Manager Pro', category: 'Management', sku: 'ADS-MANAGER', status: 'ACTIVE' } });
  await prisma.product.create({ data: { id: 'unified_inbox', name: 'Unified Inbox', category: 'Management', platformId: 'FB', moduleId: 'M3', sku: 'PL-FB-EN', status: 'ACTIVE' } });
  await prisma.product.create({ data: { id: 'custom_links', name: 'Custom Branded Links', category: 'Tools', sku: 'CUSTOM-LINKS', status: 'ACTIVE' } });
  await prisma.product.create({ data: { id: 'google_drive', name: 'Google Drive Integration', category: 'Tools', sku: 'GOOGLE-DRIVE', status: 'ACTIVE' } });

  console.log('Seeding Plans...');
  const freePlan = await prisma.plan.create({
    data: {
      name: 'FREE',
      priceAmount: 0,
      currency: 'VND',
      billingCycle: 'MONTHLY',
      description: 'Free Plan for beginners',
      planLimitId: freeLimit.id,
      isActive: true,
      products: { connect: [{ id: 'youtube_analytics' }, { id: 'facebook_management' }] }
    }
  });

  const starterPlan = await prisma.plan.create({
    data: {
      name: 'STARTER',
      priceAmount: 2000,
      currency: 'VND',
      billingCycle: 'MONTHLY',
      description: 'Starter Plan for growing creators',
      planLimitId: starterLimit.id,
      isActive: true,
      products: {
        connect: [
          { id: 'youtube_analytics' },
          { id: 'facebook_management' },
          { id: 'instagram_insights' }
        ]
      }
    }
  });

  const proPlan = await prisma.plan.create({
    data: {
      name: 'PRO',
      priceAmount: 3000,
      currency: 'VND',
      billingCycle: 'MONTHLY',
      description: 'Professional Plan for marketers',
      planLimitId: proLimit.id,
      isActive: true,
      products: {
        connect: [
          { id: 'youtube_analytics' },
          { id: 'facebook_management' },
          { id: 'tiktok_creative' },
          { id: 'instagram_insights' },
          { id: 'ai_content_engine' },
          { id: 'ai_best_time' },
          { id: 'unified_inbox' },
          { id: 'custom_links' },
          { id: 'google_drive' }
        ]
      }
    }
  });

  const agencyPlan = await prisma.plan.create({
    data: {
      name: 'AGENCY',
      priceAmount: 5000,
      currency: 'VND',
      billingCycle: 'MONTHLY',
      description: 'Agency Plan for large teams',
      planLimitId: agencyLimit.id,
      isActive: true,
      products: {
        connect: [
          { id: 'youtube_analytics' },
          { id: 'facebook_management' },
          { id: 'tiktok_creative' },
          { id: 'instagram_insights' },
          { id: 'ai_content_engine' },
          { id: 'ai_best_time' },
          { id: 'ads_manager' },
          { id: 'unified_inbox' },
          { id: 'custom_links' },
          { id: 'google_drive' }
        ]
      }
    }
  });

  console.log('Seeding SystemPermissions...');
  const { seedSystemPermissions } = require('../src/config/seeder');
  await seedSystemPermissions();

  // Platform Limits
  console.log('Seeding PlatformLimits...');
  const platformLimits = [
    { platform: 'YOUTUBE', subType: 'VIDEO', maxCaptionLength: 5000, maxFileSizeMb: 1024, allowedMediaTypes: 'VIDEO', allowedFormats: 'mp4,mov', minVideoDuration: null, maxVideoDuration: null, aspectRatios: '16:9' },
    { platform: 'YOUTUBE', subType: 'SHORTS', maxCaptionLength: 100, maxFileSizeMb: 100, allowedMediaTypes: 'VIDEO', allowedFormats: 'mp4,mov', minVideoDuration: 1, maxVideoDuration: 60, aspectRatios: '9:16' },
    { platform: 'FACEBOOK', subType: 'POST', maxCaptionLength: 63206, maxFileSizeMb: 100, allowedMediaTypes: 'ALL', allowedFormats: 'mp4,mov,png,jpg,jpeg', minVideoDuration: null, maxVideoDuration: null, aspectRatios: null },
    { platform: 'FACEBOOK', subType: 'REEL', maxCaptionLength: 2000, maxFileSizeMb: 100, allowedMediaTypes: 'VIDEO', allowedFormats: 'mp4,mov', minVideoDuration: 3, maxVideoDuration: 90, aspectRatios: '9:16' },
    { platform: 'FACEBOOK', subType: 'STORY', maxCaptionLength: 2200, maxFileSizeMb: 50, allowedMediaTypes: 'ALL', allowedFormats: 'mp4,mov,png,jpg,jpeg', minVideoDuration: 1, maxVideoDuration: 15, aspectRatios: '9:16' },
    { platform: 'TIKTOK', subType: 'VIDEO', maxCaptionLength: 2200, maxFileSizeMb: 100, allowedMediaTypes: 'VIDEO', allowedFormats: 'mp4,mov,webm', minVideoDuration: 3, maxVideoDuration: 600, aspectRatios: '9:16' },
    { platform: 'INSTAGRAM', subType: 'POST', maxCaptionLength: 2200, maxFileSizeMb: 100, allowedMediaTypes: 'ALL', allowedFormats: 'mp4,mov,png,jpg,jpeg', minVideoDuration: 3, maxVideoDuration: 60, aspectRatios: '1:1,4:5' },
    { platform: 'INSTAGRAM', subType: 'REEL', maxCaptionLength: 2200, maxFileSizeMb: 100, allowedMediaTypes: 'VIDEO', allowedFormats: 'mp4,mov', minVideoDuration: 3, maxVideoDuration: 90, aspectRatios: '9:16' },
    { platform: 'INSTAGRAM', subType: 'STORY', maxCaptionLength: 2200, maxFileSizeMb: 50, allowedMediaTypes: 'ALL', allowedFormats: 'mp4,mov,png,jpg,jpeg', minVideoDuration: 1, maxVideoDuration: 15, aspectRatios: '9:16' },
    { platform: 'TELEGRAM', subType: 'POST', maxCaptionLength: 1024, maxFileSizeMb: 50, allowedMediaTypes: 'ALL', allowedFormats: 'mp4,mov,png,jpg,jpeg', minVideoDuration: null, maxVideoDuration: null, aspectRatios: null }
  ];

  for (const limit of platformLimits) {
    await prisma.platformLimit.upsert({
      where: {
        platform_subType: {
          platform: limit.platform,
          subType: limit.subType
        }
      },
      update: limit,
      create: limit
    });
  }

  console.log('Seeding test users for CI/tests...');
  const bcrypt = require('bcryptjs');

  // Create deterministic test users matching Selenium/test credentials
  const adminEmail = process.env.ADMIN_EMAIL || 'ci-admin@publicast.test';
  const adminPassword = process.env.ADMIN_PASSWORD || 'nhacc123@';
  const adminHash = await bcrypt.hash(adminPassword, 10);

  const memberEmail = process.env.MEMBER_EMAIL || 'ci-admin@publicast.test';
  const memberPassword = process.env.MEMBER_PASSWORD || 'nhacc123@';
  const memberHash = await bcrypt.hash(memberPassword, 10);

  // Upsert admin user (passwordHash stored on User model directly)
  // NOTE: role is OWNER, not ADMIN — 'ADMIN' is the platform super-admin role
  // and redirects to /admin/revenue, which breaks the Selenium brand/workspace flows
  // that expect /dashboard, /start, or /manage/connections after login.
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: adminHash,
      isActive: true,
      isEmailVerified: true,
      role: 'OWNER'
    },
    create: {
      email: adminEmail,
      name: 'CI Admin',
      passwordHash: adminHash,
      isActive: true,
      isEmailVerified: true,
      role: 'OWNER'
    }
  });

  console.log(`✅ Admin user ensured: ${adminEmail}`);

  // Also create a UserAccount with provider LOCAL, mirroring what real
  // registration does (user.repository.js createUser() nests this create).
  // Without it, accounts.some(acc => acc.provider === 'LOCAL') is false on
  // the frontend (Settings.jsx), which hides the current-password input
  // entirely — breaking TC_PROFILE_07 through TC_PROFILE_10, which all wait
  // for [data-testid="profile-current-password-input"] to appear.
  await prisma.userAccount.upsert({
    where: { userId_provider: { userId: adminUser.id, provider: 'LOCAL' } },
    update: { passwordHash: adminHash },
    create: { userId: adminUser.id, provider: 'LOCAL', passwordHash: adminHash }
  });
  console.log(`✅ Admin LOCAL account ensured: ${adminEmail}`);

  // Pre-create a brand for the admin user on the STARTER plan (maxBrands: 3).
  // Without this, the backend's lazy auto-brand-creation (profile.service.js)
  // creates one brand on FREE plan (maxBrands: 1) on first login. Since the DB
  // is truncated every seed run, that single brand immediately hits the FREE
  // limit, which makes the frontend's "Add brand" button open the Limit
  // Reached modal instead of the Create Brand modal — breaking every
  // Selenium test that expects to create/delete brands (TC03, TC04, TC14, TC15).
  const existingBrand = await prisma.brand.findFirst({ where: { ownerId: adminUser.id } });
  if (!existingBrand) {
    await prisma.brand.create({
      data: {
        name: 'New Workspace',
        timezone: 'Asia/Ho_Chi_Minh',
        defaultLanguage: 'vi',
        owner: { connect: { id: adminUser.id } },
        subscription: {
          create: {
            planId: starterPlan.id,
            status: 'ACTIVE',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        }
      }
    });
    console.log(`✅ Default brand (STARTER plan) created for ${adminEmail}`);
  }

  // Upsert member user (if different from admin)
  if (memberEmail !== adminEmail) {
    const memberUser = await prisma.user.upsert({
      where: { email: memberEmail },
      update: {
        passwordHash: memberHash,
        isActive: true,
        isEmailVerified: true,
        role: 'STAFF'
      },
      create: {
        email: memberEmail,
        name: 'CI Member',
        passwordHash: memberHash,
        isActive: true,
        isEmailVerified: true,
        role: 'STAFF'
      }
    });
    await prisma.userAccount.upsert({
      where: { userId_provider: { userId: memberUser.id, provider: 'LOCAL' } },
      update: { passwordHash: memberHash },
      create: { userId: memberUser.id, provider: 'LOCAL', passwordHash: memberHash }
    });
    console.log(`✅ Member user ensured: ${memberEmail}`);
  }

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
