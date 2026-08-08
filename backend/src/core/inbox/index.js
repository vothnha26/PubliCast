const InboxSyncFactory = require('./inbox-sync.factory');
const InboxDisplayFactory = require('./inbox-display.factory');
const InboxFacade = require('./inbox.facade');

const YouTubeInboxSyncAdapter = require('../../services/social/youtube/inbox/youtube-inbox-sync.adapter');
const YouTubeInboxDisplayAdapter = require('../../services/social/youtube/inbox/youtube-inbox-display.adapter');

const { PLATFORMS } = require('../../utils/constants');

// 1. Instantiation Factories
const inboxSyncFactory = new InboxSyncFactory();
const inboxDisplayFactory = new InboxDisplayFactory();

// 2. Register Platform Adapters (YouTube Focus)
inboxSyncFactory.register(PLATFORMS.YOUTUBE, new YouTubeInboxSyncAdapter());
inboxDisplayFactory.register(PLATFORMS.YOUTUBE, new YouTubeInboxDisplayAdapter());

// 3. Instantiation Facade
const inboxFacade = new InboxFacade(inboxSyncFactory, inboxDisplayFactory);

module.exports = {
  inboxSyncFactory,
  inboxDisplayFactory,
  inboxFacade
};
