import React, { useEffect, useRef, useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { buildMediaUrl } from '@/utils/url';
import { PlatformIcon } from '@/components/shared/PlatformIcon';
import { PostMediaThumbnail } from '@/components/shared/PostMediaThumbnail';

const PLATFORM_COLORS = {
  YOUTUBE: "#FF0000",
  FACEBOOK: "#1877F2",
  TIKTOK: "#010101",
  INSTAGRAM: "#E1306C",
  TWITCH: "#9146FF",
  THREADS: "#000000",
  X: "#000000",
  TWITTER: "#000000"
};

const renderPlatformIcon = (platformName, sizeClass = "w-3.5 h-3.5") => {
  let size = 14;
  if (sizeClass.includes("w-2.5")) size = 10;
  if (sizeClass.includes("w-3.5")) size = 14;
  if (sizeClass.includes("w-4")) size = 16;
  return <PlatformIcon platform={platformName} size={size} />;
};

export function WeeklyGrid({
  selectedDate,
  groupedPosts,
  currentTime,
  onCellClick,
  onPostClick,
  onDuplicateClick,
  onDetailClick,
  onCellDrop,
  rowHeight = 100,
  eventsData = [],
  viewMode = 'WEEK'
}) {
  const gridContainerRef = useRef(null);

  // Group events by date string 'yyyy-MM-dd'
  const eventsByDate = useMemo(() => {
    const map = {};
    if (Array.isArray(eventsData)) {
      eventsData.forEach(event => {
        if (!event.eventDate) return;
        const dateObj = new Date(event.eventDate);
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        if (!map[dateStr]) map[dateStr] = [];
        map[dateStr].push(event);
      });
    }
    return map;
  }, [eventsData]);

  // Generate the days of the selected view (1 day for DAY mode, 7 days for WEEK mode)
  const days = useMemo(() => {
    if (viewMode === 'DAY') {
      const d = new Date(selectedDate);
      const isSelected = true;
      const isToday = d.getDate() === new Date().getDate() &&
                      d.getMonth() === new Date().getMonth() &&
                      d.getFullYear() === new Date().getFullYear();
      
      return [{
        name: d.toLocaleDateString('en-US', { weekday: 'long' }),
        shortName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        date: d.getDate(),
        month: d.getMonth() + 1,
        full: (() => {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        })(),
        isSelected,
        isToday,
        raw: d
      }];
    }

    const startOfWeek = new Date(selectedDate);
    const day = startOfWeek.getDay();
    // Set to Sunday of that week
    startOfWeek.setDate(startOfWeek.getDate() - day);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const isSelected = d.getDate() === selectedDate.getDate() &&
                         d.getMonth() === selectedDate.getMonth() &&
                         d.getFullYear() === selectedDate.getFullYear();
      
      const isToday = d.getDate() === new Date().getDate() &&
                      d.getMonth() === new Date().getMonth() &&
                      d.getFullYear() === new Date().getFullYear();

      return {
        name: d.toLocaleDateString('en-US', { weekday: 'long' }),
        shortName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        date: d.getDate(),
        month: d.getMonth() + 1,
        full: (() => {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        })(),
        isSelected,
        isToday,
        raw: d
      };
    });
  }, [selectedDate, viewMode]);

  // Generate 24 hours
  const hours = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => {
      const ampm = i >= 12 ? 'pm' : 'am';
      const displayHour = i === 0 ? 12 : i > 12 ? i - 12 : i;
      return {
        label: `${displayHour}:00${ampm}`,
        value: i
      };
    });
  }, []);

  // Time line offset position (based on current time)
  const timeLineOffset = useMemo(() => {
    const isThisWeek = days.some(d => d.isToday);
    if (!isThisWeek) return null;

    const hour = currentTime.getHours();
    const minute = currentTime.getMinutes();
    // Each hour row is rowHeight px height
    return (hour * rowHeight) + (minute / 60) * rowHeight;
  }, [currentTime, days, rowHeight]);

  // Scroll to starting hour on load (e.g. 8:00am is index 8)
  useEffect(() => {
    if (gridContainerRef.current) {
      // 8:00am starts at 8 * rowHeight
      gridContainerRef.current.scrollTop = 8 * rowHeight;
    }
  }, [rowHeight]);

  return (
    <div className="w-full h-full bg-card border border-border rounded-3xl shadow-sm overflow-hidden flex flex-col">
      {/* Days Header */}
      <div className="flex border-b border-border bg-card shrink-0 no-print">
        {/* Time column spacer */}
        <div className="w-20 shrink-0 border-r border-border bg-muted/20" />
        
        {days.map((day, idx) => {
          const dayEvents = eventsByDate[day.full] || [];

          return (
            <div 
              key={idx} 
              className="flex-1 py-3 flex flex-col items-center justify-center border-l border-border first:border-l-0 gap-1.5 min-h-[70px]"
            >
              {day.isToday ? (
                <div className="px-4 py-2 bg-[#10B981] text-white rounded-lg text-xs font-black uppercase tracking-wider shadow-sm animate-in zoom-in-95 duration-200">
                  {day.shortName} {day.month}/{day.date}
                </div>
              ) : (
                <div className={`text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer py-1.5 ${
                  day.isSelected 
                    ? "text-foreground border-b-2 border-foreground font-black" 
                    : "text-muted-foreground hover:text-foreground"
                }`}>
                  {day.shortName} {day.month}/{day.date}
                </div>
              )}

              {/* Tag ngày lễ */}
              {dayEvents.length > 0 && (
                <div className="flex flex-col gap-1 w-full px-2 max-w-[130px]">
                  {dayEvents.map(event => (
                    <div 
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onCellClick) {
                          const eventDate = new Date(day.raw);
                          eventDate.setHours(9, 0, 0, 0);
                          onCellClick(eventDate, 9);
                        }
                      }}
                      className="px-1.5 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded text-[9px] font-black tracking-tight truncate flex items-center justify-center gap-1 shadow-sm hover:bg-rose-500/20 transition-colors cursor-pointer"
                      title={event.description || event.title}
                    >
                      <span className="shrink-0">📅</span>
                      <span className="truncate">{event.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Scrollable Grid Body */}
      <div 
        ref={gridContainerRef}
        className="flex-1 overflow-y-auto relative scrollbar-none select-none pb-16"
        id="planner-grid"
      >
        {/* Current Time Indicator Line */}
        {timeLineOffset !== null && (
          <div 
            className="absolute left-20 right-0 h-px bg-red-500 z-30 pointer-events-none"
            style={{ top: `${timeLineOffset}px` }}
          >
            <div className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-red-500 rounded-full border-2 border-background shadow-sm" />
          </div>
        )}

        {/* 24 Hour Rows */}
        {hours.map((hour, hIdx) => (
          <div key={hIdx} className="flex border-b border-border group/row" style={{ minHeight: `${rowHeight}px` }}>
            {/* Time label cell */}
            <div className="w-20 shrink-0 flex items-start justify-center pt-3.5 border-r border-border bg-muted/20 no-print">
              <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-tighter">
                {hour.label}
              </span>
            </div>

            {/* Day columns for this hour */}
            {days.map((day, dIdx) => {
              const cellPosts = groupedPosts[`${day.full}-${hour.value}`] || [];

              return (
                <div 
                  key={dIdx} 
                  onClick={() => onCellClick(day.raw, hour.value)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const dataStr = e.dataTransfer.getData("text/plain");
                    if (dataStr) {
                      try {
                        const fileData = JSON.parse(dataStr);
                        if (fileData.source === 'google-drive' && onCellDrop) {
                          onCellDrop(day.raw, hour.value, fileData);
                        }
                      } catch (err) {
                        console.error('Failed to parse drag drop metadata:', err);
                      }
                    }
                  }}
                  className="flex-1 border-l border-border first:border-l-0 transition-all hover:bg-muted/50 cursor-pointer p-1.5 relative flex flex-col justify-start min-w-[100px] group/hcell"
                >
                  {/* Quick Add '+' indicator on cell hover */}
                  <div className="absolute top-1.5 right-1.5 opacity-0 group-hover/hcell:opacity-100 transition-opacity z-20 pointer-events-none">
                    <div className="w-4 h-4 bg-foreground text-background rounded-full flex items-center justify-center text-[10px] font-black shadow-sm">
                      +
                    </div>
                  </div>

                  {/* Scheduled Posts rendering */}
                  <div className="space-y-1.5 z-10 w-full">
                    {cellPosts.map(post => {
                      const displayTime = (post.publishedAt || post.scheduledAt) 
                        ? new Date(post.publishedAt || post.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) 
                        : '';
                      
                      const hasMedia = post.mediaUrls && post.mediaUrls.length > 0;
                      const isFailed = post.status?.toUpperCase() === 'FAILED';

                      const platform = post.platforms?.[0]?.toUpperCase() || 'YOUTUBE';

                      return (
                        <div 
                          key={post.id} 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onPostClick) onPostClick(post);
                          }}
                          style={{ borderLeftColor: PLATFORM_COLORS[platform] || '#9CA3AF' }}
                          className="bg-card border border-border hover:border-foreground/30 rounded-md p-2.5 shadow-sm transition-all border-l-[3.5px] text-left flex flex-col space-y-1.5 w-full group/card"
                        >
                          {/* Top Header Row */}
                          <div className="flex items-center justify-between relative">
                            {renderPlatformIcon(platform, "w-3.5 h-3.5")}
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight group-hover/card:hidden">
                                {displayTime}
                              </span>
                              {post.status?.toLowerCase() === "published" && onDetailClick && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDetailClick(post);
                                  }}
                                  title="Chi tiết bài đăng"
                                  className="hidden group-hover/card:flex items-center justify-center p-0.5 hover:bg-muted rounded text-emerald-600 transition-colors cursor-pointer border-none shadow-none bg-transparent"
                                >
                                  <BarChart3 size={11} />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onDuplicateClick) onDuplicateClick(post);
                                }}
                                title="Nhân bản bài viết"
                                className="hidden group-hover/card:flex items-center justify-center p-0.5 hover:bg-muted rounded text-indigo-500 transition-colors cursor-pointer border-none shadow-none"
                              >
                                <span className="text-[10px]">🔂</span>
                              </button>
                            </div>
                          </div>

                          {/* Title / Description */}
                          <div className="flex-1">
                            <p className={`text-[11px] font-medium leading-normal ${
                              isFailed 
                                ? "line-through decoration-red-500 decoration-1 text-muted-foreground" 
                                : "text-foreground"
                            } line-clamp-3`}>
                              {post.caption || post.title || "Untitled Post"}
                            </p>
                          </div>

                          {/* Media Preview/Thumbnail */}
                          {hasMedia && (
                            <div className="mt-1 flex items-center">
                              <div className="w-10 h-10 rounded-md overflow-hidden shrink-0 border border-border relative">
                                <PostMediaThumbnail 
                                  thumbnail={post.thumbnail}
                                  mediaUrls={post.mediaUrls}
                                  className="w-full h-full"
                                />
                                {/* Multi-media Indicator Overlay */}
                                {post.mediaUrls.length > 1 && (
                                  <div className="absolute inset-0 bg-black/45 flex items-center justify-center text-[9px] font-black text-white z-10">
                                    +{post.mediaUrls.length - 1}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Multi-platform target list */}
                          {post.platforms && post.platforms.length > 1 && (
                            <div className="flex -space-x-1.5 items-center pt-1 mt-1 border-t border-border">
                              {post.platforms.map((plt, pIdx) => (
                                <div 
                                  key={pIdx} 
                                  className="w-4 h-4 rounded-full bg-card border border-border flex items-center justify-center shrink-0 shadow-sm"
                                  title={plt}
                                >
                                  {renderPlatformIcon(plt, "w-2.5 h-2.5")}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
