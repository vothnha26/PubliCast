const prisma = require('../../config/prisma');
const { PLATFORMS, ANALYTICS, PRISMA_TIMEOUTS } = require('../../utils/constants');
const { encrypt, decrypt } = require('../../utils/encryption');
const { OUTBOX_EVENT_TYPES } = require('../../constants/outbox.constants');
const outboxEventRepository = require('../core/outbox-event.repository');
const logger = require('../../utils/logger');

class SocialAccountRepository {
  _decryptAccount(account) {
    if (!account) return null;
    return {
      ...account,
      accessToken: decrypt(account.accessToken),
      refreshToken: decrypt(account.refreshToken)
    };
  }

  _decryptAccounts(accounts) {
    if (!accounts) return [];
    return accounts.map(acc => this._decryptAccount(acc));
  }
  /**
   * Ghi Prisma socialAccount.upsert (+ facebookPage + analytics nếu có) và outbox row
   * SOCIAL_SYNC_ENQUEUE trong CÙNG 1 transaction — outbox là nguồn ghi duy nhất cho
   * job sync social account, đảm bảo không mất event nếu Redis/process lỗi ngay sau
   * khi social account đã được lưu vào DB. Payload outbox CHỈ chứa socialAccountId
   * (không chứa token) — handler tự findById lại khi xử lý.
   *
   * options.enqueueSync (default true): CHỈ đặt false khi hàm này được gọi TỪ BÊN
   * TRONG chính sync job (syncChannelMetrics) để lưu kết quả sync mới nhất — nếu
   * không, mỗi lần sync sẽ tự ghi thêm 1 outbox row mới, tạo vòng lặp sync vô hạn
   * (sync → ghi outbox → dispatcher enqueue job mới → sync → ...).
   */
  async upsertFacebookAccount(brandId, pageData, tokens, options = {}) {
    const { enqueueSync = true } = options;
    const { pageId, username, displayName, profilePictureUrl, category, likesCount, followersCount, about, website } = pageData;

    const finalUsername = username || displayName || 'facebook_page';

    return prisma.$transaction(async (tx) => {
      const account = await tx.socialAccount.upsert({
        where: {
          brandId_platform_platformAccountId: {
            brandId,
            platform: PLATFORMS.FACEBOOK,
            platformAccountId: pageId
          }
        },
        update: {
          username: finalUsername,
          displayName,
          profilePictureUrl,
          accessToken: encrypt(tokens.access_token),
          refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
          tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
          scopes: tokens.scope,
          isConnected: true,
          lastSyncAt: new Date(),
          updatedAt: new Date(),
          facebookPage: {
            upsert: {
              create: {
                pageId,
                category,
                likesCount: parseInt(likesCount) || 0,
                followersCount: parseInt(followersCount) || 0,
                about,
                website,
              },
              update: {
                likesCount: parseInt(likesCount) || 0,
                followersCount: parseInt(followersCount) || 0,
                category,
                about,
                website,
              }
            }
          }
        },
        create: {
          brandId,
          platform: PLATFORMS.FACEBOOK,
          platformAccountId: pageId,
          username: finalUsername,
          displayName,
          profilePictureUrl,
          accessToken: encrypt(tokens.access_token),
          refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : '',
          tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
          scopes: tokens.scope || '',
          lastSyncAt: new Date(),
          connectedAt: new Date(),
          facebookPage: {
            create: {
              pageId,
              category,
              likesCount: parseInt(likesCount) || 0,
              followersCount: parseInt(followersCount) || 0,
              about,
              website,
            }
          }
        },
        include: {
          facebookPage: true
        }
      });

      if (pageData.analytics) {
        const { startDate, endDate } = pageData.analytics;
        await this.saveFacebookAnalytics(brandId, account.id, pageData.analytics, startDate, endDate, tx);
      }

      if (enqueueSync) {
        await outboxEventRepository.create(
          OUTBOX_EVENT_TYPES.SOCIAL_SYNC_ENQUEUE,
          account.id,
          { socialAccountId: account.id, platform: PLATFORMS.FACEBOOK, brandId },
          {},
          tx
        );
      }

      return this.findById(account.id, tx);
    }, { timeout: PRISMA_TIMEOUTS.INTERACTIVE_TRANSACTION_MS });
  }

