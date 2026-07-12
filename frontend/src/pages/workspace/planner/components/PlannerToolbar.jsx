import React, { useState } from 'react';
import { 
  Search, ChevronLeft, ChevronRight, Filter, 
  MoreVertical, Plus, Image, Calendar as CalendarIcon,
  ChevronDown, Youtube, ZoomIn, Layers, Upload, Download,
  Eye, Settings, Check, Instagram, PlayCircle, X, RefreshCw
} from 'lucide-react';
import { DataIntegrationWizard } from './DataIntegrationWizard';
import { DatePickerPopover } from './DatePickerPopover';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import postService from '../../../../services/post.service';
import apiService from '../../../../services/api';
import { buildMediaUrl } from '@/utils/url';
import { PostMediaThumbnail } from '@/components/shared/PostMediaThumbnail';
import { AccessGuard } from '../../../../components/shared/AccessGuard';
import { PlatformIcon } from '../../../../components/shared/PlatformIcon';
import { useTranslation } from 'react-i18next';
import {
  PUBLICAST_CSV_HEADERS,
  csvCell,
  parseCSVRow,
  detectCSVFormat,
  mapMetricoolRow,
  mapPublicastRow
} from '@/utils/csvHelper';

const PLATFORM_DETAILS = {
  INSTAGRAM: {
    label: 'Instagram',
    color: '#E1306C',
    icon: (size = 10) => <Instagram size={size} className="stroke-white fill-none" strokeWidth="2.5" />
  },
  FACEBOOK: {
    label: 'Facebook',
    color: '#1877F2',
    icon: (size = 10) => (
      <svg viewBox="0 0 24 24" className="fill-white text-[#1877F2] shrink-0" style={{ width: size, height: size }}>
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    )
  },
  TIKTOK: {
    label: 'TikTok',
    color: '#010101',
    icon: (size = 10) => (
      <svg viewBox="0 0 24 24" className="fill-white text-[#010101] shrink-0" style={{ width: size, height: size }}>
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.59 4.23.95 1.2 2.27 2.04 3.75 2.4v3.9c-1.57-.02-3.11-.45-4.49-1.25-.43-.25-.83-.55-1.21-.88v6.79c.02 2.25-.8 4.43-2.31 6.09-1.5 1.66-3.64 2.64-5.91 2.73-2.43.08-4.83-.8-6.55-2.52-1.72-1.72-2.61-4.12-2.49-6.56.12-2.27 1.13-4.39 2.82-5.88 1.69-1.49 3.91-2.24 6.17-2.09l-.01 3.97c-1.25-.09-2.5.3-3.46 1.1-.96.8-1.51 1.98-1.51 3.23.01 1.27.59 2.47 1.58 3.24.99.78 2.27 1.12 3.51.93 1.2-.18 2.24-1.02 2.74-2.14.28-.63.41-1.32.39-2.01V.02z"/>
      </svg>
    )
  },
  YOUTUBE: {
    label: 'YouTube',
    color: '#FF0000',
    icon: (size = 10) => <Youtube size={size} className="fill-white text-[#FF0000]" />
  },
  LINKEDIN: {
    label: 'LinkedIn',
    color: '#0A66C2',
    icon: (size = 10) => (
      <svg viewBox="0 0 24 24" className="fill-white text-[#0A66C2] shrink-0" style={{ width: size, height: size }}>
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452z"/>
      </svg>
    )
  },
  TWITTER: {
    label: 'X / Twitter',
    color: '#000000',
    icon: (size = 10) => (
      <svg viewBox="0 0 24 24" className="fill-white text-[#000000] shrink-0" style={{ width: size, height: size }}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    )
  },
  THREADS: {
    label: 'Threads',
    color: '#000000',
    icon: (size = 10) => <PlatformIcon platform="Threads" size={size} variant="flat" className="text-white" />
  }
};

