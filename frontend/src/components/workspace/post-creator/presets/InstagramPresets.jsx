import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Instagram, Plus, X, Music, UserPlus } from "lucide-react";
import { usePostCreatorFormContext } from "../../../../context/PostCreatorFormContext";
import socialService from "../../../../services/social.service";

const MOCK_AUDIO_TRACKS = [
  { id: "viral_pop", name: "Trending Pop Hits (Viral)" },
  { id: "lofi_chill", name: "Chill Lofi Beats" },
  { id: "synthwave", name: "Epic Cinematic Synth" },
  { id: "acoustic", name: "Acoustic Sunset Moods" },
  { id: "tech_vibe", name: "Tech Startup Vibe" }
];

export function InstagramPresets() {
  const { t } = useTranslation(["planner"]);
  const {
    instagramOpen,
    setInstagramOpen,
    instagramType,
    instagramCollaborators,
    setInstagramCollaborators,
    instagramAudio,
    setInstagramAudio,
    instagramShowOnFeed,
    setInstagramShowOnFeed,
    activeBrand
  } = usePostCreatorFormContext();

  const [collabInput, setCollabInput] = useState("");
  const [showAudioList, setShowAudioList] = useState(false);
  const [audioSearchQuery, setAudioSearchQuery] = useState("");
  const [audioTracks, setAudioTracks] = useState(MOCK_AUDIO_TRACKS);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  React.useEffect(() => {
    if (!showAudioList || !activeBrand) return;

    let isMounted = true;
    const fetchAudio = async () => {
      setIsLoadingAudio(true);
      try {
        const response = await socialService.searchInstagramAudio(activeBrand.id, audioSearchQuery);
        if (isMounted) {
          setAudioTracks(response.data || MOCK_AUDIO_TRACKS);
        }
      } catch (err) {
        console.error("Failed to search Instagram audio:", err);
        if (isMounted) {
          const filtered = MOCK_AUDIO_TRACKS.filter(t => 
            t.name.toLowerCase().includes(audioSearchQuery.toLowerCase())
          );
          setAudioTracks(filtered);
        }
      } finally {
        if (isMounted) {
          setIsLoadingAudio(false);
        }
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchAudio();
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(debounceTimer);
    };
  }, [audioSearchQuery, showAudioList, activeBrand]);

  const handleAddCollaborator = () => {
    const clean = collabInput.trim().replace(/^@/, "");
    if (!clean) return;
    if (instagramCollaborators.includes(clean)) {
      setCollabInput("");
      return;
    }
    setInstagramCollaborators([...instagramCollaborators, clean]);
    setCollabInput("");
  };

  const handleRemoveCollaborator = (name) => {
    setInstagramCollaborators(instagramCollaborators.filter(c => c !== name));
  };

  return (
    <div className="border border-gray-100 rounded-3xl overflow-hidden bg-white shadow-sm transition-all duration-300">
      {/* Accordion Header */}
      <div 
        onClick={() => setInstagramOpen(!instagramOpen)}
        className="p-5 flex items-center justify-between hover:bg-gray-50/50 transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          <Instagram size={18} className="text-[#E1306C]" />
          <span className="text-[12px] font-bold text-gray-700 font-sans">{t("planner:postCreator.presets.instagram.title")}</span>
          <span className="text-[9px] bg-emerald-500 text-white font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-widest scale-90">{t("planner:postCreator.presets.instagram.newBadge")}</span>
        </div>
        <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${instagramOpen ? 'rotate-180 text-black' : ''}`} />
      </div>

      {/* Accordion Body */}
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${instagramOpen ? 'max-h-[500px] border-t border-gray-50 p-6' : 'max-h-0'}`}>
        <div className="space-y-6 text-left">
          
          {/* Collaborators section */}
          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase mb-2 font-sans">
              <UserPlus size={13} />
              {t("planner:postCreator.presets.instagram.collaborators")}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold">@</span>
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
                  className="w-full pl-7 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:border-black outline-none font-sans"
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
            {instagramCollaborators.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {instagramCollaborators.map((collab) => (
                  <span 
                    key={collab}
                    className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-[11px] font-bold transition-all"
                  >
                    @{collab}
                    <button 
                      type="button"
                      onClick={() => handleRemoveCollaborator(collab)}
                      className="text-gray-400 hover:text-red-500 rounded-full transition-all"
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
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase mb-2 font-sans">
              <Music size={13} />
              {t("planner:postCreator.presets.instagram.backgroundAudio")}
            </label>
            
            <div className="relative">
              {instagramAudio ? (
                <div className="flex items-center justify-between p-3 border border-purple-200 bg-purple-50/20 rounded-xl">
                  <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
                    <Music size={14} className="animate-pulse" />
                    <span>{instagramAudio.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInstagramAudio(null)}
                    className="p-1 text-purple-400 hover:text-purple-700 hover:bg-purple-100 rounded-full transition-all cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAudioList(!showAudioList)}
                  className="w-full px-4 py-3 bg-white border border-dashed border-gray-300 hover:border-black rounded-xl text-left text-xs font-semibold text-gray-500 hover:text-black transition-all flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Music size={14} />
                    {t("planner:postCreator.presets.instagram.selectMusicTrack")}
                  </span>
                  <ChevronDown size={14} className={`transition-transform duration-200 ${showAudioList ? 'rotate-180' : ''}`} />
                </button>
              )}

              {showAudioList && !instagramAudio && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-10 py-2 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 flex flex-col max-h-56">
                  <div className="px-3 pb-2 border-b border-gray-100">
                    <input
                      type="text"
                      value={audioSearchQuery}
                      onChange={(e) => setAudioSearchQuery(e.target.value)}
                      placeholder={t("planner:postCreator.presets.instagram.searchAudioMeta")}
                      className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 focus:border-purple-500 rounded-lg text-[11px] font-semibold text-gray-700 outline-none transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="overflow-y-auto flex-1 py-1">
                    {isLoadingAudio ? (
                      <div className="flex items-center justify-center py-4 text-[10px] text-gray-400 font-bold gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                        {t("planner:postCreator.presets.instagram.searching")}
                      </div>
                    ) : audioTracks.length === 0 ? (
                      <div className="text-center py-4 text-[10px] text-gray-400 font-bold">
                        {t("planner:postCreator.presets.instagram.noAudioFound")}
                      </div>
                    ) : (
                      audioTracks.map((track) => (
                        <button
                          key={track.id}
                          type="button"
                          onClick={() => {
                            setInstagramAudio(track);
                            setShowAudioList(false);
                            setAudioSearchQuery("");
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-purple-50/40 text-xs font-semibold text-gray-700 hover:text-purple-700 transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <Music size={12} className="text-gray-400" />
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
            <div className="flex items-center justify-between p-3.5 bg-gray-50/50 rounded-2xl border border-gray-100">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-gray-800 font-sans block">{t("planner:postCreator.presets.instagram.showReelOnFeed")}</span>
                <span className="text-[10px] text-gray-400 font-medium block leading-relaxed">{t("planner:postCreator.presets.instagram.showReelOnFeedDesc")}</span>
              </div>
              <button
                type="button"
                onClick={() => setInstagramShowOnFeed(!instagramShowOnFeed)}
                className={`w-11 h-6 rounded-full transition-all duration-300 relative ${instagramShowOnFeed ? 'bg-[#E1306C]' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${instagramShowOnFeed ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
