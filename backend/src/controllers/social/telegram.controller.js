const telegramService = require('../../services/social/telegram/telegram.service');
const asyncHandler = require('../../utils/async-handler');

class TelegramController {
  connectTelegram = asyncHandler(async (req, res) => {
    const { brandId, botToken, chatId } = req.body;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });
    if (!botToken) return res.status(400).json({ message: 'botToken is required' });
    if (!chatId) return res.status(400).json({ message: 'chatId is required' });

    try {
      const account = await telegramService.connectChannel(brandId, botToken, chatId);
      res.json({
        success: true,
        message: 'Telegram account connected successfully',
        account: {
          id: account.id,
          displayName: account.displayName,
          username: account.username,
          profilePictureUrl: account.profilePictureUrl
        }
      });
    } catch (error) {
      res.status(400).json({ message: error.message || 'Failed to connect Telegram account' });
    }
  });
}

module.exports = new TelegramController();
