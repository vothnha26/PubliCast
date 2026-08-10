const ChannelAdapterFactory = require('./channel-adapter.factory');
const AudienceAdapterFactory = require('./audience-adapter.factory');

const ChannelInsightFacade = require('./channel-insight.facade');
const AudienceInsightFacade = require('./audience-insight.facade');

const YouTubeChannelAdapter = require('../../services/social/youtube/youtube-channel.adapter');
const FacebookChannelAdapter = require('../../services/social/facebook/facebook-channel.adapter');
const TikTokChannelAdapter = require('../../services/social/tiktok/tiktok-channel.adapter');
const InstagramChannelAdapter = require('../../services/social/instagram/instagram-channel.adapter');
const ThreadsChannelAdapter = require('../../services/social/threads/threads-channel.adapter');
const BlueskyChannelAdapter = require('../../services/social/bluesky/bluesky-channel.adapter');

const YouTubeAudienceAdapter = require('../../services/social/youtube/youtube-audience.adapter');

const { PLATFORMS } = require('../../utils/constants');

// 1. Instantiation Factories
const channelAdapterFactory = new ChannelAdapterFactory();
const audienceAdapterFactory = new AudienceAdapterFactory();

// 2. Register Platform Adapters
channelAdapterFactory.register(PLATFORMS.YOUTUBE, new YouTubeChannelAdapter());
channelAdapterFactory.register(PLATFORMS.FACEBOOK, new FacebookChannelAdapter());
channelAdapterFactory.register(PLATFORMS.TIKTOK, new TikTokChannelAdapter());
channelAdapterFactory.register(PLATFORMS.INSTAGRAM, new InstagramChannelAdapter());
channelAdapterFactory.register(PLATFORMS.THREADS, new ThreadsChannelAdapter());
channelAdapterFactory.register(PLATFORMS.BLUESKY, new BlueskyChannelAdapter());

audienceAdapterFactory.register(PLATFORMS.YOUTUBE, new YouTubeAudienceAdapter());

// 3. Instantiation Facades
const channelInsightFacade = new ChannelInsightFacade(channelAdapterFactory);
const audienceInsightFacade = new AudienceInsightFacade(audienceAdapterFactory);

module.exports = {
  channelAdapterFactory,
  audienceAdapterFactory,
  channelInsightFacade,
  audienceInsightFacade
};

