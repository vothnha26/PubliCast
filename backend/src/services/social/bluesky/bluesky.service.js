const BaseSocialService = require('../base-social.service');
const blueskyGateway = require('./bluesky.gateway');
const socialAccountRepository = require('../../../repositories/social/social-account.repository');
const QuotaTrackerService = require('../quota-tracker.service');
const { decrypt } = require('../../../utils/encryption');
const { PLATFORMS, QUOTA_TTL_STRATEGY } = require('../../../utils/constants');
const redisClient = require('../../../config/redis');
const BLUESKY_CONSTANTS = require('./bluesky.constants');

class BlueskyService extends BaseSocialService {
  constructor() {
    super();
    this.quotaTracker = new QuotaTrackerService(redisClient);
  }

  async _getAuthenticatedAgent(account) {
    const agent = blueskyGateway.createAgent(account.blueskyAccount?.pdsUrl);
    const accessJwt = decrypt(account.accessToken);
    const refreshJwt = account.refreshToken ? decrypt(account.refreshToken) : undefined;
    await blueskyGateway.resumeSession(agent, {
      accessJwt,
      refreshJwt,
      did: account.platformAccountId,
      handle: account.username
    });
    
    // Auto-sync emailConfirmed status if it became verified
    if (account.blueskyAccount && !account.blueskyAccount.emailConfirmed) {
      try {
        const latestSessionData = await blueskyGateway.getSession(agent);
        if (latestSessionData && latestSessionData.emailConfirmed === true) {
          await socialAccountRepository.updateBlueskyMetrics(account.id, {
            emailConfirmed: true
          });
          account.blueskyAccount.emailConfirmed = true;
        }
      } catch (err) {
        // Silently ignore if getSession fails so we don't break the whole flow
      }
    }

    return agent;
  }

  async connectChannel(brandId, { handle, appPassword }) {
    const agent = blueskyGateway.createAgent();
    const session = await blueskyGateway.loginWithAppPassword(agent, handle, appPassword);
    
    const profile = await blueskyGateway.getProfile(agent, session.data.did);

    // Sau khi login(), SDK cập nhật agent.pdsUrl từ didDoc trả về.
    // agent.pdsUrl là PDS thực sự của user (VD: discina.us-west.host.bsky.network).
    // Phải lưu vào DB để _getAuthenticatedAgent sau này createAgent đúng PDS endpoint,
    // đảm bảo getServiceAuth dùng đúng audience khi upload video.
    const pdsUrl = agent.pdsUrl?.href ?? agent.serviceUrl?.href ?? BLUESKY_CONSTANTS.DEFAULT_PDS_URL;

    return socialAccountRepository.upsertBlueskyAccount(brandId, {
      did: profile.did,
      handle: profile.handle,
      displayName: profile.displayName || profile.handle,
      avatarUrl: profile.avatar,
      accessToken: session.data.accessJwt,
      refreshToken: session.data.refreshJwt,
      emailConfirmed: Boolean(session.data.emailConfirmed),
      followersCount: profile.followersCount,
      followsCount: profile.followsCount,
      postsCount: profile.postsCount,
      pdsUrl
    });
  }

  async _checkAndIncrementQuota(socialAccountId, actionType = 'CREATE') {
    if (!this.quotaTracker) return;
    try {
      const serviceQuotaKey = `bluesky:${socialAccountId}`;
      const points = QUOTA_TTL_STRATEGY.BLUESKY.POINTS[actionType] || 1;

      // 1. Hourly rate limit check (reset every 1h)
      const newHourlyTotal = await this.quotaTracker.incrementAndGetHourly(serviceQuotaKey, points, 3600);
      if (typeof newHourlyTotal === 'number' && newHourlyTotal > QUOTA_TTL_STRATEGY.BLUESKY.HOURLY_LIMIT) {
        throw new Error(`Bluesky hourly rate limit exceeded (${newHourlyTotal}/${QUOTA_TTL_STRATEGY.BLUESKY.HOURLY_LIMIT} points)`);
      }

      // 2. Daily rate limit check (reset at midnight PT)
      const newDailyTotal = await this.quotaTracker.incrementAndGet(serviceQuotaKey, points);
      if (typeof newDailyTotal === 'number' && newDailyTotal > QUOTA_TTL_STRATEGY.BLUESKY.DAILY_LIMIT) {
        throw new Error(`Bluesky daily rate limit exceeded (${newDailyTotal}/${QUOTA_TTL_STRATEGY.BLUESKY.DAILY_LIMIT} points)`);
      }
    } catch (err) {
      if (err.message.includes('rate limit exceeded')) {
        throw err;
      }
      // Fallback gracefully if Redis client is not initialized in test/isolated env
    }
  }

