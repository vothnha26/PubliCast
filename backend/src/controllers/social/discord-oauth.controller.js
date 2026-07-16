const discordGateway = require('../../services/social/discord/discord.gateway');
const discordService = require('../../services/social/discord/discord.service');
const asyncHandler = require('../../utils/async-handler');
const logger = require('../../utils/logger');
const socialAccountRepository = require('../../repositories/social/social-account.repository');
const authorizationFacade = require('../../services/auth/authorization.facade');
const prisma = require('../../config/prisma');
const { PLATFORMS } = require('../../utils/constants');

class DiscordOAuthController {
  _getRedirectBaseUrl(req) {
    return process.env.BACKEND_BASE_URL || `${req.protocol}://${req.get('host')}`;
  }

  getDiscordAuthUrl = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    const clientId = process.env.DISCORD_CLIENT_ID;
    const redirectUri = `${this._getRedirectBaseUrl(req)}/api/social/discord/callback`;

    // Nếu không cấu hình CLIENT_ID hoặc dùng mock, trả về URL callback trực tiếp để dev/test dễ dàng
    if (!clientId || clientId.startsWith('mock-')) {
      const mockUrl = `${this._getRedirectBaseUrl(req)}/api/social/discord/callback?code=mock-code-123&state=${brandId}&guild_id=mock-guild-999`;
      return res.json({ url: mockUrl });
    }

    // Luồng thật: Yêu cầu quyền Bot, thêm vào server (identify, guilds, bot) và quyền Quản lý Webhook (536870912)
    const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=536870912&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=bot%20identify%20guilds&state=${brandId}`;
    res.json({ url });
  });

  discordCallback = asyncHandler(async (req, res) => {
    const { code, state, guild_id } = req.query;
    const brandId = state;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    if (!brandId) {
      return res.redirect(`${frontendUrl}/manage/connections?error=brand_id_missing`);
    }

    if (!guild_id) {
      return res.redirect(`${frontendUrl}/manage/connections?error=guild_id_missing`);
    }

    try {
      // Lấy thông tin server để truyền tên server về Frontend hiển thị
      const guildInfo = await discordGateway.getGuildInfo(guild_id);
      const guildName = guildInfo.name || 'Discord Server';

      // Tự động đăng ký server với brandId trong DB (isConnected = true, isPending = true) nếu chưa tồn tại bản ghi pending nào
      const existingPending = await prisma.discordAccount.findFirst({
        where: { guildId: guild_id, socialAccount: { brandId }, isPending: true }
      });

      if (!existingPending) {
        await prisma.socialAccount.create({
          data: {
            brandId,
            platform: 'DISCORD',
            platformAccountId: guild_id,
            displayName: guildName,
            username: guildName,
            accessToken: '', // Webhook sẽ cấu hình sau
            scopes: 'bot identify guilds',
            isConnected: true,
            connectedAt: new Date(),
            discordAccount: {
              create: {
                guildId: guild_id,
                guildName,
                channelName: 'Chưa chọn',
                isPending: true,
                webhookUrl: null
              }
            }
          }
        });
      }

      // Chuyển hướng về Discord Dashboard để user chọn channel (hoặc skip)
      return res.redirect(
        `${frontendUrl}/dashboard/discord?provider=discord&guildId=${guild_id}&guildName=${encodeURIComponent(guildName)}&brandId=${brandId}`
      );
    } catch (error) {
      logger.error('Discord OAuth Callback Error:', error);
      return res.redirect(`${frontendUrl}/dashboard/discord?error=discord_oauth_failed`);
    }
  });

  getGuildChannels = asyncHandler(async (req, res) => {
    const { guildId } = req.query;
    if (!guildId) return res.status(400).json({ message: 'guildId is required' });

    // discordCallback always writes a SocialAccount row for a guild before
    // redirecting the user here to pick a channel, so by the time this is
    // called the guild is already tied to a brand — check that the caller
    // actually belongs to it instead of letting any authenticated user list
    // channels for an arbitrary guildId via this app's bot token.
    const account = await socialAccountRepository.findByPlatformAccountIdAndPlatform(guildId, PLATFORMS.DISCORD);
    if (!account) {
      return res.status(404).json({ message: 'Discord server not found or not connected to any brand yet' });
    }
    const hasAccess = await authorizationFacade.checkBrandAccess(req.user.id, account.brandId);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập thương hiệu này.' });
    }

    try {
      const channels = await discordGateway.getGuildChannels(guildId);
      res.json({ channels });
    } catch (error) {
      logger.error('Failed to fetch Discord guild channels:', error);
      res.status(500).json({ message: error.message });
    }
  });

  connectGuildChannel = asyncHandler(async (req, res) => {
    const { brandId, guildId, channelId } = req.body;
    if (!brandId || !guildId || !channelId) {
      return res.status(400).json({ message: 'brandId, guildId, and channelId are required' });
    }

    try {
      const account = await discordService.connectGuildChannel(brandId, guildId, channelId);
      res.json({ success: true, account });
    } catch (error) {
      logger.error('Failed to connect Discord guild channel:', error);
      res.status(500).json({ message: error.message });
    }
  });

  /**
   * POST /social/discord/connect-server
   * Kết nối server (guild) nhưng chưa chọn channel (isPending = true)
   * Dùng khi user bấm "Skip – Connect Later"
   */
  connectGuildServer = asyncHandler(async (req, res) => {
    const { brandId, guildId, guildName } = req.body;
    if (!brandId || !guildId) {
      return res.status(400).json({ message: 'brandId and guildId are required' });
    }

    try {
      // Kiểm tra đã tồn tại bản ghi pending chưa
      const existingPending = await prisma.discordAccount.findFirst({
        where: { guildId, socialAccount: { brandId }, isPending: true }
      });
      if (existingPending) {
        return res.json({ success: true, message: 'Server already registered and pending', isPending: true });
      }

      // Tạo SocialAccount placeholder với isPending = true
      const socialAccount = await prisma.socialAccount.create({
        data: {
          brandId,
          platform: 'DISCORD',
          platformAccountId: guildId,
          displayName: guildName || 'Discord Server',
          username: guildName || 'Discord Server',
          accessToken: '',
          scopes: 'bot identify guilds',
          isConnected: true,
          connectedAt: new Date(),
          discordAccount: {
            create: {
              guildId,
              guildName: guildName || 'Discord Server',
              isPending: true,
              webhookUrl: null
            }
          }
        },
        include: { discordAccount: true }
      });

      res.json({ success: true, socialAccount, isPending: true });
    } catch (error) {
      logger.error('Failed to register Discord guild server:', error);
      res.status(500).json({ message: error.message });
    }
  });

  disconnectGuildChannel = asyncHandler(async (req, res) => {
    const { brandId, accountId } = req.body;
    if (!brandId || !accountId) {
      return res.status(400).json({ message: 'brandId and accountId are required' });
    }

    try {
      const account = await socialAccountRepository.findById(accountId);
      if (!account || account.brandId !== brandId) {
        return res.status(404).json({ message: 'Discord channel not found for this brand' });
      }

      await prisma.socialAccount.delete({
        where: { id: accountId }
      });

      res.json({ success: true, message: 'Discord channel disconnected successfully' });
    } catch (error) {
      logger.error('Failed to disconnect Discord guild channel:', error);
      res.status(500).json({ message: error.message });
    }
  });
}

module.exports = new DiscordOAuthController();
