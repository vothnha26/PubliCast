import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Youtube, ChevronDown, RotateCw, Copy } from "lucide-react";
import { toast } from "sonner";

const FALLBACK_CATEGORIES = [
  { id: "22", title: "People & Blogs" },
  { id: "20", title: "Gaming" },
  { id: "27", title: "Education" },
  { id: "24", title: "Entertainment" },
  { id: "28", title: "Science & Technology" }
];

/**
 * Pure presentational YouTube preset form — shared by Post Composer
 * (useYouTubePresetComposer) and AutoList (useYouTubePresetAutoList).
 */
export function YouTubePresetFields({ preset }) {
  const { t } = useTranslation(["planner"]);
  const {
    isOpen, onToggleOpen,
    title, madeForKids, privacy, category, playlist, tags, firstComment,
    playlists, isLoadingPlaylists, onRefetchPlaylists, canPickPlaylist,
    categories, isLoadingCategories, onRefetchCategories,
  } = preset;

  useEffect(() => {
    if (isOpen) {
      if (canPickPlaylist) onRefetchPlaylists();
      onRefetchCategories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, canPickPlaylist]);

  const displayCategories = categories && categories.length > 0 ? categories : FALLBACK_CATEGORIES;

  return (
    <div className="border border-border rounded-3xl overflow-hidden bg-card shadow-sm transition-all duration-300">
      <div
        onClick={onToggleOpen}
        className="p-5 flex items-center justify-between hover:bg-muted/50 transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          <Youtube size={18} className="text-[#FF0000]" />
          <span className="text-[12px] font-bold text-foreground font-sans">{t("planner:postCreator.presets.youtube.title")}</span>
        </div>
        <ChevronDown size={16} className={`text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-180 text-black' : ''}`} />
      </div>

      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[800px] border-t border-gray-50 p-6' : 'max-h-0'}`}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-left">

          {/* Video or Short Title */}
          <div className="col-span-2">
            <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-2 font-sans">{t("planner:postCreator.presets.youtube.videoTitleLabel")}</label>
            <div className="relative">
              <input
                type="text"
                maxLength={100}
                value={title.value}
                onChange={(e) => title.onChange(e.target.value)}
                placeholder={t("planner:postCreator.presets.youtube.videoTitlePlaceholder")}
                className="w-full px-4 py-3 bg-card border border-border rounded-2xl text-xs font-semibold focus:border-black outline-none font-sans"
              />
              <span className="block text-right text-[9px] font-bold text-gray-300 mt-1.5 uppercase tracking-widest font-sans">
                {title.value.length} / 100
              </span>
            </div>
          </div>

          {/* Audience configuration */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-2 font-sans">{t("planner:postCreator.presets.youtube.audienceLabel")}</label>
            <div className="relative">
              <select
                value={typeof madeForKids.value === "boolean" ? (madeForKids.value ? "true" : "false") : ""}
                onChange={(e) => madeForKids.onChange(e.target.value === "" ? null : e.target.value === "true")}
                className={`w-full px-4 py-3 bg-card border rounded-2xl text-xs font-semibold focus:border-black outline-none appearance-none cursor-pointer font-sans transition-all ${
                  madeForKids.value === null
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
                value={privacy.value}
                onChange={(e) => privacy.onChange(e.target.value)}
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
                  value={category.value}
                  onChange={(e) => category.onChange(e.target.value)}
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
                onClick={() => onRefetchCategories(true)}
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
                    value={playlist.value}
                    onChange={(e) => playlist.onChange(e.target.value)}
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
                  onClick={() => onRefetchPlaylists(true)}
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
                value={tags.value}
                onChange={(e) => tags.onChange(e.target.value)}
                placeholder={t("planner:postCreator.presets.youtube.tagsPlaceholder")}
                className="w-full px-4 py-3 bg-card border border-border rounded-2xl text-xs font-semibold focus:border-black outline-none font-sans"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(tags.value);
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
              value={firstComment.value}
              onChange={(e) => firstComment.onChange(e.target.value)}
              placeholder={t("planner:postCreator.presets.youtube.firstCommentPlaceholder")}
              className="w-full p-4 border border-border rounded-2xl text-xs font-semibold focus:border-black outline-none resize-none h-16 font-sans"
            />
          </div>

        </div>
      </div>
    </div>
  );
}
