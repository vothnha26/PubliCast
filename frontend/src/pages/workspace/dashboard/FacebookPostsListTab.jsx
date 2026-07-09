import React from "react";
import { GenericPostsListTab } from "./GenericPostsListTab";

export function FacebookPostsListTab({
  publishedVideos = [],
  isPublishedLoading = false,
  pageSize = 5,
  setPageSize = () => {},
  fetchPublishedVideos = () => {},
  prevPageToken = null,
  nextPageToken = null,
  onRowClick = null,
}) {
  // Columns configuration for Facebook Posts list
  const columns = [
    {
      header: "Post",
      renderCell: (item) => (
        <div className="flex items-center gap-4">
          {item.picture ? (
            <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden relative shadow-sm border border-gray-100 shrink-0">
              <img src={item.picture} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 font-black text-sm shrink-0 border border-blue-100">
              f
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-sm font-bold text-[#0A0A0A] line-clamp-2 max-w-[280px]">
              {item.message || "No content message"}
            </span>
          </div>
        </div>
      )
    },
    {
      header: "Date",
      renderCell: (item) => (
        <div className="flex flex-col">
          <span className="text-xs font-bold text-[#0A0A0A]">
            {new Date(item.date).toLocaleDateString()}
          </span>
          <span className="text-[10px] text-gray-400">
            {new Date(item.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      )
    },
    {
      header: "Reach",
      renderCell: (item) => <span className="text-xs font-bold text-gray-800">{(item.reach || 0).toLocaleString()}</span>
    },
    {
      header: "Views",
      renderCell: (item) => <span className="text-xs font-bold text-gray-800">{(item.views || 0).toLocaleString()}</span>
    },
    {
      header: "Engagement",
      renderCell: (item) => (
        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700">
          {(item.engagement || 0).toFixed(1)}%
        </span>
      )
    },
    {
      header: "Reactions",
      renderCell: (item) => <span className="text-xs text-gray-500 font-semibold">{(item.reactions || 0).toLocaleString()}</span>
    },
    {
      header: "Comments",
      renderCell: (item) => <span className="text-xs text-gray-500 font-semibold">{(item.comments || 0).toLocaleString()}</span>
    },
    {
      header: "Shares",
      renderCell: (item) => <span className="text-xs text-gray-500 font-semibold">{(item.shares || 0).toLocaleString()}</span>
    },
    {
      header: "Clicks",
      renderCell: (item) => <span className="text-xs text-gray-500 font-semibold">{(item.clicks || 0).toLocaleString()}</span>
    }
  ];

  return (
    <GenericPostsListTab
      posts={publishedVideos}
      isLoading={isPublishedLoading}
      pageSize={pageSize}
      setPageSize={setPageSize}
      fetchPublishedVideos={fetchPublishedVideos}
      prevPageToken={prevPageToken}
      nextPageToken={nextPageToken}
      columns={columns}
      searchPlaceholder="Search posts..."
      searchKeys={["message"]}
      footerMessage="Showing latest Facebook posts"
      onRowClick={onRowClick}
    />
  );
}
