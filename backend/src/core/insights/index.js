const PostAdapterFactory = require('./post-adapter.factory');
const ChannelAdapterFactory = require('./channel-adapter.factory');
const AudienceAdapterFactory = require('./audience-adapter.factory');

const PostInsightFacade = require('./post-insight.facade');
const ChannelInsightFacade = require('./channel-insight.facade');
const AudienceInsightFacade = require('./audience-insight.facade');

const YouTubePostInsightAdapter = require('../../services/social/youtube/youtube-post-insight.adapter');
const YouTubeChannelAdapter = require('../../services/social/youtube/youtube-channel.adapter');
const YouTubeAudienceAdapter = require('../../services/social/youtube/youtube-audience.adapter');

const { PLATFORMS } = require('../../utils/constants');

// 1. Instantiation Factories
const postAdapterFactory = new PostAdapterFactory();
const channelAdapterFactory = new ChannelAdapterFactory();
const audienceAdapterFactory = new AudienceAdapterFactory();

// 2. Register Platform Adapters (Vertical Slice: YouTube)
postAdapterFactory.register(PLATFORMS.YOUTUBE, new YouTubePostInsightAdapter());
channelAdapterFactory.register(PLATFORMS.YOUTUBE, new YouTubeChannelAdapter());
audienceAdapterFactory.register(PLATFORMS.YOUTUBE, new YouTubeAudienceAdapter());

// 3. Instantiation Facades
const postInsightFacade = new PostInsightFacade(postAdapterFactory);
const channelInsightFacade = new ChannelInsightFacade(channelAdapterFactory);
const audienceInsightFacade = new AudienceInsightFacade(audienceAdapterFactory);

module.exports = {
  postAdapterFactory,
  channelAdapterFactory,
  audienceAdapterFactory,
  postInsightFacade,
  channelInsightFacade,
  audienceInsightFacade
};