  /** Xem ghi chú options.enqueueSync ở upsertFacebookAccount phía trên. */
  async upsertTikTokAccount(brandId, accountData, tokens, options = {}) {
    const { enqueueSync = true } = options;
    const { pageId, username, displayName, profilePictureUrl, followersCount = 0, followingCount = 0, likesCount = 0, videoCount = 0 } = accountData;

    const finalUsername = username || displayName || 'tiktok_user';

    return prisma.$transaction(async (tx) => {
      const account = await tx.socialAccount.upsert({
        where: {
          brandId_platform_platformAccountId: {
            brandId,
            platform: PLATFORMS.TIKTOK,
            platformAccountId: pageId
          }
        },
        update: {
          username: finalUsername,
          displayName,
          profilePictureUrl,
          accessToken: encrypt(tokens.access_token),
          refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
          tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
          scopes: tokens.scope,
          isConnected: true,
          lastSyncAt: new Date(),
          updatedAt: new Date(),
          tikTokAccount: {
            upsert: {
              create: {
                followersCount,
                followingCount,
                likesCount,
                videoCount
              },
              update: {
                followersCount,
                followingCount,
                likesCount,
                videoCount
              }
            }
          }
        },
        create: {
          brandId,
          platform: PLATFORMS.TIKTOK,
          platformAccountId: pageId,
          username: finalUsername,
          displayName,
          profilePictureUrl,
          accessToken: encrypt(tokens.access_token),
          refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : '',
          tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
          scopes: tokens.scope || '',
          lastSyncAt: new Date(),
          connectedAt: new Date(),
          tikTokAccount: {
            create: {
              followersCount,
              followingCount,
              likesCount,
              videoCount
            }
          }
        },
        include: {
          tikTokAccount: true
        }
      });

      if (accountData.analytics) {
        const { startDate, endDate } = accountData.analytics;
        await this.saveTikTokAnalytics(brandId, account.id, accountData.analytics, startDate, endDate, tx);
      }

      if (enqueueSync) {
        await outboxEventRepository.create(
          OUTBOX_EVENT_TYPES.SOCIAL_SYNC_ENQUEUE,
          account.id,
          { socialAccountId: account.id, platform: PLATFORMS.TIKTOK, brandId },
          {},
          tx
        );
      }

      return this.findById(account.id, tx);
    }, { timeout: PRISMA_TIMEOUTS.INTERACTIVE_TRANSACTION_MS });
  }

  async saveTikTokAnalytics(brandId, socialAccountId, analyticsData, startDate, endDate, client = prisma) {
    const now = new Date();

    const followersTotal = analyticsData.summary?.followers || 0;
    const followersGain = analyticsData.balance?.reduce((sum, item) => sum + (item.acquired || 0), 0) || 0;
    const followersLost = analyticsData.balance?.reduce((sum, item) => sum + (item.lost || 0), 0) || 0;
    const impressions = analyticsData.summary?.views || 0;
    const reach = analyticsData.summary?.reach || 0;
    const likes = analyticsData.interactions?.likes || 0;
    const comments = analyticsData.interactions?.comments || 0;
    const shares = analyticsData.interactions?.shares || 0;
    const clicks = analyticsData.interactions?.clicks || 0;

    const engagements = likes + comments + shares;
    const engagementRate = reach ? parseFloat(((engagements / reach) * 100).toFixed(2)) : 0;

    const analyticsEntry = await client.analytics.create({
      data: {
        brandId,
        socialAccountId,
        dateFrom: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        dateTo: endDate ? new Date(endDate) : now,
        granularity: ANALYTICS.GRANULARITY.DAILY,
        fetchedAt: now,
        analyticsType: ANALYTICS.TYPES.TIKTOK_DETAILED
      }
    });

    await client.socialAnalytics.create({
      data: {
        analyticsId: analyticsEntry.id,
        followersTotal,
        followersGain,
        followersLost,
        impressions,
        reach,
        engagements,
        likes,
        comments,
        shares,
        saves: 0,
        clicks,
        engagementRate,
        audienceDemographicsJson: JSON.stringify(analyticsData)
      }
    });
  }

  async saveFacebookAnalytics(brandId, socialAccountId, analyticsData, startDate, endDate, client = prisma) {
    const now = new Date();

    // Extract totals from analyticsData structure
    const followersTotal = analyticsData.summary?.followers || 0;
    const followersGain = analyticsData.balance?.reduce((sum, item) => sum + (item.acquired || 0), 0) || 0;
    const followersLost = analyticsData.balance?.reduce((sum, item) => sum + (item.lost || 0), 0) || 0;
    const impressions = analyticsData.summary?.views || 0;
    const reach = analyticsData.summary?.pageVisits || 0;
    const likes = analyticsData.interactions?.reactions || 0;
    const comments = analyticsData.interactions?.comments || 0;
    const shares = analyticsData.interactions?.shares || 0;
    const clicks = analyticsData.interactions?.clicks || 0;

    const engagements = likes + comments + shares;
    const engagementRate = reach ? parseFloat(((engagements / reach) * 100).toFixed(2)) : 0;

    const analyticsEntry = await client.analytics.create({
      data: {
        brandId,
        socialAccountId,
        dateFrom: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        dateTo: endDate ? new Date(endDate) : now,
        granularity: ANALYTICS.GRANULARITY.DAILY,
        fetchedAt: now,
        analyticsType: ANALYTICS.TYPES.FACEBOOK_DETAILED
      }
    });

    await client.socialAnalytics.create({
      data: {
        analyticsId: analyticsEntry.id,
        followersTotal,
        followersGain,
        followersLost,
        impressions,
        reach,
        engagements,
        likes,
        comments,
        shares,
        saves: 0,
        clicks,
        engagementRate,
        audienceDemographicsJson: JSON.stringify(analyticsData)
      }
    });
  }

