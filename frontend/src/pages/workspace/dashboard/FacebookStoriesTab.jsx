import React from "react";
import { ImageIcon, PlayCircle, ExternalLink } from "lucide-react";

// ─── Mock/empty data helper ─────────────────────────────────────────────────
function formatDuration(seconds) {
  if (!seconds) return "--";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatPercent(val) {
  if (val == null) return "--";
  return `${(val * 100).toFixed(1)}%`;
}

// ─── Story thumbnail placeholder ────────────────────────────────────────────
function StoryThumbnail({ story }) {
  if (story.mediaUrl || story.thumbnailUrl) {
    return (
      <div className="w-10 h-14 rounded-xl overflow-hidden shrink-0 border border-border shadow-sm bg-muted">
        <img
          src={story.thumbnailUrl || story.mediaUrl}
          className="w-full h-full object-cover"
          alt=""
        />
      </div>
    );
  }

  const isVideo = story.mediaType?.toUpperCase() === "VIDEO";
  return (
    <div className="w-10 h-14 rounded-xl shrink-0 border border-border shadow-sm bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 flex items-center justify-center">
      {isVideo ? (
        <PlayCircle size={16} className="text-indigo-300 dark:text-indigo-400" />
      ) : (
        <ImageIcon size={16} className="text-indigo-300 dark:text-indigo-400" />
      )}
    </div>
  );
}

// ─── Metric pill ─────────────────────────────────────────────────────────────
function MetricPill({ label, value, highlight = false }) {
  return (
    <div className="flex flex-col items-center px-3 py-1.5 rounded-xl bg-muted min-w-[64px]">
      <span
        className={`text-sm font-black ${
          highlight ? "text-indigo-600 dark:text-indigo-400" : "text-foreground"
        }`}
      >
        {value}
      </span>
      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
        {label}
      </span>
    </div>
  );
}

// ─── Completion bar ──────────────────────────────────────────────────────────
function CompletionBar({ rate }) {
  const pct = rate != null ? Math.min(100, rate * 100) : null;
  if (pct == null) return <span className="text-xs text-muted-foreground">--</span>;
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-purple-400"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] font-bold text-muted-foreground">{pct.toFixed(0)}%</span>
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────
function EmptyStories() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-indigo-950/50 dark:to-purple-900/50 flex items-center justify-center">
        <ImageIcon size={22} className="text-indigo-300 dark:text-indigo-400" />
      </div>
      <div className="text-center">
        <p className="text-sm font-bold text-muted-foreground">No stories found</p>
        <p className="text-xs text-muted-foreground mt-1">Stories will appear here after syncing</p>
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function StoriesSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map((n) => (
        <div key={n} className="flex items-center gap-4 p-4 rounded-2xl border border-border">
          <div className="w-10 h-14 rounded-xl bg-muted shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="w-32 h-3 bg-muted rounded" />
            <div className="w-20 h-2 bg-muted/60 rounded" />
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((x) => (
              <div key={x} className="w-14 h-10 bg-muted rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function FacebookStoriesTab({ realData = {}, isLoading = false, loading = false }) {
  const stories = realData.stories || [];
  const showSkeleton = isLoading || loading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          List of Stories
        </h3>
        <span className="text-[10px] font-bold text-muted-foreground">
          {stories.length} {stories.length === 1 ? "story" : "stories"}
        </span>
      </div>

      {/* Table card */}
      <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
        {showSkeleton ? (
          <div className="p-6">
            <StoriesSkeleton />
          </div>
        ) : stories.length === 0 ? (
          <EmptyStories />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-muted/50">
                <tr>
                  {[
                    "Story",
                    "Published",
                    "Reach",
                    "Impressions",
                    "Exits",
                    "Replies",
                    "Link Clicks",
                    "Completion",
                    "Exit Rate",
                  ].map((h, i) => (
                    <th
                      key={i}
                      className={`px-5 py-4 text-[9px] font-bold text-muted-foreground uppercase tracking-widest ${
                        i === 0 ? "text-left" : "text-center"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stories.map((story, idx) => (
                  <tr
                    key={story.platformStoryId || idx}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    {/* Story thumbnail + date */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <StoryThumbnail story={story} />
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">
                            {story.mediaType || "Image"}
                          </span>
                          <span className="text-[9px] text-muted-foreground mt-0.5">
                            {story.publishedAt
                              ? new Date(story.publishedAt).toLocaleDateString("vi-VN")
                              : "--"}
                          </span>
                          {story.expiresAt && (
                            <span className="text-[8px] text-muted-foreground">
                              Exp:{" "}
                              {new Date(story.expiresAt).toLocaleDateString("vi-VN")}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Published date */}
                    <td className="px-5 py-3 text-center">
                      <span className="text-xs font-bold text-foreground">
                        {story.publishedAt
                          ? new Date(story.publishedAt).toLocaleDateString()
                          : "--"}
                      </span>
                    </td>

                    {/* Reach */}
                    <td className="px-5 py-3 text-center">
                      <span className="text-xs font-black text-foreground">
                        {(story.reach || 0).toLocaleString()}
                      </span>
                    </td>

                    {/* Impressions */}
                    <td className="px-5 py-3 text-center">
                      <span className="text-xs font-bold text-foreground">
                        {(story.impressions || 0).toLocaleString()}
                      </span>
                    </td>

                    {/* Exits */}
                    <td className="px-5 py-3 text-center">
                      <span className="text-xs font-bold text-red-500">
                        {(story.exits || 0).toLocaleString()}
                      </span>
                    </td>

                    {/* Replies */}
                    <td className="px-5 py-3 text-center">
                      <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400">
                        {(story.replies || 0).toLocaleString()}
                      </span>
                    </td>

                    {/* Link Clicks */}
                    <td className="px-5 py-3 text-center">
                      <span className="text-xs font-bold text-green-600 dark:text-green-400">
                        {(story.linkClicks || 0).toLocaleString()}
                      </span>
                    </td>

                    {/* Completion Rate */}
                    <td className="px-5 py-3">
                      <div className="flex justify-center">
                        <CompletionBar rate={story.completionRate} />
                      </div>
                    </td>

                    {/* Exit Rate */}
                    <td className="px-5 py-3 text-center">
                      <span
                        className={`text-xs font-bold ${
                          story.exitRate > 0.5 ? "text-red-500" : "text-muted-foreground"
                        }`}
                      >
                        {formatPercent(story.exitRate)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary cards */}
      {!showSkeleton && stories.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Total Reach",
              value: stories.reduce((s, x) => s + (x.reach || 0), 0).toLocaleString(),
              highlight: true,
            },
            {
              label: "Total Impressions",
              value: stories.reduce((s, x) => s + (x.impressions || 0), 0).toLocaleString(),
            },
            {
              label: "Total Replies",
              value: stories.reduce((s, x) => s + (x.replies || 0), 0).toLocaleString(),
            },
            {
              label: "Total Link Clicks",
              value: stories.reduce((s, x) => s + (x.linkClicks || 0), 0).toLocaleString(),
              highlight: true,
            },
          ].map((item, i) => (
            <div
              key={i}
              className="bg-card p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-center min-h-[90px]"
            >
              <span
                className={`text-xl font-black ${
                  item.highlight ? "text-indigo-600 dark:text-indigo-400" : "text-foreground"
                }`}
              >
                {item.value}
              </span>
              <span className="text-[10px] text-muted-foreground font-bold uppercase mt-1 tracking-tight">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