  async publishPost(brandId, postData) {
    const account = await socialAccountRepository.findByBrandAndPlatformFirst(brandId, PLATFORMS.BLUESKY);
    if (!account) throw new Error('Bluesky account not connected');

    // Authenticate and sync latest state (e.g. emailConfirmed) first
    let agent;
    agent = await this._getAuthenticatedAgent(account);

    let images = postData.images || [];
    let video = postData.video || null;

    // Convert mediaUrls if passed from pipeline/postService
    if ((!images || images.length === 0) && !video && postData.mediaUrls && postData.mediaUrls.length > 0) {
      const fs = require('fs');
      const path = require('path');

      const fetchBuffer = async (mediaPath) => {
        if (typeof mediaPath !== 'string') return null;
        if (mediaPath.startsWith('http://') || mediaPath.startsWith('https://')) {
          const res = await fetch(mediaPath);
          if (!res.ok) {
            throw new Error(`Failed to fetch media from URL (HTTP ${res.status}): ${mediaPath}`);
          }
          const arrayBuffer = await res.arrayBuffer();
          return Buffer.from(arrayBuffer);
        } else {
          const fullPath = path.isAbsolute(mediaPath) ? mediaPath : path.join(process.cwd(), mediaPath);
          if (fs.existsSync(fullPath)) {
            return fs.readFileSync(fullPath);
          }
          return null;
        }
      };

      const firstMedia = postData.mediaUrls[0];
      const isVideoFile = typeof firstMedia === 'string' && firstMedia.match(/\.(mp4|mov|webm|mkv)$/i);

      if (isVideoFile) {
        if (!account.blueskyAccount?.emailConfirmed) {
          throw new Error('Tài khoản Bluesky chưa xác thực Email. Bluesky yêu cầu xác thực Email tại bsky.app > Settings > Confirm Email trước khi cho phép tải Video.');
        }
        const buf = await fetchBuffer(firstMedia);
        if (buf) {
          video = {
            buffer: buf,
            mimeType: 'video/mp4'
          };
        }
      } else {
        // Read up to 4 images for Bluesky
        const imageBuffers = await Promise.all(
          postData.mediaUrls.slice(0, 4).map(async (imgPath) => {
            const buf = await fetchBuffer(imgPath);
            if (!buf) return null;
            const ext = typeof imgPath === 'string' ? path.extname(imgPath).toLowerCase() : '';
            const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
            return { buffer: buf, mimeType };
          })
        );
        images = imageBuffers.filter(Boolean);
      }
    }

    // Pre-check email confirmation requirement for Video upload
    if (video && !account.blueskyAccount?.emailConfirmed) {
      throw new Error('Tài khoản Bluesky chưa xác thực Email. Bluesky yêu cầu xác thực Email tại bsky.app > Settings > Confirm Email trước khi cho phép tải Video.');
    }

    // Pre-check rate limit quota per account (DID) ONLY AFTER LOCAL VALIDATIONS PASS
    await this._checkAndIncrementQuota(account.id, 'CREATE');

    // Gọi gateway — nếu fail ở đây mới cần rollback quota
    let result;
    try {
      result = await blueskyGateway.publishPost(agent, {
        text: postData.caption || postData.text || postData.title || '',
        images,
        video,
        replyTo: postData.replyTo || null
      });
    } catch (gatewayErr) {
      // Rollback quota chỉ khi lỗi xảy ra ở tầng gateway (upload/publish thực sự)
      try {
        const serviceQuotaKey = `bluesky:${account.id}`;
        const points = QUOTA_TTL_STRATEGY.BLUESKY.POINTS['CREATE'] || 1;
        await this.quotaTracker.incrementAndGetHourly(serviceQuotaKey, -points, 3600);
        await this.quotaTracker.incrementAndGet(serviceQuotaKey, -points);
      } catch (rollbackErr) {
        // ignore rollback error
      }
      throw gatewayErr;
    }

    if (!result?.id) throw new Error('Bluesky publish failed: No post URI returned');

    // Post First Comment nếu có — Bluesky hỗ trợ reply qua AT Protocol.
    // firstComment lấy từ options (global field) hoặc trực tiếp từ postData.
    const firstCommentText = postData.options?.firstComment?.trim() || postData.firstComment?.trim();
    if (firstCommentText) {
      try {
        console.log(`[Bluesky] Posting first comment: "${firstCommentText}"`);
        // AT Protocol reply bắt buộc cần cả uri + cid cho cả root và parent
        const replyRef = { uri: result.id, cid: result.cid };
        await blueskyGateway.publishPost(agent, {
          text: firstCommentText,
          replyTo: { root: replyRef, parent: replyRef }
        });
        console.log(`[Bluesky] First comment posted successfully.`);
      } catch (commentErr) {
        // Không throw — lỗi comment không nên block kết quả publish
        console.error(`[Bluesky] Failed to post first comment:`, commentErr.message);
      }
    }

    return { id: result.id };
  }

