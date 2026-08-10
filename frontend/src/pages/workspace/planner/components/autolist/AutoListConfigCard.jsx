import * as React from "react";
import { useState } from "react";
import { Settings, ChevronDown, HelpCircle } from "lucide-react";
import { Switch } from "../../../../../components/ui/switch";
import { FacebookPresetFields } from "../../../../../components/workspace/post-creator/presets/fields/FacebookPresetFields";
import { YouTubePresetFields } from "../../../../../components/workspace/post-creator/presets/fields/YouTubePresetFields";
import { InstagramPresetFields } from "../../../../../components/workspace/post-creator/presets/fields/InstagramPresetFields";
import { ThreadsPresetFields } from "../../../../../components/workspace/post-creator/presets/fields/ThreadsPresetFields";
import { TikTokPresetFields } from "../../../../../components/workspace/post-creator/presets/fields/TikTokPresetFields";
import { useFacebookPresetAutoList } from "../../../../../hooks/presets/useFacebookPresetAutoList";
import { useYouTubePresetAutoList } from "../../../../../hooks/presets/useYouTubePresetAutoList";
import { useInstagramPresetAutoList } from "../../../../../hooks/presets/useInstagramPresetAutoList";
import { useThreadsPresetAutoList } from "../../../../../hooks/presets/useThreadsPresetAutoList";
import { useTikTokPresetAutoList } from "../../../../../hooks/presets/useTikTokPresetAutoList";
import { PLATFORMS, PLATFORM_API_KEY } from "../../../../../constants/platforms";

/**
 * Small Content Type selector (Post/Reel/Story) shown above the Facebook and
 * Instagram preset panels — the Post Composer has an equivalent dropdown,
 * but it lives in the composer's header/channel-picker area, outside the
 * shared *PresetFields components, so it has no counterpart to reuse here.
 * AutoList has no such header, so this renders it locally and writes into
 * the same settings.contentType key useFacebookPresetAutoList/
 * useInstagramPresetAutoList read.
 */