  /** Xem ghi chú options.enqueueSync ở upsertFacebookAccount phía trên. */
  async upsertYouTubeAccount(brandId, channelData, tokens, options = {}) {
    const { enqueueSync = true } = options;
    const { channelId, username, displayName, profilePictureUrl, statistics, snippet, analytics } = channelData;

    const finalUsername = username || displayName || 'youtube_channel';

    return prisma.$transaction(async (tx) => {
      const account = await tx.socialAccount.upsert({
        where: {
          brandId_platform_platformAccountId: {
            brandId,
            platform: PLATFORMS.YOUTUBE,
            platformAccountId: channelId
          }
        },
        update: {
          username: finalUsername,
          displayName,
          profilePictureUrl,
          accessToken: encrypt(tokens.access_token),
          refreshToken: (tokens.refreshToken || tokens.refresh_token) ? encrypt(tokens.refreshToken || tokens.refresh_token) : undefined,
          tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
          scopes: tokens.scope,
          isConnected: true,
          lastSyncAt: new Date(),
          updatedAt: new Date(),
          youtubeChannel: {
            update: {
              subscribersCount: parseInt(statistics.subscriberCount) || 0,
              totalVideosCount: parseInt(statistics.videoCount) || 0,
              totalViewsCount: parseInt(statistics.viewCount) || 0,
              customUrl: snippet.customUrl,
              uploadsPlaylistId: channelData.uploadsPlaylistId,
              country: snippet.country,
              defaultLanguage: snippet.defaultLanguage,
            }
          }
        },
        create: {
          brandId,
          platform: PLATFORMS.YOUTUBE,
          platformAccountId: channelId,
          username: finalUsername,
          displayName,
          profilePictureUrl,
          accessToken: encrypt(tokens.access_token),
          refreshToken: (tokens.refreshToken || tokens.refresh_token) ? encrypt(tokens.refreshToken || tokens.refresh_token) : '',
          tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
          scopes: tokens.scope || '',
          lastSyncAt: new Date(),
          connectedAt: new Date(),
          youtubeChannel: {
            create: {
              channelId,
              customUrl: snippet.customUrl,
              uploadsPlaylistId: channelData.uploadsPlaylistId,
              subscribersCount: parseInt(statistics.subscriberCount) || 0,
              totalVideosCount: parseInt(statistics.videoCount) || 0,
              totalViewsCount: parseInt(statistics.viewCount) || 0,
              country: snippet.country,
              defaultLanguage: snippet.defaultLanguage,
            }
          }
        },
        include: {
          youtubeChannel: true
        }
      });

      if (analytics) {
        const { startDate, endDate } = analytics;
        await this.saveYouTubeAnalytics(brandId, account.id, analytics, startDate, endDate, tx);
      }

      if (enqueueSync) {
        await outboxEventRepository.create(
          OUTBOX_EVENT_TYPES.SOCIAL_SYNC_ENQUEUE,
          account.id,
          { socialAccountId: account.id, platform: PLATFORMS.YOUTUBE, brandId },
          {},
          tx
        );
      }

      return this.findById(account.id, tx);
    }, { timeout: PRISMA_TIMEOUTS.INTERACTIVE_TRANSACTION_MS });
  }

  async saveYouTubeAnalytics(brandId, socialAccountId, analyticsData, startDate, endDate, client = prisma) {
    const now = new Date();
    const analyticsEntry = await client.analytics.create({
      data: {
        brandId,
        socialAccountId,
        dateFrom: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        dateTo: endDate ? new Date(endDate) : now,
        granularity: ANALYTICS.GRANULARITY.DAILY,
        fetchedAt: now,
        analyticsType: ANALYTICS.TYPES.YOUTUBE_DETAILED
      }
    });

    await client.socialAnalytics.create({
      data: {
        analyticsId: analyticsEntry.id,
        followersTotal: 0,
        followersGain: 0,
        followersLost: 0,
        impressions: 0,
        reach: 0,
        engagements: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        clicks: 0,
        engagementRate: 0,
        audienceDemographicsJson: JSON.stringify({
          demographics: analyticsData.demographics,
          trafficSource: analyticsData.trafficSource,
          geographic: analyticsData.geographic,
          growth: analyticsData.growth
        })
      }
    });
  }

  async findAnalyticsInRange(socialAccountId, startDate, endDate) {
    return prisma.analytics.findMany({
      where: {
        socialAccountId,
        OR: [
          {
            dateFrom: { lte: new Date(endDate) },
            dateTo: { gte: new Date(startDate) }
          }
        ]
      },
      include: {
        socialAnalytics: true
      },
      orderBy: {
        fetchedAt: 'desc'
      }
    });
  }

