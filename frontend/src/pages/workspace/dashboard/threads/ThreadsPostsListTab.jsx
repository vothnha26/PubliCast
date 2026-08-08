import React from "react";
import { useTranslation } from "react-i18next";
import { GenericPostsListTab } from "../common/GenericPostsListTab";

export function ThreadsPostsListTab({
  publishedVideos = [],
  isPublishedLoading = false,
  pageSize = 5,
  setPageSize = () => {},
  fetchPublishedVideos = () => {},
  prevPageToken = null,
  nextPageToken = null,
  onRowClick = null,
}) {
  const { t } = useTranslation("dashboard");

  // Columns configuration for Threads Posts list
  const columns = [
    {
      header: "Post",
      renderCell: (item) => {
        const url = item.mediaUrl || item.thumbnailUrl;
        return (
          <div className="flex items-center gap-4">
            {url ? (
              <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden relative shadow-sm border border-border shrink-0">
                <img src={url} alt="" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center text-foreground font-black text-sm shrink-0 border border-border">
                T
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-sm font-bold text-foreground line-clamp-2 max-w-[280px]">
                {item.message || "No content message"}
              </span>
            </div>
          </div>
        );
      }
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
      )
    },
    {
      header: "Reach",
      renderCell: (item) => {
        const val = item.reach ?? item.views ?? item.viewsCount;
        return <span className="text-xs font-bold text-foreground">{val !== null && val !== undefined ? val.toLocaleString() : "—"}</span>;
      }
    },
    {
      header: "Views",
      renderCell: (item) => {
        const val = item.views ?? item.viewsCount;
        return <span className="text-xs font-bold text-foreground">{val !== null && val !== undefined ? val.toLocaleString() : "—"}</span>;
      }
    },
    {
      header: "Engagement",
      renderCell: (item) => (
        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
          {item.engagement !== null && item.engagement !== undefined ? `${Number(item.engagement).toFixed(1)}%` : "0.0%"}
        </span>
      )
    },
    {
      header: "Likes",
      renderCell: (item) => <span className="text-xs text-muted-foreground font-semibold">{(item.reactions ?? item.likes ?? item.likeCount ?? 0).toLocaleString()}</span>
    },
    {
      header: "Replies",
      renderCell: (item) => <span className="text-xs text-muted-foreground font-semibold">{(item.comments ?? item.replies ?? item.replyCount ?? 0).toLocaleString()}</span>
    },
    {
      header: "Reposts",
      renderCell: (item) => <span className="text-xs text-muted-foreground font-semibold">{(item.shares ?? item.reposts ?? item.repostCount ?? 0).toLocaleString()}</span>
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
      searchPlaceholder={t("growth.searchPlaceholder", "Search posts...")}
      searchKeys={["message"]}
      footerMessage={t("growth.footerMessage", "Displaying latest published posts")}
      onRowClick={onRowClick}
    />
  );
}
