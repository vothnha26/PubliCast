import * as React from "react";
import { useState, useEffect } from "react";
import { 
  Settings, ChevronDown, ChevronUp, Facebook, Youtube, Instagram,
  HelpCircle, Grid, Video, ShieldAlert, AlertCircle, PlayCircle,
  MessageCircle, Scissors, Layers2, Image as ImageIcon, Type, Link as LinkIcon,
  RotateCw, Copy, Upload, UserPlus, Music, Plus, X
} from "lucide-react";
import { Switch } from "../../../../../components/ui/switch";
import { PlatformIcon } from "../../../../../components/shared/PlatformIcon";

const MOCK_AUDIO_TRACKS = [
  { id: "viral_pop", name: "Trending Pop Hits (Viral)" },
  { id: "lofi_chill", name: "Chill Lofi Beats" },
  { id: "synthwave", name: "Epic Cinematic Synth" },
  { id: "acoustic", name: "Acoustic Sunset Moods" },
  { id: "tech_vibe", name: "Tech Startup Vibe" }
];

export function AutoListConfigCard({
  selectedPlatforms = [],
  autoPublish,
  setAutoPublish,
  repeat,
  setRepeat,
  useUrlShortener,
  setUseUrlShortener,
  globalFirstComment,
  setGlobalFirstComment,

  // Facebook
  facebookContentType,
  setFacebookContentType,
  facebookTitle,
  setFacebookTitle,
  facebookReelThumbnail,
  setFacebookReelThumbnail,

  // Instagram
  instagramContentType,
  setInstagramContentType,
  instagramCollaborators = [],
  setInstagramCollaborators,
  instagramAudio,
  setInstagramAudio,
  instagramShowOnFeed,
  setInstagramShowOnFeed,

  // Threads
  threadsWhoCanReply,
  setThreadsWhoCanReply,

  // YouTube
  youtubeVideoType,
  setYoutubeVideoType,
  youtubePrivacy,
  setYoutubePrivacy,
  youtubeMadeForKids,
  setYoutubeMadeForKids,

  // TikTok
  tiktokPrivacy,
  setTiktokPrivacy,
  tiktokAllowComments,
  setTiktokAllowComments,
  tiktokAllowDuet,
  setTiktokAllowDuet,
  tiktokAllowStitch,
  setTiktokAllowStitch,
  tiktokAiGenerated,
  setTiktokAiGenerated,
  tiktokCommercialContent,
  setTiktokCommercialContent
}) {
  const [globalExpanded, setGlobalExpanded] = useState(true);
  const [facebookExpanded, setFacebookExpanded] = useState(true);
  const [youtubeExpanded, setYoutubeExpanded] = useState(true);
  const [instagramExpanded, setInstagramExpanded] = useState(true);
  const [threadsExpanded, setThreadsExpanded] = useState(true);
  const [tiktokExpanded, setTiktokExpanded] = useState(true);

  // Instagram audio dropdown state
  const [collabInput, setCollabInput] = useState("");
  const [showAudioList, setShowAudioList] = useState(false);
  const [audioSearchQuery, setAudioSearchQuery] = useState("");
  const [audioTracks, setAudioTracks] = useState(MOCK_AUDIO_TRACKS);

  useEffect(() => {
    if (!audioSearchQuery.trim()) {
      setAudioTracks(MOCK_AUDIO_TRACKS);
      return;
    }
    const filtered = MOCK_AUDIO_TRACKS.filter(t => 
      t.name.toLowerCase().includes(audioSearchQuery.toLowerCase())
    );
    setAudioTracks(filtered);
  }, [audioSearchQuery]);

  const hasFacebook = selectedPlatforms.some(p => p.toUpperCase() === 'FACEBOOK');
  const hasYoutube = selectedPlatforms.some(p => p.toUpperCase() === 'YOUTUBE');
  const hasInstagram = selectedPlatforms.some(p => p.toUpperCase() === 'INSTAGRAM');
  const hasThreads = selectedPlatforms.some(p => p.toUpperCase() === 'THREADS');
  const hasTiktok = selectedPlatforms.some(p => p.toUpperCase() === 'TIKTOK');

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
    <div className="space-y-4 text-left font-sans">
      <div className="space-y-4">
        {/* 1. Global Presets */}
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
                    <LinkIcon size={16} />
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

        {/* 2. Facebook Presets */}
        {hasFacebook && (
          <div className="border border-border rounded-3xl overflow-hidden bg-card shadow-sm transition-all duration-300">
            <div 
              onClick={() => setFacebookExpanded(!facebookExpanded)}
              className="p-5 flex items-center justify-between hover:bg-muted/50 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <svg className="w-[18px] h-[18px] text-[#1877F2] fill-[#1877F2]" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span className="text-[12px] font-bold text-foreground font-sans">Facebook presets</span>
              </div>
              <ChevronDown size={16} className={`text-muted-foreground transition-transform duration-300 ${facebookExpanded ? 'rotate-180 text-black' : ''}`} />
            </div>

            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${facebookExpanded ? 'max-h-[600px] border-t border-gray-50 p-6' : 'max-h-0'}`}>
              <div className="space-y-4 text-left">
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-2 font-sans">Content type</label>
                  <div className="relative">
                    <select 
                      value={facebookContentType}
                      onChange={(e) => setFacebookContentType(e.target.value)}
                      className="w-full px-4 py-3 bg-card border border-border rounded-2xl text-xs font-semibold focus:border-black outline-none appearance-none cursor-pointer font-sans"
                    >
                      <option value="post">Post</option>
                      <option value="reel">Reel</option>
                      <option value="story">Story</option>
                      <option value="album">Album</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-2 font-sans">Title</label>
                  <input 
                    type="text"
                    value={facebookTitle || ''}
                    onChange={(e) => setFacebookTitle(e.target.value)}
                    placeholder="Title"
                    className="w-full px-4 py-3 bg-card border border-border rounded-2xl text-xs font-semibold focus:border-black outline-none font-sans"
                  />
                </div>

                {facebookContentType === 'reel' && (
                  <div>
                    <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-2 font-sans">Custom Thumbnail URL</label>
                    <input
                      type="text"
                      value={facebookReelThumbnail || ''}
                      onChange={(e) => setFacebookReelThumbnail(e.target.value)}
                      placeholder="https://example.com/thumbnail.jpg"
                      className="w-full px-4 py-3 bg-card border border-border rounded-2xl text-xs font-semibold focus:border-black outline-none font-sans"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 3. YouTube Presets — Đổi về giao diện gốc của AutoList */}
        {hasYoutube && (
          <div className="border border-border rounded-3xl overflow-hidden bg-card shadow-sm transition-all duration-300">
            <div 
              onClick={() => setYoutubeExpanded(!youtubeExpanded)}
              className="p-5 flex items-center justify-between hover:bg-muted/50 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <Youtube size={18} className="text-[#FF0000]" />
                <span className="text-[12px] font-bold text-foreground font-sans">YouTube presets</span>
              </div>
              <ChevronDown size={16} className={`text-muted-foreground transition-transform duration-300 ${youtubeExpanded ? 'rotate-180 text-black' : ''}`} />
            </div>

            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${youtubeExpanded ? 'max-h-[600px] border-t border-gray-50 p-6' : 'max-h-0'}`}>
              <div className="space-y-5 text-left">
                
                {/* Description Alert Banner gốc */}
                <div className="bg-[#eff6ff] border border-[#dbeafe] text-[#1e40af] text-xs rounded-2xl p-4 flex items-start gap-3">
                  <AlertCircle size={18} className="text-[#3b82f6] shrink-0 mt-0.5" />
                  <span className="leading-relaxed text-[11px] font-medium font-sans">
                    The titles will be extracted from the first sentence of the content of each post. To add a description to your video, separate it from the first sentence in a different paragraph.
                  </span>
                </div>

                {/* Video type */}
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-2 font-sans">Video type</label>
                  <div className="relative">
                    <select 
                      value={youtubeVideoType}
                      onChange={(e) => setYoutubeVideoType(e.target.value)}
                      className="w-full px-4 py-3 bg-card border border-border rounded-2xl text-xs font-semibold focus:border-black outline-none appearance-none cursor-pointer font-sans"
                    >
                      <option value="video">Video</option>
                      <option value="short">Short</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                {/* Privacy configuration */}
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-2 font-sans">Privacy configuration</label>
                  <div className="relative">
                    <select 
                      value={youtubePrivacy || 'public'}
                      onChange={(e) => setYoutubePrivacy(e.target.value)}
                      className="w-full px-4 py-3 bg-card border border-border rounded-2xl text-xs font-semibold focus:border-black outline-none appearance-none cursor-pointer font-sans"
                    >
                      <option value="public">Public</option>
                      <option value="unlisted">Unlisted</option>
                      <option value="private">Private</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                {/* Audience configuration */}
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-2 font-sans">Audience configuration</label>
                  <div className="space-y-2 text-xs text-foreground font-semibold font-sans pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="kids" 
                        checked={youtubeMadeForKids} 
                        onChange={() => setYoutubeMadeForKids(true)}
                        className="w-4 h-4 text-black border-gray-300 focus:ring-black accent-black cursor-pointer" 
                      />
                      <span>Yes, it's a video made for kids</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="kids" 
                        checked={!youtubeMadeForKids} 
                        onChange={() => setYoutubeMadeForKids(false)}
                        className="w-4 h-4 text-black border-gray-300 focus:ring-black accent-black cursor-pointer" 
                      />
                      <span>No, it's not a video made for kids</span>
                    </label>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* 4. Instagram Presets */}
        {hasInstagram && (
          <div className="border border-border rounded-3xl overflow-hidden bg-card shadow-sm transition-all duration-300">
            <div 
              onClick={() => setInstagramExpanded(!instagramExpanded)}
              className="p-5 flex items-center justify-between hover:bg-muted/50 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <Instagram size={18} className="text-[#E1306C]" />
                <span className="text-[12px] font-bold text-foreground font-sans">Instagram presets</span>
                <span className="text-[9px] bg-emerald-500 text-white font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-widest scale-90">New</span>
              </div>
              <ChevronDown size={16} className={`text-muted-foreground transition-transform duration-300 ${instagramExpanded ? 'rotate-180 text-black' : ''}`} />
            </div>

            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${instagramExpanded ? 'max-h-[500px] border-t border-gray-50 p-6' : 'max-h-0'}`}>
              <div className="space-y-6 text-left">
                
                {/* Content Type */}
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-2 font-sans">Content type</label>
                  <div className="relative">
                    <select 
                      value={instagramContentType}
                      onChange={(e) => setInstagramContentType(e.target.value)}
                      className="w-full px-4 py-3 bg-card border border-border rounded-2xl text-xs font-semibold focus:border-black outline-none appearance-none cursor-pointer font-sans"
                    >
                      <option value="post">Post</option>
                      <option value="reel">Reel</option>
                      <option value="story">Story</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                {/* Collaborators section */}
                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase mb-2 font-sans">
                    <UserPlus size={13} />
                    Collaborators
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
                        placeholder="Enter username"
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

                  {instagramCollaborators.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {instagramCollaborators.map((collab) => (
                        <span 
                          key={collab}
                          className="flex items-center gap-1 px-2.5 py-1 bg-muted hover:bg-gray-200 text-foreground rounded-full text-[11px] font-bold transition-all font-sans"
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

                {/* Background Audio / Music */}
                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase mb-2 font-sans">
                    <Music size={13} />
                    Background Audio / Music
                  </label>
                  
                  <div className="relative">
                    {instagramAudio ? (
                      <div className="flex items-center justify-between p-3 border border-purple-200 bg-purple-50/20 rounded-xl">
                        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 font-sans">
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
                        className="w-full px-4 py-3 bg-card border border-dashed border-gray-300 hover:border-black rounded-xl text-left text-xs font-semibold text-muted-foreground hover:text-black transition-all flex items-center justify-between cursor-pointer font-sans"
                      >
                        <span className="flex items-center gap-2">
                          <Music size={14} />
                          Select music track
                        </span>
                        <ChevronDown size={14} className={`transition-transform duration-200 ${showAudioList ? 'rotate-180' : ''}`} />
                      </button>
                    )}

                    {showAudioList && !instagramAudio && (
                      <div className="absolute left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-10 py-2 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 flex flex-col max-h-56">
                        <div className="px-3 pb-2 border-b border-border">
                          <input
                            type="text"
                            value={audioSearchQuery}
                            onChange={(e) => setAudioSearchQuery(e.target.value)}
                            placeholder="Search audio on Meta..."
                            className="w-full px-2.5 py-1.5 bg-muted border border-border focus:border-purple-500 rounded-lg text-[11px] font-semibold text-foreground outline-none transition-colors font-sans"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="overflow-y-auto flex-1 py-1">
                          {audioTracks.length === 0 ? (
                            <div className="text-center py-4 text-[10px] text-muted-foreground font-bold font-sans">
                              No audio tracks found
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
                                className="w-full text-left px-4 py-2.5 hover:bg-purple-50/40 text-xs font-semibold text-foreground hover:text-purple-700 transition-colors flex items-center gap-2 cursor-pointer font-sans"
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
                {instagramContentType === 'reel' && (
                  <div className="flex items-center justify-between p-3.5 bg-muted/50 rounded-2xl border border-border">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-foreground font-sans block">Show Reel on feed</span>
                      <span className="text-[10px] text-muted-foreground font-medium block leading-relaxed font-sans">Also share your Reels to your Profile Feed.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setInstagramShowOnFeed(!instagramShowOnFeed)}
                      className={`w-11 h-6 rounded-full transition-all duration-300 relative ${instagramShowOnFeed ? 'bg-[#E1306C]' : 'bg-gray-200'}`}
                    >
                      <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-card transition-all duration-300 ${instagramShowOnFeed ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}

        {/* 5. Threads Presets */}
        {hasThreads && (
          <div className="border border-border rounded-3xl overflow-hidden bg-card shadow-sm transition-all duration-300">
            <div 
              onClick={() => setThreadsExpanded(!threadsExpanded)}
              className="p-5 flex items-center justify-between hover:bg-muted/50 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <PlatformIcon platform="Threads" size={18} variant="flat" className="text-black" />
                <span className="text-[12px] font-bold text-foreground font-sans">Threads presets</span>
              </div>
              <ChevronDown size={16} className={`text-muted-foreground transition-transform duration-300 ${threadsExpanded ? 'rotate-180 text-black' : ''}`} />
            </div>

            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${threadsExpanded ? 'max-h-[300px] border-t border-gray-50 p-6' : 'max-h-0'}`}>
              <div className="space-y-4 text-left">
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-2 font-sans">Who can reply to this post?</label>
                  <div className="relative">
                    <select
                      value={threadsWhoCanReply || 'everyone'}
                      onChange={(e) => setThreadsWhoCanReply(e.target.value)}
                      className="w-full px-4 py-3 bg-card border border-border rounded-2xl text-xs font-semibold focus:border-black outline-none appearance-none cursor-pointer font-sans"
                    >
                      <option value="everyone">Everyone</option>
                      <option value="accounts_you_follow">Profiles you follow</option>
                      <option value="mentioned_only">Mentioned profiles only</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 font-medium leading-normal font-sans">
                    Limit who can reply to your Threads post directly from here.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 6. TikTok Presets */}
        {hasTiktok && (
          <div className="border border-border rounded-3xl overflow-hidden bg-card shadow-sm transition-all duration-300">
            <div 
              onClick={() => setTiktokExpanded(!tiktokExpanded)}
              className="p-5 flex items-center justify-between hover:bg-muted/50 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <svg className="w-[18px] h-[18px] text-black fill-current" viewBox="0 0 24 24">
                  <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.09-1.5-1.1-1.02-1.7-2.48-1.9-3.96-.03 2.49 0 4.99 0 7.48-.02 1.9-.38 3.82-1.39 5.43-1.46 2.42-4.13 3.84-6.93 3.55-3.05-.2-5.78-2.44-6.39-5.46-.73-3.27.97-6.9 4.13-7.91 1.09-.34 2.24-.39 3.37-.2v4.02c-1.22-.32-2.58-.09-3.55.74-.95.83-1.29 2.19-1.03 3.4.31 1.65 1.84 2.91 3.53 2.78 1.94-.04 3.42-1.8 3.25-3.73-.02-2.91 0-5.83 0-8.74.02-3.11-.02-6.22.02-9.33z"/>
                </svg>
                <span className="text-[12px] font-bold text-foreground font-sans">Tiktok presets</span>
              </div>
              <ChevronDown size={16} className={`text-muted-foreground transition-transform duration-300 ${tiktokExpanded ? 'rotate-180 text-black' : ''}`} />
            </div>

            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${tiktokExpanded ? 'max-h-[500px] border-t border-gray-50 p-6' : 'max-h-0'}`}>
              <div className="space-y-5 text-left">
                
                {/* Privacy dropdown */}
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-2 font-sans">Who can view your post?</label>
                  <div className="relative">
                    <select
                      value={tiktokPrivacy || 'public'}
                      onChange={(e) => setTiktokPrivacy(e.target.value)}
                      className="w-full px-4 py-3 bg-card border border-border rounded-2xl text-xs font-semibold focus:border-black outline-none appearance-none cursor-pointer font-sans"
                    >
                      <option value="public">Public</option>
                      <option value="friends">Friends</option>
                      <option value="self">Self</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                {/* 3 Switches */}
                <div className="flex items-center justify-between gap-4 pt-2 border-t border-gray-50">
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase font-sans">Allow comments</span>
                    <button
                      type="button"
                      onClick={() => setTiktokAllowComments(!tiktokAllowComments)}
                      className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 ${
                        tiktokAllowComments ? 'bg-black' : 'bg-gray-200'
                      }`}
                    >
                      <div
                        className={`bg-card w-4 h-4 rounded-full shadow-sm transform transition-all duration-300 ${
                          tiktokAllowComments ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase font-sans">Allow duet</span>
                    <button
                      type="button"
                      onClick={() => setTiktokAllowDuet(!tiktokAllowDuet)}
                      className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 ${
                        tiktokAllowDuet ? 'bg-black' : 'bg-gray-200'
                      }`}
                    >
                      <div
                        className={`bg-card w-4 h-4 rounded-full shadow-sm transform transition-all duration-300 ${
                          tiktokAllowDuet ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase font-sans">Allow stitch</span>
                    <button
                      type="button"
                      onClick={() => setTiktokAllowStitch(!tiktokAllowStitch)}
                      className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 ${
                        tiktokAllowStitch ? 'bg-black' : 'bg-gray-200'
                      }`}
                    >
                      <div
                        className={`bg-card w-4 h-4 rounded-full shadow-sm transform transition-all duration-300 ${
                          tiktokAllowStitch ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* AI and Commercial Switches */}
                <div className="border-t border-border pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col text-left">
                      <span className="block text-[11px] font-bold text-muted-foreground uppercase font-sans">AI-generated content</span>
                      <span className="text-[9px] text-muted-foreground font-medium font-sans">Label your content as generated by AI</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTiktokAiGenerated(!tiktokAiGenerated)}
                      className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 shrink-0 ${
                        tiktokAiGenerated ? 'bg-black' : 'bg-gray-200'
                      }`}
                    >
                      <div
                        className={`bg-card w-4 h-4 rounded-full shadow-sm transform transition-all duration-300 ${
                          tiktokAiGenerated ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-0.5 text-left">
                      <span className="block text-[11px] font-bold text-muted-foreground uppercase font-sans">Commercial content</span>
                      <span className="block text-[9px] text-muted-foreground font-medium leading-normal font-sans">
                        Turn on to disclose that this post promotes goods or services in exchange for something of value
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTiktokCommercialContent(!tiktokCommercialContent)}
                      className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 shrink-0 mt-0.5 ${
                        tiktokCommercialContent ? 'bg-black' : 'bg-gray-200'
                      }`}
                    >
                      <div
                        className={`bg-card w-4 h-4 rounded-full shadow-sm transform transition-all duration-300 ${
                          tiktokCommercialContent ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
