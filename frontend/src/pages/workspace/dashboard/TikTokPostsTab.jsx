import React from "react";
import { GenericDashboardTab } from "./GenericDashboardTab";
import { GenericPostsListTab } from "./GenericPostsListTab";

export function TikTokPostsTab({
  realData = {},
  dateRange,
  publishedVideos = [],
  isPublishedLoading = false,
  pageSize = 5,
  setPageSize = () => {},
  fetchPublishedVideos = () => {},
  onVideoClick = null
}) {
  // Filter videos based on selected date range
  const filteredVideos = React.useMemo(() => {
    if (!dateRange || !dateRange.from) return publishedVideos;
    
    const fromDate = new Date(dateRange.from);
    fromDate.setHours(0, 0, 0, 0);

    const toDate = dateRange.to ? new Date(dateRange.to) : new Date();
    toDate.setHours(23, 59, 59, 999);

    return publishedVideos.filter(video => {
      const pubDate = new Date(video.publishedAt);
      return pubDate >= fromDate && pubDate <= toDate;
    });
  }, [publishedVideos, dateRange]);

  // Generate daily timeline chart data based on selected date range
  const chartData = React.useMemo(() => {
    if (!dateRange || !dateRange.from) {
      return [...filteredVideos]
        .sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt))
        .map(video => ({
          name: new Date(video.publishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          views: video.views || 0,
          likes: video.likes || 0,
          comments: video.comments || 0,
          shares: video.shares || 0,
          totalContent: 1
        }));
    }

    const start = new Date(dateRange.from);
    const end = dateRange.to ? new Date(dateRange.to) : new Date();
    
    const dailyMap = {};
    const current = new Date(start);
    while (current <= end) {
      // Format as YYYY-MM-DD in local time zone
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      dailyMap[dateStr] = {
        name: current.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        totalContent: 0
      };
      current.setDate(current.getDate() + 1);
    }

    // Populate daily stats from filtered videos
    filteredVideos.forEach(video => {
      const pubDate = new Date(video.publishedAt);
      const year = pubDate.getFullYear();
      const month = String(pubDate.getMonth() + 1).padStart(2, '0');
      const day = String(pubDate.getDate()).padStart(2, '0');
      const pubDateStr = `${year}-${month}-${day}`;

      if (dailyMap[pubDateStr]) {
        dailyMap[pubDateStr].views += video.views || 0;
        dailyMap[pubDateStr].likes += video.likes || 0;
        dailyMap[pubDateStr].comments += video.comments || 0;
        dailyMap[pubDateStr].shares += video.shares || 0;
        dailyMap[pubDateStr].totalContent += 1;
      }
    });

    return Object.keys(dailyMap).sort().map(dateStr => dailyMap[dateStr]);
  }, [filteredVideos, dateRange]);

  // Calculate real totals from filtered videos
  const totalViews = filteredVideos.reduce((sum, v) => sum + (v.views || 0), 0);
  const totalLikes = filteredVideos.reduce((sum, v) => sum + (v.likes || 0), 0);
  const totalComments = filteredVideos.reduce((sum, v) => sum + (v.comments || 0), 0);
  const totalShares = filteredVideos.reduce((sum, v) => sum + (v.shares || 0), 0);
  const totalPosts = filteredVideos.length;

  // Views Configuration
  const viewsConfig = [
    {
      key: "views",
      label: "Views",
      color: "bg-[#8E9BEE] text-white",
      chartColor: "#8E9BEE",
      type: "area",
      value: totalViews.toLocaleString()
    },
    {
      key: "totalContent",
      label: "Posts",
      color: "bg-[#E6A34A] text-white",
      chartColor: "#E6A34A",
      type: "bar",
      yAxisId: "right",
      value: totalPosts
    }
  ];

  // Interactions Configuration
  const interactionsConfig = [
    {
      key: "likes",
      label: "Likes",
      color: "bg-[#7EB299] text-white",
      chartColor: "#7EB299",
      type: "area",
      value: totalLikes.toLocaleString()
    },
    {
      key: "comments",
      label: "Comments",
      color: "bg-[#F472B6] text-white",
      chartColor: "#F472B6",
      type: "line",
      value: totalComments.toLocaleString()
    },
    {
      key: "shares",
      label: "Shares",
      color: "bg-[#C084FC] text-white",
      chartColor: "#C084FC",
      type: "line",
      value: totalShares.toLocaleString()
    },
    {
      key: "totalContent",
      label: "Posts",
      color: "bg-[#E6A34A] text-white",
      chartColor: "#E6A34A",
      type: "bar",
      yAxisId: "right",
      value: totalPosts
    }
  ];

  // Post List columns definition
  const columns = [
    {
      header: "Post",
      renderCell: (post) => (
        <div className="flex items-center gap-4">
          {post.thumbnailUrl ? (
            <img src={post.thumbnailUrl} className="w-12 h-12 rounded-lg object-cover border border-border shrink-0" alt="Thumbnail" />
          ) : (
            <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center text-white shrink-0 border border-gray-800 font-black text-xs">
              TikTok
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-sm font-bold text-foreground line-clamp-2 max-w-[300px]">
              {post.title || post.caption || "No content message"}
            </span>
            {post.shareUrl && (
              <a 
                href={post.shareUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-[10px] text-red-600 hover:text-red-800 font-bold mt-1 inline-flex items-center gap-1 hover:underline w-fit"
              >
                <span>Xem trên TikTok</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
              </a>
            )}
          </div>
        </div>
      )
    },
    {
      header: "Date",
      renderCell: (post) => (
        <div className="flex flex-col">
          <span className="text-xs font-bold text-foreground">
            {new Date(post.publishedAt || post.date).toLocaleDateString()}
          </span>
          <span className="text-[10px] text-muted-foreground font-medium">
            {new Date(post.publishedAt || post.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )
    },
    {
      header: "Views",
      renderCell: (post) => <span className="text-xs font-bold text-foreground">{(post.views || 0).toLocaleString()}</span>
    },
    {
      header: "Likes",
      renderCell: (post) => <span className="text-xs text-muted-foreground font-semibold">{(post.likes || 0).toLocaleString()}</span>
    },
    {
      header: "Comments",
      renderCell: (post) => <span className="text-xs text-muted-foreground font-semibold">{(post.comments || 0).toLocaleString()}</span>
    },
    {
      header: "Shares",
      renderCell: (post) => <span className="text-xs text-muted-foreground font-semibold">{(post.shares || 0).toLocaleString()}</span>
    }
  ];

  return (
    <div className="space-y-6">
      <GenericDashboardTab
        title="Views"
        description="Lượt xem video trong khoảng thời gian đã chọn"
        data={chartData}
        metricConfig={viewsConfig}
      />

      <GenericDashboardTab
        title="Interactions"
        description="Lượt thích, bình luận và chia sẻ của các bài đăng"
        data={chartData}
        metricConfig={interactionsConfig}
      />

      <GenericPostsListTab
        posts={filteredVideos}
        isLoading={isPublishedLoading}
        pageSize={pageSize}
        setPageSize={setPageSize}
        fetchPublishedVideos={fetchPublishedVideos}
        columns={columns}
        searchPlaceholder="Search posts..."
        searchKeys={["title", "caption"]}
        onRowClick={onVideoClick}
      />
    </div>
  );
}
