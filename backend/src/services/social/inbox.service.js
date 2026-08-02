const prisma = require('../../config/prisma');
const inboxRepository = require('../../repositories/social/inbox.repository');
const socialAccountRepository = require('../../repositories/social/social-account.repository');
const authorizationFacade = require('../auth/authorization.facade');
const { PLATFORMS, INBOX_STATUS, INBOX_TYPES, SOCIAL_TECHNICAL } = require('../../utils/constants');
const inboxFormatter = require('./inbox/inbox-formatter');
const socialPlatformFactory = require('./social-platform.factory');

const QueryPipeline = require('../../core/query-pipeline/query.pipeline');
const InboxSearchFilter = require('./inbox/filters/search.filter');
const InboxPlatformFilter = require('./inbox/filters/platform.filter');
const InboxTabFilter = require('./inbox/filters/tab.filter');
const InboxStatusFilter = require('./inbox/filters/status.filter');
const InboxTypeFilter = require('./inbox/filters/type.filter');
const InboxSocialAccountFilter = require('./inbox/filters/social-account.filter');

const YoutubeCommentSyncStrategy = require('./inbox/strategies/youtube-comment.strategy');
const FacebookCommentSyncStrategy = require('./inbox/strategies/facebook-comment.strategy');
const FacebookDMSyncStrategy = require('./inbox/strategies/facebook-dm.strategy');
const InstagramDMSyncStrategy = require('./inbox/strategies/instagram-dm.strategy');
const TiktokCommentSyncStrategy = require('./inbox/strategies/tiktok-comment.strategy');
const autoReplyService = require('./inbox/strategies/auto-reply/auto-reply.service');

class InboxService {
  constructor() {
    this.queryPipeline = new QueryPipeline([
      new InboxSearchFilter(),
      new InboxPlatformFilter(),
      new InboxTabFilter(),
      new InboxStatusFilter(),
      new InboxTypeFilter(),
      new InboxSocialAccountFilter()
    ]);

    this.strategies = [
      new YoutubeCommentSyncStrategy(),
      new FacebookCommentSyncStrategy(),
      new FacebookDMSyncStrategy(),
      new InstagramDMSyncStrategy(),
      new TiktokCommentSyncStrategy()
    ];
  }

  /**
   * Get filtered inbox items for a brand
   */
  async getInboxItems(queryParams, brandId) {
    const { page = 1, limit = 20 } = queryParams;
    const { skip, take } = this._getPagination(page, limit);

    const initialWhere = { inbox: { brandId }, parentItemId: null };
    const where = this.queryPipeline.apply(initialWhere, queryParams);

    const { items, total } = await inboxRepository.findManyAndCount(where, { skip, take });

    return {
      data: items.map(item => inboxFormatter.formatInboxListItem(item)),
      meta: {
        total,
        page: Math.max(1, parseInt(page) || 1),
        limit: take,
        totalPages: Math.ceil(total / take)
      }
    };
  }

  /**
   * post.platformPostId is stored either as a legacy plain string (older
   * YouTube-only posts) or as a JSON map of { PLATFORM: platformPostId }
   * (see UpdatePostStatusStep — multi-platform posts since #61). Using the
   * raw column value directly as a post's "id" silently treated the JSON
   * text itself as an ID for every non-legacy post, which broke matching
   * against comments (keyed by the real platform post ID) and any
   * platform-specific link/URL built from it.
   */
  _resolvePlatformPostId(post) {
    if (!post.platformPostId) return null;
    try {
      const parsed = JSON.parse(post.platformPostId);
      if (parsed && typeof parsed === 'object') {
        const platforms = (post.targetPlatforms || '').split(',').map(p => p.trim()).filter(Boolean);
        for (const p of platforms) {
          if (parsed[p]) return parsed[p];
        }
        return Object.values(parsed)[0] || null;
      }
    } catch (e) {
      // Not JSON — legacy plain-string format (YouTube video ID).
      return post.platformPostId;
    }
    return post.platformPostId;
  }

  /**
   * Best-effort "view on platform" URL for a DB Post, given its resolved
   * (real, platform-specific) post ID — used where no live-fetched
   * permalink_url is available (dbPost is PubliCast's own record, not a
   * fresh Graph API response).
   */
  _buildPlatformPostUrl(targetPlatforms, postId) {
    if (!postId) return null;
    const platform = (targetPlatforms || '').split(',')[0]?.trim().toUpperCase();
    if (platform === 'FACEBOOK') return `https://www.facebook.com/${postId}`;
    if (platform === 'YOUTUBE') return `https://www.youtube.com/watch?v=${postId}`;
    return null;
  }

