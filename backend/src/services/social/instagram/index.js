const BaseSocialService = require('../base-social.service');
const instagramAnalytics = require('./instagram-analytics.service');
const instagramPost = require('./instagram-post.service');
const instagramComment = require('./instagram-comment.service');

class InstagramService extends BaseSocialService {
  // --- Analytics & Channel ---
  async getChannelInfo(auth, startDate, endDate) {
    return instagramAnalytics.getChannelInfo(auth, startDate, endDate);
  }

  async getAnalyticsReport(auth, startDate, endDate) {
    return instagramAnalytics.getAnalyticsReport(auth.igAccountId || auth.pageId, auth.pageAccessToken, startDate, endDate, auth.followersCount || 0);
  }

  async connectChannel(brandId, code, redirectUri) {
    const facebookGateway = require('../facebook/facebook.gateway');
    const tokens = await facebookGateway.exchangeCodeForToken(code, redirectUri);
    
    // Diagnostics
    const permissions = await facebookGateway.getUserPermissions(tokens.access_token).catch(() => []);
    const pages = await facebookGateway.getUserPages(tokens.access_token);

    console.log('[Instagram Connect Diagnostics]', {
      permissions,
      pagesCount: pages.length,
      pages: pages.map(p => ({ id: p.id, name: p.name }))
    });

    if (pages.length === 0) {
      const scopes = permissions.map(p => `${p.permission}:${p.status}`).join(', ');
      throw new Error(`Không tìm thấy Trang Facebook. Quyền đã cấp: [${scopes || 'none'}]. Hãy đảm bảo tài khoản FB của bạn có quyền Quản trị (Admin) trên Trang.`);
    }

    // Tìm kiếm page có linked Instagram business account
    let selectedPage = null;
    let igAccountData = null;

    for (const page of pages) {
      const igInfo = await instagramAnalytics.getChannelInfo({ pageId: page.id, pageAccessToken: page.access_token }).catch(() => null);
      if (igInfo && igInfo.igAccountId) {
        selectedPage = page;
        igAccountData = igInfo;
        break;
      }
    }

    if (!selectedPage || !igAccountData) {
      throw new Error('No Instagram Professional Account linked to your Facebook Pages was found.');
    }

    const { ConnectionConflictGuard, ConnectionConflictError } = require('../connection-conflict.guard');
    const conflictResult = await ConnectionConflictGuard.validateConflict(brandId, require('../../../utils/constants').PLATFORMS.INSTAGRAM, igAccountData.igAccountId);
    
    if (conflictResult.conflict) {
      throw new ConnectionConflictError(
        conflictResult.type,
        igAccountData.displayName,
        igAccountData.igAccountId,
        require('../../../utils/constants').PLATFORMS.INSTAGRAM,
        conflictResult.existingAccount.brand.name
      );
    }
    
    return require('../../../repositories/social/social-account.repository').upsertInstagramAccount(brandId, {
      igAccountId: igAccountData.igAccountId,
      facebookPageId: selectedPage.id,
      username: igAccountData.username,
      displayName: igAccountData.displayName,
      profilePictureUrl: igAccountData.profilePictureUrl,
      followersCount: igAccountData.followersCount,
      followingCount: igAccountData.followingCount,
      mediaCount: igAccountData.mediaCount,
      biography: igAccountData.biography,
      website: igAccountData.website,
      analytics: igAccountData.analytics
    }, {
      access_token: selectedPage.access_token,
      refresh_token: tokens.access_token
    });
  }

  async syncChannelMetrics(socialAccountId, startDate, endDate, force = false) {
    const account = await require('../../../repositories/social/social-account.repository').findById(socialAccountId);
    if (!account || account.platform !== require('../../../utils/constants').PLATFORMS.INSTAGRAM) {
      throw new Error('Social account not found or is not an Instagram account');
    }

    // The Facebook Page ID is required to call Graph API insights/media
    // endpoints — Instagram Graph API only exposes them via the linked Page
    // node, never via the IG Business Account ID (platformAccountId). Accounts
    // connected before facebookPageId was introduced won't have it; failing
    // loudly here (instead of falling back to platformAccountId, which causes
    // a silent 400 from Graph API and overwrites good stored data with zeros)
    // forces a reconnect that populates it, rather than corrupting analytics.
    const pageId = account.instagramAccount?.facebookPageId;
    if (!pageId) {
      throw new Error('Instagram account is missing its linked Facebook Page ID — please reconnect this account.');
    }
    const pageAccessToken = account.accessToken;

    const igInfo = await instagramAnalytics.getChannelInfo({ pageId, pageAccessToken }, startDate, endDate, socialAccountId);

    // enqueueSync: false — đây CHÍNH LÀ sync job đang chạy; xem ghi chú tương tự ở
    // youtube-analytics.service.js syncChannelMetrics. platform giữ nguyên mặc định
    // (PLATFORMS.INSTAGRAM) từ account đã lưu — không đổi nền tảng khi sync.
    return require('../../../repositories/social/social-account.repository').upsertInstagramAccount(account.brandId, {
      igAccountId: account.platformAccountId,
      facebookPageId: pageId,
      username: account.username,
      displayName: account.displayName,
      profilePictureUrl: igInfo.profilePictureUrl,
      followersCount: igInfo.followersCount,
      followingCount: igInfo.followingCount,
      mediaCount: igInfo.mediaCount,
      biography: igInfo.biography,
      website: igInfo.website,
      analytics: igInfo.analytics
    }, {
      access_token: pageAccessToken,
      refresh_token: account.refreshToken
    }, account.platform, { enqueueSync: false });
  }

  // --- Posts & Feed ---
  async getPublishedVideos(brandId, pageToken = null, limit = 10, socialAccountId = null) {
    return instagramPost.getPublishedPosts(brandId, pageToken, limit, socialAccountId);
  }

  async publishPost(brandId, postData) {
    return instagramPost.publishPost(brandId, postData);
  }

  // --- Unsupported or Stub methods for LSP Compliance ---
  async trackVideo(brandId, videoUrl) {
    return null;
  }

  async getVideoDetails(brandId, videoId) {
    return null;
  }

  async searchChannel(brandId, query) {
    return [];
  }

  async addCompetitor(brandId, channelId) {
    return null;
  }

  async fetchChannelComments(brandId) {
    return instagramComment.fetchChannelComments(brandId);
  }

  async replyToComment(brandId, parentCommentId, text) {
    return instagramComment.replyToComment(brandId, parentCommentId, text);
  }

  async searchAudio(brandId, query) {
    const instagramGateway = require('./instagram.gateway');
    const { accessToken } = await this._getAccountCredentials(brandId);
    return instagramGateway.searchAudio(query, accessToken);
  }

  async _getAccountCredentials(brandId) {
    const socialAccountRepository = require('../../../repositories/social/social-account.repository');
    const { PLATFORMS } = require('../../../utils/constants');
    const socialAccount = await socialAccountRepository.findByBrandAndPlatform(brandId, PLATFORMS.INSTAGRAM);
    if (!socialAccount || socialAccount.length === 0) {
      throw new Error('Instagram account not connected for this brand');
    }
    return {
      igAccountId: socialAccount[0].platformAccountId,
      accessToken: socialAccount[0].accessToken
    };
  }
}

module.exports = new InstagramService();
