const BaseWebhookStrategy = require('./base.webhook-strategy');
const inboxRepository = require('../../../../repositories/social/inbox.repository');
const autoReplyService = require('../../inbox/strategies/auto-reply/auto-reply.service');
const { PLATFORMS, INBOX_STATUS, INBOX_TYPES, FACEBOOK_API, API_VERSIONS } = require('../../../../utils/constants');
const logger = require('../../../../utils/logger');

class FacebookFeedStrategy extends BaseWebhookStrategy {
  async handle(entry, change) {
    const pageId = entry.id;
    const value = change.value;

    logger.info(`[FacebookFeedStrategy] Handling feed change for page ${pageId}: ${value.item} ${value.verb}`);

    // We only handle comment changes for now
    if (value.item !== 'comment') {
      logger.info(`[FacebookFeedStrategy] Ignored feed item type: ${value.item}`);
      return;
    }

    const account = await this.getAccount(pageId, PLATFORMS.FACEBOOK);
    const inbox = await this.getInbox(account.brandId);

    const verb = value.verb;
    const commentId = value.comment_id;

    if (verb === 'add' || verb === 'edited') {
      if (await this.isDuplicateEvent(commentId)) return;
      // Facebook feed comment webhooks carry the author in `value.from`
      // ({ id, name }), NOT `value.sender_id` (that field only exists on
      // Messenger message webhooks). Reading the wrong field made `authorId`
      // always 'unknown', so `isFromMe` was never true — meaning the page's
      // OWN auto-reply comments triggered another auto-reply, an infinite
      // loop (#98). Mirror the Instagram strategy which already reads `from`.
      const authorId = value.from?.id || value.sender_id || 'unknown';
      const authorName = value.from?.name || value.sender_name || 'Facebook User';
      const authorAvatar = FACEBOOK_API.avatarUrl(API_VERSIONS.FACEBOOK, authorId);
      const isFromMe = authorId === pageId;
      const postPlatformId = value.post_id || value.parent_id;

      // 1. Check if this comment belongs to an active livestream
      let activeLivestream = null;
      try {
        const prisma = require('../../../../config/prisma');
        activeLivestream = await prisma.livestream.findFirst({
          where: {
            brandId: account.brandId,
            platformStreamId: postPlatformId,
            status: 'LIVE'
          }
        });
      } catch (livestreamErr) {
        logger.error(`[FacebookFeedStrategy] Error checking active livestream:`, livestreamErr);
      }

      if (activeLivestream) {
        // Comment belongs to active livestream -> ONLY emit socket, DO NOT save to Unified Inbox
        try {
          const socketManager = require('../../../workspace/socket/socket.manager');
          const { SOCKET_EVENTS } = require('../../../../utils/socket-constants');
          
          const livestreamComment = {
            id: commentId,
            authorName,
            authorAvatarUrl: authorAvatar,
            content: value.message || '',
            platform: 'facebook',
            timestamp: value.created_time ? new Date(value.created_time * 1000) : new Date()
          };

          socketManager.emitToLivestreamRoom(activeLivestream.id, SOCKET_EVENTS.NEW_LIVESTREAM_COMMENT, livestreamComment);
          logger.info(`[FacebookFeedStrategy] Forwarded Facebook Live Comment ${commentId} to livestream ${activeLivestream.id} (not saved to inbox)`);
        } catch (livestreamErr) {
          logger.error(`[FacebookFeedStrategy] Error forwarding live comment to socket:`, livestreamErr);
        }
        return; // Exit early to bypass inbox saving
      }

      // 2. Standard comment processing (not livestream) -> Save to Unified Inbox
      // Determine parent ID if this is a reply to another comment. If the
      // parent hasn't been ingested yet (webhooks can arrive out of order),
      // remember the raw platform parent id so it can be reconciled once the
      // parent's own webhook lands (#100), instead of silently dropping the
      // thread link.
      let parentDbId = null;
      let pendingParentPlatformId = null;
      if (value.parent_id && value.parent_id !== value.post_id) {
        const parentComment = await inboxRepository.findInboxItemByPlatformId(value.parent_id);
        if (parentComment) {
          parentDbId = parentComment.id;
        } else {
          pendingParentPlatformId = value.parent_id;
        }
      }

      const inboxItemData = {
        inboxId: inbox.id,
        platform: PLATFORMS.FACEBOOK,
        type: INBOX_TYPES.COMMENT,
        platformItemId: commentId,
        authorId,
        authorName,
        authorAvatarUrl: authorAvatar,
        content: value.message || '',
        relatedPostId: postPlatformId,
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
          authorAvatarUrl: inboxItemData.authorAvatarUrl,
          syncedAt: inboxItemData.syncedAt,
          socialAccountId: account.id
        },
        inboxItemData
      );

      logger.info(`[FacebookFeedStrategy] Comment ${commentId} upserted successfully.`);

      // This comment may itself be the parent some earlier, out-of-order
      // webhook was waiting on — back-fill those children now (#100).
      await inboxRepository.reconcilePendingChildren(commentId, savedItem.id).catch(err => {
        logger.error(`[FacebookFeedStrategy] Error reconciling pending children for ${commentId}:`, err);
      });

      // Notify Frontend
      const eventName = verb === 'add' ? 'new_inbox_item' : 'inbox_item_updated';
      this.notifyClient(account.brandId, eventName, savedItem);

      // Execute Auto-Reply if comment is new and not from the page itself
      if (verb === 'add' && !isFromMe) {
        autoReplyService.executeAutoReply(
          account.id,
          value.message || '',
          commentId,
          account.brandId
        ).catch(err => {
          logger.error(`[FacebookFeedStrategy] Error executing auto-reply for comment ${commentId}:`, err);
        });
      }

    } else if (verb === 'remove' || verb === 'hide') {
      const existingItem = await inboxRepository.findInboxItemByPlatformId(commentId);
      if (existingItem) {
        await inboxRepository.deleteInboxItem(existingItem.id).catch(() => {});
        logger.info(`[FacebookFeedStrategy] Comment ${commentId} deleted from database.`);
        
        // Notify Frontend
        this.notifyClient(account.brandId, 'inbox_item_deleted', { id: existingItem.id, platformItemId: commentId });
      }
    }
  }
}

module.exports = FacebookFeedStrategy;
