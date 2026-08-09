const prisma = require('../../config/prisma');
const { PLATFORMS, ANALYTICS, PRISMA_TIMEOUTS } = require('../../utils/constants');
const { encrypt, decrypt } = require('../../utils/encryption');
const { OUTBOX_EVENT_TYPES } = require('../../constants/outbox.constants');
const outboxEventRepository = require('../core/outbox-event.repository');
const channelSnapshotRepository = require('./channel-snapshot.repository');
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
        await this.upsertFacebookChannelSnapshots(brandId, account.id, followersCount, likesCount, pageData.analytics.balance, pageData.analytics.growth, tx);
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

  /**
   * Facebook's Page Insights API genuinely returns per-day follower
   * gained/lost (page_daily_follows_unique/unfollows_unique, real
   * period=day Graph API call — see facebook.gateway.js's getPageInsights)
   * plus real per-day reach/page-views (page_media_view/page_views_total),
   * so unlike most other platforms it DOES support true historical
   * backfill, same as YouTube — supportsHistoricalBackfill: true.
   *
   * No real page-level "impressions" metric exists anymore — Meta
   * deprecated page_impressions_unique on 2025-06-15 with no page-level
   * replacement (only page_total_media_view_unique, already used here as
   * reach). FacebookChannelSnapshot.impressions is always written null,
   * never fabricated from reach — populate it for real only if Meta ships
   * a replacement metric.
   */
  async upsertFacebookChannelSnapshots(brandId, socialAccountId, currentFollowersCount, currentLikesCount, balanceRows, growthRows, client = prisma) {
    const { channelInsightFacade } = require('../../core/insights');
    return channelInsightFacade.upsertChannelSnapshots(
      PLATFORMS.FACEBOOK,
      brandId,
      socialAccountId,
      { currentFollowersCount, currentLikesCount, balanceRows, growthRows },
      { client }
    );
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
        await this.upsertTikTokChannelSnapshots(brandId, account.id, followersCount, followingCount, likesCount, videoCount, accountData.analytics.growth, tx);
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

  /**
   * TikTok's video-list API has no date-ranged analytics endpoint at all —
   * tiktok-analytics.service.js's _processVideosForAnalytics buckets each
   * real video's real lifetime cumulative view/like/comment/share count
   * into its post date. Real numbers, but not a true "activity that
   * occurred this day" delta, and there is no follower-delta or reach/click
   * metric available anywhere — followersGained/Lost, reach, and clicks are
   * always null (never fabricated, see the removed *0.85/*0.1/*0.05
   * constants). followersCount can only accumulate forward from today,
   * never be backfilled — same as Instagram/Threads/Bluesky.
   */
  async upsertTikTokChannelSnapshots(brandId, socialAccountId, currentFollowersCount, currentFollowingCount, currentLikesCount, currentVideoCount, growthRows, client = prisma) {
    if (!Array.isArray(growthRows) || growthRows.length === 0) return [];

    const dailyRows = growthRows.map((row) => ({
      date: row.date,
      followersGained: null,
      followersLost: null,
      columns: {
        views: row.views ?? null,
        likes: row.likes ?? null,
        comments: row.comments ?? null,
        shares: row.shares ?? null
      }
    }));

    const current = {
      staticColumns: {
        followingCount: parseInt(currentFollowingCount) || 0,
        likesCount: parseInt(currentLikesCount) || 0,
        videoCount: parseInt(currentVideoCount) || 0
      },
      reconstructible: [
        {
          column: 'followersCount',
          currentValue: parseInt(currentFollowersCount) || 0,
          gainedKey: 'followersGained',
          lostKey: 'followersLost',
          emitDeltaColumns: true
        }
      ]
    };

    return channelSnapshotRepository.upsertChannelSnapshots(
      client.channelMetricDaily,
      brandId,
      socialAccountId,
      PLATFORMS.TIKTOK,
      current,
      dailyRows,
      false
    );
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
        const growthRows = Array.isArray(analytics.growth) ? analytics.growth : [];
        const firstDate = growthRows[0]?.date;
        const lastDate = growthRows[growthRows.length - 1]?.date;
        await this.saveYouTubeAnalytics(brandId, account.id, analytics, firstDate, lastDate, tx);

        // growthRows spans the whole requested window (30 days by default,
        // or the full connect-time backfill range) — explode every day into
        // its own snapshot row instead of only upserting "today", so a
        // first connect immediately has real day-by-day history instead of
        // starting from a single point and accumulating one row per sync.
        await this.upsertYouTubeChannelSnapshots(brandId, account.id, statistics, growthRows, tx);
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

  /**
   * Append-only daily channel snapshot — thin wrapper around the shared
   * channel-snapshot.repository.js upsert helper (also used by the other 5
   * platforms). YouTube is the only platform whose API reports real
   * historical daily deltas, so it's the only caller passing
   * supportsHistoricalBackfill=true — see that file for the full
   * backward-reconstruction rationale.
   */
  async upsertYouTubeChannelSnapshots(brandId, socialAccountId, statistics, growthRows, client = prisma) {
    const { channelInsightFacade } = require('../../core/insights');
    return channelInsightFacade.upsertChannelSnapshots(
      PLATFORMS.YOUTUBE,
      brandId,
      socialAccountId,
      { statistics, growthRows },
      { client }
    );
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

  /**
   * Cheap version signal for a brand's metrics — max(updatedAt) across its
   * social accounts, max(fetchedAt) across legacy Analytics rows, and
   * max(fetchedAt) across ChannelMetricDaily (the single table shared by all
   * 6 platforms since the 2026-08-09 consolidation — previously this looped
   * channelAdapterFactory.getAllAdapters() to query 6 separate per-platform
   * tables; now every adapter's getPrismaModel() resolves to the same
   * table, so one query covers all platforms instead of 6 redundant ones).
   * Used both by the mount-time version-check (useMetricsQuery fetches this
   * before the full metrics payload) and the reconnect-reconcile flow to
   * detect a missed `data_invalidate` socket event.
   */
  async getMetricsVersion(brandId) {
    const [latestAccount, latestAnalytics, latestSnapshot] = await Promise.all([
      prisma.socialAccount.findFirst({
        where: { brandId },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true }
      }),
      prisma.analytics.findFirst({
        where: { brandId },
        orderBy: { fetchedAt: 'desc' },
        select: { fetchedAt: true }
      }),
      prisma.channelMetricDaily.findFirst({
        where: { brandId },
        orderBy: { fetchedAt: 'desc' },
        select: { fetchedAt: true }
      }).catch(() => null)
    ]);

    const times = [
      latestAccount?.updatedAt?.getTime() || 0,
      latestAnalytics?.fetchedAt?.getTime() || 0,
      latestSnapshot?.fetchedAt?.getTime() || 0
    ];

    return Math.max(...times);
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
                website
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
              website
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

        // Snapshot rows are platform-specific even though the account row
        // itself is shared (see upsertThreadsAccount below) — Threads was
        // fully migrated off SocialPostMetric/InstagramAccount sharing
        // (schema.prisma's comment on ThreadsChannelSnapshot) except for
        // this one live-account relation, so it must never end up writing
        // into InstagramChannelSnapshot under the wrong platform.
        if (platform === PLATFORMS.INSTAGRAM) {
          await this.upsertInstagramChannelSnapshots(brandId, account.id, followersCount, followingCount, mediaCount, accountData.analytics.balance, accountData.analytics.growth, tx);
        } else if (platform === PLATFORMS.THREADS) {
          await this.upsertThreadsChannelSnapshots(brandId, account.id, followersCount, accountData.analytics.balance, accountData.analytics.growth, tx);
        }
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

  /**
   * Instagram's Graph API Insights (views/reach/profile_views) genuinely
   * returns real per-day values — instagram.gateway.js's getAccountInsights
   * makes one real dated API call per day in the requested range. But
   * unlike YouTube/Facebook, there is no follower gained/lost metric fetched
   * anywhere (instagram-analytics.service.js's balance rows are always
   * acquired:0/lost:0 — never populated from a real delta source), so
   * followersCount can only accumulate forward from today, never be
   * backfilled — supportsHistoricalBackfill: false.
   */
  async upsertInstagramChannelSnapshots(brandId, socialAccountId, currentFollowersCount, currentFollowingCount, currentMediaCount, balanceRows, growthRows, client = prisma) {
    if (!Array.isArray(balanceRows) || balanceRows.length === 0) return [];

    const growthByDate = new Map((growthRows || []).map((row) => [row.date, row]));

    const dailyRows = balanceRows.map((balance) => {
      const growth = growthByDate.get(balance.date) || {};
      return {
        date: balance.date || new Date().toISOString().split('T')[0],
        followersGained: balance.acquired ?? null,
        followersLost: balance.lost ?? null,
        columns: {
          views: growth.views ?? null,
          reach: growth.pageVisits ?? null,
          profileViews: growth.totalClicks ?? null
        }
      };
    });

    const current = {
      staticColumns: {
        followingCount: parseInt(currentFollowingCount) || 0,
        mediaCount: parseInt(currentMediaCount) || 0
      },
      reconstructible: [
        {
          column: 'followersCount',
          currentValue: parseInt(currentFollowersCount) || 0,
          gainedKey: 'followersGained',
          lostKey: 'followersLost',
          emitDeltaColumns: true
        }
      ]
    };

    return channelSnapshotRepository.upsertChannelSnapshots(
      client.channelMetricDaily,
      brandId,
      socialAccountId,
      PLATFORMS.INSTAGRAM,
      current,
      dailyRows,
      false
    );
  }

  /**
   * Thin, explicitly-named wrapper — Threads shares SocialAccount's
   * instagramAccount sub-relation for its live account row (username/
   * followers/etc; see the facebookPageId comment above), but must NEVER
   * share snapshot HISTORY with Instagram (schema.prisma's comment on
   * ThreadsChannelSnapshot: "no longer shares InstagramAccount/
   * SocialPostMetric with Instagram" was true for post metrics but not yet
   * for channel snapshots until this method existed). Calling this instead
   * of upsertInstagramAccount directly makes the platform explicit at every
   * Threads call site instead of relying on remembering to pass
   * PLATFORMS.THREADS as the 4th positional argument correctly.
   */
  async upsertThreadsAccount(brandId, accountData, tokens, options = {}) {
    return this.upsertInstagramAccount(brandId, accountData, tokens, PLATFORMS.THREADS, options);
  }

  /**
   * Threads Insights (views/likes/replies/reposts) are real per-day values
   * when the token has threads_insights permission — threads.gateway.js's
   * getInsights makes one real API call covering the whole requested range.
   * followers_count is also a real Insights metric, but threads/index.js
   * never computes a real gained/lost delta from it (balance rows are
   * always acquired:0/lost:0) — same as Instagram, followersCount can only
   * accumulate forward from today, never be backfilled.
   */
  async upsertThreadsChannelSnapshots(brandId, socialAccountId, currentFollowersCount, balanceRows, growthRows, client = prisma) {
    if (!Array.isArray(balanceRows) || balanceRows.length === 0) return [];

    const growthByDate = new Map((growthRows || []).map((row) => [row.date, row]));

    const dailyRows = balanceRows.map((balance) => {
      const growth = growthByDate.get(balance.date) || {};
      return {
        date: balance.date,
        followersGained: balance.acquired ?? null,
        followersLost: balance.lost ?? null,
        columns: {
          views: growth.views ?? null,
          likes: growth.reactions ?? null,
          replies: growth.comments ?? null,
          reposts: growth.shares ?? null
        }
      };
    });

    const current = {
      staticColumns: {},
      reconstructible: [
        {
          column: 'followersCount',
          currentValue: parseInt(currentFollowersCount) || 0,
          gainedKey: 'followersGained',
          lostKey: 'followersLost',
          emitDeltaColumns: true
        }
      ]
    };

    return channelSnapshotRepository.upsertChannelSnapshots(
      client.channelMetricDaily,
      brandId,
      socialAccountId,
      PLATFORMS.THREADS,
      current,
      dailyRows,
      false
    );
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

  async findById(id, client = prisma) {
    const account = await client.socialAccount.findUnique({
      where: { id },
      include: {
        youtubeChannel: true,
        facebookPage: true,
        tikTokAccount: true,
        instagramAccount: true,
        redditAccount: true,
        blueskyAccount: true,
        twitchAccount: true,
        analytics: {
          orderBy: { fetchedAt: 'desc' },
          take: ANALYTICS.HISTORY_ROWS_TO_MERGE,
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

    // channelMetricsDaily is scoped by this row's own socialAccountId FK, so
    // it never needs a platform filter here (a SocialAccount only ever has
    // one platform) — replaces the old facebookChannelSnapshots/
    // youtubeChannelSnapshots includes, which only covered those 2
    // platforms; every platform now gets its last-30-days history uniformly
    // since the 2026-08-09 ChannelMetricDaily consolidation.
    const accounts = await prisma.socialAccount.findMany({
      where,
      include: {
        youtubeChannel: true,
        instagramAccount: true,
        facebookPage: true,
        tikTokAccount: true,
        blueskyAccount: true,
        redditAccount: true,
        twitchAccount: true,
        channelMetricsDaily: {
          orderBy: { snapshotDate: 'desc' },
          take: 30
        },
        analytics: {
          orderBy: { fetchedAt: 'desc' },
          take: ANALYTICS.HISTORY_ROWS_TO_MERGE,
          include: {
            socialAnalytics: true
          }
        }
      }
    });
    return this._decryptAccounts(accounts);
  }

  /**
   * Lightweight counterpart to findByBrandAndPlatform for callers that only
   * need the token/identity fields to authenticate an outbound API call
   * (publish, comment sync, competitor lookup) — not the 8 platform-specific
   * relations + latest-analytics blob the full query joins in. Those callers
   * run on the hottest paths in the app (every publish, every comment sync),
   * so the 8-join Prisma query plus decrypting tokens for rows whose
   * relations are immediately discarded was pure overhead on every call.
   */
  async findAuthContextByBrandAndPlatform(brandId, platform) {
    const where = { brandId };
    if (platform) where.platform = platform;

    const accounts = await prisma.socialAccount.findMany({
      where,
      select: {
        id: true,
        brandId: true,
        platform: true,
        platformAccountId: true,
        displayName: true,
        profilePictureUrl: true,
        accessToken: true,
        refreshToken: true,
        tokenExpiresAt: true
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

    // Prisma's default transaction timeout (5s) was occasionally too tight
    // under DB pool contention (e.g. a busy cron/dispatcher holding
    // connections), producing "Transaction not found... refers to an old
    // closed transaction" — this upsert + outbox insert is small, but give
    // it real headroom instead of racing the default.
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
          updatedAt: new Date()
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
          connectedAt: new Date()
        }
      });

      // Safely upsert child BlueskyAccount without racing unique constraint on `did`
      const existingByDid = await tx.blueskyAccount.findUnique({ where: { did } });
      if (existingByDid) {
        await tx.blueskyAccount.update({
          where: { did },
          data: {
            socialAccountId: account.id,
            handle,
            pdsUrl,
            emailConfirmed: Boolean(emailConfirmed),
            followersCount: parseInt(followersCount) || 0,
            followsCount: parseInt(followsCount) || 0,
            postsCount: parseInt(postsCount) || 0,
            dpopPrivateKey: dpopPrivateKey ? encrypt(dpopPrivateKey) : undefined,
            dpopJwk: dpopJwk ? encrypt(dpopJwk) : undefined
          }
        });
      } else {
        await tx.blueskyAccount.upsert({
          where: { socialAccountId: account.id },
          update: {
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
          create: {
            socialAccountId: account.id,
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
        });
      }

      if (enqueueSync) {
        await outboxEventRepository.create(
          OUTBOX_EVENT_TYPES.SOCIAL_SYNC_ENQUEUE,
          account.id,
          { socialAccountId: account.id, platform: PLATFORMS.BLUESKY, brandId },
          {},
          tx
        );
      }

      const fullAccount = await tx.socialAccount.findUnique({
        where: { id: account.id },
        include: { blueskyAccount: true }
      });

      return this._decryptAccount(fullAccount);
    }, { timeout: 15000 });
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
      await this.upsertBlueskyChannelSnapshots(brandId, socialAccountId, followersCount, followsCount, postsCount, analytics.balance, analytics.growth);
    }

    return account;
  }

  /**
   * Bluesky's author-feed aggregation (bluesky-analytics.service.js's
   * getAnalyticsReport) genuinely returns real per-day likes/replies/
   * reposts/quotes, summed from each real post's own counts — no
   * fabrication. AT Protocol's public API has no reach/impressions concept
   * for a developer app, so BlueskyChannelSnapshot has no such columns at
   * all (not even nulled ones) — there is nothing to ever populate there.
   * followersGained/Lost are always 0 (never computed from a real delta
   * source, same as Instagram/Threads) — followersCount can only
   * accumulate forward from today, never be backfilled.
   */
  async upsertBlueskyChannelSnapshots(brandId, socialAccountId, currentFollowersCount, currentFollowsCount, currentPostsCount, balanceRows, growthRows, client = prisma) {
    if (!Array.isArray(balanceRows) || balanceRows.length === 0) return [];

    const growthByDate = new Map((growthRows || []).map((row) => [row.date, row]));

    const dailyRows = balanceRows.map((balance) => {
      const growth = growthByDate.get(balance.date) || {};
      return {
        date: balance.date,
        followersGained: balance.acquired ?? null,
        followersLost: balance.lost ?? null,
        columns: {
          likes: growth.likes ?? null,
          replies: growth.replies ?? null,
          reposts: growth.reposts ?? null,
          quotes: growth.quotes ?? null
        }
      };
    });

    const current = {
      staticColumns: {
        followsCount: parseInt(currentFollowsCount) || 0,
        postsCount: parseInt(currentPostsCount) || 0
      },
      reconstructible: [
        {
          column: 'followersCount',
          currentValue: parseInt(currentFollowersCount) || 0,
          gainedKey: 'followersGained',
          lostKey: 'followersLost',
          emitDeltaColumns: true
        }
      ]
    };

    return channelSnapshotRepository.upsertChannelSnapshots(
      client.channelMetricDaily,
      brandId,
      socialAccountId,
      PLATFORMS.BLUESKY,
      current,
      dailyRows,
      false
    );
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


  /**
   * Connected accounts whose lastSyncAt is past the cooldown (or never
   * synced) — used by SocialMetricsSyncScheduler to publish one QStash
   * message per due account instead of force-syncing every account on
   * every brand at the top of the hour regardless of how recently each was
   * synced (the previous behavior, which spiked platform API calls and
   * blocked the main process for however many brands existed).
   */
  async findDueForMetricsSync(cooldownHours, limit) {
    const threshold = new Date(Date.now() - cooldownHours * 60 * 60 * 1000);
    return prisma.socialAccount.findMany({
      where: {
        isConnected: true,
        OR: [
          { lastSyncAt: null },
          { lastSyncAt: { lt: threshold } }
        ]
      },
      select: { id: true, platform: true, brandId: true },
      take: limit
    });
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

  // Distinct from findDueForMetricsSync (per-post metrics cooldown) — this
  // scans for accounts (any platform, or all 6 if platform is omitted) whose
  // published-post list hasn't been re-pulled from the live API recently,
  // feeding PostsSyncSchedulerService (Smart Fetch's only Sync trigger
  // besides OAuth-connect backfill and the manual-refresh endpoint).
  async findDueForPostsSync(cooldownHours, limit, platform = null) {
    const threshold = new Date(Date.now() - cooldownHours * 60 * 60 * 1000);
    return prisma.socialAccount.findMany({
      where: {
        ...(platform ? { platform } : {}),
        isConnected: true,
        OR: [
          { lastPostsSyncAt: null },
          { lastPostsSyncAt: { lt: threshold } }
        ]
      },
      select: { id: true, platform: true, brandId: true },
      take: limit
    });
  }

  async updateLastPostsSyncAt(id) {
    return prisma.socialAccount.update({
      where: { id },
      data: { lastPostsSyncAt: new Date() }
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
