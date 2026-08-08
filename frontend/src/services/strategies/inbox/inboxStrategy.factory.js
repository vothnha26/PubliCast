import { BaseInboxDisplayStrategy } from './baseInboxDisplay.strategy';
import { YouTubeInboxDisplayStrategy } from './youtubeInboxDisplay.strategy';

class InboxStrategyFactory {
  constructor() {
    this._registry = new Map();
    this._defaultStrategy = new BaseInboxDisplayStrategy();

    // Register YouTube Strategy
    this.register('YOUTUBE', new YouTubeInboxDisplayStrategy());
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
