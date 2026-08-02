import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { usePostCreator } from "../../../context/PostCreatorContext";

import { useBrand } from "../../../context/BrandContext";
import { useGoogleDriveImport } from "../../../hooks/useGoogleDriveImport";
import { toast } from "sonner";
import postService from "../../../services/post.service";
import { useTranslation } from "react-i18next";
import { getPlatformPostUrl } from "../../../utils/postUrlHelper";
import { useLatestRequestId } from "../../../hooks/useLatestRequestId";

// Import SOLID Subcomponents
import { UpgradeBanner } from "./components/UpgradeBanner";
import { PlannerToolbar } from "./components/PlannerToolbar";
import { WeeklyGrid } from "./components/WeeklyGrid";
import { SidebarIntegrations } from "./components/SidebarIntegrations";
import { ImportOverlay } from "./components/ImportOverlay";
import { MonthlyGrid } from "./components/MonthlyGrid";
import { CalendarSkeleton } from "./components/CalendarSkeleton";
import { PublishedPostDetailModal } from "./components/PublishedPostDetailModal";

import { useBrandPermission } from "../../../hooks/useBrandPermission";

export function WeeklyCalendarView({ socialAccountId, platform } = {}) {
  const { t } = useTranslation("planner");
  const { hasPermission } = useBrandPermission();
  const hasCreatePermission = hasPermission('CREATE_POSTS');
  const channelContext = socialAccountId ? { socialAccountId, platform } : null;

  const [searchTerm, setSearchTerm] = useState("");
  const { openPostCreator, isOpen } = usePostCreator();
  // Post whose detail popup (stats + go-to-post) is currently open.
  const [detailPost, setDetailPost] = useState(null);

  const handlePostClick = (post) => {
    if (post.status?.toLowerCase() === "published") {
      // Open the in-app detail popup (stats + "Go to post" link) instead of
      // bouncing straight out to the platform in a new tab — the external
      // link still lives inside the popup for one more click.
      if (getPlatformPostUrl(post)) {
        setDetailPost(post);
      } else {
        openPostCreator({ post, defaultSocialAccountId: socialAccountId });
      }
    } else {
      openPostCreator({ post, defaultSocialAccountId: socialAccountId });
    }
  };

  const handleDuplicatePost = (post) => {
    if (!hasCreatePermission) {
      toast.error(t("weeklyCalendar.noPermissionCreate"));
      return;
    }
    openPostCreator({
      template: post,
      defaultScheduledAt: post.scheduledAt ? new Date(post.scheduledAt) : null,
      defaultSocialAccountId: socialAccountId
    });
  };

  const { activeBrand } = useBrand();
  const [postData, setPostData] = useState([]);
  const [eventsData, setEventsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [rowHeight, setRowHeight] = useState(100);
  const [visiblePlatforms, setVisiblePlatforms] = useState({
    YOUTUBE: true,
    FACEBOOK: true,
    TIKTOK: true,
    INSTAGRAM: true,
    THREADS: true,
    X: true,
    TWITTER: true
  });
  
  // Filtering and Best Times States
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  // Best times state removed
  const [calendarViewMode, setCalendarViewMode] = useState("WEEK"); // DAY, WEEK, MONTH
  
  // Center date of current selected week (Defaults to current date)
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Custom Hook for Drive Imports (SOLID/SRP)
  const { isImporting, importFromDrive } = useGoogleDriveImport(activeBrand);
  
  const [monthlyPostCount, setMonthlyPostCount] = useState(0);
  const postsRequest = useLatestRequestId();
  useEffect(() => {
    if (!activeBrand) return;
    const fetchMonthlyCount = async () => {
      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const toLocalDateStr = (d) => {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        const startStr = toLocalDateStr(startOfMonth);
        const endStr = toLocalDateStr(endOfMonth);
        const res = await postService.getPosts(activeBrand.id, { startDate: startStr, endDate: endStr, limit: 1 });
        setMonthlyPostCount(res.meta?.total || 0);
      } catch (e) {
        console.error("Failed to fetch monthly post count:", e);
      }
    };
    fetchMonthlyCount();
    // postData intentionally excluded: it changes every time fetchPosts
    // resolves (week/day navigation), which previously re-triggered this
    // redundant /posts?limit=1 call on every nav instead of only when the
    // brand changes (#88 M3). Post creation/deletion should trigger its own
    // refresh via whatever already calls fetchPosts, not via this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBrand]);
  
  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Posts based on selectedDate and viewMode
  const fetchPosts = async () => {
    if (!activeBrand) return;
    const requestId = postsRequest.start();
    setLoading(true);

    const toLocalDateStr = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    let startDateStr, endDateStr;
    if (calendarViewMode === 'MONTH') {
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const start = new Date(firstDay);
      start.setDate(start.getDate() - start.getDay());
      
      const lastDay = new Date(year, month + 1, 0);
      const end = new Date(lastDay);
      end.setDate(end.getDate() + (6 - end.getDay()));
      
      startDateStr = toLocalDateStr(start);
      endDateStr = toLocalDateStr(end);
    } else {
      // WEEK or DAY mode
      const current = new Date(selectedDate);
      const day = current.getDay();
      const sunday = new Date(current);
      sunday.setDate(current.getDate() - day);
      const saturday = new Date(current);
      saturday.setDate(current.getDate() - day + 6);
      startDateStr = toLocalDateStr(sunday);
      endDateStr = toLocalDateStr(saturday);
    }

    try {
      const [posts, events] = await Promise.all([
        postService.getPosts(activeBrand.id, {
          startDate: startDateStr,
          endDate: endDateStr,
          limit: 100,
          ...(socialAccountId ? { socialAccountId } : {})
        }),
        postService.getCalendarEvents(activeBrand.id, startDateStr, endDateStr)
      ]);
      // A slower in-flight request resolving after a newer one (e.g. rapid
      // Prev/Next clicks) must not overwrite the grid with stale week data (#88 M4).
      if (!postsRequest.isLatest(requestId)) return;
      setPostData(posts || []);
      setEventsData(events || []);
    } catch (e) {
      if (postsRequest.isLatest(requestId)) toast.error(t("weeklyCalendar.loadCalendarFail"));
    } finally {
      if (postsRequest.isLatest(requestId)) setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [activeBrand, selectedDate, isOpen, calendarViewMode, socialAccountId]);

  // Search/status/type filtering shared between Week view (further grouped
  // below into groupedPosts) and Month view — MonthlyGrid previously only
  // received the raw postData plus its own internal platform filter, so
  // searchTerm/filterStatus/filterType silently had no effect on the Month
  // tab even though the toolbar controlling them is shared (#88 M10).
  // Platform filtering is intentionally left to MonthlyGrid/groupedPosts
  // themselves rather than duplicated here.
  const searchStatusTypeFiltered = useMemo(() => {
    return postData.filter(post => {
      const matchesSearch = !searchTerm || post.title?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === "ALL" || post.status?.toUpperCase() === filterStatus;
      const matchesType = filterType === "ALL" || post.type?.toUpperCase() === filterType;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [postData, searchTerm, filterStatus, filterType]);

  // Group and search-filter posts dynamically
  const groupedPosts = useMemo(() => {
    const grid = {};
    const filtered = searchStatusTypeFiltered.filter(post => {
      // Check if at least one platform on the post is visible
      const matchesPlatform = !post.platforms || post.platforms.length === 0 || post.platforms.some(p => visiblePlatforms[p.toUpperCase()] !== false);
      return matchesPlatform;
    });
    filtered.forEach(post => {
      const date = new Date(post.scheduledAt || post.createdAt);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const hour = date.getHours();
      const key = `${dateStr}-${hour}`;
      if (!grid[key]) grid[key] = [];
      grid[key].push(post);
    });
    return grid;
  }, [searchStatusTypeFiltered, visiblePlatforms]);

  // Date handlers
  const handlePrevWeek = () => {
    setSelectedDate(prev => {
      const d = new Date(prev);
      if (calendarViewMode === 'DAY') {
        d.setDate(prev.getDate() - 1);
      } else if (calendarViewMode === 'WEEK') {
        d.setDate(prev.getDate() - 7);
      } else if (calendarViewMode === 'MONTH') {
        d.setMonth(prev.getMonth() - 1);
      }
      return d;
    });
  };

  const handleNextWeek = () => {
    setSelectedDate(prev => {
      const d = new Date(prev);
      if (calendarViewMode === 'DAY') {
        d.setDate(prev.getDate() + 1);
      } else if (calendarViewMode === 'WEEK') {
        d.setDate(prev.getDate() + 7);
      } else if (calendarViewMode === 'MONTH') {
        d.setMonth(prev.getMonth() + 1);
      }
      return d;
    });
  };

  const handleTodayWeek = () => {
    setSelectedDate(new Date());
  };

  const handleSelectDate = (date) => {
    setSelectedDate(date);
  };

  const handleCellClick = (date, hour) => {
    if (!hasCreatePermission) {
      toast.error(t("weeklyCalendar.noPermissionCreate"));
      return;
    }
    // Open post creator at specific date and hour
    const scheduledDate = new Date(date);
    scheduledDate.setHours(hour, 0, 0, 0);
    openPostCreator({ defaultScheduledAt: scheduledDate, defaultSocialAccountId: socialAccountId });
  };

  const handleCreatePostClick = () => {
    openPostCreator({ defaultSocialAccountId: socialAccountId });
  };

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-hidden">
      {/* 1. Plan Upgrade Banner */}
      <UpgradeBanner postedCount={monthlyPostCount} limit={activeBrand?.currentPlan?.limits?.maxPostsPerMonth || 20} />

      {/* 2. Navigation & Actions Toolbar */}
      <PlannerToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedDate={selectedDate}
        onSelectDate={handleSelectDate}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
        onTodayWeek={handleTodayWeek}
        onCreatePostClick={handleCreatePostClick}
        channelContext={channelContext}
        showSidebar={showSidebar}
        onToggleSidebar={() => setShowSidebar(prev => !prev)}
        rowHeight={rowHeight}
        onRowHeightChange={setRowHeight}
        visiblePlatforms={visiblePlatforms}
        onVisiblePlatformsChange={setVisiblePlatforms}
        postData={postData}
        activeBrand={activeBrand}
        fetchPosts={fetchPosts}
        filterStatus={filterStatus}
        onFilterStatusChange={setFilterStatus}
        filterType={filterType}
        onFilterTypeChange={setFilterType}
        calendarViewMode={calendarViewMode}
        onCalendarViewModeChange={setCalendarViewMode}
      />

      {/* 3. Main Grid layout: Lịch bên trái, Tích hợp bên phải */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6 items-stretch mb-6">
        {/* Main Calendar Content - Always 100% full width */}
        <div className="flex-1 min-w-0 h-full overflow-hidden">
          {loading ? (
            <CalendarSkeleton viewMode={calendarViewMode} />
          ) : calendarViewMode === 'MONTH' ? (
            <MonthlyGrid
              selectedDate={selectedDate}
              postData={searchStatusTypeFiltered}
              eventsData={eventsData}
              onCellClick={handleCellClick}
              onPostClick={handlePostClick}
              onDuplicateClick={handleDuplicatePost}
              onDetailClick={setDetailPost}
              visiblePlatforms={visiblePlatforms}
            />
          ) : (
            <WeeklyGrid
              selectedDate={selectedDate}
              groupedPosts={groupedPosts}
              currentTime={currentTime}
              onCellClick={handleCellClick}
              onPostClick={handlePostClick}
              onDuplicateClick={handleDuplicatePost}
              onDetailClick={setDetailPost}
              onCellDrop={importFromDrive}
              rowHeight={rowHeight}
              eventsData={eventsData}
              viewMode={calendarViewMode}
            />
          )}
        </div>
      </div>

      {/* Right Slide-over Drawer for Integrations & Media Drive */}
      {showSidebar && (
        <div className="fixed inset-y-0 right-0 z-50 flex pl-10 max-w-full no-print">
          {/* Backdrop Overlay */}
          <div 
            className="fixed inset-0 bg-black/25 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 cursor-pointer"
            onClick={() => setShowSidebar(false)}
          />
          
          {/* Slide-over Drawer Panel */}
          <div className="relative w-screen max-w-sm bg-card shadow-2xl z-10 flex flex-col h-full border-l border-border animate-in slide-in-from-right duration-300">
            <SidebarIntegrations activeBrand={activeBrand} onClose={() => setShowSidebar(false)} />
          </div>
        </div>
      )}

      {/* Google Drive Import Backdrop Overlay */}
      <ImportOverlay isOpen={isImporting} />

      {/* Published post detail popup (stats + go-to-post) */}
      {detailPost && (
        <PublishedPostDetailModal post={detailPost} onClose={() => setDetailPost(null)} />
      )}
    </div>
  );
}
