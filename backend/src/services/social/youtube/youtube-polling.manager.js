const { google } = require('googleapis');
const prisma = require('../../../config/prisma');
const googleOAuthService = require('../google-oauth.service');
const socialAccountRepository = require('../../../repositories/social/social-account.repository');
const { PLATFORMS, INBOX_TYPES, INBOX_STATUS } = require('../../../utils/constants');
const { SOCKET_EVENTS, ROOM_PREFIXES } = require('../../../utils/socket-constants');
const inboxRepository = require('../../../repositories/social/inbox.repository');
const { parseGoogleApiError } = require('./youtube-error.util');

class YoutubePollingManager {
  constructor() {
    this.activePolls = new Map(); // Map<livestreamId, TimeoutID>
  }

  /**
   * Start polling for a livestream
   */
  async startPolling(livestreamId, brandId, socketManager) {
    if (this.activePolls.has(livestreamId)) {
      console.log(`[YoutubePollingManager] Polling already active for stream ${livestreamId}`);
      return;
    }

    console.log(`[YoutubePollingManager] Starting polling for stream ${livestreamId}`);
    
    // Set a placeholder to prevent concurrent start requests
    this.activePolls.set(livestreamId, {
      timeoutId: null,
      processedMessageIds: new Set()
    });

    // Run the polling loop
    this._pollLoop(livestreamId, brandId, socketManager, null);
  }

  /**
   * Stop polling for a livestream
   */
  stopPolling(livestreamId) {
    if (this.activePolls.has(livestreamId)) {
      const pollInfo = this.activePolls.get(livestreamId);
      if (pollInfo && pollInfo.timeoutId) {
        clearTimeout(pollInfo.timeoutId);
      }
      this.activePolls.delete(livestreamId);
      console.log(`[YoutubePollingManager] Stopped polling for stream ${livestreamId}`);
    }
  }

  /**
   * Internal polling loop
   */
  async _pollLoop(livestreamId, brandId, socketManager, nextPageToken) {
    // Check if polling was stopped in the meantime
    if (!this.activePolls.has(livestreamId)) {
      return;
    }

    let nextInterval = 4000; // default 4 seconds
    let newPageToken = nextPageToken;

    try {
      // 1. Get Google OAuth Auth client and platform stream info
      const { account, auth, isMock } = await this._getAccountAndAuth(brandId);
      
      let platformStreamId = null;
      let livestream = await prisma.livestream.findUnique({
        where: { id: livestreamId }
      });

      if (!livestream) {
        console.error(`[YoutubePollingManager] Livestream ${livestreamId} not found`);
        this.stopPolling(livestreamId);
        return;
      }

      platformStreamId = livestream.platformStreamId;

      // 2. Fetch Chat Messages (either Mock or Real)
      let messages = [];
      if (isMock) {
        // Generate mock message for testing
        const mockResponse = this._generateMockMessages(nextPageToken);
        messages = mockResponse.items;
        newPageToken = mockResponse.nextPageToken;
        nextInterval = mockResponse.pollingIntervalMillis || 4000;
        
        // If liveChatId is not saved, set a mock platformStreamId
        if (!platformStreamId) {
          platformStreamId = 'mock-live-chat-id-123';
          await prisma.livestream.update({
            where: { id: livestreamId },
            data: { platformStreamId }
          });
        }
      } else {
        const youtube = google.youtube({ version: 'v3', auth });

        // If platformStreamId (liveChatId) is not yet retrieved, get it
        if (!platformStreamId) {
          console.log(`[YoutubePollingManager] Finding active liveChatId for brand ${brandId}...`);
          const broadcastRes = await youtube.liveBroadcasts.list({
            part: 'snippet',
            broadcastStatus: 'active',
            type: 'all'
          });

          const activeBroadcast = broadcastRes.data.items?.[0];
          if (activeBroadcast) {
            platformStreamId = activeBroadcast.snippet.liveChatId;
            if (platformStreamId) {
              await prisma.livestream.update({
                where: { id: livestreamId },
                data: { platformStreamId }
              });
              console.log(`[YoutubePollingManager] Associated liveChatId: ${platformStreamId}`);
            }
          }
        }

        if (platformStreamId) {
          const chatParams = {
            liveChatId: platformStreamId,
            part: 'snippet,authorDetails',
            maxResults: 200
          };
          if (newPageToken) {
            chatParams.pageToken = newPageToken;
          }

          const chatRes = await youtube.liveChatMessages.list(chatParams);
          messages = chatRes.data.items || [];
          newPageToken = chatRes.data.nextPageToken || newPageToken;
          nextInterval = chatRes.data.pollingIntervalMillis || 4000;
        } else {
          console.log(`[YoutubePollingManager] No active YouTube broadcast found. Retrying...`);
        }
      }

      // 3. Process new messages and emit to socket
      const pollInfo = this.activePolls.get(livestreamId);
      if (messages.length > 0 && pollInfo) {
        const newMessages = messages.filter(msg => !pollInfo.processedMessageIds.has(msg.id));
        newMessages.forEach(msg => pollInfo.processedMessageIds.add(msg.id));

        if (newMessages.length > 0) {
          for (const msg of newMessages) {
            const authorDetails = msg.authorDetails || {};
            const snippet = msg.snippet || {};

            // Format comment
            const commentData = {
              id: msg.id,
              authorName: authorDetails.displayName || 'YouTube User',
              authorAvatarUrl: authorDetails.profileImageUrl || '',
              content: snippet.displayMessage || '',
              platform: 'youtube',
              timestamp: snippet.publishedAt ? new Date(snippet.publishedAt) : new Date()
            };

            // Emit to Socket Room
            socketManager.emitToLivestreamRoom(livestreamId, SOCKET_EVENTS.NEW_LIVESTREAM_COMMENT, commentData);
          }
        }
      }

    } catch (err) {
      console.error(`[YoutubePollingManager] Polling error for stream ${livestreamId}:`, err.message);
      
      const { status, reason } = parseGoogleApiError(err);
      const errMsg = err.message ? err.message.toLowerCase() : '';
      const isAuthError = errMsg.includes('auth') || errMsg.includes('token') || status === 401;
      const isQuotaError = reason === 'quotaExceeded' || reason === 'dailyLimitExceeded' || errMsg.includes('quota');

      if (isAuthError) {
        console.error(`[YoutubePollingManager] Authentication failure. Stopping polling.`);
        socketManager.emitToLivestreamRoom(livestreamId, SOCKET_EVENTS.ERROR, {
          message: 'YouTube authentication failed. Please reconnect your account.'
        });
        this.stopPolling(livestreamId);
        return;
      }

      if (isQuotaError) {
        console.error(`[YoutubePollingManager] Quota exceeded. Stopping polling.`);
        socketManager.emitToLivestreamRoom(livestreamId, SOCKET_EVENTS.ERROR, {
          message: 'YouTube API quota exceeded. Please try again later.'
        });
        this.stopPolling(livestreamId);
        return;
      }
    }

    // Schedule next polling iteration
    const pollInfo = this.activePolls.get(livestreamId);
    if (pollInfo) {
      const timeoutId = setTimeout(() => {
        this._pollLoop(livestreamId, brandId, socketManager, newPageToken);
      }, nextInterval);
      pollInfo.timeoutId = timeoutId;
    }
  }

