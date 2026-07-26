const asyncHandler = require('../../utils/async-handler');
const { blueskyService } = require('../../services/social/bluesky');
const notificationService = require('../../services/core/notification.service');
const { NOTIFICATION_TYPES } = require('../../utils/constants');
const logger = require('../../utils/logger');

class BlueskyController {
  connectBluesky = asyncHandler(async (req, res) => {
    const { brandId, handle, appPassword } = req.body;
    if (!brandId || !handle || !appPassword) {
      return res.status(400).json({ message: 'brandId, handle, and appPassword are required' });
    }

    const account = await blueskyService.connectChannel(brandId, { handle, appPassword });

    try {
      await notificationService.create({
        brandId,
        type: NOTIFICATION_TYPES.PLATFORM,
        title: 'Bluesky connected',
        message: `Bluesky account (@${handle}) has been connected successfully.`,
        actionUrl: '/manage/connections'
      });
    } catch (err) {
      logger.error('[BlueskyController] Failed to create notification:', err);
    }

    res.status(200).json({
      success: true,
      message: 'Bluesky account connected successfully',
      account
    });
  });
}

module.exports = new BlueskyController();
