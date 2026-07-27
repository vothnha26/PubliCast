import { PreviewYouTube } from "./PreviewYouTube";
import { PreviewFacebook } from "./PreviewFacebook";
import { PreviewTikTok } from "./PreviewTikTok";
import { PreviewInstagram } from "./PreviewInstagram";
import { PreviewTelegram } from "./PreviewTelegram";
import { PreviewThreads } from "./PreviewThreads";
import { BlueskyPreview } from "./previews/BlueskyPreview";
import { RedditPreview } from "./previews/RedditPreview";
import { TwitchPreview } from "./previews/TwitchPreview";

export const PreviewStrategies = {
  youtube: PreviewYouTube,
  facebook: PreviewFacebook,
  tiktok: PreviewTikTok,
  instagram: PreviewInstagram,
  telegram: PreviewTelegram,
  threads: PreviewThreads,
  bluesky: BlueskyPreview,
  reddit: RedditPreview,
  twitch: TwitchPreview
};
