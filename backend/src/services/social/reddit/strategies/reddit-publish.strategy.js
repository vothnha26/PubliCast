const redditGateway = require('../reddit.gateway');

class BaseRedditPublishStrategy {
  async publish(client, postData, metadata) {
    throw new Error("Method 'publish()' must be implemented.");
  }
}

class SelfPostStrategy extends BaseRedditPublishStrategy {
  async publish(client, postData, metadata) {
    return redditGateway.submitPost(client, {
      subreddit: metadata.subreddit,
      title: postData.title || (postData.caption ? postData.caption.substring(0, 250) : 'Untitled Post'),
      kind: 'self',
      text: postData.caption || '',
      flairId: metadata.flairId,
      isNsfw: metadata.isNsfw,
      isSpoiler: metadata.isSpoiler
    });
  }
}

class LinkPostStrategy extends BaseRedditPublishStrategy {
  async publish(client, postData, metadata) {
    return redditGateway.submitPost(client, {
      subreddit: metadata.subreddit,
      title: postData.title || (postData.caption ? postData.caption.substring(0, 250) : 'Untitled Post'),
      kind: 'link',
      url: postData.linkUrl || metadata.linkUrl || '',
      text: postData.caption || '',
      flairId: metadata.flairId,
      isNsfw: metadata.isNsfw,
      isSpoiler: metadata.isSpoiler
    });
  }
}

class ImagePostStrategy extends BaseRedditPublishStrategy {
  async publish(client, postData, metadata) {
    let mediaUrl = postData.linkUrl || '';

    if (postData.images && postData.images.length > 0) {
      const img = postData.images[0];
      const asset = await redditGateway.uploadMediaAsset(client, img.buffer, img.fileName || 'image.png', img.mimeType || 'image/png');
      mediaUrl = asset.mediaUrl;
    } else if (postData.mediaUrls && postData.mediaUrls.length > 0) {
      mediaUrl = postData.mediaUrls[0];
    }

    return redditGateway.submitPost(client, {
      subreddit: metadata.subreddit,
      title: postData.title || (postData.caption ? postData.caption.substring(0, 250) : 'Untitled Post'),
      kind: 'image',
      url: mediaUrl,
      text: postData.caption || '',
      flairId: metadata.flairId,
      isNsfw: metadata.isNsfw,
      isSpoiler: metadata.isSpoiler
    });
  }
}

class VideoPostStrategy extends BaseRedditPublishStrategy {
  async publish(client, postData, metadata) {
    let mediaUrl = postData.linkUrl || '';

    if (postData.video) {
      const vid = postData.video;
      const asset = await redditGateway.uploadMediaAsset(client, vid.buffer, vid.fileName || 'video.mp4', vid.mimeType || 'video/mp4');
      mediaUrl = asset.mediaUrl;
    } else if (postData.mediaUrls && postData.mediaUrls.length > 0) {
      mediaUrl = postData.mediaUrls[0];
    }

    return redditGateway.submitPost(client, {
      subreddit: metadata.subreddit,
      title: postData.title || (postData.caption ? postData.caption.substring(0, 250) : 'Untitled Post'),
      kind: 'video',
      url: mediaUrl,
      text: postData.caption || '',
      flairId: metadata.flairId,
      isNsfw: metadata.isNsfw,
      isSpoiler: metadata.isSpoiler
    });
  }
}

class RedditPublishStrategyFactory {
  static getStrategy(postData) {
    if (postData.video || (postData.type === 'VIDEO')) {
      return new VideoPostStrategy();
    }
    if ((postData.images && postData.images.length > 0) || (postData.type === 'IMAGE')) {
      return new ImagePostStrategy();
    }
    if (postData.linkUrl) {
      return new LinkPostStrategy();
    }
    return new SelfPostStrategy();
  }
}

module.exports = {
  BaseRedditPublishStrategy,
  SelfPostStrategy,
  LinkPostStrategy,
  ImagePostStrategy,
  VideoPostStrategy,
  RedditPublishStrategyFactory
};
