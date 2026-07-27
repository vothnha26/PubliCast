import React from "react";
import { PlayCircle } from "lucide-react";
import { GenericPostsListTab } from "./GenericPostsListTab";

export function PublishedVideosTab({
  publishedVideos = [],
  isPublishedLoading = false,
  prevPageToken = null,
  nextPageToken = null,
  pageSize = 5,
  setPageSize = () => {},
  fetchPublishedVideos = () => {},
  onVideoClick = () => {}
}) {
  // Columns config for YouTube videos
  const columns = [
    {
      header: "Video",
      renderCell: (item) => (
        <div className="flex items-center gap-4">
          <div className="w-16 h-10 bg-gray-100 rounded-lg overflow-hidden relative shadow-sm border border-gray-100 shrink-0">
            <img src={item.thumbnailUrl} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all cursor-pointer">
              <PlayCircle size={16} className="text-white" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-[#0A0A0A] truncate max-w-[200px]">{item.title}</span>
          </div>
        </div>
      )
    },
    {
      header: "Status",
      renderCell: (item) => (
        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-green-100 text-green-700">
          {item.status}
        </span>
      )
    },
    {
      header: "Date",
      renderCell: (item) => (
        <div className="flex flex-col">
          <span className="text-xs font-bold text-[#0A0A0A]">
            {new Date(item.publishedAt).toLocaleDateString()}
          </span>
          <span className="text-[10px] text-gray-400">
            {new Date(item.publishedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      )
    },
    {
      header: "Views",
      renderCell: (item) => (
        <span className="text-sm font-bold text-[#0A0A0A]">
          {parseInt(item.views || 0).toLocaleString()}
        </span>
      )
    },
    {
      header: "Likes",
      renderCell: (item) => (
        <span className="text-xs text-gray-500 font-semibold">
          {parseInt(item.likes || 0).toLocaleString()}
        </span>
      )
    },
    {
      header: "Comments",
      renderCell: (item) => (
        <span className="text-xs text-gray-500 font-semibold">
          {parseInt(item.comments || 0).toLocaleString()}
        </span>
      )
    }
  ];

  return (
    <GenericPostsListTab
      posts={publishedVideos}
      isLoading={isPublishedLoading}
      pageSize={pageSize}
      setPageSize={setPageSize}
      prevPageToken={prevPageToken}
      nextPageToken={nextPageToken}
      fetchPublishedVideos={fetchPublishedVideos}
      columns={columns}
      searchPlaceholder="Search videos..."
      searchKeys={["title"]}
      emptyStateTitle="No videos found."
      footerMessage="Showing latest videos from your channel"
      onRowClick={onVideoClick}
    />
  );
}
