const PostAdapterFactory = require('./post-adapter.factory');
const ChannelAdapterFactory = require('./channel-adapter.factory');
const AudienceAdapterFactory = require('./audience-adapter.factory');

const PostInsightFacade = require('./post-insight.facade');
const ChannelInsightFacade = require('./channel-insight.facade');
const AudienceInsightFacade = require('./audience-insight.facade');

const YouTubePostInsightAdapter = require('../../services/social/youtube/youtube-post-insight.adapter');
const FacebookPostInsightAdapter = require('../../services/social/facebook/facebook-post-insight.adapter');
const TikTokPostInsightAdapter = require('../../services/social/tiktok/tiktok-post-insight.adapter');
const YouTubeChannelAdapter = require('../../services/social/youtube/youtube-channel.adapter');
const YouTubeAudienceAdapter = require('../../services/social/youtube/youtube-audience.adapter');
const FacebookChannelAdapter = require('../../services/social/facebook/facebook-channel.adapter');
const TikTokChannelAdapter = require('../../services/social/tiktok/tiktok-channel.adapter');

const { PLATFORMS } = require('../../utils/constants');

// 1. Instantiation Factories
const postAdapterFactory = new PostAdapterFactory();
const channelAdapterFactory = new ChannelAdapterFactory();
const audienceAdapterFactory = new AudienceAdapterFactory();

// 2. Register Platform Adapters
postAdapterFactory.register(PLATFORMS.YOUTUBE, new YouTubePostInsightAdapter());
postAdapterFactory.register(PLATFORMS.FACEBOOK, new FacebookPostInsightAdapter());
postAdapterFactory.register(PLATFORMS.TIKTOK, new TikTokPostInsightAdapter());
channelAdapterFactory.register(PLATFORMS.YOUTUBE, new YouTubeChannelAdapter());
channelAdapterFactory.register(PLATFORMS.FACEBOOK, new FacebookChannelAdapter());
channelAdapterFactory.register(PLATFORMS.TIKTOK, new TikTokChannelAdapter());
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

