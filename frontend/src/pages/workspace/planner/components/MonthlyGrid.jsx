import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { buildMediaUrl } from '@/utils/url';
import { PlatformIcon } from '@/components/shared/PlatformIcon';

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

const STATUS_COLORS = {
  published: "bg-green-50 text-green-700 border-green-100",
  scheduled: "bg-blue-50 text-blue-700 border-blue-100",
  draft: "bg-muted text-muted-foreground border-border",
  rejected: "bg-red-50 text-red-700 border-red-100",
  pending_approval: "bg-amber-50 text-amber-700 border-amber-100",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-100",
  failed: "bg-rose-50 text-rose-700 border-rose-100"
};

const renderPlatformIcon = (platformName, sizeClass = "w-3 h-3") => {
  let size = 12;
  if (sizeClass.includes("w-2.5")) size = 10;
  if (sizeClass.includes("w-3")) size = 12;
  if (sizeClass.includes("w-4")) size = 16;
  return <PlatformIcon platform={platformName} size={size} />;
};

export function MonthlyGrid({
  selectedDate,
  postData = [],
  eventsData = [],
  onCellClick,
  onPostClick,
  onDuplicateClick,
  visiblePlatforms = {}
}) {
  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Group events by date string 'yyyy-MM-dd'
  const eventsByDate = useMemo(() => {
    const map = {};
    eventsData.forEach(event => {
      if (!event.eventDate) return;
      const date = new Date(event.eventDate);
      const dateStr = format(date, 'yyyy-MM-dd');
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(event);
    });
    return map;
  }, [eventsData]);

  // Group posts by local date string 'yyyy-MM-dd'
  const postsByDate = useMemo(() => {
    const map = {};
    postData.forEach(post => {
      // Filter out posts that do not match the visible platforms
      const matchesPlatform = !post.platforms || post.platforms.length === 0 || post.platforms.some(p => visiblePlatforms[p.toUpperCase()] !== false);
      if (!matchesPlatform) return;

      const date = new Date(post.scheduledAt || post.createdAt);
      const dateStr = format(date, 'yyyy-MM-dd');
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(post);
    });
    return map;
  }, [postData, visiblePlatforms]);

  // Generate 42 days grid for Month view
  const daysInMonthGrid = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    
    // Set to the first Sunday of the grid
    const start = new Date(firstDay);
    start.setDate(start.getDate() - start.getDay());
    
    const grid = [];
    const temp = new Date(start);
    
    for (let i = 0; i < 42; i++) {
      const d = new Date(temp);
      const isCurrentMonth = d.getMonth() === month;
      const isToday = d.getDate() === new Date().getDate() &&
                      d.getMonth() === new Date().getMonth() &&
                      d.getFullYear() === new Date().getFullYear();
      const dateStr = format(d, 'yyyy-MM-dd');
      
      grid.push({
        date: d.getDate(),
        fullStr: dateStr,
        isCurrentMonth,
        isToday,
        raw: d
      });
      temp.setDate(temp.getDate() + 1);
    }
    return grid;
  }, [selectedDate]);

  const handleDateClick = (dateRaw) => {
    if (onCellClick) {
      const newDate = new Date(dateRaw);
      newDate.setHours(9, 0, 0, 0); // Default to 9:00 AM
      onCellClick(newDate, 9);
    }
  };

  const handlePostClick = (e, post) => {
    e.stopPropagation();
    if (onPostClick) {
      onPostClick(post);
    }
  };

  return (
    <div className="w-full h-full bg-card border border-border rounded-3xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/40 py-3 text-center no-print">
        {weekdayNames.map((dayName, idx) => (
          <div key={idx} className="text-[11px] font-black text-muted-foreground uppercase tracking-wider">
            {dayName.slice(0, 3)}
          </div>
        ))}
      </div>

      {/* 42 Days Grid */}
      <div className="grid grid-cols-7 flex-1 divide-x divide-y divide-border bg-muted/20 overflow-y-auto">
        {daysInMonthGrid.map((day, idx) => {
          const cellPosts = postsByDate[day.fullStr] || [];
          const cellEvents = eventsByDate[day.fullStr] || [];
          
          return (
            <div
              key={idx}
              onClick={() => handleDateClick(day.raw)}
              className={`min-h-[125px] p-2 flex flex-col gap-1 transition-all hover:bg-muted/70 cursor-pointer relative group/cell ${
                day.isCurrentMonth ? "bg-card text-foreground" : "bg-muted/50 text-muted-foreground"
              }`}
            >
              {/* Quick Add '+' button indicator on cell hover */}
              <div 
                className="absolute top-2 right-2 opacity-0 group-hover/cell:opacity-100 transition-all duration-200 z-20 pointer-events-none"
              >
                <div className="w-5 h-5 bg-foreground text-background rounded-full flex items-center justify-center shadow-md text-xs font-black">
                  +
                </div>
              </div>

              {/* Day number */}
              <div className="flex justify-between items-center mb-1 pr-6">
                <span className={`text-[11px] font-black w-6 h-6 flex items-center justify-center rounded-full ${
                  day.isToday 
                    ? "bg-[#10B981] text-white shadow-sm" 
                    : day.isCurrentMonth ? "text-foreground" : "text-muted-foreground"
                }`}>
                  {day.date}
                </span>
                {(cellPosts.length > 0 || cellEvents.length > 0) && (
                  <span className="text-[9px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full shrink-0">
                    {cellPosts.length + cellEvents.length} items
                  </span>
                )}
              </div>

              {/* Day Events (Holidays) List */}
              {cellEvents.length > 0 && (
                <div className="flex flex-col gap-0.5 z-10">
                  {cellEvents.map(event => (
                    <div 
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Mở composer kèm gợi ý tên event
                        if (onCellClick) {
                          const eventDate = new Date(day.raw);
                          eventDate.setHours(9, 0, 0, 0);
                          onCellClick(eventDate, 9);
                        }
                      }}
                      className="px-1.5 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded text-[9px] font-black tracking-tight truncate flex items-center gap-1 shadow-sm hover:bg-rose-500/20 transition-colors"
                      title={event.description || event.title}
                    >
                      <span className="shrink-0 text-[10px]">📅</span>
                      <span className="truncate">{event.title}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Day Posts List */}
              <div className="flex-1 overflow-y-auto flex flex-col gap-1 max-h-[85px] scrollbar-none">
                {cellPosts.map(post => (
                  <div
                    key={post.id}
                    onClick={(e) => handlePostClick(e, post)}
                    className={`flex items-center gap-1.5 px-2 py-1 border rounded-lg text-[10px] font-bold truncate transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-sm group/mcard ${
                      STATUS_COLORS[post.status?.toLowerCase()] || 'bg-card border-border text-foreground'
                    }`}
                    title={`${post.title || post.caption || "Untitled"} (${format(new Date(post.scheduledAt || post.createdAt), 'h:mma')})`}
                  >
                    {/* Platform icon */}
                    <div className="flex gap-0.5 shrink-0">
                      {post.platforms?.map(p => (
                        <span key={p} className="shrink-0">
                          {renderPlatformIcon(p, "w-2.5 h-2.5")}
                        </span>
                      ))}
                    </div>
                    
                    <span className="truncate flex-1 font-medium">{post.title || post.caption || "Untitled"}</span>
                    <span className="text-[8px] opacity-75 font-black uppercase font-mono tracking-tight shrink-0 group-hover/mcard:hidden">
                      {format(new Date(post.scheduledAt || post.createdAt), 'h:mma')}
                    </span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDuplicateClick) onDuplicateClick(post);
                      }}
                      title="Nhân bản bài viết"
                      className="hidden group-hover/mcard:flex items-center justify-center p-0.5 hover:bg-muted rounded text-indigo-500 transition-colors cursor-pointer border-none shadow-none shrink-0"
                    >
                      <span className="text-[9px]">🔂</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
