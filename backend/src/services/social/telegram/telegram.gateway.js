const logger = require('../../../utils/logger');
class TelegramGateway {
  constructor() {
    this.apiBaseUrl = 'https://api.telegram.org/bot';
  }

  /**
   * Tạo url API dựa trên Token và Method
   */
  _buildUrl(token, method) {
    return `${this.apiBaseUrl}${token}/${method}`;
  }

  /**
   * Lấy thông tin nhóm/kênh từ Telegram
   */
  async getChatInfo(token, chatId) {
    if (token.startsWith('mock-')) {
      return {
        id: chatId || 'mock-telegram-chat-id',
        title: 'Mock Telegram Channel',
        username: 'mock_telegram_channel',
        type: 'channel',
        memberCount: 1500
      };
    }

    const url = this._buildUrl(token, 'getChat');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId })
    });

    const result = await response.json();
    if (!result.ok) {
      throw new Error(result.description || 'Failed to fetch Telegram chat info');
    }

    const memberCount = await this.getMemberCount(token, chatId);

    return {
      id: result.result.id.toString(),
      title: result.result.title || result.result.first_name || 'Telegram Chat',
      username: result.result.username || '',
      type: result.result.type, // 'private', 'group', 'supergroup' or 'channel'
      memberCount
    };
  }

  /**
   * Lấy số lượng thành viên
   */
  async getMemberCount(token, chatId) {
    if (token.startsWith('mock-')) {
      return 1500;
    }

    const url = this._buildUrl(token, 'getChatMemberCount');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId })
    });

    const result = await response.json();
    if (!result.ok) {
      return 0; // fallback
    }
    return result.result;
  }

  /**
   * Đăng bài viết dạng Văn bản (Text Message)
   */
  async sendMessage(token, chatId, text, options = {}) {
    if (token.startsWith('mock-')) {
      logger.debug(`[Telegram Gateway] [MOCK] Sending message to ${chatId}:`, text);
      return { message_id: `mock-msg-${Date.now()}` };
    }

    const url = this._buildUrl(token, 'sendMessage');
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: options.parseMode || 'HTML',
      disable_web_page_preview: options.disableWebPagePreview || false,
      disable_notification: options.disableNotification || false
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!result.ok) {
      throw new Error(result.description || 'Failed to send Telegram message');
    }
    return result.result;
  }

  /**
   * Đăng bài viết dạng Hình ảnh (Photo)
   */
  async sendPhoto(token, chatId, photoUrl, caption, options = {}) {
    if (token.startsWith('mock-')) {
      logger.debug(`[Telegram Gateway] [MOCK] Sending photo to ${chatId}:`, photoUrl, caption);
      return { message_id: `mock-photo-${Date.now()}` };
    }

    const url = this._buildUrl(token, 'sendPhoto');
    const payload = {
      chat_id: chatId,
      photo: photoUrl,
      caption: caption,
      parse_mode: options.parseMode || 'HTML',
      disable_notification: options.disableNotification || false
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!result.ok) {
      throw new Error(result.description || 'Failed to send Telegram photo');
    }
    return result.result;
  }

  /**
   * Đăng bài viết dạng Video
   */
  async sendVideo(token, chatId, videoUrl, caption, options = {}) {
    if (token.startsWith('mock-')) {
      logger.debug(`[Telegram Gateway] [MOCK] Sending video to ${chatId}:`, videoUrl, caption);
      return { message_id: `mock-video-${Date.now()}` };
    }

    const url = this._buildUrl(token, 'sendVideo');
    const payload = {
      chat_id: chatId,
      video: videoUrl,
      caption: caption,
      parse_mode: options.parseMode || 'HTML',
      disable_notification: options.disableNotification || false
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!result.ok) {
      throw new Error(result.description || 'Failed to send Telegram video');
    }
    return result.result;
  }
}

module.exports = new TelegramGateway();
