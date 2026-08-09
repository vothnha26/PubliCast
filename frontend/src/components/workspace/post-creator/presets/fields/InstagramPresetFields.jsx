import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Instagram, Plus, X, Music, UserPlus } from "lucide-react";

/**
 * Pure presentational Instagram preset form — shared by Post Composer
 * (useInstagramPresetComposer) and AutoList (useInstagramPresetAutoList).
 * instagramType (feed/reel type selection) is read separately since it
 * gates the "Show Reel on feed" toggle but isn't itself a settings field.
 */
export function InstagramPresetFields({ preset, instagramType }) {
  const { t } = useTranslation(["planner"]);
  const {
    isOpen, onToggleOpen,
    collaborators, audio, showOnFeed,
    audioTracks, isLoadingAudio, audioSearchQuery, onAudioSearchChange,
    showAudioList, onToggleAudioList,
  } = preset;

  const [collabInput, setCollabInput] = useState("");

  const handleAddCollaborator = () => {
    const clean = collabInput.trim().replace(/^@/, "");
    if (!clean) return;
    if (collaborators.value.includes(clean)) {
      setCollabInput("");
      return;
    }
    collaborators.onChange([...collaborators.value, clean]);
    setCollabInput("");
  };

  const handleRemoveCollaborator = (name) => {
    collaborators.onChange(collaborators.value.filter(c => c !== name));
  };

  return (
    <div className="border border-border rounded-3xl overflow-hidden bg-card shadow-sm transition-all duration-300">
      {/* Accordion Header */}
      <div
        onClick={onToggleOpen}
        className="p-5 flex items-center justify-between hover:bg-muted/50 transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          <Instagram size={18} className="text-[#E1306C]" />
          <span className="text-[12px] font-bold text-foreground font-sans">{t("planner:postCreator.presets.instagram.title")}</span>
          <span className="text-[9px] bg-emerald-500 text-white font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-widest scale-90">{t("planner:postCreator.presets.instagram.newBadge")}</span>
        </div>
        <ChevronDown size={16} className={`text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-180 text-black' : ''}`} />
      </div>

      {/* Accordion Body */}
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[500px] border-t border-gray-50 p-6' : 'max-h-0'}`}>
        <div className="space-y-6 text-left">

          {/* Collaborators section */}
          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase mb-2 font-sans">
              <UserPlus size={13} />
              {t("planner:postCreator.presets.instagram.collaborators")}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-semibold">@</span>
                <input
                  type="text"
                  value={collabInput}
                  onChange={(e) => setCollabInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCollaborator();
                    }
                  }}
                  placeholder={t("planner:postCreator.presets.instagram.enterUsername")}
                  className="w-full pl-7 pr-4 py-2.5 bg-card border border-border rounded-xl text-xs font-semibold focus:border-black outline-none font-sans"
                />
              </div>
              <button
                type="button"
                onClick={handleAddCollaborator}
                className="px-3 py-2.5 bg-black hover:bg-gray-950 text-white rounded-xl transition-all flex items-center justify-center cursor-pointer"
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Collaborators List Badges */}
            {collaborators.value.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {collaborators.value.map((collab) => (
                  <span
                    key={collab}
                    className="flex items-center gap-1 px-2.5 py-1 bg-muted hover:bg-gray-200 text-foreground rounded-full text-[11px] font-bold transition-all"
                  >
                    @{collab}
                    <button
                      type="button"
                      onClick={() => handleRemoveCollaborator(collab)}
                      className="text-muted-foreground hover:text-red-500 rounded-full transition-all"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Audio of Reel section */}
          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase mb-2 font-sans">
              <Music size={13} />
              {t("planner:postCreator.presets.instagram.backgroundAudio")}
            </label>

            <div className="relative">
              {audio.value ? (
                <div className="flex items-center justify-between p-3 border border-purple-200 bg-purple-50/20 rounded-xl">
                  <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
                    <Music size={14} className="animate-pulse" />
                    <span>{audio.value.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => audio.onChange(null)}
                    className="p-1 text-purple-400 hover:text-purple-700 hover:bg-purple-100 rounded-full transition-all cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onToggleAudioList}
                  className="w-full px-4 py-3 bg-card border border-dashed border-gray-300 hover:border-black rounded-xl text-left text-xs font-semibold text-muted-foreground hover:text-black transition-all flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Music size={14} />
                    {t("planner:postCreator.presets.instagram.selectMusicTrack")}
                  </span>
                  <ChevronDown size={14} className={`transition-transform duration-200 ${showAudioList ? 'rotate-180' : ''}`} />
                </button>
              )}

              {showAudioList && !audio.value && (
                <div className="absolute left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-10 py-2 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 flex flex-col max-h-56">
                  <div className="px-3 pb-2 border-b border-border">
                    <input
                      type="text"
                      value={audioSearchQuery}
                      onChange={(e) => onAudioSearchChange(e.target.value)}
                      placeholder={t("planner:postCreator.presets.instagram.searchAudioMeta")}
                      className="w-full px-2.5 py-1.5 bg-muted border border-border focus:border-purple-500 rounded-lg text-[11px] font-semibold text-foreground outline-none transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="overflow-y-auto flex-1 py-1">
                    {isLoadingAudio ? (
                      <div className="flex items-center justify-center py-4 text-[10px] text-muted-foreground font-bold gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                        {t("planner:postCreator.presets.instagram.searching")}
                      </div>
                    ) : audioTracks.length === 0 ? (
                      <div className="text-center py-4 text-[10px] text-muted-foreground font-bold">
                        {t("planner:postCreator.presets.instagram.noAudioFound")}
                      </div>
                    ) : (
                      audioTracks.map((track) => (
                        <button
                          key={track.id}
                          type="button"
                          onClick={() => audio.onChange(track)}
                          className="w-full text-left px-4 py-2.5 hover:bg-purple-50/40 text-xs font-semibold text-foreground hover:text-purple-700 transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <Music size={12} className="text-muted-foreground" />
                          {track.name}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Show Reel on Feed Toggle (Reels only) */}
          {instagramType === 'reel' && (
            <div className="flex items-center justify-between p-3.5 bg-muted/50 rounded-2xl border border-border">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground font-sans block">{t("planner:postCreator.presets.instagram.showReelOnFeed")}</span>
                <span className="text-[10px] text-muted-foreground font-medium block leading-relaxed">{t("planner:postCreator.presets.instagram.showReelOnFeedDesc")}</span>
              </div>
              <button
                type="button"
                onClick={() => showOnFeed.onChange(!showOnFeed.value)}
                className={`w-11 h-6 rounded-full transition-all duration-300 relative ${showOnFeed.value ? 'bg-[#E1306C]' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-card transition-all duration-300 ${showOnFeed.value ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
