const FacebookFeedStrategy = require('./webhooks/facebook-feed.strategy');
const FacebookMessagingStrategy = require('./webhooks/facebook-messaging.strategy');
const InstagramCommentsStrategy = require('./webhooks/instagram-comments.strategy');
const InstagramMessagingStrategy = require('./webhooks/instagram-messaging.strategy');
const logger = require('../../../utils/logger');

class FacebookWebhookService {
  constructor() {
    this.strategies = {
      facebookFeed: new FacebookFeedStrategy(),
      facebookMessaging: new FacebookMessagingStrategy(),
      instagramComments: new InstagramCommentsStrategy(),
      instagramMessaging: new InstagramMessagingStrategy()
    };
  }

  async processEvent(payload) {
    const objectType = payload.object;
    logger.info(`[FacebookWebhookService] Processing webhook object type: ${objectType}`);

    if (!payload.entry || !Array.isArray(payload.entry)) {
      logger.warn('[FacebookWebhookService] Webhook payload missing entry array');
      return;
    }

    for (const entry of payload.entry) {
      try {
        if (objectType === 'page') {
          // 1. Process Page Feed Changes (e.g. comments)
          if (entry.changes && Array.isArray(entry.changes)) {
            for (const change of entry.changes) {
              if (change.field === 'feed') {
                await this.strategies.facebookFeed.handle(entry, change);
              } else {
                logger.info(`[FacebookWebhookService] Ignored page change field: ${change.field}`);
              }
            }
          }

          // 2. Process Page Messaging Events (Messenger DMs)
          if (entry.messaging && Array.isArray(entry.messaging)) {
            for (const messagingItem of entry.messaging) {
              await this.strategies.facebookMessaging.handle(entry, messagingItem);
            }
          }
        } 
        
        else if (objectType === 'instagram') {
          // 1. Process Instagram Comments Changes
          if (entry.changes && Array.isArray(entry.changes)) {
            for (const change of entry.changes) {
              if (change.field === 'comments') {
                await this.strategies.instagramComments.handle(entry, change);
              } else {
                logger.info(`[FacebookWebhookService] Ignored IG change field: ${change.field}`);
              }
            }
          }

          // 2. Process Instagram Messaging Events (Instagram DMs)
          if (entry.messaging && Array.isArray(entry.messaging)) {
            for (const messagingItem of entry.messaging) {
              await this.strategies.instagramMessaging.handle(entry, messagingItem);
            }
          }
        } 
        
        else {
          logger.warn(`[FacebookWebhookService] Unsupported webhook object type: ${objectType}`);
        }
      } catch (entryError) {
        logger.error(`[FacebookWebhookService] Error processing entry: ${entry.id}`, entryError);
      }
    }
  }
}

module.exports = new FacebookWebhookService();
