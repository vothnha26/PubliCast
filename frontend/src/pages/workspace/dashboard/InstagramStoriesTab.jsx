import React, { useMemo } from "react";
import { GenericPostsListTab } from "./GenericPostsListTab";
import { GenericDashboardTab } from "./GenericDashboardTab";

export function InstagramStoriesTab({
  metrics,
  realData,
  publishedVideos = [],
  isPublishedLoading = false,
  pageSize = 5,
  setPageSize = () => {},
  fetchPublishedVideos = () => {},
  prevPageToken = null,
  nextPageToken = null,
  onVideoClick = null,
  communityGrowthData = []
}) {
  const displayStories = useMemo(() => {
    if (!publishedVideos || publishedVideos.length === 0) return [];
    const storiesOnly = publishedVideos.filter(p => {
      const type = (p.mediaType || p.type || "").toUpperCase();
      return type.includes("STORY") || type.includes("STORIES");
    });
    return storiesOnly.length > 0 ? storiesOnly : publishedVideos.slice(0, 3);
  }, [publishedVideos]);

  const totalStoriesCount = displayStories.length || 3;
  const totalImpressions = displayStories.reduce((acc, s) => acc + (s.impressions || s.views || 0), 0) || 0;
  const avgReachPerStory = totalStoriesCount > 0 ? Math.round((displayStories.reduce((acc, s) => acc + (s.reach || 0), 0) || 0) / totalStoriesCount) : 0;

  const storiesEvolutionConfig = [
    {
      key: "impressions",
      label: "Impressions",
      color: "bg-[#8E9BEE] text-white",
      chartColor: "#8E9BEE",
      type: "line",
      value: totalImpressions > 0 ? totalImpressions : "-"
    },
    {
      key: "reach",
      label: "Avg. reach per story",
      color: "bg-[#A7F3D0] text-foreground",
      chartColor: "#A7F3D0",
      type: "line",
      value: avgReachPerStory > 0 ? avgReachPerStory : "-"
    },
    {
      key: "stories",
      dataKey: "posts",
      label: "Stories",
      color: "bg-[#E6A34A] text-white",
      chartColor: "#E6A34A",
      type: "bar",
      yAxisId: "right",
      value: totalStoriesCount
    }
  ];

  // Columns configuration for List of stories
  const columns = [
    {
      header: "Story",
      renderCell: (item) => (
        <div className="flex items-center gap-4">
          {item.mediaUrl ? (
            <div className="w-10 h-16 bg-muted rounded-lg overflow-hidden relative shadow-sm border border-border shrink-0">
              <img src={item.mediaUrl} className="w-full h-full object-cover" alt="Story" />
            </div>
          ) : (
            <div className="w-10 h-16 bg-gradient-to-tr from-[#FCAF45] via-[#E1306C] to-[#C13584] rounded-lg flex items-center justify-center text-white font-black text-[10px] shrink-0 shadow-xs text-center p-1">
              Story
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-xs font-bold text-muted-foreground line-clamp-2 max-w-[240px]">
              {item.message || "Without text"}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: "Date",
      renderCell: (item) => (
        <div className="flex flex-col">
          <span className="text-xs font-bold text-foreground">
            {new Date(item.date).toLocaleDateString()}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {new Date(item.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      ),
    },
    {
      header: "Organic Reach",
      renderCell: (item) => <span className="text-xs font-bold text-foreground">{(item.reach || 0).toLocaleString()}</span>,
    },
    {
      header: "Paid Reach",
      renderCell: (item) => <span className="text-xs text-muted-foreground font-semibold">0</span>,
    },
    {
      header: "Impressions",
      renderCell: (item) => <span className="text-xs font-bold text-foreground">{(item.impressions || item.views || 0).toLocaleString()}</span>,
    },
    {
      header: "Organic Replies",
      renderCell: (item) => <span className="text-xs text-muted-foreground font-semibold">{(item.replies || 0).toLocaleString()}</span>,
    },
    {
      header: "Organic Taps back",
      renderCell: (item) => <span className="text-xs text-muted-foreground font-semibold">{(item.tapsBack || 0).toLocaleString()}</span>,
    },
    {
      header: "Organic Taps forward",
      renderCell: (item) => <span className="text-xs text-muted-foreground font-semibold">{(item.tapsForward || 0).toLocaleString()}</span>,
    },
    {
      header: "Organic Exits",
      renderCell: (item) => <span className="text-xs text-muted-foreground font-semibold">{(item.exits || 0).toLocaleString()}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Evolution Section */}
      <div className="space-y-6">
        <GenericDashboardTab
          title="Evolution"
          description=""
          data={communityGrowthData}
          metricConfig={storiesEvolutionConfig}
          watermark="publicast"
        />
      </div>

      {/* List of stories */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-foreground tracking-tight">List of stories</h2>
        <GenericPostsListTab
          posts={displayStories}
          isLoading={isPublishedLoading}
          pageSize={pageSize}
          setPageSize={setPageSize}
          fetchPublishedVideos={fetchPublishedVideos}
          prevPageToken={prevPageToken}
          nextPageToken={nextPageToken}
          columns={columns}
          searchPlaceholder="Search Stories..."
          searchKeys={["message"]}
          footerMessage="Showing Instagram Stories"
          onRowClick={onVideoClick}
        />
      </div>
    </div>
  );
}
