import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Scissors, Music, Type, Languages, Sparkles, Loader2, Save, Crop, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import apiService from "../../services/api";
import { usePostCreatorStore } from "../../store/usePostCreatorStore";
import { useBrand } from "../../context/BrandContext";
import { VIDEO_EDITOR_TABS, ASPECT_RATIOS, MOOD_PRESETS } from "../../constants/video-editor";

export function VideoEditorPage() {
  const navigate = useNavigate();
  const { activeBrand } = useBrand();
  
  // Zustand store states
  const { 
    videoFileUrl: videoUrl, 
    uploadedVideoPath: videoPath, 
    videoSettings, 
    setVideoSettings,
    setVideoFileUrl,
    setUploadedVideoPath
  } = usePostCreatorStore();

  const activeVideoUrl = videoSettings?.originalVideoUrl || videoUrl;
  const activeVideoPath = videoSettings?.originalVideoPath || videoPath;

  const brandId = activeBrand?.id || "unassigned";

  // Redirect to planner if no video is present
  useEffect(() => {
    if (!activeVideoUrl) {
      toast.error("Không tìm thấy video để chỉnh sửa!");
      navigate("/planner");
    }
  }, [activeVideoUrl, navigate]);

  const videoRef = useRef(null);
  const timelineRef = useRef(null);
  const keyframeTimelineRef = useRef(null);
  const videoContainerRef = useRef(null);
  const audioPreviewRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState(VIDEO_EDITOR_TABS.TRIM);

  // Trim options (Dual-Handle)
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(10);
  const [isDraggingStart, setIsDraggingStart] = useState(false);
  const [isDraggingEnd, setIsDraggingEnd] = useState(false);

  // Aspect ratio
  const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS.ORIGINAL);
  const [videoRatio, setVideoRatio] = useState(16 / 9);

  // Crop Keyframes state
  const [keyframes, setKeyframes] = useState([{ id: "default", time: 0, cropX: 0.5 }]);
  const [cropXSlider, setCropXSlider] = useState(50);

  const getBoxWidthPct = () => {
    if (aspectRatio === ASPECT_RATIOS.ORIGINAL) return 100;
    
    let targetRatio = 1.0;
    if (aspectRatio === ASPECT_RATIOS.SQUARE) targetRatio = 1.0;
    else if (aspectRatio === ASPECT_RATIOS.PORTRAIT) targetRatio = 9 / 16;
    else if (aspectRatio === ASPECT_RATIOS.LANDSCAPE) targetRatio = 16 / 9;
    
    const originalRatio = videoRatio || (16/9);
    const widthPct = (targetRatio / originalRatio) * 100;
    return Math.min(100, widthPct);
  };

  const handleCropBoxMouseDown = (e) => {
    e.preventDefault();
    if (aspectRatio === ASPECT_RATIOS.ORIGINAL) return;
    
    const container = videoContainerRef.current;
    if (!container) return;
    
    const containerWidth = container.clientWidth;
    const boxWidthPct = getBoxWidthPct();
    const slidingRoom = 100 - boxWidthPct;
    if (slidingRoom <= 0) return;
    
    const currentCropX = interpolateCropX(currentTime);
    const initialLeftPct = currentCropX * slidingRoom;
    
    const startX = e.clientX;
    
    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaXPct = (deltaX / containerWidth) * 100;
      
      let newLeftPct = initialLeftPct + deltaXPct;
      newLeftPct = Math.max(0, Math.min(slidingRoom, newLeftPct));
      
      const newCropX = newLeftPct / slidingRoom;
      setCropXSlider(newCropX * 100);
      
      // Update keyframes
      setKeyframes(prev => {
        const timeIndex = prev.findIndex(k => Math.abs(k.time - currentTime) < 0.1);
        if (timeIndex >= 0) {
          const updated = [...prev];
          updated[timeIndex].cropX = newCropX;
          return updated;
        } else {
          const newKeyframe = {
            id: Date.now().toString(),
            time: currentTime,
            cropX: newCropX
          };
          return [...prev, newKeyframe].sort((a, b) => a.time - b.time);
        }
      });
    };
    
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

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
    if (videoUrl) {
      if (videoSettings) {
        setStartTime(videoSettings.startTime ?? 0);
        setEndTime(videoSettings.endTime ?? 10);
        setAspectRatio(videoSettings.aspectRatio ?? ASPECT_RATIOS.ORIGINAL);
        setKeyframes(videoSettings.keyframes && videoSettings.keyframes.length > 0 ? videoSettings.keyframes : [{ id: "default", time: 0, cropX: 0.5 }]);
        setSelectedAudio(videoSettings.selectedAudio ?? "none");
        setAudioVolume(videoSettings.audioVolume ?? 50);
        setTextOverlay(videoSettings.textOverlay ?? "");
        setTextColor(videoSettings.textColor ?? "#FFFFFF");
        setTextSize(videoSettings.textSize ?? 18);
        setTextX(videoSettings.textX ?? 50);
        setTextY(videoSettings.textY ?? 80);
        setSubtitlesEnabled(videoSettings.subtitlesEnabled ?? false);
        setSubtitles(videoSettings.subtitles ?? []);
      } else {
        setStartTime(0);
        setEndTime(duration || 10);
        setAspectRatio(ASPECT_RATIOS.ORIGINAL);
        setKeyframes([{ id: "default", time: 0, cropX: 0.5 }]);
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
  }, [activeVideoUrl, videoSettings, duration]);

  // Prevent user leaving while processing
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isProcessing) {
        e.preventDefault();
        e.returnValue = "Đang xử lý video, bạn có chắc chắn muốn rời đi?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isProcessing]);

  // Load music tracks when mood or tab changes
  useEffect(() => {
    if (activeTab === VIDEO_EDITOR_TABS.AUDIO) {
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
  }, [activeTab, selectedMood]);

  // Handle video element reloading when URL changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      setIsPlaying(false);
    }
  }, [activeVideoUrl]);

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

  // requestAnimationFrame loop for 60fps smooth playhead and bounding box updates
  useEffect(() => {
    let animationFrameId;

    const updateLoop = () => {
      if (videoRef.current && !videoRef.current.paused) {
        const time = videoRef.current.currentTime;
        setCurrentTime(time);

        // Sync background music
        if (audioPreviewRef.current) {
          if (Math.abs(audioPreviewRef.current.currentTime - (time - startTime)) > 0.3) {
            audioPreviewRef.current.currentTime = Math.max(0, time - startTime);
          }
          if (audioPreviewRef.current.paused) {
            audioPreviewRef.current.play().catch(() => {});
          }
        }

        // Auto-loop within trim limits
        if (time >= endTime) {
          videoRef.current.currentTime = startTime;
          if (audioPreviewRef.current) {
            audioPreviewRef.current.currentTime = 0;
          }
        }

        animationFrameId = requestAnimationFrame(updateLoop);
      }
    };

    if (isPlaying) {
      animationFrameId = requestAnimationFrame(updateLoop);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPlaying, startTime, endTime]);

  const interpolateCropX = (t) => {
    if (keyframes.length === 0) return 0.5;
    const sorted = [...keyframes].sort((a, b) => a.time - b.time);
    if (sorted.length === 1) return sorted[0].cropX;
    if (t <= sorted[0].time) return sorted[0].cropX;
    if (t >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].cropX;

    for (let i = 0; i < sorted.length - 1; i++) {
      const k0 = sorted[i];
      const k1 = sorted[i + 1];
      if (t >= k0.time && t <= k1.time) {
        const ratio = (t - k0.time) / (k1.time - k0.time);
        return k0.cropX + (k1.cropX - k0.cropX) * ratio;
      }
    }
    return 0.5;
  };

  const handleMetadataLoaded = () => {
    if (videoRef.current) {
      const vidDuration = videoRef.current.duration;
      setDuration(vidDuration);
      
      const width = videoRef.current.videoWidth;
      const height = videoRef.current.videoHeight;
      if (width && height) {
        setVideoRatio(width / height);
      }
      
      if (!videoSettings) {
        setEndTime(vidDuration);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);

    // Sync background music
    if (audioPreviewRef.current && isPlaying) {
      if (Math.abs(audioPreviewRef.current.currentTime - (time - startTime)) > 0.3) {
        audioPreviewRef.current.currentTime = Math.max(0, time - startTime);
      }
      if (audioPreviewRef.current.paused) {
        audioPreviewRef.current.play().catch(() => {});
      }
    }

    // Auto-loop within trim limits
    if (time >= endTime) {
      videoRef.current.currentTime = startTime;
      if (audioPreviewRef.current) {
        audioPreviewRef.current.currentTime = 0;
      }
    }

    // Apply linear interpolation to Crop Center X position
    const currentCropX = interpolateCropX(time);
    setCropXSlider(currentCropX * 100);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      if (audioPreviewRef.current) audioPreviewRef.current.pause();
      setIsPlaying(false);
    } else {
      // Start playback within trim range
      if (videoRef.current.currentTime < startTime || videoRef.current.currentTime >= endTime) {
        videoRef.current.currentTime = startTime;
      }
      videoRef.current.play();
      if (audioPreviewRef.current) {
        audioPreviewRef.current.currentTime = Math.max(0, videoRef.current.currentTime - startTime);
        audioPreviewRef.current.play().catch(() => {});
      }
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e) => {
    if (!videoRef.current) return;
    const vol = parseFloat(e.target.value);
    videoRef.current.volume = vol;
    if (vol === 0) {
      setIsMuted(true);
      videoRef.current.muted = true;
    } else {
      setIsMuted(false);
      videoRef.current.muted = false;
    }
  };

  // Timeline Mouse Event Dragging for Trim Limits
  const handleTimelineMouseDown = (type, e) => {
    e.preventDefault();
    if (type === "start") {
      setIsDraggingStart(true);
      isDraggingStartRef.current = true;
    } else {
      setIsDraggingEnd(true);
      isDraggingEndRef.current = true;
    }

    const handleMouseMove = (moveEvent) => {
      if (!timelineRef.current || !durationRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const clickX = moveEvent.clientX - rect.left;
      let targetTime = (clickX / rect.width) * durationRef.current;
      targetTime = Math.max(0, Math.min(durationRef.current, targetTime));

      if (isDraggingStartRef.current) {
        if (targetTime < endTimeRef.current - 0.5) {
          setStartTime(targetTime);
          if (videoRef.current) videoRef.current.currentTime = targetTime;
        }
      } else if (isDraggingEndRef.current) {
        if (targetTime > startTimeRef.current + 0.5) {
          setEndTime(targetTime);
          if (videoRef.current) videoRef.current.currentTime = targetTime;
        }
      }
    };

    const handleMouseUp = () => {
      setIsDraggingStart(false);
      setIsDraggingEnd(false);
      isDraggingStartRef.current = false;
      isDraggingEndRef.current = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleKeyframeTimelineClick = (e) => {
    if (!keyframeTimelineRef.current || !durationRef.current) return;
    const rect = keyframeTimelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    let targetTime = (clickX / rect.width) * durationRef.current;
    targetTime = Math.max(0, Math.min(durationRef.current, targetTime));
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  const handleKeyframeMarkerMouseDown = (kfId, e) => {
    e.preventDefault();
    e.stopPropagation();

    if (kfId === "default") {
      toast.error("Không thể kéo di chuyển keyframe mặc định tại 0s!");
      return;
    }

    const timeline = keyframeTimelineRef.current;
    if (!timeline) return;

    const rect = timeline.getBoundingClientRect();

    const handleMouseMove = (moveEvent) => {
      const clickX = moveEvent.clientX - rect.left;
      let targetTime = (clickX / rect.width) * durationRef.current;
      targetTime = Math.max(0.1, Math.min(durationRef.current - 0.1, targetTime));

      setKeyframes(prev => {
        return prev.map(k => {
          if (k.id === kfId) {
            return { ...k, time: targetTime };
          }
          return k;
        }).sort((a, b) => a.time - b.time);
      });

      if (videoRef.current) {
        videoRef.current.currentTime = targetTime;
        setCurrentTime(targetTime);
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Text Overlay Drag & Drop Position calculations
  const handleTextMouseDown = (e) => {
    e.preventDefault();
    setIsDraggingText(true);
    isDraggingTextRef.current = true;

    const startX = e.clientX;
    const startY = e.clientY;
    const initialTextX = textX;
    const initialTextY = textY;

    const handleMouseMove = (moveEvent) => {
      if (!isDraggingTextRef.current || !videoContainerRef.current) return;
      const containerRect = videoContainerRef.current.getBoundingClientRect();
      
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      const pctDeltaX = (deltaX / containerRect.width) * 100;
      const pctDeltaY = (deltaY / containerRect.height) * 100;

      setTextX(Math.max(5, Math.min(95, initialTextX + pctDeltaX)));
      setTextY(Math.max(5, Math.min(95, initialTextY + pctDeltaY)));
    };

    const handleMouseUp = () => {
      setIsDraggingText(false);
      isDraggingTextRef.current = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Crop Center X manual Slider modification
  const handleCropSliderChange = (e) => {
    const val = parseFloat(e.target.value);
    setCropXSlider(val);

    // Cập nhật/thêm keyframe tương ứng tại currentTime
    const timeIndex = keyframes.findIndex(k => Math.abs(k.time - currentTime) < 0.1);
    if (timeIndex >= 0) {
      const updated = [...keyframes];
      updated[timeIndex].cropX = val / 100;
      setKeyframes(updated);
    } else {
      const newKeyframe = {
        id: Date.now().toString(),
        time: currentTime,
        cropX: val / 100
      };
      setKeyframes(prev => [...prev, newKeyframe].sort((a, b) => a.time - b.time));
    }
  };

  // Delete keyframe
  const handleDeleteKeyframe = (kfId) => {
    if (kfId === "default") {
      toast.error("Không thể xóa Keyframe mặc định tại giây 0!");
      return;
    }
    setKeyframes(prev => prev.filter(k => k.id !== kfId));
    toast.success("Đã xóa keyframe!");
  };

  // Add dynamic keyframe at playhead position manually
  const handleAddKeyframeAtPlayhead = () => {
    const exists = keyframes.some(k => Math.abs(k.time - currentTime) < 0.1);
    if (exists) {
      toast.error("Đã tồn tại keyframe tại giây này!");
      return;
    }
    const currentVal = interpolateCropX(currentTime);
    const newK = {
      id: Date.now().toString(),
      time: currentTime,
      cropX: currentVal
    };
    setKeyframes(prev => [...prev, newK].sort((a, b) => a.time - b.time));
    toast.success(`Đã thêm keyframe tại ${currentTime.toFixed(1)}s`);
  };

  // Call API transcribe
  const handleGenerateAIQuotes = async () => {
    setIsGeneratingSubs(true);
    try {
      const res = await apiService.post("/posts/transcribe", {
        videoUrl: videoPath || videoUrl,
        brandId
      }, { timeout: 120000 });
      setSubtitles(res.data.subtitles || []);
      setSubtitlesEnabled(true);
      toast.success("AI Subtitles generated successfully!");
    } catch (error) {
      console.error(error);
      toast.error(`Failed to generate subtitles: ${error.message}`);
    } finally {
      setIsGeneratingSubs(false);
    }
  };

  // Save and Apply video processing
  const handleSaveVideo = async () => {
    setIsProcessing(true);
    toast.loading("Đang xử lý video... Vui lòng không đóng trang.", { id: "video-edit-toast" });
    try {
      const response = await apiService.post("/posts/trim", {
        videoUrl: activeVideoPath || activeVideoUrl,
        startTime,
        endTime,
        aspectRatio,
        keyframes,
        audioUrl: selectedAudio !== "none" ? musicTracks.find(t => t.id === selectedAudio)?.url : null,
        audioVolume,
        brandId
      }, { timeout: 120000 });

      // Save processed settings
      const settings = {
        originalVideoUrl: activeVideoUrl,
        originalVideoPath: activeVideoPath,
        startTime,
        endTime,
        aspectRatio,
        keyframes,
        selectedAudio,
        audioVolume,
        textOverlay,
        textColor,
        textSize,
        textX,
        textY,
        subtitlesEnabled,
        subtitles,
        brandId
      };

      setVideoFileUrl(response.data.videoUrl);
      setUploadedVideoPath(response.data.videoUrl);
      setVideoSettings(settings);

      // Cập nhật backup trong sessionStorage và store state
      const currentBackupStr = sessionStorage.getItem('postCreatorFormBackup');
      if (currentBackupStr) {
        const currentBackup = JSON.parse(currentBackupStr);
        const oldVideoUrl = currentBackup.videoFileUrl;
        const oldVideoPath = currentBackup.uploadedVideoPath;
        
        currentBackup.videoFileUrl = response.data.videoUrl;
        currentBackup.uploadedVideoPath = response.data.videoUrl;
        currentBackup.videoSettings = settings;
        
        // Cập nhật lại phần tử video trong postMedia của backup
        if (currentBackup.postMedia) {
          currentBackup.postMedia = currentBackup.postMedia.map(item => {
            if (item.path === oldVideoPath || item.previewUrl === oldVideoUrl) {
              return {
                ...item,
                previewUrl: response.data.videoUrl,
                path: response.data.videoUrl
              };
            }
            return item;
          });
        }
        
        sessionStorage.setItem('postCreatorFormBackup', JSON.stringify(currentBackup));
        usePostCreatorStore.setState({ postCreatorFormBackup: currentBackup });
      }

      toast.success("Đã áp dụng các thay đổi thành công!", { id: "video-edit-toast" });
      navigate(-1);
    } catch (error) {
      console.error(error);
      toast.error(`Lỗi xử lý video: ${error.message}`, { id: "video-edit-toast" });
    } finally {
      setIsProcessing(false);
    }
  };

  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case ASPECT_RATIOS.SQUARE: return "aspect-square max-h-[60vh] max-w-[60vh]";
      case ASPECT_RATIOS.PORTRAIT: return "aspect-[9/16] max-h-[65vh] max-w-[36vh]";
      case ASPECT_RATIOS.LANDSCAPE: return "aspect-[16/9] max-h-[50vh] max-w-[88vh]";
      default: return "max-h-[60vh] max-w-[100%]";
    }
  };

  const activeSubtitle = subtitlesEnabled 
    ? subtitles.find(s => currentTime >= s.start && currentTime <= s.end)
    : null;

  const currentCropX = interpolateCropX(currentTime);
  const boxWidthPct = getBoxWidthPct();
  const slidingRoom = 100 - boxWidthPct;
  const boxLeftPct = slidingRoom * currentCropX;

  const getCropRatio = () => {
    if (aspectRatio === ASPECT_RATIOS.SQUARE) return 1;
    if (aspectRatio === ASPECT_RATIOS.PORTRAIT) return 9/16;
    if (aspectRatio === ASPECT_RATIOS.LANDSCAPE) return 16/9;
    return videoRatio || (16/9);
  };

  const getPreviewStyles = () => {
    const cropRatio = getCropRatio();
    const ratio = videoRatio || (16/9);
    
    // Tỷ lệ chiều rộng video so với container
    const widthPct = (ratio / cropRatio) * 100;
    const maxTranslatePct = widthPct - 100;
    const translateX = -currentCropX * maxTranslatePct;
    
    return {
      container: {
        aspectRatio: cropRatio,
        maxHeight: "60vh",
        maxWidth: "100%",
        width: "auto",
        height: "auto",
        overflow: "hidden",
        position: "relative"
      },
      video: {
        height: "100%",
        width: `${widthPct}%`,
        maxWidth: "none",
        transform: `translateX(${translateX}%)`,
        objectFit: "fill"
      }
    };
  };

  const getContainerStyle = () => {
    if (isPreviewMode && aspectRatio !== ASPECT_RATIOS.ORIGINAL) {
      return getPreviewStyles().container;
    }
    return {
      aspectRatio: videoRatio || (16/9),
      maxHeight: "60vh",
      maxWidth: "100%",
      width: "auto",
      height: "auto"
    };
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#08080C] text-gray-100 overflow-hidden relative">
      {/* Loading Block Screen Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center z-50">
          <Loader2 className="animate-spin text-lime-400 w-16 h-16 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Đang xử lý video...</h2>
          <p className="text-sm text-gray-400 max-w-sm text-center">
            FFmpeg đang tiến hành cắt, crop tỉ lệ khung hình và chèn nhạc nền. Vui lòng không tắt trình duyệt hoặc tải lại trang!
          </p>
        </div>
      )}

      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-gray-800 bg-[#0C0C12] shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (window.confirm("Bạn có chắc chắn muốn thoát? Các thay đổi chưa lưu sẽ bị mất.")) {
                navigate(-1);
              }
            }} 
            className="p-2 hover:bg-gray-800 rounded-full transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Trình chỉnh sửa Video chuyên nghiệp</h1>
            <p className="text-xs text-gray-400">Tùy chỉnh timeline, crop tỉ lệ thông minh và chèn nhạc nền</p>
          </div>
        </div>

        <button 
          onClick={handleSaveVideo}
          className="flex items-center gap-2 px-5 py-2.5 bg-lime-400 hover:bg-lime-500 text-black font-semibold rounded-xl shadow-lg transition-all"
        >
          <Save className="w-4 h-4" />
          <span>Apply & Save</span>
        </button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0">
        {/* Left Side: Video Preview & Canvas */}
        <div className="flex-1 flex flex-col justify-center items-center p-6 bg-[#030305] relative min-w-0">
          {/* Main Video Canvas Area */}
          <div 
            ref={videoContainerRef}
            style={getContainerStyle()}
            className="relative bg-[#0F0F1A] rounded-2xl overflow-hidden flex items-center justify-center border border-gray-800 shadow-2xl transition-all duration-300"
          >
            <video 
              ref={videoRef}
              src={activeVideoUrl}
              className={isPreviewMode && aspectRatio !== ASPECT_RATIOS.ORIGINAL ? "" : "w-full h-full object-contain"}
              style={isPreviewMode && aspectRatio !== ASPECT_RATIOS.ORIGINAL ? getPreviewStyles().video : {}}
              onLoadedMetadata={handleMetadataLoaded}
              onTimeUpdate={handleTimeUpdate}
              onClick={togglePlay}
            />

            {/* Crop Overlay & Bounding Box */}
            {!isPreviewMode && aspectRatio !== ASPECT_RATIOS.ORIGINAL && (
              <div className="absolute inset-0 z-20 pointer-events-none">
                {/* Left dim area */}
                <div 
                  style={{ width: `${boxLeftPct}%` }}
                  className="absolute left-0 top-0 bottom-0 bg-black/60 pointer-events-none"
                />
                
                {/* Bounding Box Area */}
                <div
                  onMouseDown={handleCropBoxMouseDown}
                  style={{ 
                    left: `${boxLeftPct}%`, 
                    width: `${boxWidthPct}%` 
                  }}
                  className="absolute top-0 bottom-0 border-2 border-dashed border-lime-400 cursor-move pointer-events-auto flex flex-col justify-between p-2 select-none shadow-[0_0_25px_rgba(0,0,0,0.6)]"
                >
                  {/* Corners decorative markers */}
                  <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-4 border-l-4 border-lime-400 pointer-events-none" />
                  <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-4 border-r-4 border-lime-400 pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-4 border-l-4 border-lime-400 pointer-events-none" />
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-4 border-r-4 border-lime-400 pointer-events-none" />
                  
                  {/* Indicator Label */}
                  <div className="mx-auto mt-2 bg-lime-400 text-black text-[9px] font-extrabold px-2 py-0.5 rounded shadow-md uppercase tracking-wider select-none pointer-events-none">
                    {aspectRatio} Crop Frame
                  </div>
                </div>

                {/* Right dim area */}
                <div 
                  style={{ left: `${boxLeftPct + boxWidthPct}%` }}
                  className="absolute right-0 top-0 bottom-0 bg-black/60 pointer-events-none"
                />
              </div>
            )}

            {/* Draggable Text Overlay */}
            {textOverlay && (
              <div 
                onMouseDown={handleTextMouseDown}
                style={{ 
                  left: `${textX}%`, 
                  top: `${textY}%`, 
                  color: textColor,
                  fontSize: `${textSize}px`,
                  transform: "translate(-50%, -50%)"
                }}
                className={`absolute select-none cursor-move px-3 py-1.5 font-bold text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] border border-dashed border-transparent hover:border-white/50 rounded transition-colors ${isDraggingText ? "scale-105 border-white" : ""} z-30`}
              >
                {textOverlay}
              </div>
            )}

            {/* AI Subtitle Overlay */}
            {activeSubtitle && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/75 text-white font-medium text-sm text-center rounded-lg shadow-lg max-w-[85%] pointer-events-none drop-shadow-md z-30">
                {activeSubtitle.text}
              </div>
            )}
          </div>

          {/* Video Control Bar */}
          <div className="mt-4 flex items-center justify-between w-full max-w-2xl bg-[#0F0F16] border border-gray-800 rounded-xl px-4 py-2.5">
            <div className="flex items-center gap-3">
              <button 
                onClick={togglePlay}
                className="p-2 hover:bg-gray-800 rounded-lg text-lime-400 transition"
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
              </button>
              <span className="text-xs font-mono text-gray-400">
                {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Nút Toggle Preview Mode */}
              {aspectRatio !== ASPECT_RATIOS.ORIGINAL && (
                <button
                  type="button"
                  onClick={() => setIsPreviewMode(!isPreviewMode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isPreviewMode 
                      ? "bg-lime-400 text-black shadow-[0_0_12px_rgba(163,230,53,0.4)]" 
                      : "bg-gray-800 hover:bg-gray-700 text-gray-300"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{isPreviewMode ? "Editing Mode" : "Preview Effect"}</span>
                </button>
              )}

              <button onClick={toggleMute} className="p-2 hover:bg-gray-800 rounded-lg transition">
                {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05"
                defaultValue="1"
                onChange={handleVolumeChange}
                className="w-20 accent-lime-400 h-1 rounded-lg cursor-pointer bg-gray-700" 
              />
            </div>
          </div>
        </div>

        {/* Right Side: Options Panels & Controls */}
        <div className="w-[420px] border-l border-gray-800 bg-[#0C0C12] flex flex-col shrink-0">
          {/* Tab Selection */}
          <div className="flex border-b border-gray-800">
            <button 
              onClick={() => setActiveTab(VIDEO_EDITOR_TABS.TRIM)}
              className={`flex-1 py-3.5 flex flex-col items-center justify-center gap-1.5 border-b-2 text-xs font-semibold transition ${activeTab === VIDEO_EDITOR_TABS.TRIM ? "border-lime-400 text-lime-400 bg-lime-400/5" : "border-transparent text-gray-400 hover:text-gray-200"}`}
            >
              <Scissors className="w-4 h-4" />
              <span>Trim & Ratio</span>
            </button>
            <button 
              onClick={() => setActiveTab("crop")}
              className={`flex-1 py-3.5 flex flex-col items-center justify-center gap-1.5 border-b-2 text-xs font-semibold transition ${activeTab === "crop" ? "border-lime-400 text-lime-400 bg-lime-400/5" : "border-transparent text-gray-400 hover:text-gray-200"}`}
            >
              <Crop className="w-4 h-4" />
              <span>Crop Keyframes</span>
            </button>
            <button 
              onClick={() => setActiveTab(VIDEO_EDITOR_TABS.AUDIO)}
              className={`flex-1 py-3.5 flex flex-col items-center justify-center gap-1.5 border-b-2 text-xs font-semibold transition ${activeTab === VIDEO_EDITOR_TABS.AUDIO ? "border-lime-400 text-lime-400 bg-lime-400/5" : "border-transparent text-gray-400 hover:text-gray-200"}`}
            >
              <Music className="w-4 h-4" />
              <span>Audio</span>
            </button>
            <button 
              onClick={() => setActiveTab(VIDEO_EDITOR_TABS.TEXT)}
              className={`flex-1 py-3.5 flex flex-col items-center justify-center gap-1.5 border-b-2 text-xs font-semibold transition ${activeTab === VIDEO_EDITOR_TABS.TEXT ? "border-lime-400 text-lime-400 bg-lime-400/5" : "border-transparent text-gray-400 hover:text-gray-200"}`}
            >
              <Type className="w-4 h-4" />
              <span>Text</span>
            </button>
            <button 
              onClick={() => setActiveTab(VIDEO_EDITOR_TABS.SUBTITLES)}
              className={`flex-1 py-3.5 flex flex-col items-center justify-center gap-1.5 border-b-2 text-xs font-semibold transition ${activeTab === VIDEO_EDITOR_TABS.SUBTITLES ? "border-lime-400 text-lime-400 bg-lime-400/5" : "border-transparent text-gray-400 hover:text-gray-200"}`}
            >
              <Languages className="w-4 h-4" />
              <span>AI Subtitles</span>
            </button>
          </div>

          {/* Panel Views */}
          <div className="flex-1 overflow-y-auto p-6">
            
            {/* Tab 1: Trim & Aspect Ratio */}
            {activeTab === VIDEO_EDITOR_TABS.TRIM && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold mb-3">Tỉ lệ khung hình (Aspect Ratio)</h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    {Object.values(ASPECT_RATIOS).map((ratio) => (
                      <button
                        key={ratio}
                        onClick={() => {
                          setAspectRatio(ratio);
                          setIsPreviewMode(false);
                        }}
                        className={`py-3 px-4 rounded-xl border text-xs font-medium transition ${aspectRatio === ratio ? "border-lime-400 bg-lime-400/5 text-lime-400" : "border-gray-800 hover:border-gray-700 bg-gray-900/50"}`}
                      >
                        {ratio === ASPECT_RATIOS.ORIGINAL ? "Mặc định (Original)" : ratio}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2">Trim Timeline (Giới hạn thời lượng)</h3>
                  <p className="text-xs text-gray-400 mb-4">Kéo thanh cuộn bên dưới để thiết lập khoảng Trim chính xác.</p>
                  
                  <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between text-xs font-mono">
                      <span>Bắt đầu: {startTime.toFixed(1)}s</span>
                      <span>Thời lượng: {(endTime - startTime).toFixed(1)}s</span>
                      <span>Kết thúc: {endTime.toFixed(1)}s</span>
                    </div>

                    {/* Timeline handle bar */}
                    <div 
                      ref={timelineRef}
                      className="relative h-6 bg-gray-800/80 rounded-lg overflow-visible cursor-pointer select-none"
                    >
                      {/* Playhead pointer & Tooltip */}
                      <div 
                        style={{ left: `${(currentTime / duration) * 100}%` }}
                        className="absolute top-0 bottom-0 w-0.5 bg-lime-400 z-10 pointer-events-none"
                      >
                        {/* Playhead time tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-lime-400 text-black text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-[0_2px_8px_rgba(0,0,0,0.5)] whitespace-nowrap">
                          {currentTime.toFixed(1)}s
                        </div>
                      </div>

                      {/* Selected Range Fill */}
                      <div 
                        style={{ 
                          left: `${(startTime / duration) * 100}%`,
                          width: `${((endTime - startTime) / duration) * 100}%` 
                        }}
                        className="absolute top-0 bottom-0 bg-lime-400/20 border-l border-r border-lime-400 z-0"
                      />

                      {/* Start Handle */}
                      <div 
                        onMouseDown={(e) => handleTimelineMouseDown("start", e)}
                        style={{ left: `${(startTime / duration) * 100}%` }}
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-6 bg-lime-400 hover:bg-lime-300 rounded cursor-ew-resize flex items-center justify-center shadow-lg border border-black/30 z-20 transition-colors"
                      >
                        <div className="w-[2px] h-3 bg-black/50" />
                      </div>

                      {/* End Handle */}
                      <div 
                        onMouseDown={(e) => handleTimelineMouseDown("end", e)}
                        style={{ left: `${(endTime / duration) * 100}%` }}
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-6 bg-lime-400 hover:bg-lime-300 rounded cursor-ew-resize flex items-center justify-center shadow-lg border border-black/30 z-20 transition-colors"
                      >
                        <div className="w-[2px] h-3 bg-black/50" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Crop Keyframes (New!) */}
            {activeTab === "crop" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold mb-2">Crop Keyframes (Định vị Camera)</h3>
                  <p className="text-xs text-gray-400 mb-4">
                    Nếu chọn tỷ lệ khác (như 9:16), bạn có thể dịch vị trí camera (Crop Center X) tại các mốc giây khác nhau để tạo chuyển động.
                  </p>

                  <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 space-y-4">
                    <div>
                      <div className="flex justify-between text-xs mb-2">
                        <span>Vị trí ngang (Crop Center X):</span>
                        <span className="font-mono text-lime-400 font-semibold">{cropXSlider.toFixed(0)}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={cropXSlider}
                        onChange={handleCropSliderChange}
                        disabled={aspectRatio === ASPECT_RATIOS.ORIGINAL}
                        className="w-full accent-lime-400 h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                      />
                      <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                        <span>Trái (0%)</span>
                        <span>Giữa (50%)</span>
                        <span>Phải (100%)</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleAddKeyframeAtPlayhead}
                        disabled={aspectRatio === ASPECT_RATIOS.ORIGINAL}
                        className="flex-1 py-2 px-3 bg-gray-800 hover:bg-gray-700 text-xs font-semibold rounded-lg border border-gray-700 transition disabled:opacity-50"
                      >
                        + Thêm Keyframe
                      </button>
                    </div>
                  </div>
                </div>

                {/* Keyframe Timeline (Tách biệt hoàn toàn với Trim Timeline!) */}
                {aspectRatio !== ASPECT_RATIOS.ORIGINAL && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Keyframe Timeline (Dòng thời gian hiệu ứng)</h3>
                    <p className="text-xs text-gray-400 mb-4">Click để nhảy kim chỉ hoặc nhấn giữ kéo các marker hình thoi màu vàng để di chuyển thời gian keyframe.</p>
                    
                    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 space-y-3">
                      <div className="flex justify-between text-xs font-mono">
                        <span>Bắt đầu: 0.0s</span>
                        <span>Thời lượng: {duration.toFixed(1)}s</span>
                        <span>Kim chỉ: {currentTime.toFixed(1)}s</span>
                      </div>

                      {/* Keyframe Timeline container */}
                      <div 
                        ref={keyframeTimelineRef}
                        onClick={handleKeyframeTimelineClick}
                        className="relative h-6 bg-gray-800/80 rounded-lg overflow-visible cursor-pointer select-none"
                      >
                        {/* Playhead pointer & Tooltip */}
                        <div 
                          style={{ left: `${(currentTime / duration) * 100}%` }}
                          className="absolute top-0 bottom-0 w-0.5 bg-lime-400 z-10 pointer-events-none"
                        >
                          {/* Playhead time tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-lime-400 text-black text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-[0_2px_8px_rgba(0,0,0,0.5)] whitespace-nowrap">
                            {currentTime.toFixed(1)}s
                          </div>
                        </div>

                        {/* Selected Range Shadow (để biết vùng video được Trim thực tế) */}
                        <div 
                          style={{ 
                            left: `${(startTime / duration) * 100}%`,
                            width: `${((endTime - startTime) / duration) * 100}%` 
                          }}
                          className="absolute top-0 bottom-0 bg-lime-400/10 border-l border-r border-dashed border-lime-400/40 z-0 pointer-events-none"
                        />

                        {/* Keyframe Markers */}
                        {keyframes.map((kf) => (
                          <div
                            key={kf.id}
                            onMouseDown={(e) => handleKeyframeMarkerMouseDown(kf.id, e)}
                            style={{ left: `${(kf.time / duration) * 100}%` }}
                            title={`Keyframe tại ${kf.time.toFixed(1)}s (Nhấn giữ kéo để thay đổi thời gian)`}
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-lime-400 border-2 border-black rotate-45 cursor-ew-resize z-30 hover:scale-125 transition-transform shadow-[0_0_8px_rgba(163,230,53,0.6)]"
                          >
                            {/* Tooltip hiển thị số giây của keyframe phía trên hình thoi (đảo ngược góc xoay rotate-45 của cha để chữ không bị chéo) */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 -rotate-45 mb-2 bg-gray-950/90 text-lime-400 border border-gray-800 text-[8px] font-bold px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap">
                              {kf.time.toFixed(1)}s
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold mb-3">Danh sách Keyframes ({keyframes.length})</h3>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {keyframes.map((kf) => (
                      <div 
                        key={kf.id} 
                        className="flex items-center justify-between p-3 bg-gray-900/40 border border-gray-800 hover:border-gray-700 rounded-xl transition"
                      >
                        <div className="flex items-center gap-3">
                          {/* Seek Button */}
                          <button 
                            onClick={() => {
                              if (videoRef.current) {
                                videoRef.current.currentTime = kf.time;
                                setCurrentTime(kf.time);
                              }
                            }}
                            title="Nhảy tới thời điểm này"
                            className="p-1 bg-gray-800 hover:bg-gray-700 text-lime-400 rounded transition"
                          >
                            <Play className="w-3 h-3 fill-current" />
                          </button>

                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-gray-400 w-10">Thời gian:</span>
                              <input 
                                type="number" 
                                step="0.1" 
                                min="0" 
                                max={duration} 
                                value={parseFloat(kf.time.toFixed(1))}
                                disabled={kf.id === "default"}
                                onChange={(e) => {
                                  const newTime = parseFloat(e.target.value);
                                  if (!isNaN(newTime) && newTime >= 0 && newTime <= duration) {
                                    setKeyframes(prev => prev.map(k => k.id === kf.id ? { ...k, time: newTime } : k).sort((a, b) => a.time - b.time));
                                  }
                                }}
                                className="w-16 bg-gray-800 text-white text-[11px] px-1 py-0.5 rounded border border-gray-700 font-mono text-center focus:border-lime-400 focus:outline-none disabled:opacity-50"
                              />
                              <span className="text-[10px] text-gray-500">s</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-gray-400 w-10">Vị trí X:</span>
                              <input 
                                type="number" 
                                min="0" 
                                max="100" 
                                value={Math.round(kf.cropX * 100)}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  if (!isNaN(val) && val >= 0 && val <= 100) {
                                    setKeyframes(prev => prev.map(k => k.id === kf.id ? { ...k, cropX: val / 100 } : k));
                                    if (Math.abs(currentTime - kf.time) < 0.1) {
                                      setCropXSlider(val);
                                    }
                                  }
                                }}
                                className="w-16 bg-gray-800 text-white text-[11px] px-1 py-0.5 rounded border border-gray-700 font-mono text-center focus:border-lime-400 focus:outline-none"
                              />
                              <span className="text-[10px] text-gray-500">%</span>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDeleteKeyframe(kf.id)}
                          className="p-1.5 hover:bg-red-500/10 text-gray-500 hover:text-red-400 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Background Audio */}
            {activeTab === VIDEO_EDITOR_TABS.AUDIO && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold mb-3">Nhạc nền theo Mood</h3>
                  <div className="grid grid-cols-4 gap-1.5">
                    {MOOD_PRESETS.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setSelectedMood(m.id)}
                        className={`py-2 text-xs font-medium rounded-lg capitalize transition border ${selectedMood === m.id ? "border-lime-400 bg-lime-400/5 text-lime-400" : "border-gray-800 bg-gray-900/30 hover:border-gray-700"}`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2">Âm lượng nhạc nền</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-gray-400 w-8">{audioVolume}%</span>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={audioVolume}
                      onChange={(e) => setAudioVolume(parseInt(e.target.value))}
                      className="flex-1 accent-lime-400 h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Thư viện nhạc nền</h3>
                  
                  {isLoadingMusic ? (
                    <div className="py-8 flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-lime-400" />
                      <span className="text-xs text-gray-400">Đang tải nhạc...</span>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                      <div 
                        onClick={() => setSelectedAudio("none")}
                        className={`p-3 rounded-xl border cursor-pointer text-xs font-medium transition ${selectedAudio === "none" ? "border-lime-400 bg-lime-400/5 text-lime-400" : "border-gray-800 bg-gray-900/30 hover:border-gray-700"}`}
                      >
                        Không sử dụng nhạc nền
                      </div>
                      
                      {musicTracks.map((track) => (
                        <div 
                          key={track.id}
                          onClick={() => setSelectedAudio(track.id)}
                          className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition ${selectedAudio === track.id ? "border-lime-400 bg-lime-400/5 text-lime-400" : "border-gray-800 bg-gray-900/30 hover:border-gray-700"}`}
                        >
                          <div>
                            <p className="text-xs font-semibold">{track.name}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Thời lượng: {track.duration}s</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 4: Text Overlay */}
            {activeTab === VIDEO_EDITOR_TABS.TEXT && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-semibold mb-2">Nội dung Text</h3>
                  <textarea 
                    placeholder="Gõ tiêu đề hoặc phụ đề cần chèn lên video..."
                    value={textOverlay}
                    onChange={(e) => setTextOverlay(e.target.value)}
                    className="w-full h-24 bg-[#08080C] border border-gray-800 rounded-xl p-3 text-xs focus:border-lime-400 focus:outline-none placeholder-gray-600 transition"
                  />
                  <p className="text-[10px] text-gray-500 mt-1.5">
                    * Mẹo: Click và kéo thả trực tiếp Text trên video player để định vị vị trí hiển thị.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-xs font-semibold mb-2">Kích thước Text</h3>
                    <input 
                      type="number" 
                      min="12" 
                      max="72"
                      value={textSize}
                      onChange={(e) => setTextSize(parseInt(e.target.value) || 18)}
                      className="w-full bg-[#08080C] border border-gray-800 rounded-lg px-3 py-2 text-xs focus:border-lime-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold mb-2">Màu sắc Text</h3>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="w-10 h-8 rounded border border-gray-800 cursor-pointer bg-transparent"
                      />
                      <input 
                        type="text" 
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="flex-1 bg-[#08080C] border border-gray-800 rounded-lg px-2 text-xs uppercase focus:border-lime-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 5: AI Subtitles */}
            {activeTab === VIDEO_EDITOR_TABS.SUBTITLES && (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-gray-900/30 border border-gray-800 p-4 rounded-xl">
                  <div>
                    <p className="text-xs font-semibold">Kích hoạt Phụ đề (Subtitles)</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Hiển thị phụ đề trên video</p>
                  </div>
                  <input 
                    type="checkbox"
                    checked={subtitlesEnabled}
                    onChange={(e) => setSubtitlesEnabled(e.target.checked)}
                    className="w-4 h-4 accent-lime-400 cursor-pointer"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-semibold">Tự động phát hiện Phụ đề</h3>
                    <button
                      onClick={handleGenerateAIQuotes}
                      disabled={isGeneratingSubs}
                      className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-800 text-[10px] font-semibold text-white rounded-lg transition"
                    >
                      {isGeneratingSubs ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 text-purple-200" />
                          <span>AI Transcribe</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {subtitles.length === 0 ? (
                      <div className="py-12 border border-dashed border-gray-800 rounded-xl flex flex-col items-center justify-center text-center p-4">
                        <Languages className="w-8 h-8 text-gray-700 mb-2" />
                        <p className="text-xs text-gray-400">Chưa có phụ đề nào.</p>
                        <p className="text-[10px] text-gray-500 mt-1">Bấm AI Transcribe để tự động nhận diện tiếng nói thành chữ.</p>
                      </div>
                    ) : (
                      subtitles.map((sub, i) => (
                        <div 
                          key={i} 
                          className={`p-3 border rounded-xl transition cursor-pointer ${currentTime >= sub.start && currentTime <= sub.end ? "border-purple-500 bg-purple-500/5" : "border-gray-800 bg-gray-900/20 hover:border-gray-700"}`}
                          onClick={() => {
                            if (videoRef.current) videoRef.current.currentTime = sub.start;
                          }}
                        >
                          <div className="flex justify-between text-[10px] text-gray-400 font-mono mb-1.5">
                            <span>{sub.start.toFixed(1)}s - {sub.end.toFixed(1)}s</span>
                          </div>
                          <input 
                            type="text"
                            value={sub.text}
                            onChange={(e) => {
                              const updated = [...subtitles];
                              updated[i].text = e.target.value;
                              setSubtitles(updated);
                            }}
                            className="w-full bg-[#08080C] border border-gray-800 focus:border-purple-400 focus:outline-none rounded px-2 py-1 text-xs text-white"
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
