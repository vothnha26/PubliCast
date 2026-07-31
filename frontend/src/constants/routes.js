import { PLATFORM_DEFAULT_TAB } from "./platforms";

export const buildDashboardTabRoute = (platform, tab) => {
  const targetTab = tab || PLATFORM_DEFAULT_TAB[platform] || 'overview';
  return `/dashboard/${platform}?tab=${targetTab}`;
};