  /** Xem ghi chú options.enqueueSync ở upsertFacebookAccount phía trên. */
  async upsertInstagramAccount(brandId, accountData, tokens, platform = PLATFORMS.INSTAGRAM, options = {}) {
    const { enqueueSync = true } = options;
    const { igAccountId, facebookPageId, username, displayName, profilePictureUrl, followersCount = 0, followingCount = 0, mediaCount = 0, biography = '', website = '', accountType = 'BUSINESS', businessCategoryName = '' } = accountData;

    const finalUsername = username || displayName || 'instagram_user';

    return prisma.$transaction(async (tx) => {
      const account = await tx.socialAccount.upsert({
        where: {
          brandId_platform_platformAccountId: {
            brandId,
            platform: platform,
            platformAccountId: igAccountId
          }
        },
        update: {
          username: finalUsername,
          displayName,
          profilePictureUrl,
          accessToken: encrypt(tokens.access_token),
          refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
          tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
          scopes: tokens.scope,
          isConnected: true,
          lastSyncAt: new Date(),
          updatedAt: new Date(),
          instagramAccount: {
            upsert: {
              create: {
                facebookPageId,
                accountType,
                businessCategoryName,
                followersCount: parseInt(followersCount) || 0,
                followingCount: parseInt(followingCount) || 0,
                mediaCount: parseInt(mediaCount) || 0,
                biography,
                website,
                supportsStories: true,
                supportsReels: true,
                supportsCarousels: true,
                supportsCollaboration: true
              },
              update: {
                // facebookPageId omitted from update on purpose: syncChannelMetrics
                // re-upserts on every periodic sync without knowing the Page ID
                // (it only has the already-stored account), so an explicit
                // undefined here would otherwise null out the value saved at
                // connect time. Only connectChannel ever has a fresh Page ID.
                facebookPageId: facebookPageId || undefined,
                accountType,
                businessCategoryName,
                followersCount: parseInt(followersCount) || 0,
                followingCount: parseInt(followingCount) || 0,
                mediaCount: parseInt(mediaCount) || 0,
                biography,
                website
              }
            }
          }
        },
        create: {
          brandId,
          platform: platform,
          platformAccountId: igAccountId,
          username: finalUsername,
          displayName,
          profilePictureUrl,
          accessToken: encrypt(tokens.access_token),
          refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : '',
          tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
          scopes: tokens.scope || '',
          lastSyncAt: new Date(),
          connectedAt: new Date(),
          instagramAccount: {
            create: {
              facebookPageId,
              accountType,
              businessCategoryName,
              followersCount: parseInt(followersCount) || 0,
              followingCount: parseInt(followingCount) || 0,
              mediaCount: parseInt(mediaCount) || 0,
              biography,
              website,
              supportsStories: true,
              supportsReels: true,
              supportsCarousels: true,
              supportsCollaboration: true
            }
          }
        },
        include: {
          instagramAccount: true
        }
      });

      if (accountData.analytics) {
        const { startDate, endDate } = accountData.analytics;
        await this.saveInstagramAnalytics(brandId, account.id, accountData.analytics, startDate, endDate, tx);
      }

      if (enqueueSync) {
        await outboxEventRepository.create(
          OUTBOX_EVENT_TYPES.SOCIAL_SYNC_ENQUEUE,
          account.id,
          { socialAccountId: account.id, platform, brandId },
          {},
          tx
        );
      }

      return this.findById(account.id, tx);
    }, { timeout: PRISMA_TIMEOUTS.INTERACTIVE_TRANSACTION_MS });
  }

  async saveInstagramAnalytics(brandId, socialAccountId, analyticsData, startDate, endDate, client = prisma) {
    const now = new Date();

    const followersTotal = analyticsData.summary?.followers || 0;
    const followersGain = analyticsData.balance?.reduce((sum, item) => sum + (item.acquired || 0), 0) || 0;
    const followersLost = analyticsData.balance?.reduce((sum, item) => sum + (item.lost || 0), 0) || 0;
    const impressions = analyticsData.summary?.views || 0;
    const reach = analyticsData.summary?.pageVisits || 0;
    const likes = analyticsData.interactions?.reactions || 0;
    const comments = analyticsData.interactions?.comments || 0;
    const shares = analyticsData.interactions?.shares || 0;
    const clicks = analyticsData.interactions?.clicks || 0;

    const engagements = likes + comments + shares;
    const engagementRate = reach ? parseFloat(((engagements / reach) * 100).toFixed(2)) : 0;

    const analyticsEntry = await client.analytics.create({
      data: {
        brandId,
        socialAccountId,
        dateFrom: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        dateTo: endDate ? new Date(endDate) : now,
        granularity: ANALYTICS.GRANULARITY.DAILY,
        fetchedAt: now,
        analyticsType: ANALYTICS.TYPES.INSTAGRAM_DETAILED
      }
    });

    await client.socialAnalytics.create({
      data: {
        analyticsId: analyticsEntry.id,
        followersTotal,
        followersGain,
        followersLost,
        impressions,
        reach,
        engagements,
        likes,
        comments,
        shares,
        saves: 0,
        clicks,
        engagementRate,
        audienceDemographicsJson: JSON.stringify(analyticsData)
      }
    });
  }

