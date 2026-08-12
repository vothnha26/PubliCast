const FacebookPublishStrategyFactory = require('../../src/services/social/facebook/publish-strategies/publish-strategy.factory');
const ReelPublishStrategy = require('../../src/services/social/facebook/publish-strategies/reel.strategy');
const StoryPublishStrategy = require('../../src/services/social/facebook/publish-strategies/story.strategy');
const AlbumPublishStrategy = require('../../src/services/social/facebook/publish-strategies/album.strategy');
const VideoPublishStrategy = require('../../src/services/social/facebook/publish-strategies/video.strategy');
const PhotoPublishStrategy = require('../../src/services/social/facebook/publish-strategies/photo.strategy');
const TextPublishStrategy = require('../../src/services/social/facebook/publish-strategies/text.strategy');
const { POST_TYPES } = require('../../src/utils/constants');

describe('FacebookPublishStrategyFactory', () => {
  it('returns ReelPublishStrategy for REEL regardless of mediaUrl', () => {
    expect(FacebookPublishStrategyFactory.getStrategy(POST_TYPES.REEL, 'https://cdn.example/x.jpg')).toBeInstanceOf(ReelPublishStrategy);
  });

  it('returns StoryPublishStrategy for STORY', () => {
    expect(FacebookPublishStrategyFactory.getStrategy(POST_TYPES.STORY, null)).toBeInstanceOf(StoryPublishStrategy);
  });

  it('returns AlbumPublishStrategy for CAROUSEL', () => {
    expect(FacebookPublishStrategyFactory.getStrategy(POST_TYPES.CAROUSEL, null)).toBeInstanceOf(AlbumPublishStrategy);
  });

  it('returns VideoPublishStrategy for a plain video extension', () => {
    const strategy = FacebookPublishStrategyFactory.getStrategy(POST_TYPES.POST, 'https://cdn.example/clip.mp4');
    expect(strategy).toBeInstanceOf(VideoPublishStrategy);
  });

  it('returns VideoPublishStrategy when the video extension is followed by a query string (regression #65)', () => {
    const strategy = FacebookPublishStrategyFactory.getStrategy(POST_TYPES.POST, 'https://cdn.example/clip.mp4?token=abc123&exp=999');
    expect(strategy).toBeInstanceOf(VideoPublishStrategy);
  });

  it('returns PhotoPublishStrategy for an image extension', () => {
    const strategy = FacebookPublishStrategyFactory.getStrategy(POST_TYPES.POST, 'https://cdn.example/photo.jpg');
    expect(strategy).toBeInstanceOf(PhotoPublishStrategy);
  });

  it('returns PhotoPublishStrategy for an image extension with a query string', () => {
    const strategy = FacebookPublishStrategyFactory.getStrategy(POST_TYPES.POST, 'https://cdn.example/photo.png?sig=xyz');
    expect(strategy).toBeInstanceOf(PhotoPublishStrategy);
  });

  it('falls back to TextPublishStrategy when there is no mediaUrl and no special type', () => {
    const strategy = FacebookPublishStrategyFactory.getStrategy(POST_TYPES.TEXT, null);
    expect(strategy).toBeInstanceOf(TextPublishStrategy);
  });

  it('treats an unrecognized extension as a photo (matchesExtension returns false -> else branch)', () => {
    const strategy = FacebookPublishStrategyFactory.getStrategy(POST_TYPES.POST, 'https://cdn.example/file.unknown');
    expect(strategy).toBeInstanceOf(PhotoPublishStrategy);
  });
});

describe('FacebookPublishStrategy (base)', () => {
  it('publish() rejects as not implemented', async () => {
    const FacebookPublishStrategy = require('../../src/services/social/facebook/publish-strategies/publish.strategy');
    const strategy = new FacebookPublishStrategy();
    await expect(strategy.publish('page-1', 'token', {})).rejects.toThrow('Method publish() must be implemented');
  });
});
