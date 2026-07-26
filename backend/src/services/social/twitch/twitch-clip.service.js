const twitchGateway = require('./twitch.gateway');

class TwitchClipService {
  async createAndPollClip(apiClient, broadcasterId, maxAttempts = 10) {
    // 1. Check if stream is LIVE
    const status = await twitchGateway.getStreamStatus(apiClient, broadcasterId);
    if (!status || !status.isLive) {
      const error = new Error('Stream must be LIVE to create clips');
      error.code = 'STREAM_OFFLINE';
      throw error;
    }

    // 2. Request clip creation
    const clipId = await twitchGateway.createClip(apiClient, broadcasterId);

    // 3. Poll for clip ready state
    const clipDetails = await twitchGateway.pollClipDetails(apiClient, clipId, maxAttempts);
    return clipDetails;
  }
}

module.exports = new TwitchClipService();
