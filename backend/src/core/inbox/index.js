const InboxSyncFactory = require('./inbox-sync.factory');
const InboxDisplayFactory = require('./inbox-display.factory');
const InboxFacade = require('./inbox.facade');

const YouTubeInboxSyncAdapter = require('../../services/social/youtube/inbox/youtube-inbox-sync.adapter');
const YouTubeInboxDisplayAdapter = require('../../services/social/youtube/inbox/youtube-inbox-display.adapter');
const FacebookInboxSyncAdapter = require('../../services/social/facebook/inbox/facebook-inbox-sync.adapter');
const FacebookInboxDisplayAdapter = require('../../services/social/facebook/inbox/facebook-inbox-display.adapter');
const TikTokInboxSyncAdapter = require('../../services/social/tiktok/inbox/tiktok-inbox-sync.adapter');
const TikTokInboxDisplayAdapter = require('../../services/social/tiktok/inbox/tiktok-inbox-display.adapter');
const InstagramInboxSyncAdapter = require('../../services/social/instagram/inbox/instagram-inbox-sync.adapter');
const InstagramInboxDisplayAdapter = require('../../services/social/instagram/inbox/instagram-inbox-display.adapter');

const { PLATFORMS } = require('../../utils/constants');

// 1. Instantiation Factories
const inboxSyncFactory = new InboxSyncFactory();
const inboxDisplayFactory = new InboxDisplayFactory();

// 2. Register Platform Adapters (YouTube, Facebook, TikTok, Instagram)
inboxSyncFactory.register(PLATFORMS.YOUTUBE, new YouTubeInboxSyncAdapter());
inboxDisplayFactory.register(PLATFORMS.YOUTUBE, new YouTubeInboxDisplayAdapter());
inboxSyncFactory.register(PLATFORMS.FACEBOOK, new FacebookInboxSyncAdapter());
inboxDisplayFactory.register(PLATFORMS.FACEBOOK, new FacebookInboxDisplayAdapter());
inboxSyncFactory.register(PLATFORMS.TIKTOK, new TikTokInboxSyncAdapter());
inboxDisplayFactory.register(PLATFORMS.TIKTOK, new TikTokInboxDisplayAdapter());
inboxSyncFactory.register(PLATFORMS.INSTAGRAM, new InstagramInboxSyncAdapter());
inboxDisplayFactory.register(PLATFORMS.INSTAGRAM, new InstagramInboxDisplayAdapter());

// 3. Instantiation Facade
const inboxFacade = new InboxFacade(inboxSyncFactory, inboxDisplayFactory);

module.exports = {
  inboxSyncFactory,
  inboxDisplayFactory,
  inboxFacade
};