  async upsertTelegramAccount(brandId, channelData, tokens) {
    const { pageId, username, displayName, profilePictureUrl, chatType = 'channel', memberCount = 0 } = channelData;

    const finalUsername = username || displayName || 'telegram_channel';

    const account = await prisma.socialAccount.upsert({
      where: {
        brandId_platform_platformAccountId: {
          brandId,
          platform: PLATFORMS.TELEGRAM,
          platformAccountId: pageId
        }
      },
      update: {
        username: finalUsername,
        displayName,
        profilePictureUrl,
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        scopes: tokens.scope || '',
        isConnected: true,
        lastSyncAt: new Date(),
        updatedAt: new Date(),
        telegramAccount: {
          upsert: {
            create: {
              chatType,
              memberCount
            },
            update: {
              chatType,
              memberCount
            }
          }
        }
      },
      create: {
        brandId,
        platform: PLATFORMS.TELEGRAM,
        platformAccountId: pageId,
        username: finalUsername,
        displayName,
        profilePictureUrl,
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : '',
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        scopes: tokens.scope || '',
        lastSyncAt: new Date(),
        connectedAt: new Date(),
        telegramAccount: {
          create: {
            chatType,
            memberCount
          }
        }
      },
      include: {
        telegramAccount: true
      }
    });

    if (channelData.analytics) {
      const { startDate, endDate } = channelData.analytics;
      await this.saveTelegramAnalytics(brandId, account.id, channelData.analytics, startDate, endDate);
    }

    return this.findById(account.id);
  }

  async saveTelegramAnalytics(brandId, socialAccountId, analyticsData, startDate, endDate) {
    const now = new Date();
    
    const followersTotal = analyticsData.summary?.followers || 0;
    const followersGain = analyticsData.balance?.reduce((sum, item) => sum + (item.acquired || 0), 0) || 0;
    const followersLost = analyticsData.balance?.reduce((sum, item) => sum + (item.lost || 0), 0) || 0;
    const impressions = analyticsData.summary?.views || 0;
    const reach = analyticsData.summary?.reach || 0;
    const likes = analyticsData.interactions?.likes || 0;
    const comments = analyticsData.interactions?.comments || 0;
    const shares = analyticsData.interactions?.shares || 0;
    const clicks = analyticsData.interactions?.clicks || 0;
    
    const engagements = likes + comments + shares;
    const engagementRate = reach ? parseFloat(((engagements / reach) * 100).toFixed(2)) : 0;

    const analyticsEntry = await prisma.analytics.create({
      data: {
        brandId,
        socialAccountId,
        dateFrom: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        dateTo: endDate ? new Date(endDate) : now,
        granularity: ANALYTICS.GRANULARITY.DAILY,
        fetchedAt: now,
        analyticsType: ANALYTICS.TYPES.TELEGRAM_DETAILED
      }
    });

    await prisma.socialAnalytics.create({
      data: {
        analyticsId: analyticsEntry.id,
        followersTotal,
        followersGain,
        followersLost,
        impressions,
        reach,
        engagements,
        likes,
        comments,
        shares,
        saves: 0,
        clicks,
        engagementRate,
        audienceDemographicsJson: JSON.stringify(analyticsData)
      }
    });
  }

  async findById(id, client = prisma) {
    const account = await client.socialAccount.findUnique({
      where: { id },
      include: {
        youtubeChannel: true,
        facebookPage: true,
        tikTokAccount: true,
        instagramAccount: true,
        telegramAccount: true,
        redditAccount: true,
        blueskyAccount: true,
        twitchAccount: true,
        analytics: {
          orderBy: { fetchedAt: 'desc' },
          take: 1,
          include: {
            socialAnalytics: true
          }
        }
      }
    });
    return this._decryptAccount(account);
  }

