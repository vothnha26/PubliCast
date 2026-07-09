const BaseSyncStrategy = require('./base.strategy');
const socialAccountRepository = require('../../../../repositories/social/social-account.repository');
const inboxRepository = require('../../../../repositories/social/inbox.repository');
const { PLATFORMS, INBOX_STATUS, INBOX_TYPES } = require('../../../../utils/constants');

class TiktokCommentSyncStrategy extends BaseSyncStrategy {
  supports(platform) {
    return platform.toUpperCase() === PLATFORMS.TIKTOK || platform.toUpperCase() === 'TIKTOK';
  }

  async sync(brandId, inbox) {
    const socialAccount = await socialAccountRepository.findByBrandAndPlatform(brandId, 'TIKTOK');
    if (!socialAccount || socialAccount.length === 0) return [];

    const account = socialAccount[0];
    
    // Tạo realistic mock TikTok comments để hiển thị lên UI
    const mockComments = [
      {
        id: `tt_comment_1_${brandId}`,
        text: 'Video này xu hướng quá! Có chương trình khuyến mãi nào không shop?',
        author: 'tiktok_dancer_99',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
        videoId: 'v_tiktok_123',
        createdAt: new Date(Date.now() - 3600000 * 2) // 2h trước
      },
      {
        id: `tt_comment_2_${brandId}`,
        text: 'Sản phẩm bên mình dùng rất tốt nha mọi người, đã mua lần thứ 2 rồi.',
        author: 'review_chat_luong',
        avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=100&q=80',
        videoId: 'v_tiktok_456',
        createdAt: new Date(Date.now() - 3600000 * 5) // 5h trước
      },
      {
        id: `tt_comment_3_${brandId}`,
        text: 'Shop rep inbox tư vấn em với ạ, muốn mua sỉ.',
        author: 'kho_si_sg',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80',
        videoId: 'v_tiktok_123',
        createdAt: new Date(Date.now() - 3600000 * 12) // 12h trước
      }
    ];

    const inboxItems = [];
    for (const comment of mockComments) {
      const item = await inboxRepository.upsertInboxItem(
        { platformItemId: comment.id },
        {
          content: comment.text,
          authorName: comment.author,
          authorAvatarUrl: comment.avatar,
          syncedAt: new Date(),
          socialAccountId: account.id
        },
        {
          inboxId: inbox.id,
          platform: 'TIKTOK',
          type: INBOX_TYPES.COMMENT,
          platformItemId: comment.id,
          authorId: `author_${comment.author}`,
          authorName: comment.author,
          authorAvatarUrl: comment.avatar,
          content: comment.text,
          relatedPostId: comment.videoId,
          platformCreatedAt: comment.createdAt,
          syncedAt: new Date(),
          status: INBOX_STATUS.UNREAD,
          socialAccountId: account.id
        }
      );
      inboxItems.push(item);
    }

    return inboxItems;
  }

  supportsReply(item) {
    return (item.platform === 'TIKTOK' || item.platform === 'tiktok') && item.type === INBOX_TYPES.COMMENT;
  }

  async reply(brandId, parentPlatformItemId, text) {
    const socialAccount = await socialAccountRepository.findByBrandAndPlatform(brandId, 'TIKTOK');
    if (!socialAccount || socialAccount.length === 0) throw new Error('TikTok account not connected');

    const account = socialAccount[0];
    const inbox = await inboxRepository.findOrCreateInbox(brandId);
    const parentInDb = await inboxRepository.findInboxItemByPlatformId(parentPlatformItemId);

    const newCommentId = `tt_reply_${Date.now()}`;

    return await inboxRepository.createInboxItem({
      inboxId: inbox.id,
      platform: 'TIKTOK',
      type: INBOX_TYPES.COMMENT,
      platformItemId: newCommentId,
      parentItemId: parentInDb?.id,
      authorId: account.platformAccountId || 'my_tiktok_id',
      authorName: account.displayName || 'Shop Owner',
      authorAvatarUrl: account.profilePictureUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&q=80',
      content: text,
      relatedPostId: parentInDb?.relatedPostId,
      platformCreatedAt: new Date(),
      syncedAt: new Date(),
      status: INBOX_STATUS.READ,
      socialAccountId: account.id
    });
  }

  async updateReply(brandId, platformItemId, text) {
    return { success: true };
  }

  async deleteReply(brandId, platformItemId) {
    return { success: true };
  }
}

module.exports = TiktokCommentSyncStrategy;