function ContentTypeSelector({ contentType, options, label = "Content type" }) {
  return (
    <div className="mb-4">
      <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-2 font-sans">{label}</label>
      <div className="relative">
        <select
          value={contentType.value}
          onChange={(e) => contentType.onChange(e.target.value)}
          className="w-full px-4 py-3 bg-card border border-border rounded-2xl text-xs font-semibold focus:border-black outline-none appearance-none cursor-pointer font-sans"
        >
          {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  );
}

const FACEBOOK_CONTENT_TYPES = [
  { value: 'post', label: 'Post' },
  { value: 'reel', label: 'Reel' },
  { value: 'story', label: 'Story' },
  { value: 'album', label: 'Album' },
];
const INSTAGRAM_CONTENT_TYPES = [
  { value: 'post', label: 'Post' },
  { value: 'reel', label: 'Reel' },
  { value: 'story', label: 'Story' },
];
const YOUTUBE_VIDEO_TYPES = [
  { value: 'video', label: 'Video' },
  { value: 'short', label: 'Short' },
];

/**
 * Renders the currently-active channel's platform preset form using the
 * exact same *PresetFields components the Post Composer renders (via
 * useXPresetComposer adapters) — AutoList's useXPresetAutoList adapters
 * translate networkCustom/setNetworkSetting into the same `preset` shape,
 * so a future field change to e.g. YouTubePresetFields.jsx automatically
 * shows up here too, instead of needing to be duplicated by hand.
 */
function ActivePlatformPresetPanel({ platform, networkCustom, setNetworkSetting, activeAccountId }) {
  // Hooks must run unconditionally in the same order every render — call
  // all 5 adapters and just render the one matching the active platform,
  // rather than conditionally calling only one (which would violate the
  // rules of hooks as `platform` changes between renders).
  const facebookPreset = useFacebookPresetAutoList(networkCustom, setNetworkSetting, activeAccountId);
  const youtubePreset = useYouTubePresetAutoList(networkCustom, setNetworkSetting, activeAccountId);
  const instagramPreset = useInstagramPresetAutoList(networkCustom, setNetworkSetting, activeAccountId);
  const threadsPreset = useThreadsPresetAutoList(networkCustom, setNetworkSetting, activeAccountId);
  const tiktokPreset = useTikTokPresetAutoList(networkCustom, setNetworkSetting, activeAccountId);

  switch (platform) {
    case PLATFORM_API_KEY[PLATFORMS.FACEBOOK]:
      return (
        <>
          <ContentTypeSelector contentType={facebookPreset.contentType} options={FACEBOOK_CONTENT_TYPES} />
          <FacebookPresetFields preset={facebookPreset} contentType={facebookPreset.contentType.value} />
        </>
      );
    case PLATFORM_API_KEY[PLATFORMS.YOUTUBE]:
      return (
        <>
          <ContentTypeSelector contentType={youtubePreset.videoType} options={YOUTUBE_VIDEO_TYPES} label="Video type" />
          <YouTubePresetFields preset={youtubePreset} />
        </>
      );
    case PLATFORM_API_KEY[PLATFORMS.INSTAGRAM]:
      return (
        <>
          <ContentTypeSelector contentType={instagramPreset.contentType} options={INSTAGRAM_CONTENT_TYPES} />
          <InstagramPresetFields preset={instagramPreset} instagramType={instagramPreset.contentType.value} />
        </>
      );
    case PLATFORM_API_KEY[PLATFORMS.THREADS]:
      return <ThreadsPresetFields preset={threadsPreset} />;
    case PLATFORM_API_KEY[PLATFORMS.TIKTOK]:
      return <TikTokPresetFields preset={tiktokPreset} />;
    default:
      return null;
  }
}

export function AutoListConfigCard({
  selectedAccounts = [],
  networkCustom = {},
  setNetworkSetting,
  autoPublish,
  setAutoPublish,
  repeat,
  setRepeat,
  useUrlShortener,
  setUseUrlShortener,
  globalFirstComment,
  setGlobalFirstComment,
  activeChannelAccountId,
}) {
  const [globalExpanded, setGlobalExpanded] = useState(true);

  const activeAccount = selectedAccounts.find(a => a.id === activeChannelAccountId) || selectedAccounts[0];
  const activePlatform = activeAccount?.platform?.toUpperCase();

  return (
    <div className="space-y-4 text-left font-sans">
      <div className="space-y-4">
        {/* Global Presets */}
        <div className="border border-border rounded-3xl overflow-hidden bg-card shadow-sm transition-all duration-300">
          <div
            onClick={() => setGlobalExpanded(!globalExpanded)}
            className="p-5 flex items-center justify-between hover:bg-muted/50 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <Settings size={18} className="text-muted-foreground group-hover:text-foreground transition-colors" />
              <span className="text-[12px] font-bold text-foreground font-sans">Global presets</span>
              <span className="px-2 py-0.5 bg-[#D1FAE5] text-[#065F46] rounded-lg text-[9px] font-bold font-sans">New</span>
            </div>

            <div className="flex items-center gap-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 font-sans">
                  Auto publish
                  <HelpCircle size={12} className="text-muted-foreground cursor-help" title="Automatically publish posts in the queue when their scheduled time arrives" />
                </span>
                <Switch
                  checked={autoPublish}
                  onCheckedChange={setAutoPublish}
                  className="scale-90"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-muted-foreground font-sans">Repeat</span>
                <Switch
                  checked={!!repeat}
                  onCheckedChange={setRepeat}
                  className="scale-90"
                />
              </div>

              <ChevronDown size={16} className={`text-muted-foreground transition-transform duration-300 ${globalExpanded ? 'rotate-180 text-foreground' : ''}`} />
            </div>
          </div>

          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${globalExpanded ? 'max-h-[500px] border-t border-border p-6' : 'max-h-0'}`}>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 font-sans">First Comment</label>
                <textarea
                  value={globalFirstComment || ''}
                  onChange={(e) => setGlobalFirstComment(e.target.value)}
                  placeholder="Write a comment to be posted automatically right after publishing..."
                  className="w-full p-4 border border-border bg-card text-foreground rounded-2xl text-xs font-medium focus:border-foreground outline-none resize-none h-20 font-sans shadow-sm placeholder:text-muted-foreground"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl border border-border hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-card rounded-xl shadow-sm text-muted-foreground">
                    <Settings size={16} />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-foreground font-sans">SmartLinks (URL Shortener)</div>
                    <div className="text-[10px] text-muted-foreground font-medium font-sans">Auto-shorten links in your post body & first comment, and track analytics.</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUseUrlShortener(!useUrlShortener)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${useUrlShortener ? 'bg-foreground' : 'bg-muted'}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${useUrlShortener ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Active channel's platform preset — reuses the same field
            components the Post Composer renders. */}
        {activeAccount && (
          <ActivePlatformPresetPanel
            platform={activePlatform}
            networkCustom={networkCustom}
            setNetworkSetting={setNetworkSetting}
            activeAccountId={activeAccount.id}
          />
        )}
      </div>
    </div>
  );
}