  async upsertTwitchAccount(brandId, channelData, tokens, options = {}) {
    const { enqueueSync = true } = options;
    const { broadcasterId, username, displayName, profilePictureUrl, broadcasterType = '', followersCount = 0 } = channelData;

    const finalUsername = username || displayName || 'twitch_user';

    return prisma.$transaction(async (tx) => {
      const account = await tx.socialAccount.upsert({
        where: {
          brandId_platform_platformAccountId: {
            brandId,
            platform: PLATFORMS.TWITCH,
            platformAccountId: broadcasterId
          }
        },
        update: {
          username: finalUsername,
          displayName: displayName || finalUsername,
          profilePictureUrl,
          accessToken: encrypt(tokens.accessToken || tokens.access_token),
          refreshToken: (tokens.refreshToken || tokens.refresh_token) ? encrypt(tokens.refreshToken || tokens.refresh_token) : undefined,
          tokenExpiresAt: tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : (tokens.expiry_date ? new Date(tokens.expiry_date) : undefined),
          scopes: tokens.scope || '',
          isConnected: true,
          lastSyncAt: new Date(),
          updatedAt: new Date(),
          twitchAccount: {
            upsert: {
              create: {
                broadcasterId,
                broadcasterType,
                followersCount: parseInt(followersCount) || 0
              },
              update: {
                broadcasterType,
                followersCount: parseInt(followersCount) || 0
              }
            }
          }
        },
        create: {
          brandId,
          platform: PLATFORMS.TWITCH,
          platformAccountId: broadcasterId,
          username: finalUsername,
          displayName: displayName || finalUsername,
          profilePictureUrl,
          accessToken: encrypt(tokens.accessToken || tokens.access_token),
          refreshToken: (tokens.refreshToken || tokens.refresh_token) ? encrypt(tokens.refreshToken || tokens.refresh_token) : '',
          tokenExpiresAt: tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : (tokens.expiry_date ? new Date(tokens.expiry_date) : undefined),
          scopes: tokens.scope || '',
          lastSyncAt: new Date(),
          connectedAt: new Date(),
          twitchAccount: {
            create: {
              broadcasterId,
              broadcasterType,
              followersCount: parseInt(followersCount) || 0
            }
          }
        },
        include: {
          twitchAccount: true
        }
      });

      if (enqueueSync) {
        await outboxEventRepository.create(
          OUTBOX_EVENT_TYPES.SOCIAL_SYNC_ENQUEUE,
          account.id,
          { socialAccountId: account.id, platform: PLATFORMS.TWITCH, brandId },
          {},
          tx
        );
      }

      return this.findById(account.id, tx);
    });
  }

  async updateTokens(id, tokens) {
    try {
      const account = await prisma.socialAccount.update({
        where: { id },
        data: {
          accessToken: encrypt(tokens.access_token),
          refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
          tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
          updatedAt: new Date()
        }
      });
      return this._decryptAccount(account);
    } catch (err) {
      if (err.code === 'P2025') {
        logger.warn(`[SocialAccountRepository.updateTokens] Account ${id} not found for token update (likely deleted or disconnected).`);
        return null;
      }
      throw err;
    }
  }

  /**
   * Marks an account as needing the user to reconnect it — used when a
   * refresh_token comes back invalid_grant (already used/revoked, e.g.
   * TikTok's single-use rotating refresh tokens, see #62). Reuses the same
   * isConnected:false signal token-refresh.service.js already sets on
   * refresh failure, so the UI's existing "reconnect" prompt picks this up
   * without needing a new field.
   */
  async markNeedsReauth(id) {
    return prisma.socialAccount.update({
      where: { id },
      data: { isConnected: false }
    });
  }

  async findByBrandAndPlatform(brandId, platform) {
    const where = { brandId };
    if (platform) where.platform = platform;

    const accounts = await prisma.socialAccount.findMany({
      where,
      include: {
        youtubeChannel: true,
        instagramAccount: true,
        facebookPage: true,
        tikTokAccount: true,
        telegramAccount: true,
        blueskyAccount: true,
        redditAccount: true,
        twitchAccount: true,
        analytics: {
          orderBy: { fetchedAt: 'desc' },
          take: 1,
          include: {
            socialAnalytics: true
          }
        }
      }
    });
    return this._decryptAccounts(accounts);
  }

  async upsertRedditAccount(brandId, accountData, tokens, options = {}) {
    const { enqueueSync = true } = options;
    const { platformAccountId, username, displayName, profilePictureUrl, linkKarma = 0, commentKarma = 0 } = accountData;

    const finalUsername = username || displayName || 'reddit_user';

    return prisma.$transaction(async (tx) => {
      const account = await tx.socialAccount.upsert({
        where: {
          brandId_platform_platformAccountId: {
            brandId,
            platform: PLATFORMS.REDDIT,
            platformAccountId
          }
        },
        update: {
          username: finalUsername,
          displayName: displayName || finalUsername,
          profilePictureUrl,
          accessToken: encrypt(tokens.accessToken || tokens.access_token),
          refreshToken: (tokens.refreshToken || tokens.refresh_token) ? encrypt(tokens.refreshToken || tokens.refresh_token) : undefined,
          tokenExpiresAt: tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : undefined,
          scopes: tokens.scope || '',
          isConnected: true,
          lastSyncAt: new Date(),
          updatedAt: new Date(),
          redditAccount: {
            upsert: {
              create: {
                username: finalUsername,
                linkKarma: parseInt(linkKarma) || 0,
                commentKarma: parseInt(commentKarma) || 0
              },
              update: {
                username: finalUsername,
                linkKarma: parseInt(linkKarma) || 0,
                commentKarma: parseInt(commentKarma) || 0
              }
            }
          }
        },
        create: {
          brandId,
          platform: PLATFORMS.REDDIT,
          platformAccountId,
          username: finalUsername,
          displayName: displayName || finalUsername,
          profilePictureUrl,
          accessToken: encrypt(tokens.accessToken || tokens.access_token),
          refreshToken: (tokens.refreshToken || tokens.refresh_token) ? encrypt(tokens.refreshToken || tokens.refresh_token) : '',
          tokenExpiresAt: tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : undefined,
          scopes: tokens.scope || '',
          lastSyncAt: new Date(),
          connectedAt: new Date(),
          redditAccount: {
            create: {
              username: finalUsername,
              linkKarma: parseInt(linkKarma) || 0,
              commentKarma: parseInt(commentKarma) || 0
            }
          }
        },
        include: {
          redditAccount: true
        }
      });

      if (enqueueSync) {
        await outboxEventRepository.create(
          OUTBOX_EVENT_TYPES.SOCIAL_SYNC_ENQUEUE,
          account.id,
          { socialAccountId: account.id, platform: PLATFORMS.REDDIT, brandId },
          {},
          tx
        );
      }

      return this.findById(account.id, tx);
    });
  }