  /**
   * Helper to get YouTube oauth client
   */
  async _getAccountAndAuth(brandId) {
    const socialAccount = await socialAccountRepository.findByBrandAndPlatform(brandId, PLATFORMS.YOUTUBE);
    if (!socialAccount || socialAccount.length === 0) {
      throw new Error('YouTube account not connected for brand ' + brandId);
    }

    const account = socialAccount.find(acc => 
      !(acc.accessToken && acc.accessToken.startsWith('mock-')) &&
      !(acc.platformAccountId && acc.platformAccountId.startsWith('mock-'))
    ) || socialAccount[0];

    const isMock = !account.accessToken || account.accessToken.startsWith('mock-') || process.env.NODE_ENV === 'test';
    
    if (isMock) {
      return { account, auth: null, isMock: true };
    }

    const auth = googleOAuthService.createClient();
    auth.setCredentials({ access_token: account.accessToken });
    return { account, auth, isMock: false };
  }

  /**
   * Helper to generate fake messages for testing & mock mode
   */
  _generateMockMessages(nextPageToken) {
    const tokenVal = nextPageToken ? parseInt(nextPageToken) || 0 : 0;
    const shouldSendMessage = Math.random() < 0.4 || tokenVal === 0;
    
    const items = [];
    if (shouldSendMessage) {
      const mockNames = ['Linh Nguyễn', 'Bách Trần', 'Hải Đăng', 'Thu Trang', 'David Miller'];
      const mockTexts = [
        'Chào streamer nha! Live mượt quá',
        'App PubliCast gom chat xịn thật sự',
        'Có bán sản phẩm này không ạ?',
        'Sub kênh rồi nhé bro!',
        'Hello from the other side! Great quality.'
      ];
      const randomIndex = Math.floor(Math.random() * mockNames.length);
      const msgId = `mock-msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      items.push({
        id: msgId,
        authorDetails: {
          displayName: mockNames[randomIndex],
          profileImageUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${mockNames[randomIndex]}`,
          channelId: `mock-channel-${randomIndex}`
        },
        snippet: {
          displayMessage: mockTexts[randomIndex],
          publishedAt: new Date().toISOString()
        }
      });
    }

    return {
      items,
      nextPageToken: String(tokenVal + 1),
      pollingIntervalMillis: 3000
    };
  }
}

module.exports = new YoutubePollingManager();
