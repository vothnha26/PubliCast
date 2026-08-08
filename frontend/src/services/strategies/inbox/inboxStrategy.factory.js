import { BaseInboxDisplayStrategy } from './baseInboxDisplay.strategy';
import { YouTubeInboxDisplayStrategy } from './youtubeInboxDisplay.strategy';
import { FacebookInboxDisplayStrategy } from './facebookInboxDisplay.strategy';
import { InstagramInboxDisplayStrategy } from './instagramInboxDisplay.strategy';

class InboxStrategyFactory {
  constructor() {
    this._registry = new Map();
    this._defaultStrategy = new BaseInboxDisplayStrategy();

    // Register Supported Platform Strategies
    this.register('YOUTUBE', new YouTubeInboxDisplayStrategy());
    this.register('FACEBOOK', new FacebookInboxDisplayStrategy());
    this.register('INSTAGRAM', new InstagramInboxDisplayStrategy());
  }

  register(platform, strategyInstance) {
    if (!platform) return;
    this._registry.set(platform.toUpperCase(), strategyInstance);
  }

  getStrategy(platform) {
    if (!platform) return this._defaultStrategy;
    const platKey = platform.toUpperCase();
    return this._registry.get(platKey) || this._defaultStrategy;
  }
}

export const inboxStrategyFactory = new InboxStrategyFactory();