  async upsertBlueskyAccount(brandId, accountData, options = {}) {
    const { enqueueSync = true } = options;
    const { did, handle, displayName, avatarUrl, accessToken, refreshToken, pdsUrl = 'https://bsky.social', emailConfirmed = false, followersCount = 0, followsCount = 0, postsCount = 0, dpopPrivateKey, dpopJwk } = accountData;

    return prisma.$transaction(async (tx) => {
      const account = await tx.socialAccount.upsert({
        where: {
          brandId_platform_platformAccountId: {
            brandId,
            platform: PLATFORMS.BLUESKY,
            platformAccountId: did
          }
        },
        update: {
          username: handle,
          displayName: displayName || handle,
          profilePictureUrl: avatarUrl,
          accessToken: encrypt(accessToken),
          refreshToken: refreshToken ? encrypt(refreshToken) : undefined,
          scopes: 'atproto',
          isConnected: true,
          lastSyncAt: new Date(),
          updatedAt: new Date(),
          blueskyAccount: {
            upsert: {
              create: {
                did,
                handle,
                pdsUrl,
                emailConfirmed: Boolean(emailConfirmed),
                followersCount: parseInt(followersCount) || 0,
                followsCount: parseInt(followsCount) || 0,
                postsCount: parseInt(postsCount) || 0,
                dpopPrivateKey: dpopPrivateKey ? encrypt(dpopPrivateKey) : undefined,
                dpopJwk: dpopJwk ? encrypt(dpopJwk) : undefined
              },
              update: {
                handle,
                pdsUrl,
                emailConfirmed: Boolean(emailConfirmed),
                followersCount: parseInt(followersCount) || 0,
                followsCount: parseInt(followsCount) || 0,
                postsCount: parseInt(postsCount) || 0,
                dpopPrivateKey: dpopPrivateKey ? encrypt(dpopPrivateKey) : undefined,
                dpopJwk: dpopJwk ? encrypt(dpopJwk) : undefined
              }
            }
          }
        },
        create: {
          brandId,
          platform: PLATFORMS.BLUESKY,
          platformAccountId: did,
          username: handle,
          displayName: displayName || handle,
          profilePictureUrl: avatarUrl,
          accessToken: encrypt(accessToken),
          refreshToken: refreshToken ? encrypt(refreshToken) : '',
          scopes: 'atproto',
          lastSyncAt: new Date(),
          connectedAt: new Date(),
          blueskyAccount: {
            create: {
              did,
              handle,
              pdsUrl,
              emailConfirmed: Boolean(emailConfirmed),
              followersCount: parseInt(followersCount) || 0,
              followsCount: parseInt(followsCount) || 0,
              postsCount: parseInt(postsCount) || 0,
              dpopPrivateKey: dpopPrivateKey ? encrypt(dpopPrivateKey) : undefined,
              dpopJwk: dpopJwk ? encrypt(dpopJwk) : undefined
            }
          }
        },
        include: {
          blueskyAccount: true
        }
      });

      if (enqueueSync) {
        await outboxEventRepository.create(
          OUTBOX_EVENT_TYPES.SOCIAL_SYNC_ENQUEUE,
          account.id,
          { socialAccountId: account.id, platform: PLATFORMS.BLUESKY, brandId },
          {},
          tx
        );
      }

      return this._decryptAccount(account);
    });
  }

  async updateBlueskyMetrics(socialAccountId, metricsData) {
    const { followersCount = 0, followsCount = 0, postsCount = 0, emailConfirmed, analytics } = metricsData;
    const data = {
      followersCount: parseInt(followersCount) || 0,
      followsCount: parseInt(followsCount) || 0,
      postsCount: parseInt(postsCount) || 0
    };
    if (emailConfirmed !== undefined) {
      data.emailConfirmed = emailConfirmed;
    }

    const account = await prisma.blueskyAccount.update({
      where: { socialAccountId },
      data
    });

    if (analytics) {
      const { startDate, endDate, brandId } = analytics;
      await this.saveBlueskyAnalytics(brandId, socialAccountId, analytics, startDate, endDate);
    }

    return account;
  }

