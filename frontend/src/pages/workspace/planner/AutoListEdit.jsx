import * as React from "react";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  AlertTriangle, Youtube, PlayCircle, Instagram,
  Facebook, Loader2, Calendar, Plus, AlertCircle
} from "lucide-react";
import { validatePostForm } from "@/utils/postValidation";
import { PlatformIcon } from "../../../components/shared/PlatformIcon";
import { useBrand } from "../../../context/BrandContext";
import socialService from "../../../services/social.service";
import autoListService from "../../../services/auto-list.service";
import postService from "../../../services/post.service";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/useConfirm";

// Import Refactored Subcomponents
import { AutoListHeader } from "./components/autolist/AutoListHeader";
import { AutoListTimingCard } from "./components/autolist/AutoListTimingCard";
import { AutoListToolbar } from "./components/autolist/AutoListToolbar";
import { AutoListPostCard } from "./components/autolist/AutoListPostCard";
import { AutoListConfigCard } from "./components/autolist/AutoListConfigCard";

const PLATFORM_ICONS = {
  YOUTUBE: <Youtube size={18} className="text-[#FF0000]" />,
  TIKTOK: <PlayCircle size={18} className="text-[#010101]" />,
  INSTAGRAM: <Instagram size={18} className="text-[#E1306C]" />,
  FACEBOOK: <Facebook size={18} className="text-[#1877F2]" />,
  THREADS: <PlatformIcon platform="Threads" size={18} variant="flat" className="text-black" />,
  BLUESKY: <PlatformIcon platform="Bluesky" size={18} variant="flat" className="text-[#0085FF]" />,
};

