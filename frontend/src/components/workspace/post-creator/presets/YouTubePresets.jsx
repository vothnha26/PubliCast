import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Youtube, ChevronDown, RotateCw, Copy } from "lucide-react";
import { usePostCreatorFormContext } from "../../../../context/PostCreatorFormContext";
import { toast } from "sonner";

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
    fetchCategories
  } = usePostCreatorFormContext();

  useEffect(() => {
    if (youtubeOpen) {
      fetchPlaylists();
      fetchCategories();
    }
  }, [youtubeOpen]);

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
          <div>
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
                value={typeof youtubeMadeForKids === "boolean" ? (youtubeMadeForKids ? "true" : "false") : ""}
                onChange={(e) => setYoutubeMadeForKids(e.target.value === "" ? null : e.target.value === "true")}
                className={`w-full px-4 py-3 bg-card border rounded-2xl text-xs font-semibold focus:border-black outline-none appearance-none cursor-pointer font-sans transition-all ${
                  youtubeMadeForKids === null 
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
                value={youtubePrivacy}
                onChange={(e) => setYoutubePrivacy(e.target.value)}
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
                  value={youtubeCategory}
                  onChange={(e) => setYoutubeCategory(e.target.value)}
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

          {/* Add to playlist */}
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

          {/* Tags */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-2 font-sans">{t("planner:postCreator.presets.youtube.tagsLabel")}</label>
            <div className="flex gap-2">
              <input 
                type="text"
                value={youtubeTags}
                onChange={(e) => setYoutubeTags(e.target.value)}
                placeholder={t("planner:postCreator.presets.youtube.tagsPlaceholder")}
                className="w-full px-4 py-3 bg-card border border-border rounded-2xl text-xs font-semibold focus:border-black outline-none font-sans"
              />
              <button 
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(youtubeTags);
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
