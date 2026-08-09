import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  AlertTriangle, Loader2, Calendar, Plus
} from "lucide-react";
import { validatePostAgainstAllPresets } from "@/utils/postValidation";
import { useBrand } from "../../../context/BrandContext";
import { PLATFORMS, PLATFORM_API_KEY } from "../../../constants/platforms";
import { getNetworkEntrySlot, setNetworkEntrySlot } from "../../../utils/networkEntrySlot";
import { ChannelAvatar } from "../../../components/workspace/post-creator/ChannelAvatar";
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
import { AutoListPlatformsCard } from "./components/autolist/AutoListPlatformsCard";

export function AutoListEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const isNew = id === "new";

  // Form states
  const [name, setName] = useState("New autolist 1");
  const [repeat, setRepeat] = useState(false);
  const [selectedDays, setSelectedDays] = useState(['Mo', 'Tu', 'We', 'Th', 'Fr']);
  // One entry per connected SocialAccount (not deduped by platform) — a brand
  // with 2 YouTube channels needs both individually selectable/targetable.
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState([]);
  const [scheduleType, setScheduleType] = useState('INTERVAL'); // INTERVAL or SPECIFIC
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [specificTimes, setSpecificTimes] = useState([{ time: '09:00', days: ['Mo', 'Tu', 'We', 'Th', 'Fr'] }]);

  // Global (platform-agnostic) preset states
  const [autoPublish, setAutoPublish] = useState(true);
  const [useUrlShortener, setUseUrlShortener] = useState(true);
  const [globalFirstComment, setGlobalFirstComment] = useState('');

  // Per-channel presets — reuses the exact same shape the Post Composer
  // uses for per-account overrides (networkCustom[platform].perAccount
  // [accountId].settings, via getNetworkEntrySlot/setNetworkEntrySlot from
  // utils/networkEntrySlot.js), so 2 channels of the same platform (e.g. 2
  // YouTube channels) can each have independent preset values instead of
  // one config shared by both, without inventing a second parallel model.
  const [networkCustom, setNetworkCustom] = useState({});
  const setNetworkSetting = (platform, field, value, accountId) => {
    setNetworkCustom(prev => {
      const entry = prev[platform];
      const currentSlot = getNetworkEntrySlot(entry, accountId);
      const nextSettings = { ...(currentSlot.settings || {}), [field]: value };
      return {
        ...prev,
        [platform]: setNetworkEntrySlot(entry, accountId, { settings: nextSettings }),
      };
    });
  };

  // Which channel's preset panel is currently shown in AutoListConfigCard —
  // defaults to the first selected account and re-syncs whenever the
  // selection changes (e.g. the active channel gets deselected).
  const [activeChannelAccountId, setActiveChannelAccountId] = useState(null);

  // Post states
  const [posts, setPosts] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { activeBrand } = useBrand();

  const selectedAccounts = useMemo(
    () => connectedAccounts.filter(a => selectedAccountIds.includes(a.id)),
    [connectedAccounts, selectedAccountIds]
  );

  useEffect(() => {
    if (selectedAccounts.length === 0) {
      setActiveChannelAccountId(null);
      return;
    }
    if (!selectedAccounts.some(a => a.id === activeChannelAccountId)) {
      setActiveChannelAccountId(selectedAccounts[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccounts]);
  // Flat unique platform-name list, still needed by downstream consumers that
  // only care "is this platform targeted" (validation, post cards) and don't
  // need per-channel granularity.
  const selectedPlatformKeys = useMemo(
    () => [...new Set(selectedAccounts.map(a => a.platform))],
    [selectedAccounts]
  );

  // Effective preset PER SELECTED ACCOUNT of each platform — a brand can
  // have 2+ YouTube channels, each with its own Title/Audience/etc, and at
  // publish time the backend applies each channel's own preset via
  // networkOverrides (see _applyAutoListPresets). Validation must therefore
  // check every channel of a platform, not just one representative account,
  // or a post gets silently flagged/cleared based on the wrong channel's
  // settings. Consumed by both the summary banner below and each
  // AutoListPostCard.
  const validationPresets = useMemo(() => {
    const presetsForPlatform = (platform) =>
      selectedAccounts
        .filter(a => a.platform === platform)
        .map(a => getNetworkEntrySlot(networkCustom[platform], a.id).settings || {});
    return {
      facebook: presetsForPlatform(PLATFORM_API_KEY[PLATFORMS.FACEBOOK]),
      youtube: presetsForPlatform(PLATFORM_API_KEY[PLATFORMS.YOUTUBE]),
      instagram: presetsForPlatform(PLATFORM_API_KEY[PLATFORMS.INSTAGRAM]),
    };
  }, [selectedAccounts, networkCustom]);

  const init = async () => {
    if (!activeBrand) return;
    setIsLoading(true);
    try {
      // Derive selectable channels from the brand's actual connected social
      // accounts (same source ChannelsList/ComposerHeader use) — one row per
      // account, not deduped by platform. GOOGLE_DRIVE is a media-source
      // integration, not a publishable channel, and disconnected accounts
      // shouldn't be selectable here.
      const accounts = (activeBrand.socialAccounts || [])
        .filter((a) => a.platform !== PLATFORMS.GOOGLE_DRIVE && a.isConnected !== false);
      setConnectedAccounts(accounts);

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

          setSelectedAccountIds(list.targetSocialAccountIds ? list.targetSocialAccountIds.split(',').filter(Boolean) : []);
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
              if (parsed.networkCustom) setNetworkCustom(parsed.networkCustom);
            } catch (err) {
              console.error("Failed to parse metadata", err);
            }
          }
        }
      } else {
        // Defaults for new autolist
        if (accounts.length > 0) {
          setSelectedAccountIds([accounts[0].id]);
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

  const toggleAccount = (accountId) => {
    setSelectedAccountIds(prev =>
      prev.includes(accountId) ? prev.filter(a => a !== accountId) : [...prev, accountId]
    );
  };

  const toggleDay = (day) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const buildConfigMetadata = () => ({
    autoPublish,
    useUrlShortener,
    globalFirstComment,
    networkCustom
  });

  const handleSave = async () => {
    if (selectedAccountIds.length === 0) {
      toast.error("You must select at least one channel");
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
      const payload = {
        brandId: activeBrand.id,
        name,
        targetSocialAccountIds: selectedAccountIds.join(','),
        scheduleType,
        intervalMinutes: scheduleType === 'INTERVAL' ? intervalMinutes : null,
        specificTimes: scheduleType === 'SPECIFIC' ? JSON.stringify(specificTimes) : null,
        activeDays: allActiveDays.join(','),
        loopEnabled: repeat,
        isActive: true,
        metadata: JSON.stringify(buildConfigMetadata())
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
        // targetPlatforms intentionally omitted — backend's
        // _applyAutoListPresets derives it (and the precise per-channel
        // selectedAccountIds) from the AutoList's targetSocialAccountIds.
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
      if (selectedAccountIds.length === 0) {
        toast.error("You must select at least one channel.");
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
        const payload = {
          brandId: activeBrand.id,
          name,
          targetSocialAccountIds: selectedAccountIds.join(','),
          scheduleType,
          intervalMinutes: scheduleType === 'INTERVAL' ? intervalMinutes : null,
          specificTimes: scheduleType === 'SPECIFIC' ? JSON.stringify(specificTimes) : null,
          activeDays: allActiveDays.join(','),
          loopEnabled: repeat,
          isActive: true,
          metadata: JSON.stringify(buildConfigMetadata())
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
        {selectedAccountIds.length === 0 && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <div className="w-6 h-6 bg-red-500/20 rounded-lg flex items-center justify-center text-red-500">
              <AlertTriangle size={14} />
            </div>
            <span className="text-[11px] font-bold text-red-500 uppercase tracking-tight">
              You must select at least one channel.
            </span>
          </div>
        )}

        {/* Unified Edit Autolist Form Panel */}
        <div className="bg-card border border-border rounded-3xl p-8 shadow-sm space-y-8 text-left">
          {/* Row 1: Name */}
          <div className="space-y-2">
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

          {/* Row 2: Where to publish? — one row per channel, not per platform */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-foreground uppercase tracking-wider">Where to publish?</label>
            <AutoListPlatformsCard
              connectedAccounts={connectedAccounts}
              selectedAccountIds={selectedAccountIds}
              onToggleAccount={toggleAccount}
            />
          </div>

          {/* Row 3: Configuration */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-foreground uppercase tracking-wider">Configuration</label>

            {/* Which channel's preset panel is shown below — only worth
                showing when there's a choice to make. */}
            {selectedAccounts.length > 1 && (
              <div className="flex items-center gap-2 flex-wrap pb-1">
                {selectedAccounts.map((account) => {
                  const isActive = account.id === activeChannelAccountId;
                  return (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => setActiveChannelAccountId(account.id)}
                      title={account.displayName || account.username || account.accountName}
                      className={`relative rounded-xl transition-all cursor-pointer ${
                        isActive ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-105" : "opacity-60 hover:opacity-100"
                      }`}
                    >
                      <ChannelAvatar account={account} platform={account.platform} size={40} badgeSize={16} />
                    </button>
                  );
                })}
              </div>
            )}

            <AutoListConfigCard
              selectedAccounts={selectedAccounts}
              networkCustom={networkCustom}
              setNetworkSetting={setNetworkSetting}
              activeChannelAccountId={activeChannelAccountId}
              autoPublish={autoPublish}
              setAutoPublish={setAutoPublish}
              repeat={repeat}
              setRepeat={setRepeat}
              useUrlShortener={useUrlShortener}
              setUseUrlShortener={setUseUrlShortener}
              globalFirstComment={globalFirstComment}
              setGlobalFirstComment={setGlobalFirstComment}
            />
          </div>

          {/* Row 4: Timing */}
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
                const invalidCount = posts.filter(p =>
                  validatePostAgainstAllPresets(p, validationPresets, selectedPlatformKeys).length > 0
                ).length;

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
                    selectedPlatforms={selectedPlatformKeys}
                    validationPresets={validationPresets}
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
