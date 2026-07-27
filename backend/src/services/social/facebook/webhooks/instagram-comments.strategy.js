const BaseWebhookStrategy = require('./base.webhook-strategy');
const inboxRepository = require('../../../../repositories/social/inbox.repository');
const { PLATFORMS, INBOX_STATUS, INBOX_TYPES } = require('../../../../utils/constants');
const autoReplyService = require('../../inbox/strategies/auto-reply/auto-reply.service');
const logger = require('../../../../utils/logger');

class InstagramCommentsStrategy extends BaseWebhookStrategy {
  async handle(entry, change) {
    const instagramAccountId = entry.id;
    const value = change.value;

    logger.info(`[InstagramCommentsStrategy] Handling comment change for IG account ${instagramAccountId}`);

    const commentId = value.id;
    // 'remove' events were bypassing dedup entirely (only non-remove verbs
    // were checked), so a duplicated remove webhook re-ran the delete branch
    // and re-broadcast `inbox_item_deleted` after the item was already gone
    // (#100). Give remove events their own dedup key instead of skipping
    // dedup for them.
    const dedupeKey = value.verb === 'remove' ? `remove:${commentId}` : commentId;
    if (await this.isDuplicateEvent(dedupeKey)) return;
    const text = value.text;
    const authorId = value.from?.id || 'unknown';
    const authorName = value.from?.username || 'Instagram User';
    const mediaId = value.media?.id;

    const account = await this.getAccount(instagramAccountId, PLATFORMS.INSTAGRAM);
    const inbox = await this.getInbox(account.brandId);

    const isFromMe = authorId === instagramAccountId;

    // Handle delete/hide verb if exists in webhook change details
    // (Instagram also fires comments webhook with verb: 'remove')
    if (value.verb === 'remove') {
      const existingItem = await inboxRepository.findInboxItemByPlatformId(commentId);
      if (existingItem) {
        await inboxRepository.deleteInboxItem(existingItem.id).catch(() => {});
        logger.info(`[InstagramCommentsStrategy] Comment ${commentId} deleted.`);
        this.notifyClient(account.brandId, 'inbox_item_deleted', { id: existingItem.id, platformItemId: commentId });
      }
      return;
    }

    let parentDbId = null;
    let pendingParentPlatformId = null;
    if (value.parent_id) {
      const parentComment = await inboxRepository.findInboxItemByPlatformId(value.parent_id);
      if (parentComment) {
        parentDbId = parentComment.id;
      } else {
        // Parent not ingested yet (out-of-order webhook) — remember it for
        // reconciliation once the parent's own webhook lands (#100).
        pendingParentPlatformId = value.parent_id;
      }
    }

    const inboxItemData = {
      inboxId: inbox.id,
      platform: PLATFORMS.INSTAGRAM,
      type: INBOX_TYPES.COMMENT,
      platformItemId: commentId,
      authorId,
      authorName,
      content: text || '',
      relatedPostId: mediaId,
      // Facebook's strategy uses the real `created_time` from the webhook;
      // this used ingest time instead, which skews ordering/"x minutes ago"
      // whenever delivery is delayed (#100). IG comment webhooks don't
      // reliably include a numeric timestamp field, so fall back to now()
      // only when the platform genuinely didn't send one.
      platformCreatedAt: value.created_time ? new Date(value.created_time * 1000) : new Date(),
      syncedAt: new Date(),
      status: isFromMe ? INBOX_STATUS.READ : INBOX_STATUS.UNREAD,
      socialAccountId: account.id
    };

    if (parentDbId) {
      inboxItemData.parentItemId = parentDbId;
    } else if (pendingParentPlatformId) {
      inboxItemData.pendingParentPlatformId = pendingParentPlatformId;
    }

    const savedItem = await inboxRepository.upsertInboxItem(
      { platformItemId: commentId },
      {
        content: inboxItemData.content,
        authorName: inboxItemData.authorName,
        syncedAt: inboxItemData.syncedAt,
        socialAccountId: account.id
      },
      inboxItemData
    );

    logger.info(`[InstagramCommentsStrategy] IG comment ${commentId} saved.`);

    // This comment may itself be the parent some earlier, out-of-order
    // webhook was waiting on — back-fill those children now (#100).
    await inboxRepository.reconcilePendingChildren(commentId, savedItem.id).catch(err => {
      logger.error(`[InstagramCommentsStrategy] Error reconciling pending children for ${commentId}:`, err);
    });

    // Notify Frontend
    this.notifyClient(account.brandId, 'new_inbox_item', savedItem);

    // Execute Auto-Reply if comment is new and not from the IG page itself
    if (value.verb !== 'remove' && !isFromMe && text) {
      autoReplyService.executeAutoReply(
        account.id,
        text || '',
        commentId,
        account.brandId
      ).catch(err => {
        logger.error(`[InstagramCommentsStrategy] Error executing auto-reply for comment ${commentId}:`, err);
      });
    }
  }
}

module.exports = InstagramCommentsStrategy;