  async syncChannelMetrics(socialAccountId) {
    const account = await socialAccountRepository.findById(socialAccountId);
    if (!account || !account.blueskyAccount) return account;

    const agent = await this._getAuthenticatedAgent(account);
    const profile = await blueskyGateway.getProfile(agent, account.blueskyAccount.did);

    await socialAccountRepository.updateBlueskyMetrics(socialAccountId, {
      followersCount: profile.followersCount,
      followsCount: profile.followsCount,
      postsCount: profile.postsCount
    });

    return socialAccountRepository.findById(socialAccountId);
  }

  /**
   * Trả lời bình luận trên bài đăng Bluesky.
   * Thao tác này ủy quyền cho publishPost() xử lý việc đăng bài và kiểm tra quota 'CREATE' (3 điểm).
   */
  async replyToComment(brandId, { text, parentUri, parentCid, rootUri, rootCid }) {
    return this.publishPost(brandId, {
      caption: text,
      replyTo: {
        root: { uri: rootUri || parentUri, cid: rootCid || parentCid },
        parent: { uri: parentUri, cid: parentCid }
      }
    });
  }

  async likePost(brandId, { uri, cid }) {
    const account = await socialAccountRepository.findByBrandAndPlatformFirst(brandId, PLATFORMS.BLUESKY);
    if (!account) throw new Error('Bluesky account not connected');
    await this._checkAndIncrementQuota(account.id, 'UPDATE');

    const agent = await this._getAuthenticatedAgent(account);
    return blueskyGateway.likePost(agent, uri, cid);
  }

  async repost(brandId, { uri, cid }) {
    const account = await socialAccountRepository.findByBrandAndPlatformFirst(brandId, PLATFORMS.BLUESKY);
    if (!account) throw new Error('Bluesky account not connected');
    await this._checkAndIncrementQuota(account.id, 'UPDATE');

    const agent = await this._getAuthenticatedAgent(account);
    return blueskyGateway.repost(agent, uri, cid);
  }

  async followUser(brandId, { did }) {
    const account = await socialAccountRepository.findByBrandAndPlatformFirst(brandId, PLATFORMS.BLUESKY);
    if (!account) throw new Error('Bluesky account not connected');
    await this._checkAndIncrementQuota(account.id, 'UPDATE');

    const agent = await this._getAuthenticatedAgent(account);
    return blueskyGateway.followUser(agent, did);
  }

  async deleteLike(brandId, { likeUri }) {
    const account = await socialAccountRepository.findByBrandAndPlatformFirst(brandId, PLATFORMS.BLUESKY);
    if (!account) throw new Error('Bluesky account not connected');
    await this._checkAndIncrementQuota(account.id, 'DELETE');

    const agent = await this._getAuthenticatedAgent(account);
    return blueskyGateway.deleteLike(agent, likeUri);
  }

  async deleteRepost(brandId, { repostUri }) {
    const account = await socialAccountRepository.findByBrandAndPlatformFirst(brandId, PLATFORMS.BLUESKY);
    if (!account) throw new Error('Bluesky account not connected');
    await this._checkAndIncrementQuota(account.id, 'DELETE');

    const agent = await this._getAuthenticatedAgent(account);
    return blueskyGateway.deleteRepost(agent, repostUri);
  }

  // Stubs for BaseSocialService contract compliance
  async getChannelInfo() { return null; }
  async getPublishedVideos() { return []; }
  async getAnalyticsReport() { return {}; }
  async trackVideo() { return null; }
  async getVideoDetails() { return null; }
  async searchChannel() { return []; }
  async addCompetitor() { return null; }
  async fetchChannelComments() { return []; }
  async updatePublishedPost() { return null; }
  async deletePost() { return true; }
}

module.exports = new BlueskyService();
