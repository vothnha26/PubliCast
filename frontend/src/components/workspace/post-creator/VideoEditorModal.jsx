import React, { useState, useRef, useEffect } from "react";
import { X, Play, Pause, Volume2, VolumeX, Scissors, Music, Type, Languages, Sparkles, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import apiService from "../../../services/api";
import { VIDEO_EDITOR_TABS, ASPECT_RATIOS, MOOD_PRESETS } from "../../../constants/video-editor";

export function VideoEditorModal({ isOpen, videoUrl, videoPath, onClose, onSave, initialSettings, brandId }) {
  const videoRef = useRef(null);
  const timelineRef = useRef(null);
  const videoContainerRef = useRef(null);
  const audioPreviewRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  
  // Tabs
  const [activeTab, setActiveTab] = useState(VIDEO_EDITOR_TABS.TRIM);
  
  // Trim options (Dual-Handle)
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(10);
  const [isDraggingStart, setIsDraggingStart] = useState(false);
  const [isDraggingEnd, setIsDraggingEnd] = useState(false);
  
  // Aspect ratio
  const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS.ORIGINAL);
  
  // Audio options
  const [selectedAudio, setSelectedAudio] = useState("none");
  const [audioVolume, setAudioVolume] = useState(50);
  const [selectedMood, setSelectedMood] = useState(MOOD_PRESETS[1].id); // chill
  const [musicTracks, setMusicTracks] = useState([]);
  const [isLoadingMusic, setIsLoadingMusic] = useState(false);
  
  // Text Overlay options (Drag & Drop)
  const [textOverlay, setTextOverlay] = useState("");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [textSize, setTextSize] = useState(18);
  const [textX, setTextX] = useState(50); // % from left
  const [textY, setTextY] = useState(80); // % from top
  const [isDraggingText, setIsDraggingText] = useState(false);
  
  // Subtitle options
  const [subtitles, setSubtitles] = useState([]);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [isGeneratingSubs, setIsGeneratingSubs] = useState(false);

  const startTimeRef = useRef(startTime);
  const endTimeRef = useRef(endTime);
  const durationRef = useRef(duration);
  const isDraggingStartRef = useRef(false);
  const isDraggingEndRef = useRef(false);
  const isDraggingTextRef = useRef(false);

  useEffect(() => { startTimeRef.current = startTime; }, [startTime]);
  useEffect(() => { endTimeRef.current = endTime; }, [endTime]);
  useEffect(() => { durationRef.current = duration; }, [duration]);

  // Load initial settings if present
  useEffect(() => {
    if (isOpen) {
      if (initialSettings) {
        setStartTime(initialSettings.startTime ?? 0);
        setEndTime(initialSettings.endTime ?? 10);
        setAspectRatio(initialSettings.aspectRatio ?? ASPECT_RATIOS.ORIGINAL);
        setSelectedAudio(initialSettings.selectedAudio ?? "none");
        setAudioVolume(initialSettings.audioVolume ?? 50);
        setTextOverlay(initialSettings.textOverlay ?? "");
        setTextColor(initialSettings.textColor ?? "#FFFFFF");
        setTextSize(initialSettings.textSize ?? 18);
        setTextX(initialSettings.textX ?? 50);
        setTextY(initialSettings.textY ?? 80);
        setSubtitlesEnabled(initialSettings.subtitlesEnabled ?? false);
        setSubtitles(initialSettings.subtitles ?? []);
      } else {
        setStartTime(0);
        setEndTime(duration || 10);
        setAspectRatio(ASPECT_RATIOS.ORIGINAL);
        setSelectedAudio("none");
        setAudioVolume(50);
        setTextOverlay("");
        setTextColor("#FFFFFF");
        setTextSize(18);
        setTextX(50);
        setTextY(80);
        setSubtitlesEnabled(false);
        setSubtitles([]);
      }
    }
  }, [isOpen, initialSettings, duration]);

  // Load music tracks when mood or tab changes
  useEffect(() => {
    if (isOpen && activeTab === VIDEO_EDITOR_TABS.AUDIO) {
      const fetchMusic = async () => {
        setIsLoadingMusic(true);
        try {
          const res = await apiService.get(`/posts/music?mood=${selectedMood}`);
          setMusicTracks(res.data.data || []);
        } catch (error) {
          console.error("Failed to load music tracks", error);
        } finally {
          setIsLoadingMusic(false);
        }
      };
      fetchMusic();
    }
  }, [isOpen, activeTab, selectedMood]);

  // Handle video element reloading when URL changes
  useEffect(() => {
    if (videoRef.current && isOpen) {
      videoRef.current.load();
      setIsPlaying(false);
    }
  }, [isOpen, videoUrl]);

  // Sync background music preview with video playback
  useEffect(() => {
    if (selectedAudio && selectedAudio !== "none") {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
      const track = musicTracks.find(t => t.id === selectedAudio);
      if (track && track.url) {
        audioPreviewRef.current = new Audio(track.url);
        audioPreviewRef.current.volume = audioVolume / 100;
        audioPreviewRef.current.loop = true;
      }
    } else {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
        audioPreviewRef.current = null;
      }
    }
    return () => {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
    };
  }, [selectedAudio, musicTracks]);

  // Update background audio volume
  useEffect(() => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.volume = audioVolume / 100;
    }
  }, [audioVolume]);

  // Start/pause background audio in sync with video
  useEffect(() => {
    if (audioPreviewRef.current) {
      if (isPlaying) {
        audioPreviewRef.current.currentTime = currentTime % (audioPreviewRef.current.duration || 300);
        audioPreviewRef.current.play().catch(() => {});
      } else {
        audioPreviewRef.current.pause();
      }
    }
  }, [isPlaying, currentTime]);

  const handleTimelineMouseDown = (e, type) => {
    e.preventDefault();
    if (type === "start") {
      isDraggingStartRef.current = true;
      setIsDraggingStart(true);
    } else {
      isDraggingEndRef.current = true;
      setIsDraggingEnd(true);
    }
  };

  const handleTextMouseDown = (e) => {
    e.preventDefault();
    isDraggingTextRef.current = true;
    setIsDraggingText(true);
  };

  // Dual-Handle Range Slider dragging handler
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingStartRef.current && !isDraggingEndRef.current) return;
      if (!timelineRef.current) return;
      
      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      const newTime = percentage * (durationRef.current || 10);

      if (isDraggingStartRef.current) {
        const targetStart = Math.max(0, Math.min(newTime, endTimeRef.current - 1));
        setStartTime(targetStart);
        if (videoRef.current) videoRef.current.currentTime = targetStart;
      } else if (isDraggingEndRef.current) {
        const targetEnd = Math.max(startTimeRef.current + 1, Math.min(newTime, durationRef.current));
        setEndTime(targetEnd);
        if (videoRef.current) videoRef.current.currentTime = targetEnd;
      }
    };

    const handleMouseUp = () => {
      isDraggingStartRef.current = false;
      isDraggingEndRef.current = false;
      setIsDraggingStart(false);
      setIsDraggingEnd(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // Text overlay dragging handler
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingTextRef.current || !videoContainerRef.current) return;
      const rect = videoContainerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      setTextX(Math.max(5, Math.min(95, x)));
      setTextY(Math.max(5, Math.min(95, y)));
    };

    const handleMouseUp = () => {
      isDraggingTextRef.current = false;
      setIsDraggingText(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

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
      
      // Loop within the trimmed timeline
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

  const handleGenerateSubtitles = async () => {
    setIsGeneratingSubs(true);
    try {
      const res = await apiService.post("/posts/transcribe", {
        videoUrl: videoPath || videoUrl,
        brandId: brandId || initialSettings?.brandId || 'unassigned'
      });
      setSubtitles(res.data.subtitles || []);
      setSubtitlesEnabled(true);
      toast.success("AI Subtitles generated successfully!");
    } catch (error) {
      toast.error(`Speech transcription failed: ${error.message}`);
    } finally {
      setIsGeneratingSubs(false);
    }
  };

  const handleSaveVideo = async () => {
    toast.loading("Applying video edits...", { id: "video-edit-toast" });
    try {
      const response = await apiService.post("/posts/trim", {
        videoUrl: videoPath || videoUrl,
        startTime,
        endTime,
        audioUrl: selectedAudio !== "none" ? musicTracks.find(t => t.id === selectedAudio)?.url : null,
        audioVolume,
        brandId: brandId || initialSettings?.brandId || 'unassigned'
      });

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
        textX,
        textY,
        subtitlesEnabled,
        subtitles,
        videoUrl: response.data.videoUrl
      });
    } catch (error) {
      toast.error(`Failed to trim video: ${error.message}`, { id: "video-edit-toast" });
    }
  };

  // Get active subtitle text based on current playback time
  const getActiveSubtitle = () => {
    if (!subtitlesEnabled || !subtitles || subtitles.length === 0) return "";
    const activeSub = subtitles.find(sub => currentTime >= sub.start && currentTime <= sub.end);
    return activeSub ? activeSub.text : "";
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
            <div 
              ref={videoContainerRef}
              className={`relative max-w-full max-h-[50vh] overflow-hidden rounded-2xl shadow-2xl bg-black transition-all duration-300 flex items-center justify-center ${
                aspectRatio === ASPECT_RATIOS.PORTRAIT ? "aspect-[9/16] h-[45vh]" :
                aspectRatio === ASPECT_RATIOS.LANDSCAPE ? "aspect-[16/9] w-full" :
                aspectRatio === ASPECT_RATIOS.SQUARE ? "aspect-square h-[40vh]" : "max-h-[50vh]"
              }`}
            >
              <video
                ref={videoRef}
                src={videoUrl}
                onLoadedMetadata={handleMetadataLoaded}
                onTimeUpdate={handleTimeUpdate}
                onClick={togglePlay}
                className={`w-full h-full ${aspectRatio !== ASPECT_RATIOS.ORIGINAL ? "object-cover" : "object-contain"}`}
              />

              {/* Text Overlay on video (Draggable) */}
              {textOverlay && (
                <div 
                  onMouseDown={handleTextMouseDown}
                  className="absolute cursor-move select-none font-bold font-sans drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] z-10 px-2 py-1 hover:border border-dashed border-white/50"
                  style={{ 
                    left: `${textX}%`, 
                    top: `${textY}%`, 
                    transform: "translate(-50%, -50%)", 
                    color: textColor, 
                    fontSize: `${textSize}px` 
                  }}
                >
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
                  { id: ASPECT_RATIOS.ORIGINAL, label: "Orig" },
                  { id: ASPECT_RATIOS.PORTRAIT, label: "9:16" },
                  { id: ASPECT_RATIOS.LANDSCAPE, label: "16:9" },
                  { id: ASPECT_RATIOS.SQUARE, label: "1:1" }
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
                { id: VIDEO_EDITOR_TABS.TRIM, icon: <Scissors size={14} />, label: "Trim" },
                { id: VIDEO_EDITOR_TABS.AUDIO, icon: <Music size={14} />, label: "Audio" },
                { id: VIDEO_EDITOR_TABS.TEXT, icon: <Type size={14} />, label: "Text" },
                { id: VIDEO_EDITOR_TABS.SUBTITLES, icon: <Languages size={14} />, label: "AI Subs" }
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
              
              {/* Tab 1: Trim Timeline (Dual Handle) */}
              {activeTab === VIDEO_EDITOR_TABS.TRIM && (
                <div className="space-y-6">
                  <span className="text-[11px] font-bold text-gray-600 block">Trim Video Range</span>
                  
                  {/* Timeline Dual Handle Slider */}
                  <div 
                    ref={timelineRef}
                    className="relative w-full h-8 bg-gray-100 rounded-xl border border-gray-200 overflow-visible select-none mt-2"
                  >
                    {/* Render visual ticks */}
                    {Array.from({ length: 11 }).map((_, i) => (
                      <div 
                        key={i} 
                        className="h-1.5 w-0.5 bg-gray-300 absolute bottom-0.5" 
                        style={{ left: `${i * 10}%` }} 
                      />
                    ))}

                    {/* Highlighted selected range */}
                    <div 
                      className="absolute top-0 bottom-0 bg-purple-100 border-y-2 border-purple-500/50"
                      style={{ 
                        left: `${(startTime / (duration || 10)) * 100}%`, 
                        right: `${100 - (endTime / (duration || 10)) * 100}%` 
                      }}
                    />

                    {/* Playhead position indicator */}
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-yellow-500 z-10 pointer-events-none"
                      style={{ left: `${(currentTime / (duration || 10)) * 100}%` }}
                    />

                    {/* Start Handle */}
                    <div 
                      onMouseDown={(e) => handleTimelineMouseDown(e, "start")}
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-7 bg-purple-600 hover:bg-purple-700 rounded-md border border-purple-800 shadow-md cursor-ew-resize z-20 flex items-center justify-center text-[8px] text-white font-bold"
                      style={{ left: `${(startTime / (duration || 10)) * 100}%` }}
                    >
                      [
                    </div>

                    {/* End Handle */}
                    <div 
                      onMouseDown={(e) => handleTimelineMouseDown(e, "end")}
                      className="absolute top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-7 bg-purple-600 hover:bg-purple-700 rounded-md border border-purple-800 shadow-md cursor-ew-resize z-20 flex items-center justify-center text-[8px] text-white font-bold"
                      style={{ left: `${(endTime / (duration || 10)) * 100}%` }}
                    >
                      ]
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs font-mono font-bold text-gray-800">
                    <div>Start: {startTime.toFixed(1)}s</div>
                    <div>End: {endTime.toFixed(1)}s</div>
                  </div>

                  <div className="p-3 bg-purple-50/40 border border-purple-100 rounded-2xl text-[11px] text-purple-700 leading-relaxed font-medium">
                    Trimmed Duration: <span className="font-bold">{(endTime - startTime).toFixed(1)} seconds</span>
                  </div>
                </div>
              )}

              {/* Tab 2: Audio */}
              {activeTab === VIDEO_EDITOR_TABS.AUDIO && (
                <div className="space-y-4">
                  
                  {/* Mood Selector presets */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-gray-600 block">Mood Genre</span>
                    <div className="grid grid-cols-4 gap-1">
                      {MOOD_PRESETS.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setSelectedMood(m.id)}
                          className={`py-1.5 text-[9px] font-bold rounded-lg border text-center transition-all cursor-pointer ${
                            selectedMood === m.id
                              ? "bg-purple-600 border-purple-600 text-white shadow-sm"
                              : "bg-white border-gray-200 text-gray-500 hover:text-black"
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tracks Grid */}
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <span className="text-[11px] font-bold text-gray-600 block">Select Audio Track</span>
                    
                    {isLoadingMusic ? (
                      <div className="py-8 flex flex-col items-center justify-center gap-2 text-gray-400">
                        <Loader2 className="animate-spin text-purple-600" size={20} />
                        <span className="text-[9px] font-bold uppercase tracking-wider">Loading Music...</span>
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        <button
                          onClick={() => setSelectedAudio("none")}
                          className={`w-full text-left px-3 py-2.5 rounded-xl border text-[11px] font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                            selectedAudio === "none"
                              ? "bg-purple-50 border-purple-300 text-purple-700 font-bold"
                              : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                          }`}
                        >
                          <Music size={12} className={selectedAudio === "none" ? "text-purple-600" : "text-gray-400"} />
                          Keep Original Audio Only
                        </button>

                        {musicTracks.map((track) => (
                          <button
                            key={track.id}
                            onClick={() => setSelectedAudio(track.id)}
                            className={`w-full text-left px-3 py-2.5 rounded-xl border text-[11px] font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                              selectedAudio === track.id
                                ? "bg-purple-50 border-purple-300 text-purple-700 font-bold"
                                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                            }`}
                          >
                            <Music size={12} className={selectedAudio === track.id ? "text-purple-600 animate-pulse" : "text-gray-400"} />
                            <div className="flex-1 truncate">{track.name}</div>
                            <span className="text-[9px] font-mono text-gray-400">{(track.duration / 60).toFixed(1)}m</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedAudio !== "none" && (
                    <div className="space-y-2 pt-2 border-t border-gray-100 animate-in fade-in duration-200">
                      <span className="text-[11px] font-bold text-gray-600 block">Music Volume</span>
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
              {activeTab === VIDEO_EDITOR_TABS.TEXT && (
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
                      <div className="p-3 bg-purple-50/20 border border-purple-100 rounded-2xl text-[10px] text-purple-700 leading-relaxed font-semibold">
                        💡 Click & Drag the caption text directly on the video player above to adjust its position.
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
              {activeTab === VIDEO_EDITOR_TABS.SUBTITLES && (
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
                          className="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase cursor-pointer"
                        >
                          Disable
                        </button>
                      </div>

                      <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-100 rounded-2xl p-3 bg-gray-50/30">
                        {subtitles.map((sub, index) => (
                          <div key={index} className="flex gap-2.5 text-[11px] font-medium leading-relaxed">
                            <span className="text-purple-600 font-mono font-bold">{sub.start.toFixed(1)}s</span>
                            <input
                              type="text"
                              value={sub.text}
                              onChange={(e) => {
                                const newSubs = [...subtitles];
                                newSubs[index].text = e.target.value;
                                setSubtitles(newSubs);
                              }}
                              className="text-gray-700 bg-transparent border-none focus:outline-none focus:bg-white focus:ring-1 focus:ring-purple-300 rounded px-1 flex-1 font-semibold"
                            />
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
