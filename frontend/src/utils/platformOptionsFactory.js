import { PLATFORM_SPECS } from "../constants/platformCapability.spec.js";
import {
  YOUTUBE_TYPE,
  FACEBOOK_TYPE,
  INSTAGRAM_TYPE,
  TIKTOK_PRIVACY,
  YOUTUBE_DEFAULT_CATEGORY_ID
} from "../constants/postTypes.js";

/**
 * Template Method Runner cho Hydration (Post/Template Options -> Flat Form State)
 * Duyệt cố định qua PLATFORM_SPECS, gọi Strategy hook spec.hydrate(opts),
 * và generic-map ngược về tên flat state qua spec.stateKeys.
 */
export function createPlatformOptionsFromPost(post) {
  const opts = post?.options || {};

  // Default initial flat state fallback
  const result = {
    youtubeType: YOUTUBE_TYPE.VIDEO,
    youtubeTitle: "",
    youtubeMadeForKids: null,
    youtubePrivacy: "public",
    youtubeCategory: YOUTUBE_DEFAULT_CATEGORY_ID,
    youtubePlaylistId: "",
    youtubeTags: "",
    youtubeFirstComment: "",
    globalFirstComment: opts.firstComment || "",
    youtubeThumbnail: "",
    threadsWhoCanReply: "everyone",
    notes: opts.notes || [],
    videoSettings: opts.videoSettings || null,
    facebookType: FACEBOOK_TYPE.POST,
    facebookTitle: "",
    facebookReelThumbnail: "",
    instagramType: INSTAGRAM_TYPE.POST,
    instagramCollaborators: [],
    instagramAudio: null,
    instagramShowOnFeed: true,
    tiktokPrivacy: TIKTOK_PRIVACY.PUBLIC,
    tiktokAllowComments: true,
    tiktokAllowDuet: true,
    tiktokAllowStitch: true,
    tiktokAiGenerated: false,
    tiktokCommercialContent: false,
  };

  // Strategy Template loop
  for (const spec of Object.values(PLATFORM_SPECS)) {
    if (!spec.hydrate || !spec.stateKeys) continue;
    const partial = spec.hydrate(opts);
    for (const [specKey, value] of Object.entries(partial)) {
      const flatKey = spec.stateKeys[specKey];
      if (flatKey) {
        result[flatKey] = value;
      }
    }
  }

  return result;
}

/**
 * Factory tạo platform options mặc định khi khởi tạo form mới.
 */
export function createDefaultPlatformOptions() {
  return {
    youtubeType: YOUTUBE_TYPE.VIDEO,
    youtubeTitle: "",
    youtubeMadeForKids: null,
    youtubePrivacy: "public",
    youtubeCategory: YOUTUBE_DEFAULT_CATEGORY_ID,
    youtubePlaylistId: "",
    youtubeTags: "",
    youtubeFirstComment: "",
    globalFirstComment: "",
    youtubeThumbnail: "",
    threadsWhoCanReply: "everyone",
    notes: [],
    videoSettings: null,
    facebookType: FACEBOOK_TYPE.POST,
    facebookTitle: "",
    facebookReelThumbnail: "",
    instagramType: INSTAGRAM_TYPE.POST,
    instagramCollaborators: [],
    instagramAudio: null,
    instagramShowOnFeed: true,
    tiktokPrivacy: TIKTOK_PRIVACY.PUBLIC,
    tiktokAllowComments: true,
    tiktokAllowDuet: true,
    tiktokAllowStitch: true,
    tiktokAiGenerated: false,
    tiktokCommercialContent: false,
  };
}
