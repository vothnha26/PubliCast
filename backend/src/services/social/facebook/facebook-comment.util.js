const inboxRepository = require('../../../repositories/social/inbox.repository');
const { PLATFORMS, INBOX_TYPES, INBOX_STATUS, FACEBOOK_API, API_VERSIONS, SYSTEM_LABELS } = require('../../../utils/constants');

/**
 * Filter out mock accounts and return the first real Facebook social account
 * @param {Array} socialAccounts
 * @returns {Object|null}
 */
function filterRealAccount(socialAccounts) {
  if (!socialAccounts || !Array.isArray(socialAccounts) || socialAccounts.length === 0) {
    return null;
  }
  const realAccount = socialAccounts.find(acc => {
    const isMockToken = acc.accessToken && typeof acc.accessToken === 'string' && acc.accessToken.startsWith('mock-');
    const isMockId = acc.platformAccountId && typeof acc.platformAccountId === 'string' && acc.platformAccountId.startsWith('mock-');
    return !isMockToken && !isMockId;
  });
  return realAccount || socialAccounts[0];
}

/**
 * Upsert Facebook comment into Inbox Repository
 */
async function processComment(comment, postId, account, inbox) {
  const authorId = comment.from?.id || SYSTEM_LABELS.UNKNOWN.toLowerCase();
  const authorName = comment.from?.name || 'Facebook User';
  const authorAvatar = FACEBOOK_API.avatarUrl(API_VERSIONS.FACEBOOK, authorId);

  return await inboxRepository.upsertInboxItem(
    { inboxId_platformItemId: { inboxId: inbox.id, platformItemId: comment.id } },
    {
      content: comment.message,
      authorName,
      authorAvatarUrl: authorAvatar,
      syncedAt: new Date(),
      socialAccountId: account.id
    },
    {
      inboxId: inbox.id,
      platform: PLATFORMS.FACEBOOK,
      type: INBOX_TYPES.COMMENT,
      platformItemId: comment.id,
      authorId,
      authorName,
      authorAvatarUrl: authorAvatar,
      content: comment.message,
      relatedPostId: postId,
      platformCreatedAt: new Date(comment.created_time),
      syncedAt: new Date(),
      status: INBOX_STATUS.UNREAD,
      socialAccountId: account.id
    }
  );
}

/**
 * Upsert Facebook comment replies into Inbox Repository
 */
async function processReplies(replies, parentDbId, postId, account, inbox) {
  for (const reply of replies) {
    const replyAuthorId = reply.from?.id || SYSTEM_LABELS.UNKNOWN.toLowerCase();
    const replyAuthorName = reply.from?.name || 'Facebook User';
    const replyAuthorAvatar = FACEBOOK_API.avatarUrl(API_VERSIONS.FACEBOOK, replyAuthorId);

    await inboxRepository.upsertInboxItem(
      { inboxId_platformItemId: { inboxId: inbox.id, platformItemId: reply.id } },
      {
        content: reply.message,
        authorName: replyAuthorName,
        authorAvatarUrl: replyAuthorAvatar,
        socialAccountId: account.id
      },
      {
        inboxId: inbox.id,
        platform: PLATFORMS.FACEBOOK,
        type: INBOX_TYPES.COMMENT,
        platformItemId: reply.id,
        parentItemId: parentDbId,
        authorId: replyAuthorId,
        authorName: replyAuthorName,
        authorAvatarUrl: replyAuthorAvatar,
        content: reply.message,
        relatedPostId: postId,
        platformCreatedAt: new Date(reply.created_time),
        syncedAt: new Date(),
        status: INBOX_STATUS.READ,
        socialAccountId: account.id
      }
    );
  }
}

module.exports = {
  filterRealAccount,
  processComment,
  processReplies
};