export function AutoListEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const isNew = id === "new";

  // Form states
  const [name, setName] = useState("New autolist 1");
  const [repeat, setRepeat] = useState(false);
  const [selectedDays, setSelectedDays] = useState(['Mo', 'Tu', 'We', 'Th', 'Fr']);
  const [connectedPlatforms, setConnectedPlatforms] = useState([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [scheduleType, setScheduleType] = useState('INTERVAL'); // INTERVAL or SPECIFIC
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [specificTimes, setSpecificTimes] = useState([{ time: '09:00', days: ['Mo', 'Tu', 'We', 'Th', 'Fr'] }]);
  
  // Preset Configuration states
  const [autoPublish, setAutoPublish] = useState(true);
  const [useUrlShortener, setUseUrlShortener] = useState(true);
  const [globalFirstComment, setGlobalFirstComment] = useState('');
  const [facebookContentType, setFacebookContentType] = useState('post');
  const [facebookTitle, setFacebookTitle] = useState('');
  const [facebookReelCollaboratorId, setFacebookReelCollaboratorId] = useState('');
  const [facebookReelPlaceId, setFacebookReelPlaceId] = useState('');
  const [facebookReelThumbnail, setFacebookReelThumbnail] = useState('');
  const [instagramContentType, setInstagramContentType] = useState('post');
  const [instagramCollaborators, setInstagramCollaborators] = useState([]);
  const [instagramAudio, setInstagramAudio] = useState(null);
  const [instagramShowOnFeed, setInstagramShowOnFeed] = useState(true);
  // Threads
  const [threadsWhoCanReply, setThreadsWhoCanReply] = useState('everyone');
  // YouTube
  const [youtubeVideoType, setYoutubeVideoType] = useState('video');
  const [youtubePrivacy, setYoutubePrivacy] = useState('public');
  const [youtubeMadeForKids, setYoutubeMadeForKids] = useState(false);
  const [youtubeTitle, setYoutubeTitle] = useState('');
  const [youtubeCategory, setYoutubeCategory] = useState('22');
  const [youtubePlaylistId, setYoutubePlaylistId] = useState('');
  const [youtubeTags, setYoutubeTags] = useState('');
  const [youtubeThumbnail, setYoutubeThumbnail] = useState('');
  const [youtubeFirstComment, setYoutubeFirstComment] = useState('');
  // TikTok presets
  const [tiktokPrivacy, setTiktokPrivacy] = useState('public');
  const [tiktokAllowComments, setTiktokAllowComments] = useState(true);
  const [tiktokAllowDuet, setTiktokAllowDuet] = useState(true);
  const [tiktokAllowStitch, setTiktokAllowStitch] = useState(true);
  const [tiktokAiGenerated, setTiktokAiGenerated] = useState(false);
  const [tiktokCommercialContent, setTiktokCommercialContent] = useState(false);
  
  // Post states
  const [posts, setPosts] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { activeBrand } = useBrand();

  const init = async () => {
    if (!activeBrand) return;
    setIsLoading(true);
    try {
      // Load connected platforms
      const metricsRes = await socialService.getMetrics(activeBrand.id);
      const metricsList = metricsRes || [];
      const platforms = metricsList.map(m => ({
        id: m.platform,
        name: m.platform.charAt(0) + m.platform.slice(1).toLowerCase(),
        icon: PLATFORM_ICONS[m.platform] || <PlayCircle size={18} />
      }));
      setConnectedPlatforms(platforms);

      // Load list details if editing
      if (!isNew) {
        const listRes = await autoListService.getAutoListDetails(id);
        const list = listRes?.data || listRes;
        if (list) {
          setName(list.name);
          setRepeat(!!list.loopEnabled);
          setScheduleType(list.scheduleType);
          setIntervalMinutes(list.intervalMinutes || 60);
          
          if (list.specificTimes) {
            try {
              const parsed = JSON.parse(list.specificTimes);
              if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
                setSpecificTimes(parsed);
              } else {
                throw new Error('Legacy format');
              }
            } catch (e) {
              // Fallback for legacy format (comma separated times)
              const times = list.specificTimes.split(',').filter(Boolean);
              const legacyDays = list.activeDays ? list.activeDays.split(',').filter(Boolean) : ['Mo', 'Tu', 'We', 'Th', 'Fr'];
              setSpecificTimes(times.map(t => ({ time: t, days: legacyDays })));
            }
          } else {
            setSpecificTimes([]);
          }
          
          setSelectedPlatforms(list.targetPlatforms.split(',').filter(Boolean));
          setSelectedDays(list.activeDays ? list.activeDays.split(',').filter(Boolean) : ['Mo', 'Tu', 'We', 'Th', 'Fr']);
          // Post order is now strictly from DB
          setPosts(list.posts || []);

          // Load configuration from metadata field (replacement for LocalStorage)
          if (list.metadata) {
            try {
              const parsed = JSON.parse(list.metadata);
              if (parsed.autoPublish !== undefined) setAutoPublish(parsed.autoPublish);
              if (parsed.useUrlShortener !== undefined) setUseUrlShortener(parsed.useUrlShortener);
              if (parsed.globalFirstComment !== undefined) setGlobalFirstComment(parsed.globalFirstComment);
              else if (parsed.firstComment !== undefined) setGlobalFirstComment(parsed.firstComment);
              if (parsed.facebookContentType !== undefined) setFacebookContentType(parsed.facebookContentType);
              if (parsed.facebookTitle !== undefined) setFacebookTitle(parsed.facebookTitle);
              if (parsed.facebookReelCollaboratorId !== undefined) setFacebookReelCollaboratorId(parsed.facebookReelCollaboratorId);
              if (parsed.facebookReelPlaceId !== undefined) setFacebookReelPlaceId(parsed.facebookReelPlaceId);
              if (parsed.facebookReelThumbnail !== undefined) setFacebookReelThumbnail(parsed.facebookReelThumbnail);
              if (parsed.instagramContentType !== undefined) setInstagramContentType(parsed.instagramContentType);
              if (parsed.instagramCollaborators !== undefined) setInstagramCollaborators(parsed.instagramCollaborators);
              if (parsed.instagramAudio !== undefined) setInstagramAudio(parsed.instagramAudio);
              if (parsed.instagramShowOnFeed !== undefined) setInstagramShowOnFeed(parsed.instagramShowOnFeed);
              if (parsed.threadsWhoCanReply !== undefined) setThreadsWhoCanReply(parsed.threadsWhoCanReply);
              else if (parsed.threadsContentType !== undefined) setThreadsWhoCanReply('everyone');
              if (parsed.youtubeVideoType !== undefined) setYoutubeVideoType(parsed.youtubeVideoType);
              if (parsed.youtubePrivacy !== undefined) setYoutubePrivacy(parsed.youtubePrivacy);
              if (parsed.youtubeMadeForKids !== undefined) setYoutubeMadeForKids(parsed.youtubeMadeForKids);
              if (parsed.youtubeTitle !== undefined) setYoutubeTitle(parsed.youtubeTitle);
              if (parsed.youtubeCategory !== undefined) setYoutubeCategory(parsed.youtubeCategory);
              if (parsed.youtubePlaylistId !== undefined) setYoutubePlaylistId(parsed.youtubePlaylistId);
              if (parsed.youtubeTags !== undefined) setYoutubeTags(parsed.youtubeTags);
              if (parsed.youtubeThumbnail !== undefined) setYoutubeThumbnail(parsed.youtubeThumbnail);
              if (parsed.youtubeFirstComment !== undefined) setYoutubeFirstComment(parsed.youtubeFirstComment);
              if (parsed.tiktokPrivacy !== undefined) setTiktokPrivacy(parsed.tiktokPrivacy);
              if (parsed.tiktokAllowComments !== undefined) setTiktokAllowComments(parsed.tiktokAllowComments);
              if (parsed.tiktokAllowDuet !== undefined) setTiktokAllowDuet(parsed.tiktokAllowDuet);
              if (parsed.tiktokAllowStitch !== undefined) setTiktokAllowStitch(parsed.tiktokAllowStitch);
              if (parsed.tiktokAiGenerated !== undefined) setTiktokAiGenerated(parsed.tiktokAiGenerated);
              if (parsed.tiktokCommercialContent !== undefined) setTiktokCommercialContent(parsed.tiktokCommercialContent);
            } catch (err) {
              console.error("Failed to parse metadata", err);
            }
          }
        }
      } else {
        // Defaults for new autolist
        if (platforms.length > 0) {
          setSelectedPlatforms([platforms[0].id]);
        }
      }
    } catch (e) {
      console.error("Failed to initialize", e);
      toast.error("Failed to load autolist details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeBrand) {
      init();
    }
  }, [id, isNew, activeBrand]);

  const togglePlatform = (platformId) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId) ? prev.filter(p => p !== platformId) : [...prev, platformId]
    );
  };

  const toggleDay = (day) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSave = async () => {
    if (selectedPlatforms.length === 0) {
      toast.error("You must select at least one platform");
      return;
    }
    if (scheduleType === 'INTERVAL' && selectedDays.length === 0) {
      toast.error("You must select at least one active day for the interval");
      return;
    }
    if (scheduleType === 'SPECIFIC' && specificTimes.length === 0) {
      toast.error("You must add at least one specific posting time");
      return;
    }

    // Collect all unique active days from specific times to maintain backward compatibility with backend if needed
    // Otherwise fallback to selectedDays for INTERVAL
    const allActiveDays = scheduleType === 'SPECIFIC' 
      ? [...new Set(specificTimes.flatMap(st => st.days || []))]
      : selectedDays;

    setIsSaving(true);
    try {
      const configMetadata = {
        autoPublish,
        useUrlShortener,
        globalFirstComment,
        facebookContentType,
        facebookTitle,
        facebookReelCollaboratorId,
        facebookReelPlaceId,
        facebookReelThumbnail,
        instagramContentType,
        instagramCollaborators,
        instagramAudio,
        instagramShowOnFeed,
        threadsWhoCanReply,
        youtubeVideoType,
        youtubePrivacy,
        youtubeMadeForKids,
        youtubeTitle,
        youtubeCategory,
        youtubePlaylistId,
        youtubeTags,
        youtubeThumbnail,
        youtubeFirstComment,
        tiktokPrivacy,
        tiktokAllowComments,
        tiktokAllowDuet,
        tiktokAllowStitch,
        tiktokAiGenerated,
        tiktokCommercialContent
      };

      const payload = {
        brandId: activeBrand.id,
        name,
        targetPlatforms: selectedPlatforms.join(','),
        scheduleType,
        intervalMinutes: scheduleType === 'INTERVAL' ? intervalMinutes : null,
        specificTimes: scheduleType === 'SPECIFIC' ? JSON.stringify(specificTimes) : null,
        activeDays: allActiveDays.join(','),
        loopEnabled: repeat,
        isActive: true,
        metadata: JSON.stringify(configMetadata)
      };

      let savedId = id;
      if (isNew) {
        const created = await autoListService.createAutoList(payload);
        savedId = created.data?.id || created.id;
        toast.success("Autolist created successfully");
      } else {
        await autoListService.updateAutoList(id, payload);
        toast.success("Autolist updated successfully");
      }

      if (isNew) {
        navigate(`/planner/autolist/${savedId}`);
      } else {
        init();
      }
    } catch (e) {
      toast.error("Failed to save autolist");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteList = async () => {
    const isConfirmed = await confirm({
      title: "Delete Autolist?",
      description: "Are you sure you want to delete this autolist? All queued posts in this list will be permanently deleted.",
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "destructive"
    });
    if (!isConfirmed) return;
    try {
      await autoListService.deleteAutoList(id);
      toast.success("Autolist deleted");
      navigate("/planner/autolists");
    } catch (e) {
      toast.error("Failed to delete autolist");
    }
  };

  const handleInsertPostDirectly = async () => {
    try {
      await postService.createPost({
        brandId: activeBrand.id,
        title: "Untitled Post",
        caption: "",
        type: "VIDEO",
        status: "DRAFT",
        targetPlatforms: selectedPlatforms, // Array – post.service.js truyền thẳng
        mediaUrls: [],
        autoListId: id
      });
      toast.success("Post added to queue");
      init(); // Reload details
    } catch (e) {
      console.error("[handleInsertPostDirectly] Error:", e?.response?.data || e.message);
      toast.error(e?.response?.data?.message || "Failed to add post to queue");
    }
  };

  const handleInsertPost = async () => {
    if (isNew) {
      if (!activeBrand) return;
      if (selectedPlatforms.length === 0) {
        toast.error("You must select at least one network.");
        return;
      }
      if (scheduleType === 'INTERVAL' && selectedDays.length === 0) {
        toast.error("You must select at least one active day for the interval");
        return;
      }
      if (scheduleType === 'SPECIFIC' && specificTimes.length === 0) {
        toast.error("You must add at least one specific posting time");
        return;
      }

      const allActiveDays = scheduleType === 'SPECIFIC' 
        ? [...new Set(specificTimes.flatMap(st => st.days || []))]
        : selectedDays;

      setIsSaving(true);
      try {
        const configMetadata = {
          autoPublish,
          useUrlShortener,
          facebookContentType,
          instagramContentType,
          threadsWhoCanReply,
          youtubeVideoType,
          youtubePrivacy,
          youtubeMadeForKids
        };

        const payload = {
          brandId: activeBrand.id,
          name,
          targetPlatforms: selectedPlatforms.join(','),
          scheduleType,
          intervalMinutes: scheduleType === 'INTERVAL' ? intervalMinutes : null,
          specificTimes: scheduleType === 'SPECIFIC' ? JSON.stringify(specificTimes) : null,
          activeDays: allActiveDays.join(','),
          loopEnabled: repeat,
          isActive: true,
          metadata: JSON.stringify(configMetadata)
        };

        const created = await autoListService.createAutoList(payload);
        const savedId = created.data?.id || created.data?.data?.id || created.id;

        if (!savedId) throw new Error('AutoList created but no ID returned');

        // Now create the post for this list
        await postService.createPost({
          brandId: activeBrand.id,
          title: "Untitled Post",
          caption: "",
          type: "VIDEO",
          status: "DRAFT",
          targetPlatforms: selectedPlatforms, // Array
          mediaUrls: [],
          autoListId: savedId
        });

        toast.success("Autolist created and post inserted");
        navigate(`/planner/autolist/${savedId}`);
      } catch (err) {
        console.error("[handleInsertPost] Error:", err?.response?.data || err.message);
        toast.error(err?.response?.data?.message || "Failed to create autolist and insert post");
      } finally {
        setIsSaving(false);
      }
    } else {
      await handleInsertPostDirectly();
    }
  };

  const handleDeletePost = async (postId) => {
    const isConfirmed = await confirm({
      title: "Remove post?",
      description: "Remove this post from the queue?",
      confirmText: "Remove",
      cancelText: "Cancel",
      variant: "destructive"
    });
    if (!isConfirmed) return;
    try {
      await postService.deletePosts(activeBrand.id, [postId]);
      toast.success("Post removed from queue");
      init();
    } catch (e) {
      toast.error("Failed to remove post");
    }
  };

  const handleUpdatePostFields = async (postId, fields) => {
    try {
      await postService.updatePost(postId, { ...fields, brandId: activeBrand.id });
      toast.success("Post updated");
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...fields } : p));
    } catch (e) {
      toast.error("Failed to update post");
    }
  };

  const handleTogglePostStatus = async (postId, newStatus) => {
    try {
      await postService.updatePost(postId, { status: newStatus, brandId: activeBrand.id });
      toast.success(newStatus === 'PAUSED' ? "Post paused" : "Post activated");
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: newStatus } : p));
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  // Drag and Drop States and Handlers
  const [draggedIndex, setDraggedIndex] = React.useState(null);

  const handleDragStart = (e, idx) => {
    setDraggedIndex(idx);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
  };

  const handleDrop = async (e, idx) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === idx) return;

    const reorderedPosts = [...posts];
    const [draggedPost] = reorderedPosts.splice(draggedIndex, 1);
    reorderedPosts.splice(idx, 0, draggedPost);
    setPosts(reorderedPosts);

    // Persist to server so scheduler updates slots - LocalStorage order is now removed
    try {
      await autoListService.reorderPosts(id, reorderedPosts.map(p => p.id));
      toast.success("Queue order saved to server");
      init();
    } catch (err) {
      console.error("Failed to persist queue order to server", err);
      toast.error("Failed to sync queue order to server");
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background min-h-screen">
        <Loader2 className="animate-spin text-muted-foreground" size={40} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background text-foreground min-h-screen overflow-y-auto animate-in slide-in-from-right duration-300">
      {/* Header */}
      <AutoListHeader 
        isNew={isNew} 
        isSaving={isSaving} 
        onSave={handleSave} 
        onDelete={handleDeleteList} 
        onBack={() => navigate("/planner/autolists")} 
      />

      <div className="p-8 max-w-6xl mx-auto w-full space-y-8">
        {/* Error Alert */}
        {selectedPlatforms.length === 0 && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <div className="w-6 h-6 bg-red-500/20 rounded-lg flex items-center justify-center text-red-500">
              <AlertTriangle size={14} />
            </div>
            <span className="text-[11px] font-bold text-red-500 uppercase tracking-tight">
              You must select at least one network.
            </span>
          </div>
        )}

        {/* Unified Edit Autolist Form Panel */}
        <div className="bg-card border border-border rounded-3xl p-8 shadow-sm space-y-8 text-left">
          {/* Row 1: Name and Platforms side-by-side */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Name Input */}
            <div className="md:col-span-3 space-y-2">
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider">Name</label>
              <div className="relative">
                <label className="absolute -top-2 left-4 px-1.5 bg-card text-[9px] font-black text-muted-foreground uppercase tracking-widest z-10">Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-5 py-3.5 border border-border bg-card text-foreground rounded-xl text-xs font-bold focus:border-foreground outline-none shadow-sm transition-all focus:ring-1 focus:ring-foreground/10 placeholder:text-muted-foreground"
                  placeholder="Enter queue name..."
                />
              </div>
            </div>

            {/* Where to publish? */}
            <div className="md:col-span-1 space-y-2">
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider">Where to publish?</label>
              <div className="flex flex-wrap gap-2 pt-1">
                {connectedPlatforms.length === 0 ? (
                  <span className="text-[11px] font-semibold text-muted-foreground italic">No connections</span>
                ) : (
                  connectedPlatforms.map((p) => {
                    const isSelected = selectedPlatforms.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => togglePlatform(p.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium cursor-pointer transition-all ${
                          isSelected
                            ? 'border-border bg-muted font-semibold text-foreground'
                            : 'border-border bg-card text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {p.icon}
                        <span>{p.name}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Row 2: Configuration */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-foreground uppercase tracking-wider">Configuration</label>
            <AutoListConfigCard 
              selectedPlatforms={selectedPlatforms}
              autoPublish={autoPublish}
              setAutoPublish={setAutoPublish}
              repeat={repeat}
              setRepeat={setRepeat}
              useUrlShortener={useUrlShortener}
              setUseUrlShortener={setUseUrlShortener}
              globalFirstComment={globalFirstComment}
              setGlobalFirstComment={setGlobalFirstComment}
              facebookContentType={facebookContentType}
              setFacebookContentType={setFacebookContentType}
              facebookTitle={facebookTitle}
              setFacebookTitle={setFacebookTitle}
              facebookReelCollaboratorId={facebookReelCollaboratorId}
              setFacebookReelCollaboratorId={setFacebookReelCollaboratorId}
              facebookReelPlaceId={facebookReelPlaceId}
              setFacebookReelPlaceId={setFacebookReelPlaceId}
              facebookReelThumbnail={facebookReelThumbnail}
              setFacebookReelThumbnail={setFacebookReelThumbnail}
              instagramContentType={instagramContentType}
              setInstagramContentType={setInstagramContentType}
              instagramCollaborators={instagramCollaborators}
              setInstagramCollaborators={setInstagramCollaborators}
              instagramAudio={instagramAudio}
              setInstagramAudio={setInstagramAudio}
              instagramShowOnFeed={instagramShowOnFeed}
              setInstagramShowOnFeed={setInstagramShowOnFeed}
              threadsWhoCanReply={threadsWhoCanReply}
              setThreadsWhoCanReply={setThreadsWhoCanReply}
              youtubeVideoType={youtubeVideoType}
              setYoutubeVideoType={setYoutubeVideoType}
              youtubePrivacy={youtubePrivacy}
              setYoutubePrivacy={setYoutubePrivacy}
              youtubeMadeForKids={youtubeMadeForKids}
              setYoutubeMadeForKids={setYoutubeMadeForKids}
              youtubeTitle={youtubeTitle}
              setYoutubeTitle={setYoutubeTitle}
              youtubeCategory={youtubeCategory}
              setYoutubeCategory={setYoutubeCategory}
              youtubePlaylistId={youtubePlaylistId}
              setYoutubePlaylistId={setYoutubePlaylistId}
              youtubeTags={youtubeTags}
              setYoutubeTags={setYoutubeTags}
              youtubeThumbnail={youtubeThumbnail}
              setYoutubeThumbnail={setYoutubeThumbnail}
              youtubeFirstComment={youtubeFirstComment}
              setYoutubeFirstComment={setYoutubeFirstComment}
              tiktokPrivacy={tiktokPrivacy}
              setTiktokPrivacy={setTiktokPrivacy}
              tiktokAllowComments={tiktokAllowComments}
              setTiktokAllowComments={setTiktokAllowComments}
              tiktokAllowDuet={tiktokAllowDuet}
              setTiktokAllowDuet={setTiktokAllowDuet}
              tiktokAllowStitch={tiktokAllowStitch}
              setTiktokAllowStitch={setTiktokAllowStitch}
              tiktokAiGenerated={tiktokAiGenerated}
              setTiktokAiGenerated={setTiktokAiGenerated}
              tiktokCommercialContent={tiktokCommercialContent}
              setTiktokCommercialContent={setTiktokCommercialContent}
            />
          </div>

          {/* Row 3: Timing */}
          <div className="border-t border-border pt-8">
            <AutoListTimingCard 
              scheduleType={scheduleType}
              setScheduleType={setScheduleType}
              intervalMinutes={intervalMinutes}
              setIntervalMinutes={setIntervalMinutes}
              selectedDays={selectedDays}
              onToggleIntervalDay={toggleDay}
              specificTimes={specificTimes}
              setSpecificTimes={setSpecificTimes}
            />
          </div>
        </div>

        {/* Separator line */}
        <div className="w-full h-px bg-border my-8" />

        {/* Queue Content list */}
        <div className="space-y-6 text-left pb-20">
          <AutoListToolbar 
            onInsertPost={handleInsertPost}
            onAddWithAI={() => toast.info("AI feature coming soon")}
            onImportCSV={() => toast.info("CSV import coming soon")}
            onDownloadCSV={() => toast.info("CSV download coming soon")}
            onDeleteAll={() => toast.info("Action not supported yet")}
            onRssFeed={() => toast.info("RSS feed coming soon")}
            hasPosts={posts.length > 0}
          />

          {posts.length === 0 ? (
            <div className="border border-dashed border-border rounded-3xl p-12 text-center">
              <Calendar className="mx-auto text-muted-foreground mb-4 opacity-50" size={40} />
              <h4 className="text-xs font-bold text-foreground">The queue is currently empty</h4>
              <p className="text-[11px] text-muted-foreground mt-1 max-w-sm mx-auto mb-4">
                Add your first post to begin automated scheduling based on your cadence settings.
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleInsertPost();
                }}
                className="px-5 py-2.5 bg-foreground hover:bg-foreground/90 text-background rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
              >
                Add your first post
              </button>
            </div>
          ) : (
            <div className="space-y-4 max-w-4xl mx-auto w-full">
              {/* Overall Validation Warning Banner */}
              {(() => {
                const invalidCount = posts.filter(p => {
                  const mediaUrls = !p.mediaUrls ? [] : (Array.isArray(p.mediaUrls) ? p.mediaUrls : p.mediaUrls.split(',').filter(Boolean));
                  const firstMedia = mediaUrls[0];
                  const errs = validatePostForm({
                    isLibrary: false,
                    selectedPublishId: 'schedule',
                    scheduledDate: p.scheduledAt || new Date(),
                    selectedPlatforms: selectedPlatforms || [],
                    facebookType: p.options?.facebookType || facebookContentType || 'post',
                    youtubeType: p.options?.youtubeType || youtubeVideoType || 'video',
                    instagramType: p.options?.instagramType || instagramContentType || 'post',
                    videoFileUrl: firstMedia,
                    uploadedVideoPath: firstMedia,
                    mediaCount: mediaUrls.length,
                    postMedia: mediaUrls.map(url => ({ path: url }))
                  });
                  return errs.length > 0;
                }).length;

                if (invalidCount === 0) return null;

                return (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-between shadow-sm animate-in fade-in duration-200">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="text-red-500 shrink-0" size={20} />
                      <div className="text-left">
                        <h5 className="text-xs font-bold text-red-500 font-sans">
                          {invalidCount} {invalidCount === 1 ? 'post has' : 'posts have'} platform requirement issues
                        </h5>
                        <p className="text-[11px] text-red-500/80 font-medium font-sans">
                          Please review the red warnings on the post cards below (e.g. YouTube requires video instead of image).
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-4">
                {posts.map((post, idx) => (
                  <AutoListPostCard 
                    key={post.id}
                    post={post}
                    index={idx + 1}
                    onDelete={handleDeletePost}
                    onToggleStatus={handleTogglePostStatus}
                    onUpdatePostFields={handleUpdatePostFields}
                    activeBrand={activeBrand}
                    selectedPlatforms={selectedPlatforms}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                    onDrop={handleDrop}
                    draggedIndex={draggedIndex}
                  />
                ))}
              </div>
              
              <div className="pt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleInsertPost();
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <Plus size={14} className="text-muted-foreground" /> Add post to end
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
