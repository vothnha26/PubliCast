import { youtubeStrategy } from "./youtube.strategy";
import { facebookStrategy } from "./facebook.strategy";
import { tiktokStrategy } from "./tiktok.strategy";

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

export const PLATFORM_STRATEGIES = {
  youtube: youtubeStrategy,
  facebook: facebookStrategy,
  tiktok: tiktokStrategy
};
