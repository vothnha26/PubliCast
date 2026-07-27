const youtubeService = require('../../services/social/youtube');
const logger = require('../../utils/logger');

/**
 * YouTube PubSubHubbub Webhook Controller
 * 
 * Single Responsibility: Tiếp nhận HTTP GET/POST Webhook từ Google PubSubHubbub Hub.
 */
class YoutubePubSubController {
  /**
   * GET /api/v1/social/youtube/pubsub/callback
   * Google Hub gọi tới để xác minh Intent (Subscribe/Unsubscribe Challenge Verification)
   */
  async verifyWebhook(req, res) {
    try {
      logger.info('[YouTube PubSub Controller] Received verification GET request from Google Hub:', req.query);
      const result = await youtubeService.verifyPubSubIntent(queryToPlainObject(req.query));

      if (!result.isValid) {
        return res.status(result.statusCode).send('Verification Failed');
      }

      // Trả về hub.challenge với header text/plain đúng quy chuẩn W3C WebSub
      res.setHeader('Content-Type', 'text/plain');
      return res.status(200).send(result.challenge);
    } catch (error) {
      logger.error('[YouTube PubSub Controller] Verification error:', error.message);
      return res.status(500).send('Internal Server Error');
    }
  }

  /**
   * POST /api/v1/social/youtube/pubsub/callback
   * Google Hub bắn thông báo Atom Feed XML khi channel có video mới/cập nhật
   */
  async handleEventPayload(req, res) {
    try {
      const signatureHeader = req.headers['x-hub-signature'] || null;
      let rawXml = req.body;

      // Đảm bảo req.body là string (raw XML)
      if (Buffer.isBuffer(req.body)) {
        rawXml = req.body.toString('utf-8');
      } else if (typeof req.body === 'object') {
        rawXml = JSON.stringify(req.body);
      }

      logger.info('[YouTube PubSub Controller] Received event notification POST from Google Hub.');

      const result = await youtubeService.processPubSubEvent(rawXml, signatureHeader);

      // Luôn trả về 200 OK cho Google Hub lập tức để tránh timeout
      return res.status(200).send('OK');
    } catch (error) {
      logger.error('[YouTube PubSub Controller] Error handling event payload:', error.message);
      // Vẫn trả về 200 OK để Google không gửi lại liên tục nếu là lỗi parse phía ta
      return res.status(200).send('OK');
    }
  }
}

function queryToPlainObject(query) {
  const obj = {};
  for (const key in query) {
    obj[key] = query[key];
  }
  return obj;
}

module.exports = new YoutubePubSubController();
