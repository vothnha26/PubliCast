import { PLATFORM_DEFAULT_TAB } from "./platforms";

export const buildPostDetailRoute = (platform, postId) => 
  `/dashboard/${platform}/post/${postId}`;

export const buildDashboardTabRoute = (platform, tab) => {
  const targetTab = tab || PLATFORM_DEFAULT_TAB[platform] || 'overview';
  return `/dashboard/${platform}?tab=${targetTab}`;
};