  /**
   * Helper to resolve genuine thumbnail URL for a post entity with video cover fallbacks
   */
  _resolveRealThumbnail(item, dbPost, trackedVideo, index = 0) {
    if (trackedVideo?.thumbnailUrl) return trackedVideo.thumbnailUrl;
    if (item?.videoContext?.thumbnailUrl && !item.videoContext.thumbnailUrl.includes('dicebear')) {
      return item.videoContext.thumbnailUrl;
    }

    // Parse from DB Post mediaUrls or mediaThumbnailUrls
    if (dbPost) {
      const rawMedia = dbPost.mediaThumbnailUrls || dbPost.mediaUrls;
      if (rawMedia) {
        try {
          const parsed = JSON.parse(rawMedia);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const first = parsed[0];
            const url = typeof first === 'string' ? first : first?.url || first?.previewUrl;
            if (url) return url;
          }
        } catch (e) {
          if (typeof rawMedia === 'string' && rawMedia.startsWith('http')) {
            return rawMedia.split(',')[0].trim();
          }
        }
      }
    }

    // Parse from InboxItem mediaUrls
    if (item?.mediaUrls) {
      try {
        const parsed = JSON.parse(item.mediaUrls);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = parsed[0];
          const url = typeof first === 'string' ? first : first?.url || first?.previewUrl;
          if (url) return url;
        }
      } catch (e) {
        if (typeof item.mediaUrls === 'string' && item.mediaUrls.startsWith('http')) {
          return item.mediaUrls.split(',')[0].trim();
        }
      }
    }

    // Check YouTube platform / valid YouTube video ID for genuine public thumbnail.
    // dbPost.platformPostId (the real YouTube video ID assigned once a Post
    // publishes) must come before dbPost.id (PubliCast's internal UUID,
    // which is never a valid YouTube thumbnail URL) — falling through to
    // dbPost.id here previously meant every published DB Post without
    // mediaThumbnailUrls/mediaUrls saved ended up with no thumbnail at all,
    // even though its real video ID was sitting right there on the row.
    const postId = item?.relatedPostId || item?.videoContext?.id || trackedVideo?.videoId || (dbPost ? this._resolvePlatformPostId(dbPost) : null) || dbPost?.id;
    if ((item?.platform === 'YOUTUBE' || trackedVideo || (typeof postId === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(postId))) && postId) {
      return `https://i.ytimg.com/vi/${postId}/hqdefault.jpg`;
    }

    // Return null if no genuine thumbnail media available (absolutely NO mock unsplash images)
    return null;
  }

  /**
   * Fetch real published posts directly from every connected platform's API
   * (YouTube/Facebook/Instagram/TikTok), normalized to one shape
   * { id, title, thumbnailUrl, platform, publishedAt }. Each platform's raw
   * response shape differs (videos[] vs data[], title vs message,
   * thumbnailUrl vs mediaUrl, publishedAt string vs Date) — see the
   * per-platform normalizers below. Failures for one platform/account don't
   * block the others; each is caught and logged individually.
   *
   * @param {string[]} [socialAccountIds] - When provided, only fetch posts
   *   for these accounts (the "Channels" filter in the Inbox UI). Omitted
   *   or empty means every connected account on the brand.
   */
  async _fetchAllPlatformPosts(brandId, socialAccountIds = []) {
    let socialAccounts = [];
    try {
      socialAccounts = await prisma.socialAccount.findMany({
        where: {
          brandId,
          isConnected: true,
          ...(socialAccountIds.length > 0 ? { id: { in: socialAccountIds } } : {})
        }
      });
    } catch (e) {
      console.error("[getInboxPosts] Failed to load connected social accounts:", e.message);
      return [];
    }

    const normalizers = {
      YOUTUBE: (res, socialAccountId) => (res?.videos || []).map(v => ({
        id: v.id,
        title: v.title || null,
        thumbnailUrl: v.thumbnailUrl || null,
        platform: 'YOUTUBE',
        publishedAt: v.publishedAt || null,
        postUrl: `https://www.youtube.com/watch?v=${v.id}`,
        socialAccountId,
        views: parseInt(v.views || 0, 10),
        likes: parseInt(v.likes || 0, 10),
        comments: parseInt(v.comments || 0, 10),
      })),
      FACEBOOK: (res, socialAccountId) => (res?.data || []).map(p => ({
        id: p.id,
        title: p.message?.slice(0, 60) || null,
        thumbnailUrl: p.mediaUrl || null,
        platform: 'FACEBOOK',
        publishedAt: p.date || null,
        postUrl: p.postUrl || `https://www.facebook.com/${p.id}`,
        socialAccountId,
        views: parseInt(p.video_views || p.views || 0, 10),
        likes: parseInt(p.reactions?.summary?.total_count || p.reactions || p.likes || 0, 10),
        comments: parseInt(p.comments?.summary?.total_count || p.comments || 0, 10),
        shares: parseInt(p.shares?.count || p.shares || 0, 10),
        clicks: parseInt(p.clicks || 0, 10),
        reach: parseInt(p.reach || p.impressions || 0, 10),
      })),
      INSTAGRAM: (res, socialAccountId) => (res?.data || []).map(p => ({
        id: p.id,
        title: p.message?.slice(0, 60) || null,
        thumbnailUrl: p.thumbnailUrl || p.mediaUrl || null,
        platform: 'INSTAGRAM',
        publishedAt: p.date || null,
        postUrl: p.postUrl || null,
        socialAccountId,
        likes: parseInt(p.like_count || p.likes || 0, 10),
        comments: parseInt(p.comments_count || p.comments || 0, 10),
      })),
      TIKTOK: (res, socialAccountId) => (res?.videos || []).map(v => ({
        id: v.id,
        title: v.title || null,
        thumbnailUrl: v.thumbnailUrl || null,
        platform: 'TIKTOK',
        publishedAt: v.publishedAt || null,
        postUrl: v.shareUrl || null,
        socialAccountId,
        views: parseInt(v.view_count || v.views || 0, 10),
        likes: parseInt(v.like_count || v.likes || 0, 10),
        comments: parseInt(v.comment_count || v.comments || 0, 10),
        shares: parseInt(v.share_count || v.shares || 0, 10),
      })),
    };

    // TikTok's video/list endpoint caps max_count at 20 per call (enforced
    // in tiktok.gateway.js#getVideoList) — unlike the other platforms, a
    // single limit=50 call silently truncates to whatever the API allows
    // per page, so fetching this inbox requires walking pages via the
    // cursor (nextPageToken/has_more).
    //
    // Fetching a channel's ENTIRE history here would be both slow (TikTok
    // only allows 20/page, so an old, prolific channel could mean dozens of
    // sequential requests) and pointless for an inbox whose job is
    // surfacing recent comments to reply to, not archiving. Stop at
    // whichever comes first: posts older than RECENT_WINDOW_MONTHS, or
    // MAX_POST_COUNT total — the time window bounds the common case (an
    // active channel), the hard count cap bounds the pathological one (a
    // channel that posts many times a day, where "3 months" could still be
    // thousands of videos).
    const RECENT_WINDOW_MONTHS = 3;
    const MAX_POST_COUNT = 200;
    const recentCutoff = new Date();
    recentCutoff.setMonth(recentCutoff.getMonth() - RECENT_WINDOW_MONTHS);

    const fetchTikTokPaged = async (socialAccountId) => {
      const service = socialPlatformFactory.getService('TIKTOK');
      let cursor = 0;
      let videos = [];
      let hasMore = true;
      while (hasMore && videos.length < MAX_POST_COUNT) {
        const page = await service.getPublishedVideos(brandId, cursor, 20, socialAccountId);
        const pageVideos = page?.videos || [];
        if (pageVideos.length === 0) break;

        // TikTok returns videos newest-first, so once one video in a page
        // is older than the cutoff, every video after it (this page and
        // all subsequent pages) is guaranteed older too — safe to stop
        // instead of walking the rest of the channel's history.
        const cutoffIndex = pageVideos.findIndex(v => v.publishedAt && new Date(v.publishedAt) < recentCutoff);
        if (cutoffIndex === -1) {
          videos = videos.concat(pageVideos);
          hasMore = Boolean(page?.nextPageToken);
          cursor = page?.nextPageToken || 0;
        } else {
          videos = videos.concat(pageVideos.slice(0, cutoffIndex));
          hasMore = false;
        }
      }
      return { videos: videos.slice(0, MAX_POST_COUNT) };
    };

    const fetchers = {
      YOUTUBE: (socialAccountId) => socialPlatformFactory.getService('YOUTUBE').getPublishedVideos(brandId, null, 50, socialAccountId),
      FACEBOOK: (socialAccountId) => socialPlatformFactory.getService('FACEBOOK').getPublishedVideos(brandId, null, 50, socialAccountId),
      INSTAGRAM: (socialAccountId) => socialPlatformFactory.getService('INSTAGRAM').getPublishedVideos(brandId, null, 50, socialAccountId),
      TIKTOK: fetchTikTokPaged,
    };

    const fetchableAccounts = socialAccounts.filter(sa => fetchers[sa.platform]);
    const results = await Promise.allSettled(
      fetchableAccounts.map(sa => fetchers[sa.platform](sa.id).then(res => normalizers[sa.platform](res, sa.id)))
    );

    const posts = [];
    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        posts.push(...result.value);
      } else {
        console.error(`[getInboxPosts] Failed to fetch published posts for account ${fetchableAccounts[idx]?.id} (${fetchableAccounts[idx]?.platform}):`, result.reason?.message || result.reason);
      }
    });
    return posts;
  }

  /**
   * Get distinct posts with comment statistics for a brand (Post-First Strategy)
   * Queries real DB Posts & TrackedVideos, and aggregates comment statistics.
   */
  async getInboxPosts(brandId, queryParams = {}) {
    const { page = 1, limit = 20, socialAccountId } = queryParams;
    const { skip, take } = this._getPagination(page, limit);

    const socialAccountIds = (socialAccountId && socialAccountId !== 'All')
      ? socialAccountId.split(',').filter(Boolean)
      : [];

    // When scoped to specific accounts, resolve their platform types and
    // platformAccountId (the YouTube channelId / Facebook pageId etc.) up
    // front — dbPosts only carries a platform-type string (no account FK)
    // and trackedVideos only carries channelId, so both need this lookup to
    // be filtered at all.
    let scopedAccounts = [];
    if (socialAccountIds.length > 0) {
      try {
        scopedAccounts = await prisma.socialAccount.findMany({
          where: { id: { in: socialAccountIds }, brandId }
        });
      } catch (e) {
        console.error("[getInboxPosts] Prisma scopedAccounts query error:", e);
      }
    }
    const scopedPlatforms = [...new Set(scopedAccounts.map(sa => sa.platform))];
    const scopedChannelIds = scopedAccounts.map(sa => sa.platformAccountId).filter(Boolean);

    // 1. Fetch published posts for the brand from Prisma DB.
    // Post has no direct socialAccountId FK (only a platform-type string in
    // targetPlatforms), so scoping to a specific account can only be done at
    // platform-type granularity here — best effort when a brand has more
    // than one connected account on the same platform.
    let dbPosts = [];
    try {
      dbPosts = await prisma.post.findMany({
        where: {
          brandId,
          isDeleted: false,
          status: 'PUBLISHED',
          ...(scopedPlatforms.length > 0
            ? { OR: scopedPlatforms.map(p => ({ targetPlatforms: { contains: p } })) }
            : {})
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      });
    } catch (e) {
      console.error("[getInboxPosts] Prisma dbPosts query error:", e);
    }

    // 2. Fetch tracked YouTube videos for the brand
    let trackedVideos = [];
    try {
      trackedVideos = await prisma.trackedVideo.findMany({
        where: {
          brandId,
          ...(socialAccountIds.length > 0 ? { channelId: { in: scopedChannelIds } } : {})
        },
        orderBy: { addedAt: 'desc' },
        take: 50
      });
    } catch (e) {
      console.error("[getInboxPosts] Prisma trackedVideos query error:", e);
    }

    // 2b. Fetch real published posts directly from each connected platform's
    // API (YouTube/Facebook/Instagram/TikTok). dbPosts/trackedVideos above
    // only cover posts PubliCast itself published or the user manually
    // tracked — a video/post published outside PubliCast (or before the
    // account was connected) never gets a Post/TrackedVideo row, so it was
    // invisible here even though the channel stats page (which calls these
    // same platform APIs directly) shows it fine.
    const platformPosts = await this._fetchAllPlatformPosts(brandId, socialAccountIds);

    // 3. Fetch inbox items for comment stats
    const initialWhere = { inbox: { brandId }, parentItemId: null };
    const where = this.queryPipeline.apply(initialWhere, queryParams);
    const { items } = await inboxRepository.findManyAndCount(where, { skip: 0, take: 200 });

    const postsMap = new Map();

    // Add published DB Posts first.
    // Key by platformPostId (the real YouTube video ID a published Post got
    // assigned) when available, falling back to post.id (internal UUID) only
    // for posts that haven't published yet / have no platform ID. Comments
    // synced later for the same video arrive keyed by their own
    // relatedPostId (also the real video ID) — using post.id here for
    // already-published posts made the same video show up twice: once as a
    // "0 comments" DB Post entry and once as a separate synced-comment entry,
    // because the two loops never produced matching keys.
    dbPosts.forEach((post, idx) => {
      const thumbnail = this._resolveRealThumbnail(null, post, null, idx);
      const postTitle = post.title || post.caption?.slice(0, 60) || `Bài viết #${idx + 1}`;
      const postKey = this._resolvePlatformPostId(post) || post.id;
      const postUrl = this._buildPlatformPostUrl(post.targetPlatforms, postKey);

      postsMap.set(postKey, {
        id: postKey,
        title: postTitle,
        thumbnailUrl: thumbnail,
        mediaUrl: thumbnail,
        videoContext: {
          id: postKey,
          title: postTitle,
          thumbnailUrl: thumbnail,
          channelTitle: post.targetPlatforms || "PubliCast Channel",
          postUrl
        },
        platform: post.targetPlatforms || "Social",
        commentCount: 0,
        unreadCount: 0,
        latestCommentAt: post.createdAt,
        rawItem: null,
      });
    });

    // Add tracked YouTube videos
    trackedVideos.forEach((video, idx) => {
      if (!postsMap.has(video.videoId)) {
        const thumb = this._resolveRealThumbnail(null, null, video, idx);
        const title = video.title || `YouTube Video (${video.videoId})`;
        postsMap.set(video.videoId, {
          id: video.videoId,
          title,
          thumbnailUrl: thumb,
          mediaUrl: thumb,
          videoContext: {
            id: video.videoId,
            title,
            thumbnailUrl: thumb,
            channelTitle: video.channelName || "YouTube Channel",
            postUrl: `https://www.youtube.com/watch?v=${video.videoId}`
          },
          platform: "YOUTUBE",
          commentCount: video.lastComments || 0,
          unreadCount: 0,
          latestCommentAt: video.publishedAt || video.addedAt,
          rawItem: null,
        });
      }
    });

    // Add real published posts fetched directly from each connected
    // platform's API — fills the gap dbPosts/trackedVideos leave for posts
    // never published through PubliCast or tracked manually.
    platformPosts.forEach((post) => {
      if (!postsMap.has(post.id)) {
        postsMap.set(post.id, {
          id: post.id,
          title: post.title,
          thumbnailUrl: post.thumbnailUrl,
          mediaUrl: post.thumbnailUrl,
          videoContext: {
            id: post.id,
            title: post.title,
            thumbnailUrl: post.thumbnailUrl,
            channelTitle: `${post.platform} Channel`,
            postUrl: post.postUrl || null,
            views: post.views || 0,
            likes: post.likes || 0,
            comments: post.comments || 0,
            shares: post.shares || 0,
            clicks: post.clicks || 0,
          },
          platform: post.platform,
          socialAccountId: post.socialAccountId || null,
          commentCount: post.comments || 0,
          unreadCount: 0,
          views: post.views || 0,
          likes: post.likes || 0,
          comments: post.comments || 0,
          shares: post.shares || 0,
          clicks: post.clicks || 0,
          latestCommentAt: post.publishedAt || null,
          rawItem: null,
        });
      }
    });

    // Aggregate inbox items into postsMap
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const formatted = inboxFormatter.formatInboxListItem(item);
      const postId = item.relatedPostId || item.platformItemId || item.id;

      if (!postsMap.has(postId)) {
        const thumbnail = this._resolveRealThumbnail(item, null, null, index);
        const postTitle = item.videoContext?.title || `Bài viết (${formatted.platform})`;

        postsMap.set(postId, {
          id: postId,
          title: postTitle,
          thumbnailUrl: thumbnail,
          mediaUrl: thumbnail,
          videoContext: {
            id: postId,
            title: postTitle,
            thumbnailUrl: thumbnail,
            channelTitle: `${formatted.platform} Channel`,
            postUrl: this._buildPlatformPostUrl(formatted.platform, postId)
          },
          platform: formatted.platform,
          commentCount: 1,
          unreadCount: formatted.unread ? 1 : 0,
          latestCommentAt: item.platformCreatedAt || item.createdAt,
          rawItem: formatted,
        });
      } else {
        const existing = postsMap.get(postId);
        existing.commentCount += 1;
        if (formatted.unread) existing.unreadCount += 1;
        if (!existing.rawItem) existing.rawItem = formatted;
      }
    }

    const postsList = Array.from(postsMap.values());
    const paginatedPosts = postsList.slice(skip, skip + take);

    return {
      data: paginatedPosts,
      meta: {
        total: postsList.length,
        page: Math.max(1, parseInt(page) || 1),
        limit: take,
        totalPages: Math.max(1, Math.ceil(postsList.length / take))
      }
    };
  }

  /**
   * Get comments and thread messages belonging to a specific post
   */
  async getCommentsByPost(brandId, postId, queryParams = {}) {
    const initialWhere = {
      inbox: { brandId },
      parentItemId: null,
      OR: [
        { relatedPostId: postId },
        { platformItemId: postId },
        { id: postId }
      ]
    };

    const { items } = await inboxRepository.findManyAndCount(initialWhere, { skip: 0, take: 50 });

    if (!items || items.length === 0) {
      return { data: [], thread: [], videoContext: null };
    }

    // brandId here was already verified by the checkBrandAccess route
    // middleware, so pass it as claimedBrandId (item.inbox.brandId ===
    // claimedBrandId check) rather than userId — getConversationThread's
    // second param is a real user id for authorizationFacade.checkBrandAccess,
    // and passing a brandId there always evaluated to false, 403ing every
    // getCommentsByPost call (#post-first-inbox).
    //
    // A post can have several top-level comments (`items`), each with its
    // own replies. getConversationThread only resolves ONE item's own
    // thread (itself + its replies) — calling it just once against
    // items[0] silently dropped every other top-level comment from the
    // returned `thread`, even though `data` above already listed all of
    // them. Flatten every item's thread together so the UI's comment list
    // (which renders `thread`, not `data`) shows the full real comment set.
    const threadResults = await Promise.all(
      items.map(item => this.getConversationThread(item.id, null, brandId))
    );

    return {
      data: items.map(item => inboxFormatter.formatInboxListItem(item)),
      thread: threadResults.flatMap(r => r.thread),
      videoContext: threadResults.find(r => r.videoContext)?.videoContext || null
    };
  }

  async getConversationThread(itemId, userId, claimedBrandId = null) {
    const item = await this._getAuthorizedItem(itemId, userId, claimedBrandId);

    const myAccountId = await this._getMyPlatformAccountId(item);
    const videoContext = await this._getVideoContext(item);

    const thread = [
      inboxFormatter.formatThreadMessage(item, myAccountId),
      ...(item.replies || []).map(r => inboxFormatter.formatThreadMessage(r, myAccountId))
    ];

    return { item, thread, videoContext };
  }

  async syncPlatformComments(brandId, platform) {
    try {
      const inbox = await inboxRepository.findOrCreateInbox(brandId);
      const activeStrategies = this.strategies.filter(s => s.supports(platform));
      
      if (activeStrategies.length === 0) {
        console.warn(`No sync strategies found for platform: ${platform}`);
        return [];
      }

      let allSyncedItems = [];
      for (const strategy of activeStrategies) {
        try {
          const items = await strategy.sync(brandId, inbox);
          if (items && items.length > 0) {
            allSyncedItems = allSyncedItems.concat(items);
          }
        } catch (err) {
          console.error(`Strategy ${strategy.constructor.name} failed during sync:`, err.message);
        }
      }

      await inboxRepository.updateInboxLastSync(inbox.id);
      return allSyncedItems;
    } catch (e) {
      console.error(`Failed to sync platform comments/messages for ${platform}:`, e.message);
      return [];
    }
  }

  async _seedMockInboxItems(brandId, platform) {
    const inbox = await inboxRepository.findOrCreateInbox(brandId);
    const platformUpper = platform.toUpperCase();
    
    const mockUsers = [
      { name: "Nguyễn Văn Nam", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop" },
      { name: "Trần Thị Mai", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop" },
      { name: "Lê Minh Tuấn", avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop" },
      { name: "Phạm Hồng Nhung", avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop" }
    ];

    const mockMessages = {
      COMMENT: [
        "Bài viết này hay quá, mình rất thích cách trình bày của bên bạn!",
        "Cho mình hỏi video này quay bằng thiết bị gì mà đẹp thế ạ?",
        "Mong bên bạn ra thêm nhiều nội dung chất lượng như thế này nữa nhé.",
        "Thông tin rất hữu ích, cảm ơn PubliCast nhiều nhé!"
      ],
      DIRECT_MESSAGE: [
        "Chào bạn, mình muốn hỏi về chi phí hợp tác truyền thông bên bạn.",
        "Dịch vụ bên mình có hỗ trợ xuất hóa đơn VAT không ạ?",
        "Mình đã gửi email liên hệ hợp tác, bạn check giúp mình nhé.",
        "Tư vấn giúp mình gói dịch vụ Marketing cho doanh nghiệp nhỏ với ạ."
      ]
    };

    const seededItems = [];

    // Create 3 comments and 2 DMs
    for (let i = 0; i < 5; i++) {
      const type = i < 3 ? INBOX_TYPES.COMMENT : INBOX_TYPES.DIRECT_MESSAGE;
      // Skip DMs for YouTube (YouTube doesn't have DMs)
      if (platformUpper === 'YOUTUBE' && type === INBOX_TYPES.DIRECT_MESSAGE) {
        continue;
      }
      
      const user = mockUsers[i % mockUsers.length];
      const content = mockMessages[type][i % mockMessages[type].length];
      const platformItemId = `mock_${platform.toLowerCase()}_${type.toLowerCase()}_${Date.now()}_${i}`;

      const item = await inboxRepository.createInboxItem({
        inboxId: inbox.id,
        platform: platformUpper,
        type: type,
        platformItemId,
        authorId: `author_${i}`,
        authorName: user.name,
        authorAvatarUrl: user.avatar,
        content,
        platformCreatedAt: new Date(Date.now() - i * 3600000),
        syncedAt: new Date(),
        status: INBOX_STATUS.UNREAD
      });

      // Add a reply to first item to make thread look rich
      if (i === 0) {
        await inboxRepository.createInboxItem({
          inboxId: inbox.id,
          platform: platformUpper,
          type: type,
          platformItemId: `${platformItemId}_reply`,
          parentItemId: item.id,
          authorId: `author_brand`,
          authorName: "PubliCast Agent",
          authorAvatarUrl: "",
          content: "Cảm ơn bạn rất nhiều! Chúng tôi sẽ liên hệ lại ngay nhé.",
          platformCreatedAt: new Date(Date.now() - i * 3600000 + 600000),
          syncedAt: new Date(),
          status: INBOX_STATUS.READ
        });
      }

      seededItems.push(item);
    }

    await inboxRepository.updateInboxLastSync(inbox.id);
    return seededItems;
  }

  async replyToItem(brandId, itemId, text, userId, attachmentUrl = null) {
    const item = await this._getAuthorizedItem(itemId, userId, brandId);

    const strategy = this.strategies.find(s => s.supportsReply(item));
    if (!strategy) {
      throw new Error(`No reply strategy found for platform ${item.platform} and type ${item.type}`);
    }

    // item.socialAccountId is whichever account synced this comment/DM in —
    // routing the reply through that exact account (not an arbitrary pick)
    // matters once a brand has more than one account of the platform.
    const reply = await strategy.reply(brandId, item.platformItemId, text, item.socialAccountId, attachmentUrl);
    
    // Update parent conversation to reflect the reply (update snippet text, sorting time and mark as READ)
    // and record who replied / when — drives the "Replied" tab filter.
    await inboxRepository.updateInboxItem(itemId, {
      content: text,
      platformCreatedAt: new Date(),
      status: INBOX_STATUS.READ,
      repliedByUserId: userId || null,
      repliedAt: new Date()
    });

    return reply;
  }

  // Posts a brand-new top-level comment on a post/video that currently has
  // no synced InboxItem to reply to (0-comment posts) — unlike replyToItem,
  // there's no existing item for authorization, so brand access is checked
  // directly instead of going through _getAuthorizedItem.
  async postNewComment(brandId, postId, platform, text, userId, socialAccountId = null, attachmentUrl = null) {
    const hasAccess = await authorizationFacade.checkBrandAccess(userId, brandId);
    if (!hasAccess) {
      throw { status: 403, message: 'Bạn không có quyền truy cập vào thương hiệu này.' };
    }

    const strategy = this.strategies.find(s => s.supportsNewComment && s.supportsNewComment(platform));
    if (!strategy) {
      throw new Error(`Posting a new comment is not supported for platform ${platform}`);
    }

    return await strategy.createComment(brandId, postId, text, socialAccountId, attachmentUrl);
  }

  async updateReply(brandId, replyId, text, userId) {
    const reply = await this._getAuthorizedItem(replyId, userId, brandId, 'Reply not found');

    const strategy = this.strategies.find(s => s.supportsReply(reply));
    if (!strategy) {
      throw new Error(`No strategy found to update reply for platform ${reply.platform}`);
    }

    await strategy.updateReply(brandId, reply.platformItemId, text, reply.socialAccountId);
    return await inboxRepository.updateInboxItem(replyId, { content: text });
  }

  async deleteReply(brandId, replyId, userId) {
    const reply = await this._getAuthorizedItem(replyId, userId, brandId, 'Reply not found');

    const strategy = this.strategies.find(s => s.supportsReply(reply));
    if (!strategy) {
      throw new Error(`No strategy found to delete reply for platform ${reply.platform}`);
    }

    await strategy.deleteReply(brandId, reply.platformItemId, reply.socialAccountId);
    return await inboxRepository.deleteInboxItem(replyId);
  }

  async updateItemStatus(itemId, status, userId) {
    const item = await inboxRepository.findById(itemId);
    if (!item) {
      return { id: itemId, status: status.toLowerCase() };
    }
    await this._getAuthorizedItem(itemId, userId);
    return await inboxRepository.updateStatus(itemId, status.toUpperCase());
  }

  async updateItemMetadata(itemId, { tags, internalNotes }, userId) {
    await this._getAuthorizedItem(itemId, userId);

    const updateData = {};
    if (tags !== undefined) updateData.tags = tags;
    if (internalNotes !== undefined) updateData.internalNotes = internalNotes;

    return await inboxRepository.updateInboxItem(itemId, updateData);
  }

  // ============= Private Helper Methods =============

  /**
   * Fetch an inbox item/reply by ID and enforce brand authorization in one place.
   * If claimedBrandId is provided, it must match the item's real brand (guards against
   * a caller sending a brandId it's authorized for to act on another brand's item).
   */
  async _getAuthorizedItem(itemId, userId, claimedBrandId, notFoundMessage = 'Item not found') {
    const item = await inboxRepository.findById(itemId);
    if (!item) throw { status: 404, message: notFoundMessage };

    if (claimedBrandId && item.inbox.brandId !== claimedBrandId) {
      throw { status: 404, message: notFoundMessage };
    }

    // A verified claimedBrandId (e.g. from a route already gated by the
    // checkBrandAccess middleware) is sufficient proof of access on its
    // own — skip the redundant per-user check, since callers in that path
    // don't have a real userId to pass (only a brandId, which
    // checkBrandAccess(userId, brandId) would otherwise always reject).
    if (!claimedBrandId || userId) {
      const hasAccess = await authorizationFacade.checkBrandAccess(userId, item.inbox.brandId);
      if (!hasAccess) {
        throw { status: 403, message: 'Bạn không có quyền truy cập vào thương hiệu này.' };
      }
    }

    return item;
  }

  _getPagination(page, limit) {
    const safePage = Math.max(1, parseInt(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));
    return { skip: (safePage - 1) * safeLimit, take: safeLimit };
  }

  async _getMyPlatformAccountId(item) {
    if (item.socialAccountId) {
      const sa = await socialAccountRepository.findById(item.socialAccountId);
      return sa?.platformAccountId;
    }
    const sa = await socialAccountRepository.findByBrandAndPlatformFirst(item.inbox.brandId, item.platform);
    return sa?.platformAccountId;
  }

  async _getVideoContext(item) {
    if (!item.relatedPostId) return null;
    try {
      const service = socialPlatformFactory.getService(item.platform);
      return await service.getVideoDetails(item.inbox.brandId, item.relatedPostId, item.socialAccountId || null);
    } catch (e) {
      console.error(`[InboxService] Error resolving _getVideoContext for item ${item.id} (platform: ${item.platform}, relatedPostId: ${item.relatedPostId}):`, e.message || e);
      if (item.platform === 'YOUTUBE' && typeof item.relatedPostId === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(item.relatedPostId)) {
        return {
          id: item.relatedPostId,
          title: item.videoContext?.title || `YouTube Video (${item.relatedPostId})`,
          thumbnailUrl: `https://i.ytimg.com/vi/${item.relatedPostId}/hqdefault.jpg`,
          channelTitle: "YouTube",
          postUrl: `https://www.youtube.com/watch?v=${item.relatedPostId}`
        };
      }
      // getVideoDetails failing shouldn't also silently drop the "view on
      // platform" link — a real post ID is still enough to build one.
      const fallbackPostUrl = this._buildPlatformPostUrl(item.platform, item.relatedPostId);
      if (fallbackPostUrl) {
        return {
          id: item.relatedPostId,
          title: item.videoContext?.title || `${item.platform} Post`,
          thumbnailUrl: null,
          channelTitle: item.platform,
          postUrl: fallbackPostUrl
        };
      }
      return null;
    }
  }

  async getAutoReplySettings(socialAccountId, userId) {
    await this._getAuthorizedSocialAccount(socialAccountId, userId);
    return await autoReplyService.getSettings(socialAccountId);
  }

  async saveAutoReplySettings(socialAccountId, data, userId) {
    await this._getAuthorizedSocialAccount(socialAccountId, userId);
    return await autoReplyService.saveSettings(socialAccountId, data);
  }

  /**
   * Fetch a SocialAccount by ID and enforce brand authorization — mirrors
   * _getAuthorizedItem but for routes keyed by socialAccountId instead of an
   * inbox item ID (auto-reply settings live on the SocialAccount, not on any
   * inbox item, so there's no item to fetch brandId from).
   */
  async _getAuthorizedSocialAccount(socialAccountId, userId) {
    const account = await socialAccountRepository.findById(socialAccountId);
    if (!account) throw { status: 404, message: 'Social account not found' };

    const hasAccess = await authorizationFacade.checkBrandAccess(userId, account.brandId);
    if (!hasAccess) {
      throw { status: 403, message: 'Bạn không có quyền truy cập vào thương hiệu này.' };
    }

    return account;
  }
}

module.exports = new InboxService();