  async saveBlueskyAnalytics(brandId, socialAccountId, analyticsData, startDate, endDate, client = prisma) {
    const now = new Date();

    const followersTotal = analyticsData.summary?.followers || 0;
    const followersGain = analyticsData.balance?.reduce((sum, item) => sum + (item.acquired || 0), 0) || 0;
    const followersLost = analyticsData.balance?.reduce((sum, item) => sum + (item.lost || 0), 0) || 0;
    const likes = analyticsData.interactions?.likes || 0;
    const comments = analyticsData.interactions?.replies || 0;
    const shares = analyticsData.interactions?.reposts || 0;
    const engagements = likes + comments + shares;

    const analyticsEntry = await client.analytics.create({
      data: {
        brandId,
        socialAccountId,
        dateFrom: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        dateTo: endDate ? new Date(endDate) : now,
        granularity: ANALYTICS.GRANULARITY.DAILY,
        fetchedAt: now,
        analyticsType: ANALYTICS.TYPES.BLUESKY_DETAILED
      }
    });

    await client.socialAnalytics.create({
      data: {
        analyticsId: analyticsEntry.id,
        followersTotal,
        followersGain,
        followersLost,
        // Bluesky's public AT Protocol API has no reach/impressions concept
        // (see bluesky.service.js getAnalyticsReport) — left at 0 rather
        // than fabricated, unlike engagement counts which ARE real
        // (fetched per-post via getPostMetrics/getAuthorFeed).
        impressions: 0,
        reach: 0,
        engagements,
        likes,
        comments,
        shares,
        saves: 0,
        clicks: 0,
        engagementRate: 0,
        audienceDemographicsJson: JSON.stringify(analyticsData)
      }
    });
  }

  // socialAccountId picks a specific account when the brand has more than
  // one of this platform; omitted, falls back to findFirst's natural order
  // (correct as long as the brand only has one, still the common case).
  async findByBrandAndPlatformFirst(brandId, platform, socialAccountId = null) {
    const where = { brandId };
    if (platform) where.platform = platform;
    if (socialAccountId) where.id = socialAccountId;

    const account = await prisma.socialAccount.findFirst({
      where,
      include: {
        blueskyAccount: true,
        redditAccount: true,
        twitchAccount: true
      }
    });
    return this._decryptAccount(account);
  }

  async findByPlatformAccountIdAndPlatform(platformAccountId, platform) {
    const account = await prisma.socialAccount.findFirst({
      where: { platformAccountId, platform }
    });
    return this._decryptAccount(account);
  }


  async updateSyncStatus(id, syncStatus) {
    return prisma.socialAccount.update({
      where: { id },
      data: { syncStatus }
    });
  }

  async updateLastSyncAt(id) {
    return prisma.socialAccount.update({
      where: { id },
      data: { lastSyncAt: new Date() }
    });
  }

  async upsertGoogleDriveAccount(brandId, profile, tokens) {
    const platformAccountId = profile.id || profile.email;
    const finalUsername = profile.email || profile.name || 'google_drive_user';
    const displayName = profile.name || profile.email || 'Google Drive';

    return prisma.socialAccount.upsert({
      where: {
        brandId_platform_platformAccountId: {
          brandId,
          platform: PLATFORMS.GOOGLE_DRIVE,
          platformAccountId
        }
      },
      update: {
        username: finalUsername,
        displayName,
        profilePictureUrl: profile.picture || null,
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scopes: tokens.scope || '',
        isConnected: true,
        lastSyncAt: new Date(),
        updatedAt: new Date()
      },
      create: {
        brandId,
        platform: PLATFORMS.GOOGLE_DRIVE,
        platformAccountId,
        username: finalUsername,
        displayName,
        profilePictureUrl: profile.picture || null,
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : '',
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scopes: tokens.scope || '',
        connectedAt: new Date(),
        lastSyncAt: new Date()
      }
    });
  }

  async disconnectGoogleDriveAccount(brandId) {
    return prisma.socialAccount.deleteMany({
      where: { brandId, platform: PLATFORMS.GOOGLE_DRIVE }
    });
  }

  async deleteManyByBrandAndPlatform(brandId, platform) {
    return prisma.socialAccount.deleteMany({
      where: { brandId, platform }
    });
  }

  // Scoped by brandId (not just id) so a caller can never delete another
  // brand's account by passing a foreign socialAccountId.
  async deleteByIdAndBrand(brandId, socialAccountId) {
    return prisma.socialAccount.deleteMany({
      where: { id: socialAccountId, brandId }
    });
  }

  // At most one account per (brandId, platform) should have isDefault=true —
  // enforced here (not a DB constraint, see schema comment) by clearing any
  // existing default for that brand+platform before setting the new one.
  async setDefault(brandId, platform, socialAccountId) {
    return prisma.$transaction([
      prisma.socialAccount.updateMany({
        where: { brandId, platform, isDefault: true },
        data: { isDefault: false }
      }),
      prisma.socialAccount.update({
        where: { id: socialAccountId },
        data: { isDefault: true }
      })
    ]);
  }
}

module.exports = new SocialAccountRepository();
