import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { usePostCreator } from "../../../context/PostCreatorContext";
import apiService from "../../../services/api";
import { useBrand } from "../../../context/BrandContext";
import { useGoogleDriveImport } from "../../../hooks/useGoogleDriveImport";
import { toast } from "sonner";
import postService from "../../../services/post.service";

// Import SOLID Subcomponents
import { UpgradeBanner } from "./components/UpgradeBanner";
import { PlannerToolbar } from "./components/PlannerToolbar";
import { WeeklyGrid } from "./components/WeeklyGrid";
import { SidebarIntegrations } from "./components/SidebarIntegrations";
import { ImportOverlay } from "./components/ImportOverlay";
import { MonthlyGrid } from "./components/MonthlyGrid";

import { useBrandPermission } from "../../../hooks/useBrandPermission";
import { PostAnalyticsDetailModal } from "../../../components/workspace/PostAnalyticsDetailModal";

export function WeeklyCalendarView() {
  const { hasPermission } = useBrandPermission();
  const hasCreatePermission = hasPermission('CREATE_POSTS');

  const [searchTerm, setSearchTerm] = useState("");
  const { openPostCreator, isOpen } = usePostCreator();
  const [analyticsModal, setAnalyticsModal] = useState({ open: false, post: null });

  const handlePostClick = (post) => {
    if (post.status?.toLowerCase() === "published") {
      setAnalyticsModal({ open: true, post });
    } else {
      openPostCreator({ post });
    }
  };
  const { activeBrand } = useBrand();
  const [postData, setPostData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [rowHeight, setRowHeight] = useState(100);
  const [visiblePlatforms, setVisiblePlatforms] = useState({
    YOUTUBE: true,
    FACEBOOK: true,
    TIKTOK: true,
    INSTAGRAM: true,
    LINKEDIN: true,
    THREADS: true,
    X: true,
    TWITTER: true
  });
  
  // Filtering and Best Times States
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [bestTimePlatform, setBestTimePlatform] = useState("INSTAGRAM");
  const [calendarViewMode, setCalendarViewMode] = useState("WEEK"); // DAY, WEEK, MONTH
  
  // Center date of current selected week (Defaults to current date)
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Custom Hook for Drive Imports (SOLID/SRP)
  const { isImporting, importFromDrive } = useGoogleDriveImport(activeBrand);
  
  const [monthlyPostCount, setMonthlyPostCount] = useState(0);
  const [bestTimesData, setBestTimesData] = useState([]);

  // Fetch Best Times to Post metrics
  useEffect(() => {
    if (!activeBrand) return;
    const fetchBestTimes = async () => {
      try {
        const res = await apiService.get(`/posts/best-times?brandId=${activeBrand.id}&platform=${bestTimePlatform}`);
        setBestTimesData(res.data.data || []);
      } catch (e) {
        console.error("Failed to fetch best times:", e);
      }
    };
    fetchBestTimes();
  }, [activeBrand, bestTimePlatform]);

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
        const res = await apiService.get(`/posts?brandId=${activeBrand.id}&startDate=${startStr}&endDate=${endStr}&limit=1`);
        setMonthlyPostCount(res.data.meta?.total || 0);
      } catch (e) {
        console.error("Failed to fetch monthly post count:", e);
      }
    };
    fetchMonthlyCount();
  }, [activeBrand, postData]);
  
  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Posts based on selectedDate and viewMode
  const fetchPosts = async () => {
    if (!activeBrand) return;
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
      const res = await apiService.get(`/posts?brandId=${activeBrand.id}&startDate=${startDateStr}&endDate=${endDateStr}&limit=100`);
      setPostData(res.data.data || []);
    } catch (e) {
      toast.error("Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [activeBrand, selectedDate, isOpen, calendarViewMode]);

  // Group and search-filter posts dynamically
  const groupedPosts = useMemo(() => {
    const grid = {};
    const filtered = postData.filter(post => {
      const matchesSearch = !searchTerm || post.title?.toLowerCase().includes(searchTerm.toLowerCase());
      // Check if at least one platform on the post is visible
      const matchesPlatform = !post.platforms || post.platforms.length === 0 || post.platforms.some(p => visiblePlatforms[p.toUpperCase()] !== false);
      // Filter by Status and Type
      const matchesStatus = filterStatus === "ALL" || post.status?.toUpperCase() === filterStatus;
      const matchesType = filterType === "ALL" || post.type?.toUpperCase() === filterType;

      return matchesSearch && matchesPlatform && matchesStatus && matchesType;
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
  }, [postData, searchTerm, visiblePlatforms, filterStatus, filterType]);

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
      toast.error("You do not have permission to create posts");
      return;
    }
    // Open post creator at specific date and hour
    const scheduledDate = new Date(date);
    scheduledDate.setHours(hour, 0, 0, 0);
    openPostCreator({ defaultScheduledAt: scheduledDate });
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
        onCreatePostClick={openPostCreator}
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
        bestTimePlatform={bestTimePlatform}
        onBestTimePlatformChange={setBestTimePlatform}
        calendarViewMode={calendarViewMode}
        onCalendarViewModeChange={setCalendarViewMode}
      />

      {loading && (
        <div className="flex items-center justify-center py-4 no-print">
          <Loader2 className="animate-spin text-[#0A0A0A] mr-2" size={18} />
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Loading calendar posts...</span>
        </div>
      )}

      {/* 3. Main Grid layout: Lịch bên trái, Tích hợp bên phải */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6 items-stretch mb-6">
        {/* Lưới lịch tuần/ngày/tháng */}
        <div className="flex-1 w-full h-full">
          {calendarViewMode === 'MONTH' ? (
            <MonthlyGrid
              selectedDate={selectedDate}
              postData={postData}
              onCellClick={handleCellClick}
              onPostClick={handlePostClick}
              visiblePlatforms={visiblePlatforms}
            />
          ) : (
            <WeeklyGrid
              selectedDate={selectedDate}
              groupedPosts={groupedPosts}
              currentTime={currentTime}
              onCellClick={handleCellClick}
              onPostClick={handlePostClick}
              onCellDrop={importFromDrive}
              rowHeight={rowHeight}
              bestTimePlatform={bestTimePlatform}
              bestTimesData={bestTimesData}
              viewMode={calendarViewMode}
            />
          )}
        </div>

        {/* Cột tích hợp bên phải */}
        {showSidebar && (
          <div className="w-full lg:w-[280px] shrink-0 h-full animate-in slide-in-from-right duration-250">
            <SidebarIntegrations activeBrand={activeBrand} />
          </div>
        )}
      </div>

      {/* Google Drive Import Backdrop Overlay */}
      <ImportOverlay isOpen={isImporting} />
      <PostAnalyticsDetailModal
        isOpen={analyticsModal.open}
        onClose={() => setAnalyticsModal({ open: false, post: null })}
        post={analyticsModal.post}
        brandId={activeBrand?.id}
      />
    </div>
  );
}
