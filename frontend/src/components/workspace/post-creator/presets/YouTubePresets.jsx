import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Youtube, ChevronDown, RotateCw, Copy } from "lucide-react";
import { usePostCreatorFormContext } from "../../../../context/PostCreatorFormContext";
import { toast } from "sonner";
import { PLATFORMS } from "../../../../constants/platforms";

const FALLBACK_CATEGORIES = [
  { id: "22", title: "People & Blogs" },
  { id: "20", title: "Gaming" },
  { id: "27", title: "Education" },
  { id: "24", title: "Entertainment" },
  { id: "28", title: "Science & Technology" }
];

export function YouTubePresets() {
  const { t } = useTranslation(["planner"]);
  const {
    youtubeOpen,
    setYoutubeOpen,
    youtubeTitle,
    setYoutubeTitle,
    youtubeMadeForKids,
    setYoutubeMadeForKids,
    youtubePrivacy,
    setYoutubePrivacy,
    youtubeCategory,
    setYoutubeCategory,
    youtubePlaylistId,
    setYoutubePlaylistId,
    youtubeTags,
    setYoutubeTags,
    youtubeType,
    youtubeFirstComment,
    setYoutubeFirstComment,
    globalFirstComment,
    playlists,
    isLoadingPlaylists,
    fetchPlaylists,
    categories,
    isLoadingCategories,
    fetchCategories,
    selectedAccountIds,
    activeBrand,
    networkCustom,
    activeNetworkAccountId,
    updateNetworkSetting
  } = usePostCreatorFormContext();

  // A YouTube channel's technical settings (category/privacy/tags/madeForKids)
  // are per-account when the brand has ≥2 YouTube channels targeted — read
  // from/write into networkCustom.youtube.perAccount[accountId].settings
  // instead of the flat state, mirroring how caption/media already work
  // (composer-audit P0.4 / SRS FR-3.4). With exactly one account, or no
  // sub-tab selected yet, the flat state below remains the effective value —
  // it also still doubles as the "shared/global default" every account seeds
  // from on first customization.
  const youtubeAccounts = (activeBrand?.socialAccounts || []).filter(
    sa => (sa.platform || '').toUpperCase() === PLATFORMS.YOUTUBE.toUpperCase() && selectedAccountIds.includes(sa.id)
  );
  const hasAccountSettings = youtubeAccounts.length > 1 && !!activeNetworkAccountId;
  const accountSettings = hasAccountSettings
    ? (networkCustom?.[PLATFORMS.YOUTUBE]?.perAccount?.[activeNetworkAccountId]?.settings || {})
    : null;

  const effectiveCategory = hasAccountSettings && accountSettings.categoryId !== undefined ? accountSettings.categoryId : youtubeCategory;
  const effectivePrivacy = hasAccountSettings && accountSettings.privacyStatus !== undefined ? accountSettings.privacyStatus : youtubePrivacy;
  const effectiveTags = hasAccountSettings && accountSettings.tags !== undefined ? accountSettings.tags : youtubeTags;
  const effectiveMadeForKids = hasAccountSettings && accountSettings.madeForKids !== undefined ? accountSettings.madeForKids : youtubeMadeForKids;

  const handleSettingChange = (key, flatSetter, value) => {
    if (hasAccountSettings) {
      updateNetworkSetting(PLATFORMS.YOUTUBE, key, value, activeNetworkAccountId);
    } else {
      flatSetter(value);
    }
  };

  // A playlist belongs to exactly one YouTube channel — with ≥2 channels
  // targeted, options.playlistId (a single value for the whole post) would
  // get sent as-is to every channel's publish call, adding the video to a
  // playlist it doesn't own (silently fails or errors per-channel). Simplest
  // correct behavior until playlist selection is modeled per-channel: only
  // offer it when there's exactly one YouTube channel to disambiguate.
  const selectedYoutubeAccountCount = youtubeAccounts.length;
  const canPickPlaylist = selectedYoutubeAccountCount <= 1;

  useEffect(() => {
    if (youtubeOpen) {
      if (canPickPlaylist) fetchPlaylists();
      fetchCategories();
    }
  }, [youtubeOpen, canPickPlaylist]);

  // Clears a stale selection made while only one channel was targeted, so
  // a since-added second channel can't inherit a playlist it doesn't own.
  useEffect(() => {
    if (!canPickPlaylist && youtubePlaylistId) {
      setYoutubePlaylistId("");
    }
  }, [canPickPlaylist]);

  const displayCategories = categories && categories.length > 0 ? categories : FALLBACK_CATEGORIES;

  return (
    <div className="border border-border rounded-3xl overflow-hidden bg-card shadow-sm transition-all duration-300">
      <div 
        onClick={() => setYoutubeOpen(!youtubeOpen)}
        className="p-5 flex items-center justify-between hover:bg-muted/50 transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          <Youtube size={18} className="text-[#FF0000]" />
          <span className="text-[12px] font-bold text-foreground font-sans">{t("planner:postCreator.presets.youtube.title")}</span>
        </div>
        <ChevronDown size={16} className={`text-muted-foreground transition-transform duration-300 ${youtubeOpen ? 'rotate-180 text-black' : ''}`} />
      </div>

      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${youtubeOpen ? 'max-h-[800px] border-t border-gray-50 p-6' : 'max-h-0'}`}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-left">
          
          {/* Video or Short Title */}
          <div className="col-span-2">
            <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-2 font-sans">{t("planner:postCreator.presets.youtube.videoTitleLabel")}</label>
            <div className="relative">
              <input 
                type="text"
                maxLength={100}
                value={youtubeTitle}
                onChange={(e) => setYoutubeTitle(e.target.value)}
                placeholder={t("planner:postCreator.presets.youtube.videoTitlePlaceholder")}
                className="w-full px-4 py-3 bg-card border border-border rounded-2xl text-xs font-semibold focus:border-black outline-none font-sans"
              />
              <span className="block text-right text-[9px] font-bold text-gray-300 mt-1.5 uppercase tracking-widest font-sans">
                {youtubeTitle.length} / 100
              </span>
            </div>
          </div>

          {/* Audience configuration */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-2 font-sans">{t("planner:postCreator.presets.youtube.audienceLabel")}</label>
            <div className="relative">
              <select
                value={typeof effectiveMadeForKids === "boolean" ? (effectiveMadeForKids ? "true" : "false") : ""}
                onChange={(e) => handleSettingChange('madeForKids', setYoutubeMadeForKids, e.target.value === "" ? null : e.target.value === "true")}
                className={`w-full px-4 py-3 bg-card border rounded-2xl text-xs font-semibold focus:border-black outline-none appearance-none cursor-pointer font-sans transition-all ${
                  effectiveMadeForKids === null
                    ? "border-amber-300 bg-amber-50/20 text-amber-900 font-bold"
                    : "border-border text-foreground"
                }`}
              >
                <option value="" disabled className="text-muted-foreground font-normal">-- Select Audience (Required) --</option>
                <option value="false">{t("planner:postCreator.presets.youtube.notMadeForKids")}</option>
                <option value="true">{t("planner:postCreator.presets.youtube.madeForKids")}</option>
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Privacy configuration */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-2 font-sans">{t("planner:postCreator.presets.youtube.privacyLabel")}</label>
            <div className="relative">
              <select
                value={effectivePrivacy}
                onChange={(e) => handleSettingChange('privacyStatus', setYoutubePrivacy, e.target.value)}
                className="w-full px-4 py-3 bg-card border border-border rounded-2xl text-xs font-semibold focus:border-black outline-none appearance-none cursor-pointer font-sans"
              >
                <option value="public">{t("planner:postCreator.presets.youtube.public")}</option>
                <option value="unlisted">{t("planner:postCreator.presets.youtube.unlisted")}</option>
                <option value="private">{t("planner:postCreator.presets.youtube.private")}</option>
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 font-medium leading-normal font-sans">
              {t("planner:postCreator.presets.youtube.privacyDesc")}
            </p>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-2 font-sans">{t("planner:postCreator.presets.youtube.categoryLabel")}</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select
                  value={effectiveCategory}
                  onChange={(e) => handleSettingChange('categoryId', setYoutubeCategory, e.target.value)}
                  className="w-full px-4 py-3 bg-card border border-border rounded-2xl text-xs font-semibold focus:border-black outline-none appearance-none cursor-pointer font-sans"
                >
                  {displayCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.title}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
              <button 
                type="button"
                onClick={() => fetchCategories(true)}
                className="p-3 bg-muted hover:bg-muted rounded-2xl border border-border text-muted-foreground hover:text-black transition-all flex items-center justify-center shrink-0 cursor-pointer"
              >
                <RotateCw size={14} className={isLoadingCategories ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {/* Add to playlist — hidden when targeting multiple YouTube
              channels, since a playlist belongs to one specific channel and
              there's no per-channel playlist picker yet. */}
          {canPickPlaylist ? (
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-2 font-sans">{t("planner:postCreator.presets.youtube.playlistLabel")}</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <select
                    value={youtubePlaylistId}
                    onChange={(e) => setYoutubePlaylistId(e.target.value)}
                    className="w-full px-4 py-3 bg-card border border-border rounded-2xl text-xs font-semibold focus:border-black outline-none appearance-none cursor-pointer font-sans"
                  >
                    <option value="">{t("planner:postCreator.presets.youtube.selectPlaylist")}</option>
                    {playlists.map(pl => (
                      <option key={pl.id} value={pl.id}>{pl.title}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
                <button
                  type="button"
                  onClick={() => fetchPlaylists(true)}
                  className="p-3 bg-muted hover:bg-muted rounded-2xl border border-border text-muted-foreground hover:text-black transition-all flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <RotateCw size={14} className={isLoadingPlaylists ? "animate-spin" : ""} />
                </button>
              </div>
            </div>
          ) : (
            <div className="px-4 py-3 bg-muted/50 border border-border rounded-2xl text-[11px] text-muted-foreground font-sans">
              {t("planner:postCreator.presets.youtube.playlistUnavailableMultiChannel", "Playlist không khả dụng khi đăng cùng lúc lên nhiều kênh YouTube.")}
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-2 font-sans">{t("planner:postCreator.presets.youtube.tagsLabel")}</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={effectiveTags}
                onChange={(e) => handleSettingChange('tags', setYoutubeTags, e.target.value)}
                placeholder={t("planner:postCreator.presets.youtube.tagsPlaceholder")}
                className="w-full px-4 py-3 bg-card border border-border rounded-2xl text-xs font-semibold focus:border-black outline-none font-sans"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(effectiveTags);
                  toast.success(t("planner:postCreator.presets.youtube.tagsCopied"));
                }}
                className="p-3 bg-muted hover:bg-muted rounded-2xl border border-border text-muted-foreground hover:text-black transition-all flex items-center justify-center shrink-0 cursor-pointer"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>


          {/* First Comment inside YT presets */}
          <div className="col-span-2 text-left">
            <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-2 font-sans">{t("planner:postCreator.presets.youtube.firstCommentLabel")}</label>
            <textarea 
              value={youtubeFirstComment}
              onChange={(e) => setYoutubeFirstComment(e.target.value)}
              placeholder={t("planner:postCreator.presets.youtube.firstCommentPlaceholder")}
              className="w-full p-4 border border-border rounded-2xl text-xs font-semibold focus:border-black outline-none resize-none h-16 font-sans"
            />
          </div>

        </div>
      </div>
    </div>
  );
}
