import React, { useState, useRef, useEffect } from "react";
import { X, Play, Pause, Volume2, VolumeX, Scissors, Music, Type, Languages, Sparkles, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

const MOCK_AUDIO_TRACKS = [
  { id: "none", name: "None (Keep Original Audio)" },
  { id: "viral_beats", name: "Viral TikTok Beats (Upbeat)" },
  { id: "lofi_sunset", name: "Lofi Sunset Lounge (Chill)" },
  { id: "epic_synth", name: "Epic Synthwave (Energetic)" },
  { id: "corp_tech", name: "Modern Corporate Tech (Professional)" }
];

const MOCK_SUBTITLES = [
  { time: "00:01", text: "Welcome to PubliCast! 🚀" },
  { time: "00:03", text: "Today we are looking at the new features" },
  { time: "00:06", text: "Enjoy editing your social videos in one place!" }
];

export function VideoEditorModal({ isOpen, videoUrl, onClose, onSave }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  
  // Tabs
  const [activeTab, setActiveTab] = useState("trim"); // "trim" | "audio" | "text" | "subtitles"
  
  // Trim options
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(10);
  
  // Aspect ratio
  const [aspectRatio, setAspectRatio] = useState("original"); // "original" | "9:16" | "16:9" | "1:1"
  
  // Audio options
  const [selectedAudio, setSelectedAudio] = useState("none");
  const [audioVolume, setAudioVolume] = useState(50);
  
  // Text Overlay options
  const [textOverlay, setTextOverlay] = useState("");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [textSize, setTextSize] = useState(18);
  const [textPosition, setTextPosition] = useState("bottom"); // "top" | "center" | "bottom"
  
  // Subtitle options
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [isGeneratingSubs, setIsGeneratingSubs] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      if (isOpen) {
        videoRef.current.load();
        setIsPlaying(false);
      }
    }
  }, [isOpen, videoUrl]);

  if (!isOpen) return null;

  const handleMetadataLoaded = () => {
    if (videoRef.current) {
      const videoDuration = videoRef.current.duration || 10;
      setDuration(videoDuration);
      setEndTime(videoDuration);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const curr = videoRef.current.currentTime;
      setCurrentTime(curr);
      
      // Loop within trimmed duration
      if (curr >= endTime) {
        videoRef.current.currentTime = startTime;
      }
      if (curr < startTime) {
        videoRef.current.currentTime = startTime;
      }
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleGenerateSubtitles = () => {
    setIsGeneratingSubs(true);
    setTimeout(() => {
      setIsGeneratingSubs(false);
      setSubtitlesEnabled(true);
      toast.success("AI Subtitles generated successfully!");
    }, 2000);
  };

  const handleSaveVideo = () => {
    toast.loading("Applying video edits...", { id: "video-edit-toast" });
    setTimeout(() => {
      toast.success("Video changes applied successfully!", { id: "video-edit-toast" });
      onSave({
        startTime,
        endTime,
        aspectRatio,
        selectedAudio,
        audioVolume,
        textOverlay,
        textColor,
        textSize,
        textPosition,
        subtitlesEnabled
      });
    }, 1500);
  };

  // Get active subtitle text based on current playback time
  const getActiveSubtitle = () => {
    if (!subtitlesEnabled) return "";
    if (currentTime < 3) return MOCK_SUBTITLES[0].text;
    if (currentTime >= 3 && currentTime < 6) return MOCK_SUBTITLES[1].text;
    if (currentTime >= 6) return MOCK_SUBTITLES[2].text;
    return "";
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full h-full max-w-5xl max-h-[85vh] md:rounded-[32px] overflow-hidden shadow-2xl flex flex-col justify-between font-sans relative border border-gray-100 mx-4">
        
        {/* Header */}
        <div className="h-16 border-b border-gray-100 flex items-center justify-between px-8 bg-white shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="text-purple-600 animate-pulse" size={18} />
            <h2 className="text-base font-black text-gray-800 tracking-tight">Smart Video Editor</h2>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[#180F1E] hover:bg-black text-white flex items-center justify-center shadow-md transition-all cursor-pointer group"
          >
            <X size={18} className="group-hover:rotate-90 transition-transform duration-300 text-yellow-300" />
          </button>
        </div>

        {/* Editor Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-gray-50">
          
          {/* Left panel: Video Player preview */}
          <div className="flex-1 flex flex-col justify-center items-center p-6 relative overflow-hidden bg-gray-950 border-r border-gray-100">
            
            {/* Player Container */}
            <div className={`relative max-w-full max-h-[50vh] overflow-hidden rounded-2xl shadow-2xl bg-black transition-all duration-300 flex items-center justify-center ${
              aspectRatio === "9:16" ? "aspect-[9/16] h-[45vh]" :
              aspectRatio === "16:9" ? "aspect-[16/9] w-full" :
              aspectRatio === "1:1" ? "aspect-square h-[40vh]" : "max-h-[50vh]"
            }`}>
              <video
                ref={videoRef}
                src={videoUrl}
                onLoadedMetadata={handleMetadataLoaded}
                onTimeUpdate={handleTimeUpdate}
                onClick={togglePlay}
                className={`w-full h-full ${aspectRatio !== "original" ? "object-cover" : "object-contain"}`}
              />

              {/* Text Overlay on video */}
              {textOverlay && (
                <div className={`absolute left-4 right-4 text-center font-bold font-sans pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] z-10 ${
                  textPosition === "top" ? "top-6" :
                  textPosition === "center" ? "top-1/2 -translate-y-1/2" : "bottom-12"
                }`} style={{ color: textColor, fontSize: `${textSize}px` }}>
                  {textOverlay}
                </div>
              )}

              {/* AI Subtitles Overlay on video */}
              {subtitlesEnabled && getActiveSubtitle() && (
                <div className="absolute bottom-4 left-4 right-4 text-center font-sans font-medium text-sm text-yellow-300 px-3 py-1 bg-black/60 rounded-lg max-w-xs mx-auto drop-shadow-md z-10">
                  {getActiveSubtitle()}
                </div>
              )}

              {/* Playback center indicator */}
              {!isPlaying && (
                <button 
                  onClick={togglePlay}
                  className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-white/35 hover:bg-white/50 backdrop-blur-md text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-lg"
                >
                  <Play size={24} className="fill-white ml-1" />
                </button>
              )}
            </div>

            {/* Video Controls Bar */}
            <div className="w-full max-w-md mt-4 flex items-center justify-between gap-4 px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-white">
              <button onClick={togglePlay} className="hover:text-yellow-300 transition-colors">
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>

              <div className="flex-1 text-[10px] font-mono text-white/80 select-none text-center">
                {Math.floor(currentTime)}s / {Math.floor(duration)}s (Trim: {Math.floor(startTime)}s - {Math.floor(endTime)}s)
              </div>

              <button onClick={toggleMute} className="hover:text-yellow-300 transition-colors">
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
            </div>
          </div>

          {/* Right panel: Editor settings & options */}
          <div className="w-full md:w-80 bg-white flex flex-col overflow-y-auto border-t md:border-t-0 border-gray-100">
            
            {/* Aspect Ratio Tabs */}
            <div className="p-5 border-b border-gray-100 space-y-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 font-sans block">Aspect Ratio</span>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: "original", label: "Orig" },
                  { id: "9:16", label: "9:16" },
                  { id: "16:9", label: "16:9" },
                  { id: "1:1", label: "1:1" }
                ].map((aspect) => (
                  <button
                    key={aspect.id}
                    onClick={() => setAspectRatio(aspect.id)}
                    className={`py-2 text-[10px] font-bold rounded-xl transition-all cursor-pointer text-center border uppercase tracking-wider ${
                      aspectRatio === aspect.id 
                        ? "bg-[#180F1E] border-[#180F1E] text-yellow-300 shadow-sm" 
                        : "bg-white border-gray-200 text-gray-500 hover:text-black hover:border-gray-300"
                    }`}
                  >
                    {aspect.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Panel Tabs Navigation */}
            <div className="flex border-b border-gray-100 shrink-0">
              {[
                { id: "trim", icon: <Scissors size={14} />, label: "Trim" },
                { id: "audio", icon: <Music size={14} />, label: "Audio" },
                { id: "text", icon: <Type size={14} />, label: "Text" },
                { id: "subtitles", icon: <Languages size={14} />, label: "AI Subs" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-3.5 flex flex-col items-center gap-1 border-b-2 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === tab.id 
                      ? "border-[#180F1E] text-black bg-gray-50/50" 
                      : "border-transparent text-gray-400 hover:text-black"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 text-left">
              
              {/* Tab 1: Trim */}
              {activeTab === "trim" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-gray-600 block">Start Time (seconds)</span>
                    <input 
                      type="range"
                      min={0}
                      max={Math.max(0, endTime - 1)}
                      step={0.5}
                      value={startTime}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setStartTime(val);
                        if (videoRef.current) videoRef.current.currentTime = val;
                      }}
                      className="w-full accent-black cursor-pointer"
                    />
                    <div className="text-right text-xs font-mono font-bold text-gray-800">{startTime}s</div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-gray-600 block">End Time (seconds)</span>
                    <input 
                      type="range"
                      min={Math.min(duration, startTime + 1)}
                      max={duration || 10}
                      step={0.5}
                      value={endTime}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setEndTime(val);
                        if (videoRef.current) videoRef.current.currentTime = val;
                      }}
                      className="w-full accent-black cursor-pointer"
                    />
                    <div className="text-right text-xs font-mono font-bold text-gray-800">{endTime}s</div>
                  </div>

                  <div className="p-3 bg-purple-50/40 border border-purple-100 rounded-2xl text-[11px] text-purple-700 leading-relaxed font-medium">
                    Trimmed Duration: <span className="font-bold">{(endTime - startTime).toFixed(1)} seconds</span>
                  </div>
                </div>
              )}

              {/* Tab 2: Audio */}
              {activeTab === "audio" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-gray-600 block">Select Audio Track</span>
                    <div className="space-y-1.5">
                      {MOCK_AUDIO_TRACKS.map((track) => (
                        <button
                          key={track.id}
                          onClick={() => setSelectedAudio(track.id)}
                          className={`w-full text-left px-4 py-3 rounded-xl border text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                            selectedAudio === track.id
                              ? "bg-purple-50 border-purple-300 text-purple-700 font-bold"
                              : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                          }`}
                        >
                          <Music size={13} className={selectedAudio === track.id ? "text-purple-600 animate-pulse" : "text-gray-400"} />
                          {track.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedAudio !== "none" && (
                    <div className="space-y-2 pt-2 border-t border-gray-100 animate-in fade-in duration-200">
                      <span className="text-[11px] font-bold text-gray-600 block">Music Track Volume</span>
                      <input 
                        type="range"
                        min={0}
                        max={100}
                        value={audioVolume}
                        onChange={(e) => setAudioVolume(parseInt(e.target.value))}
                        className="w-full accent-black cursor-pointer"
                      />
                      <div className="text-right text-xs font-mono font-bold text-gray-800">{audioVolume}%</div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Text */}
              {activeTab === "text" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-gray-600 block">Text Overlay</span>
                    <input 
                      type="text"
                      value={textOverlay}
                      onChange={(e) => setTextOverlay(e.target.value)}
                      placeholder="Add caption overlay..."
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:border-black outline-none font-sans"
                    />
                  </div>

                  {textOverlay && (
                    <div className="space-y-4 pt-2 border-t border-gray-100 animate-in fade-in duration-200">
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold text-gray-600 block">Text Position</span>
                        <div className="grid grid-cols-3 gap-1.5">
                          {["top", "center", "bottom"].map((pos) => (
                            <button
                              key={pos}
                              onClick={() => setTextPosition(pos)}
                              className={`py-2 text-[10px] font-bold rounded-xl border uppercase tracking-wider text-center cursor-pointer ${
                                textPosition === pos 
                                  ? "bg-black border-black text-white" 
                                  : "bg-white border-gray-200 text-gray-500 hover:text-black hover:border-gray-300"
                              }`}
                            >
                              {pos}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[11px] font-bold text-gray-600 block">Text Size</span>
                        <input 
                          type="range"
                          min={12}
                          max={36}
                          value={textSize}
                          onChange={(e) => setTextSize(parseInt(e.target.value))}
                          className="w-full accent-black cursor-pointer"
                        />
                        <div className="text-right text-xs font-mono font-bold text-gray-800">{textSize}px</div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[11px] font-bold text-gray-600 block">Text Color</span>
                        <div className="flex gap-2">
                          {["#FFFFFF", "#FFFF00", "#FF0000", "#00FF00", "#00FFFF", "#FF00FF"].map((color) => (
                            <button
                              key={color}
                              onClick={() => setTextColor(color)}
                              className={`w-6 h-6 rounded-full border border-gray-300 transition-transform ${
                                textColor === color ? "scale-125 border-black" : "hover:scale-110"
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: AI Subtitles */}
              {activeTab === "subtitles" && (
                <div className="space-y-4">
                  <div className="p-4 bg-purple-50/20 border border-purple-100 rounded-2xl space-y-2.5 text-center">
                    <Languages className="text-purple-600 mx-auto" size={24} />
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-gray-800 block">Auto-generate AI Subtitles</span>
                      <p className="text-[10px] text-gray-400 font-medium leading-relaxed">Let our AI transcribe your video speech into smart, beautiful captions instantly.</p>
                    </div>
                  </div>

                  {isGeneratingSubs ? (
                    <div className="py-8 flex flex-col items-center justify-center gap-2.5 text-gray-400">
                      <Loader2 className="animate-spin text-purple-600" size={24} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Transcribing Audio...</span>
                    </div>
                  ) : subtitlesEnabled ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3.5 bg-green-50/20 rounded-2xl border border-green-100">
                        <span className="text-xs font-bold text-green-700">Subtitles Generated!</span>
                        <button
                          onClick={() => setSubtitlesEnabled(false)}
                          className="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase"
                        >
                          Disable
                        </button>
                      </div>

                      <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-100 rounded-2xl p-3 bg-gray-50/30">
                        {MOCK_SUBTITLES.map((sub, index) => (
                          <div key={index} className="flex gap-2.5 text-[11px] font-medium leading-relaxed">
                            <span className="text-purple-600 font-mono font-bold">{sub.time}</span>
                            <span className="text-gray-700">{sub.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleGenerateSubtitles}
                      className="w-full py-3.5 bg-black hover:bg-gray-950 text-white rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 text-xs font-bold shadow-md hover:shadow-lg active:scale-95"
                    >
                      <Sparkles size={14} className="text-yellow-300 animate-bounce" />
                      <span>Transcribe & Generate Subtitles</span>
                    </button>
                  )}
                </div>
              )}

            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="h-16 bg-white border-t border-gray-100 flex items-center justify-end px-8 gap-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-black text-gray-500 hover:text-black transition-all cursor-pointer uppercase tracking-wider"
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={handleSaveVideo}
            className="px-6 py-2.5 text-xs font-black bg-[#1A1A1A] hover:bg-black text-yellow-300 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md uppercase tracking-wider"
          >
            <Save size={14} />
            Apply Changes
          </button>
        </div>

      </div>
    </div>
  );
}
