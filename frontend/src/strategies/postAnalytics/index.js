import { youtubeStrategy } from "./youtube.strategy";
import { facebookStrategy } from "./facebook.strategy";
import { tiktokStrategy } from "./tiktok.strategy";
import { blueskyStrategy } from "./bluesky.strategy";
import { redditStrategy } from "./reddit.strategy";
import { twitchStrategy } from "./twitch.strategy";
import { instagramStrategy } from "./instagram.strategy";
import { telegramStrategy } from "./telegram.strategy";
import { threadsStrategy } from "./threads.strategy";

export function validateStrategyContract(strategy, platform) {
  const requiredKeys = ["fetchData", "supportedTabs", "renderHeaderStats", "renderTabContent"];
  for (const key of requiredKeys) {
    if (typeof strategy[key] === "undefined") {
      throw new Error(`Platform strategy for "${platform}" must implement "${key}"`);
    }
  }
  if (typeof strategy.supportsDateRange !== "boolean") {
    throw new Error(`Platform strategy for "${platform}" must implement "supportsDateRange" as a boolean`);
  }
}

validateStrategyContract(youtubeStrategy, "youtube");
validateStrategyContract(facebookStrategy, "facebook");
validateStrategyContract(tiktokStrategy, "tiktok");
validateStrategyContract(blueskyStrategy, "bluesky");
validateStrategyContract(redditStrategy, "reddit");
validateStrategyContract(twitchStrategy, "twitch");
validateStrategyContract(instagramStrategy, "instagram");
validateStrategyContract(telegramStrategy, "telegram");
validateStrategyContract(threadsStrategy, "threads");

export const PLATFORM_STRATEGIES = {
  youtube: youtubeStrategy,
  facebook: facebookStrategy,
  tiktok: tiktokStrategy,
  bluesky: blueskyStrategy,
  reddit: redditStrategy,
  twitch: twitchStrategy,
  instagram: instagramStrategy,
  telegram: telegramStrategy,
  threads: threadsStrategy,
};