export function PlannerToolbar({
  searchTerm,
  setSearchTerm,
  selectedDate,
  onSelectDate,
  onPrevWeek,
  onNextWeek,
  onTodayWeek,
  onCreatePostClick,
  showSidebar,
  onToggleSidebar,
  rowHeight,
  onRowHeightChange,
  visiblePlatforms = {},
  onVisiblePlatformsChange,
  postData = [],
  activeBrand,
  fetchPosts,
  filterStatus = 'ALL',
  onFilterStatusChange,
  filterType = 'ALL',
  onFilterTypeChange,
  bestTimePlatform = 'INSTAGRAM',
  onBestTimePlatformChange,
  calendarViewMode = 'WEEK',
  onCalendarViewModeChange,
  onImportIcsClick
}) {
  const { t } = useTranslation(['planner', 'common']);
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isPreviewFeedOpen, setIsPreviewFeedOpen] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isBestTimesOpen, setIsBestTimesOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const togglePlatform = (platform) => {
    if (!onVisiblePlatformsChange) return;
    onVisiblePlatformsChange(prev => {
      const next = { ...prev, [platform]: !prev[platform] };
      if (platform === "X") {
        next.TWITTER = !prev.TWITTER;
      }
      return next;
    });
  };

  // Format date display based on viewMode
  const formatDateDisplay = (centerDate, viewMode) => {
    const current = new Date(centerDate);
    const locale = t('common:langLocale') || 'en-US';
    
    if (viewMode === 'DAY') {
      return current.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
    }
    if (viewMode === 'MONTH') {
      return current.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    }
    
    // WEEK mode (default)
    const day = current.getDay();
    const sunday = new Date(current.setDate(current.getDate() - day));
    const saturday = new Date(current.setDate(current.getDate() - day + 6));
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return `${sunday.toLocaleDateString(locale, options)} - ${saturday.toLocaleDateString(locale, options)}`;
  };

  return (
    <>
    <div className="flex flex-col gap-4 w-full no-print">
      {/* Row 1: Search, Navigator, Filters */}
      <div className="flex flex-wrap items-center gap-3 w-full">
        {/* Search Input */}
      <div className="relative flex-1 min-w-[200px] max-w-sm group">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-900 transition-colors" />
        <input 
          type="text" 
          placeholder={t('toolbar.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all text-gray-700"
        />
      </div>

      {/* This Week Button */}
      <button 
        onClick={onTodayWeek}
        className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all cursor-pointer shadow-sm"
      >
        {t('toolbar.thisWeek')}
      </button>

      {/* Date Navigation group */}
      <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-visible relative shadow-sm h-10">
        <button 
          onClick={onPrevWeek}
          className="px-3 h-full hover:bg-gray-50 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
        >
          <ChevronLeft size={16} />
        </button>
        
        <button 
          onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
          className="px-4 h-full flex items-center gap-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all border-l border-r border-gray-100 cursor-pointer"
        >
          <CalendarIcon size={14} className="text-gray-400" />
          {formatDateDisplay(selectedDate, calendarViewMode)}
        </button>

        <DatePickerPopover 
          isOpen={isDatePickerOpen}
          onClose={() => setIsDatePickerOpen(false)}
          selectedDate={selectedDate}
          onSelectDate={onSelectDate}
        />

        <button 
          onClick={onNextWeek}
          className="px-3 h-full hover:bg-gray-50 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Filter and More buttons */}
      <div className="flex gap-2 relative">
        <div className="relative">
          <button 
            onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
            className={`w-10 h-10 flex items-center justify-center border rounded-xl transition-all cursor-pointer shadow-sm ${
              isFilterMenuOpen 
                ? "bg-[#0A0A0A] border-[#0A0A0A] text-white" 
                : "bg-white border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Filter size={16} />
          </button>
          
          {isFilterMenuOpen && (
            <>
              {/* Overlay backdrop */}
              <div 
                className="fixed inset-0 z-40 cursor-default" 
                onClick={() => setIsFilterMenuOpen(false)} 
              />
              
              {/* Filter Dropdown */}
              <div className="absolute left-0 mt-2 w-56 bg-white rounded-2xl border border-gray-100 shadow-xl py-3 z-50 text-left animate-in fade-in slide-in-from-top-3 duration-200 font-medium">
                <div className="px-4 pb-1.5 border-b border-gray-100 mb-1.5">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('toolbar.filterStatusLabel')}</span>
                </div>
                {[
                  { label: t('toolbar.statuses.all'), value: "ALL" },
                  { label: t('toolbar.statuses.draft'), value: "DRAFT" },
                  { label: t('toolbar.statuses.scheduled'), value: "SCHEDULED" },
                  { label: t('toolbar.statuses.pendingApproval'), value: "PENDING_APPROVAL" },
                  { label: t('toolbar.statuses.published'), value: "PUBLISHED" },
                  { label: t('toolbar.statuses.failed'), value: "FAILED" }
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      if (onFilterStatusChange) onFilterStatusChange(opt.value);
                      setIsFilterMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-between cursor-pointer border-none bg-transparent"
                  >
                    <span>{opt.label}</span>
                    {filterStatus === opt.value && <Check size={12} className="text-green-500" />}
                  </button>
                ))}

                <div className="my-2 border-t border-gray-100" />
                
                <div className="px-4 pb-1.5 mb-1">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('toolbar.filterTypeLabel')}</span>
                </div>
                {[
                  { label: t('toolbar.types.all'), value: "ALL" },
                  { label: t('toolbar.types.image'), value: "IMAGE" },
                  { label: t('toolbar.types.video'), value: "VIDEO" },
                  { label: t('toolbar.types.carousel'), value: "CAROUSEL" }
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      if (onFilterTypeChange) onFilterTypeChange(opt.value);
                      setIsFilterMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-between cursor-pointer border-none bg-transparent"
                  >
                    <span>{opt.label}</span>
                    {filterType === opt.value && <Check size={12} className="text-green-500" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="relative">
          <button 
            onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
            className={`w-10 h-10 flex items-center justify-center border rounded-xl transition-all cursor-pointer shadow-sm ${
              isMoreMenuOpen 
                ? "bg-[#0A0A0A] border-[#0A0A0A] text-white" 
                : "bg-white border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <MoreVertical size={16} />
          </button>
          
          {isMoreMenuOpen && (
            <>
              {/* Overlay backdrop to close menu when click outside */}
              <div 
                className="fixed inset-0 z-40 cursor-default" 
                onClick={() => setIsMoreMenuOpen(false)} 
              />
              
              {/* Floating Menu Container */}
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-gray-100 shadow-xl py-2.5 z-50 text-left animate-in fade-in slide-in-from-top-3 duration-200 font-medium">
                
                {/* 1. Calendar Zoom */}
                <div className="relative group/sub">
                  <button className="w-full px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-between group cursor-pointer transition-colors border-none bg-transparent">
                    <div className="flex items-center gap-3">
                      <ZoomIn size={14} className="text-gray-400 group-hover:text-gray-700" />
                      <span>{t('toolbar.calendarZoom')}</span>
                    </div>
                    <ChevronRight size={12} className="text-gray-400" />
                  </button>
                  {/* Submenu for Zoom */}
                  <div className="absolute left-full top-0 pl-1.5 hidden group-hover/sub:block animate-in fade-in slide-in-from-left-2 duration-150 z-50">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-xl py-2 w-48 text-left">
                      {[
                        { label: t('toolbar.zooms.small'), value: 80 },
                        { label: t('toolbar.zooms.medium'), value: 100 },
                        { label: t('toolbar.zooms.large'), value: 120 }
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            if (onRowHeightChange) onRowHeightChange(opt.value);
                            toast.success(t('toolbar.toasts.zoomLevelSet', { size: opt.value }));
                            setIsMoreMenuOpen(false);
                          }}
                          className="w-full px-4 py-2 text-[11px] font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-between cursor-pointer border-none bg-transparent"
                        >
                          <span>{opt.label}</span>
                          {rowHeight === opt.value && <Check size={12} className="text-green-500" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. Calendar View */}
                <div className="relative group/sub">
                  <button className="w-full px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-between group cursor-pointer transition-colors border-none bg-transparent">
                    <div className="flex items-center gap-3">
                      <CalendarIcon size={14} className="text-gray-400 group-hover:text-gray-700" />
                      <span>{t('toolbar.calendarView')}</span>
                    </div>
                    <ChevronRight size={12} className="text-gray-400" />
                  </button>
                  {/* Submenu for Views */}
                  <div className="absolute left-full top-0 pl-1.5 hidden group-hover/sub:block animate-in fade-in slide-in-from-left-2 duration-150 z-50">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-xl py-2 w-48 text-left">
                      {[
                        { label: t('toolbar.views.day'), value: "DAY" },
                        { label: t('toolbar.views.week'), value: "WEEK" },
                        { label: t('toolbar.views.month'), value: "MONTH" }
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            if (onCalendarViewModeChange) onCalendarViewModeChange(opt.value);
                            setIsMoreMenuOpen(false);
                            toast.success(t('toolbar.toasts.switchedTo', { view: opt.label }));
                          }}
                          className="w-full px-4 py-2 text-[11px] font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-between cursor-pointer border-none bg-transparent"
                        >
                          <span>{opt.label}</span>
                          {calendarViewMode === opt.value && <Check size={12} className="text-green-500 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. Social Calendars */}
                <div className="relative group/sub">
                  <button className="w-full px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-between group cursor-pointer transition-colors border-none bg-transparent">
                    <div className="flex items-center gap-3">
                      <Layers size={14} className="text-gray-400 group-hover:text-gray-700" />
                      <span>{t('toolbar.socialCalendars')}</span>
                    </div>
                    <ChevronRight size={12} className="text-gray-400" />
                  </button>
                  {/* Submenu for Social Channels toggling */}
                  <div className="absolute left-full top-0 pl-1.5 hidden group-hover/sub:block animate-in fade-in slide-in-from-left-2 duration-150 z-50">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-xl py-2 w-48 text-left">
                      {[
                        { label: "YouTube", key: "YOUTUBE" },
                        { label: "Facebook", key: "FACEBOOK" },
                        { label: "TikTok", key: "TIKTOK" },
                        { label: "Instagram", key: "INSTAGRAM" },
                        { label: "LinkedIn", key: "LINKEDIN" },
                        { label: "X / Twitter", key: "X" }
                      ].map(platform => (
                        <button
                          key={platform.key}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            togglePlatform(platform.key);
                          }}
                          className="w-full px-4 py-2 text-[11px] font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-between cursor-pointer border-none bg-transparent"
                        >
                          <span>{platform.label}</span>
                          {visiblePlatforms[platform.key] !== false && <Check size={12} className="text-green-500 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="my-1 border-t border-gray-100" />

                 <AccessGuard feature="IMPORT_CSV">
                  <button 
                    onClick={() => {
                      setIsWizardOpen(true);
                      setIsMoreMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-xs font-bold flex items-center gap-3 group transition-colors border-none bg-transparent text-gray-700 hover:bg-gray-50 cursor-pointer"
                  >
                    <RefreshCw size={14} className="text-gray-400 group-hover:text-gray-700" />
                    <span>{t('toolbar.syncImportExport')}</span>
                  </button>
                 </AccessGuard>

                <div className="my-1 border-t border-gray-100" />

                {/* 6. Preview feed */}
                <button 
                  onClick={() => {
                    setIsPreviewFeedOpen(true);
                    setIsMoreMenuOpen(false);
                  }}
                  className="w-full px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-3 group cursor-pointer transition-colors border-none bg-transparent"
                >
                  <Instagram size={14} className="text-gray-400 group-hover:text-gray-700" />
                  <span>{t('toolbar.previewFeed')}</span>
                </button>

                {/* 7. Notifications */}
                <button 
                  onClick={() => {
                    navigate("/settings?tab=account");
                    setIsMoreMenuOpen(false);
                  }}
                  className="w-full px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-3 group cursor-pointer transition-colors border-none bg-transparent"
                >
                  <Settings size={14} className="text-gray-400 group-hover:text-gray-700" />
                  <span>{t('toolbar.notifications')}</span>
                </button>

              </div>
            </>
          )}
        </div>
      </div>
      </div>

      {/* Row 2: Platforms, Media, Create Post */}
      <div className="flex items-center gap-3">
        {/* Best Times Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setIsBestTimesOpen(!isBestTimesOpen)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all cursor-pointer shadow-sm"
          >
            {/* Display selected platform color and icon */}
            <div 
              style={{ backgroundColor: PLATFORM_DETAILS[bestTimePlatform]?.color || '#FF0000' }}
              className="w-4 h-4 rounded-sm flex items-center justify-center shrink-0"
            >
              {PLATFORM_DETAILS[bestTimePlatform]?.icon(10)}
            </div>
            <span className="capitalize">{PLATFORM_DETAILS[bestTimePlatform] ? PLATFORM_DETAILS[bestTimePlatform].label : t('toolbar.bestTimes')}</span>
            <ChevronDown size={14} className="text-gray-400" />
          </button>
          
          {isBestTimesOpen && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-40 cursor-default" 
                onClick={() => setIsBestTimesOpen(false)} 
              />
              {/* Menu */}
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl border border-gray-100 shadow-xl py-2 z-50 text-left animate-in fade-in slide-in-from-top-3 duration-200">
                <div className="px-4 py-1.5 border-b border-gray-100 mb-1">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest font-mono">{t('toolbar.selectHeatmapPlatform')}</span>
                </div>
                {Object.keys(PLATFORM_DETAILS).map(key => {
                  const detail = PLATFORM_DETAILS[key];
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        if (onBestTimePlatformChange) onBestTimePlatformChange(key);
                        setIsBestTimesOpen(false);
                        toast.success(t('toolbar.toasts.showingBestTimes', { platform: detail.label }));
                      }}
                      className="w-full px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-between cursor-pointer border-none bg-transparent"
                    >
                      <div className="flex items-center gap-2.5">
                        <div 
                          style={{ backgroundColor: detail.color }}
                          className="w-4 h-4 rounded-sm flex items-center justify-center shrink-0"
                        >
                          {detail.icon(9)}
                        </div>
                        <span>{detail.label}</span>
                      </div>
                      {bestTimePlatform === key && <Check size={12} className="text-green-500" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Media/Photo Button */}
        <button 
          onClick={onToggleSidebar}
          className={`w-10 h-10 flex items-center justify-center border rounded-xl transition-all cursor-pointer shadow-sm ${
            showSidebar 
              ? "bg-[#0A0A0A] border-[#0A0A0A] text-white hover:bg-black" 
              : "bg-[#F3EFE9] border-gray-200/50 text-gray-700 hover:bg-[#EAE5DF]"
          }`}
        >
          <Image size={18} />
        </button>

        <AccessGuard feature="CREATE_POSTS">
          <button 
            onClick={onCreatePostClick} data-testid="planner-create-post-btn"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold bg-[#0A0A0A] hover:bg-[#1A1A1A] text-white hover:scale-[1.02] active:scale-[0.98] cursor-pointer transition-all shadow-md"
          >
            <Plus size={16} />
            <span>{t('toolbar.createPost')}</span>
          </button>
        </AccessGuard>
      </div>


      {/* Feed Preview Dialog */}
      {isPreviewFeedOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col relative h-[650px] border border-gray-100">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <span className="text-xs font-black text-gray-800 uppercase tracking-wider">{t('toolbar.feedPreviewTitle')}</span>
              <button 
                onClick={() => setIsPreviewFeedOpen(false)}
                className="text-xs font-bold text-gray-400 hover:text-black hover:bg-gray-100 px-3 py-1 rounded-xl transition-all cursor-pointer border-none bg-transparent"
              >
                {t('toolbar.close')}
              </button>
            </div>

            {/* Instagram Phone mock container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white flex flex-col">
              {/* Instagram header profile info mock */}
              <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-fuchsia-600 p-[2px]">
                  <div className="w-full h-full rounded-full bg-white p-[2px]">
                    <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center font-bold text-xs text-gray-700 uppercase">
                      {activeBrand?.name ? activeBrand.name.substring(0, 2).toUpperCase() : 'PC'}
                    </div>
                  </div>
                </div>
                <div>
                  <h5 className="text-[11px] font-black text-[#0A0A0A] leading-tight">
                    {activeBrand?.name ? activeBrand.name.toLowerCase().replace(/\s+/g, '_') : 'publicast_creator'}
                  </h5>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{t('toolbar.feedMockup')}</p>
                </div>
              </div>

              {/* Feed Grid (3 columns) */}
              <div className="grid grid-cols-3 gap-1">
                {postData.length === 0 ? (
                  <div className="col-span-3 py-12 text-center flex flex-col items-center justify-center text-gray-300">
                    <Instagram size={36} className="mb-2 stroke-[1.5]" />
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('toolbar.noScheduledPosts')}</p>
                  </div>
                ) : (
                  postData.map(post => {
                    const hasMedia = post.mediaUrls && post.mediaUrls.length > 0;
                    return (
                      <div 
                        key={post.id} 
                        className="aspect-square bg-gray-50 border border-gray-100/50 relative overflow-hidden group cursor-pointer rounded-md"
                        title={post.caption || post.title}
                      >
                        <PostMediaThumbnail 
                          thumbnail={post.thumbnail}
                          mediaUrls={post.mediaUrls}
                          className="w-full h-full group-hover:scale-105 transition-all duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Eye size={16} className="text-white animate-pulse" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
      
      {/* Unified Import/Export Wizard Dialog */}
      <DataIntegrationWizard 
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onRefreshData={fetchPosts}
      />
    </>
  );
}
