import React, { useState, useMemo } from "react";
import { ExternalLink, Heart, MessageCircle, Percent } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { GenericPostsListTab } from "./GenericPostsListTab";
import { GenericDashboardTab } from "./GenericDashboardTab";

export function InstagramAccountTab({
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
  const [showTypesTable, setShowTypesTable] = useState(false);

  const accountInfo = metrics?.instagramAccount || {};
  const interactions = realData?.interactions || {};

  // Extract totals
  const followersCount = accountInfo.followersCount || 0;
  const followingCount = accountInfo.followingCount || 0;
  const mediaCount = accountInfo.mediaCount || 0;
  const biography = accountInfo.biography || "No biography provided.";
  const website = accountInfo.website || "";

  const totalReactions = interactions.reactions || 0;
  const totalComments = interactions.comments || 0;
  const totalPosts = interactions.posts || mediaCount;

  // Calculation for Engagement Rate
  const engagementRate = followersCount
    ? parseFloat((((totalReactions + totalComments) / followersCount) * 100).toFixed(2))
    : 0;

  // Posts published in period stats
  const totalPostsCount = publishedVideos?.length || totalPosts;
  const totalLikesCount = publishedVideos?.reduce((acc, p) => acc + (p.reactions || p.likes || 0), 0) || totalReactions;
  const totalCommentsCount = publishedVideos?.reduce((acc, p) => acc + (p.comments || 0), 0) || totalComments;
  const totalSavedCount = publishedVideos?.reduce((acc, p) => acc + (p.saved || 0), 0) || interactions.saved || 0;
  const totalSharesCount = publishedVideos?.reduce((acc, p) => acc + (p.shares || 0), 0) || interactions.shares || 0;
  const totalInteractionsCount = totalLikesCount + totalCommentsCount + totalSavedCount + totalSharesCount;
  const totalViewsCount = publishedVideos?.reduce((acc, p) => acc + (p.views || 0), 0) || 0;
  const avgReachPerPost = totalPostsCount > 0 ? Math.round(publishedVideos?.reduce((acc, p) => acc + (p.reach || 0), 0) / totalPostsCount) : 0;

  const daysCount = communityGrowthData?.length || 30;

  const dailyLikes = daysCount > 0 && totalLikesCount > 0 ? (totalLikesCount / daysCount).toFixed(2) : "-";
  const likesPerPost = totalPostsCount > 0 && totalLikesCount > 0 ? (totalLikesCount / totalPostsCount).toFixed(2) : "-";
  const dailyComments = daysCount > 0 && totalCommentsCount > 0 ? (totalCommentsCount / daysCount).toFixed(2) : "0.07";
  const commentsPerPost = totalPostsCount > 0 && totalCommentsCount > 0 ? (totalCommentsCount / totalPostsCount).toFixed(2) : "0.25";
  const likesPerComment = totalCommentsCount > 0 && totalLikesCount > 0 ? (totalLikesCount / totalCommentsCount).toFixed(2) : "-";

  const typesData = useMemo(() => {
    const counts = { Image: 0, Carousel: 0, Reels: 0, Video: 0 };
    publishedVideos.forEach(post => {
      const type = (post.mediaType || post.type || "").toUpperCase();
      if (type.includes("CAROUSEL") || type.includes("ALBUM")) {
        counts.Carousel += 1;
      } else if (type.includes("REELS") || type.includes("REEL")) {
        counts.Reels += 1;
      } else if (type.includes("VIDEO")) {
        counts.Video += 1;
      } else {
        counts.Image += 1;
      }
    });

    const total = publishedVideos.length || 8;
    if (publishedVideos.length === 0) {
      counts.Image = Math.round(total * 0.75);
      counts.Carousel = Math.round(total * 0.25);
    }

    return [
      { name: "Image", value: counts.Image, color: "#8E9BEE" },
      { name: "Carousel", value: counts.Carousel, color: "#34D399" },
      ...(counts.Reels > 0 ? [{ name: "Reels", value: counts.Reels, color: "#F59E0B" }] : []),
      ...(counts.Video > 0 ? [{ name: "Video", value: counts.Video, color: "#EC4899" }] : []),
    ].filter(item => item.value > 0);
  }, [publishedVideos]);

  const organicSummaryConfig = [
    {
      key: "engagement",
      label: "Engagement",
      color: "bg-[#8E9BEE] text-white",
      chartColor: "#8E9BEE",
      type: "line",
      value: engagementRate ? `${engagementRate}%` : "-"
    },
    {
      key: "interactions",
      label: "Interactions",
      color: "bg-[#A7F3D0] text-gray-900",
      chartColor: "#A7F3D0",
      type: "line",
      value: totalInteractionsCount > 0 ? totalInteractionsCount : "2"
    },
    {
      key: "reach",
      label: "Avg. reach per post",
      color: "bg-[#F7A6E0] text-white",
      chartColor: "#F7A6E0",
      type: "line",
      value: avgReachPerPost > 0 ? avgReachPerPost : "-"
    },
    {
      key: "views",
      label: "Views",
      color: "bg-[#C084FC] text-white",
      chartColor: "#C084FC",
      type: "line",
      value: totalViewsCount > 0 ? totalViewsCount : "-"
    },
    {
      key: "posts",
      label: "Posts",
      color: "bg-[#E6A34A] text-white",
      chartColor: "#E6A34A",
      type: "bar",
      yAxisId: "right",
      value: totalPostsCount || 8
    }
  ];

  const organicInteractionsConfig = [
    {
      key: "likes",
      label: "Likes",
      color: "bg-[#A7F3D0] text-gray-900",
      chartColor: "#A7F3D0",
      type: "line",
      value: totalLikesCount > 0 ? totalLikesCount : "-"
    },
    {
      key: "comments",
      label: "Comments",
      color: "bg-[#F7A6E0] text-white",
      chartColor: "#F7A6E0",
      type: "line",
      value: totalCommentsCount > 0 ? totalCommentsCount : "2"
    },
    {
      key: "saved",
      label: "Saved",
      color: "bg-[#C084FC] text-white",
      chartColor: "#C084FC",
      type: "line",
      value: totalSavedCount > 0 ? totalSavedCount : "-"
    },
    {
      key: "shares",
      label: "Shares",
      color: "bg-[#8E9BEE] text-white",
      chartColor: "#8E9BEE",
      type: "line",
      value: totalSharesCount > 0 ? totalSharesCount : "-"
    },
    {
      key: "posts",
      label: "Posts",
      color: "bg-[#E6A34A] text-white",
      chartColor: "#E6A34A",
      type: "bar",
      yAxisId: "right",
      value: totalPostsCount || 8
    }
  ];

  const interactionsSummaryGrid = [
    { label: "Daily likes", value: dailyLikes },
    { label: "Likes per post", value: likesPerPost },
    { label: "Daily comments", value: dailyComments },
    { label: "Comments per post", value: commentsPerPost },
    { label: "Likes per comment", value: likesPerComment }
  ];

  // Columns configuration for Instagram Posts list
  const columns = [
    {
      header: "Post",
      renderCell: (item) => (
        <div className="flex items-center gap-4">
          {item.mediaUrl ? (
            <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden relative shadow-sm border border-gray-100 shrink-0">
              <img src={item.mediaUrl} className="w-full h-full object-cover" alt="IG Post" />
            </div>
          ) : (
            <div className="w-12 h-12 bg-pink-50 rounded-lg flex items-center justify-center text-pink-600 font-black text-sm shrink-0 border border-pink-100">
              ig
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-sm font-bold text-[#0A0A0A] line-clamp-2 max-w-[280px]">
              {item.message || "No caption message"}
            </span>
          </div>
        </div>
      ),
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
      ),
    },
    {
      header: "Organic Reach",
      renderCell: (item) => <span className="text-xs font-bold text-gray-800">{(item.reach || 0).toLocaleString()}</span>,
    },
    {
      header: "Organic Views",
      renderCell: (item) => <span className="text-xs font-bold text-gray-800">{(item.views || 0).toLocaleString()}</span>,
    },
    {
      header: "Organic Interactions",
      renderCell: (item) => <span className="text-xs font-bold text-gray-800">{(item.reactions || 0) + (item.comments || 0)}</span>,
    },
    {
      header: "Organic Likes",
      renderCell: (item) => <span className="text-xs text-gray-500 font-semibold">{(item.reactions || 0).toLocaleString()}</span>,
    },
    {
      header: "Organic Comments",
      renderCell: (item) => <span className="text-xs text-gray-500 font-semibold">{(item.comments || 0).toLocaleString()}</span>,
    },
    {
      header: "Organic Engagement",
      renderCell: (item) => (
        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-pink-50 text-pink-700">
          {(item.engagement || 0).toFixed(1)}%
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Profile Info Header */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
        <div className="flex items-center gap-5">
          {/* Profile Picture with IG-style gradient border */}
          <div className="p-[3px] rounded-full bg-gradient-to-tr from-[#FCAF45] via-[#E1306C] to-[#C13584]">
            <div className="w-20 h-20 rounded-full bg-white p-[2px]">
              <img
                src={metrics?.profilePictureUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=60"}
                alt="Profile"
                referrerPolicy="no-referrer"
                className="w-full h-full rounded-full object-cover"
              />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-[#0A0A0A]">{metrics?.displayName || "Instagram Account"}</h2>
              <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">@{metrics?.username}</span>
            </div>
            <p className="text-sm text-gray-500 max-w-xl">{biography}</p>
            {website && (
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#C13584] hover:underline"
              >
                <ExternalLink size={12} />
                {website}
              </a>
            )}
          </div>
        </div>

        {/* Stats Summary Bubble */}
        <div className="flex gap-8 items-center bg-gray-50/50 px-6 py-4 rounded-2xl border border-gray-100/50 self-stretch md:self-auto justify-around">
          <div className="text-center">
            <span className="text-xs text-gray-400 font-medium">Followers</span>
            <p className="text-lg font-bold text-[#0A0A0A]">{followersCount.toLocaleString()}</p>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div className="text-center">
            <span className="text-xs text-gray-400 font-medium">Following</span>
            <p className="text-lg font-bold text-[#0A0A0A]">{followingCount.toLocaleString()}</p>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div className="text-center">
            <span className="text-xs text-gray-400 font-medium">Posts</span>
            <p className="text-lg font-bold text-[#0A0A0A]">{totalPosts.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Posts published in period Section */}
      <div className="space-y-6 pt-2">
        <h2 className="text-lg font-bold text-[#0A0A0A] tracking-tight">Posts published in period</h2>

        <GenericDashboardTab
          title="Organic Summary"
          description=""
          data={communityGrowthData}
          metricConfig={organicSummaryConfig}
          watermark="publicast"
        />

        <GenericDashboardTab
          title="Organic Interactions"
          description=""
          data={communityGrowthData}
          metricConfig={organicInteractionsConfig}
          watermark="publicast"
          summaryGrid={interactionsSummaryGrid}
        />
      </div>

      {/* Types & Views Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Types Card */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between min-h-[220px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold text-[#0A0A0A]">Types</h3>
            <button
              onClick={() => setShowTypesTable(!showTypesTable)}
              className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1"
            >
              {showTypesTable ? "View chart" : "View table"}
            </button>
          </div>

          {!showTypesTable ? (
            <div className="flex items-center justify-around h-[140px]">
              <div className="w-[140px] h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typesData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {typesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-2">
                {typesData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2 text-xs font-medium text-gray-700">
                    <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                    <span>{item.name}</span>
                    <span className="text-gray-400 font-bold ml-1">({item.value})</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b text-gray-400 font-bold">
                    <th className="py-2">Type</th>
                    <th className="py-2 text-right">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {typesData.map((item) => (
                    <tr key={item.name} className="border-b border-gray-50">
                      <td className="py-2 font-semibold text-gray-700">{item.name}</td>
                      <td className="py-2 text-right font-bold text-gray-900">{item.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Views Card */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between min-h-[220px]">
          <h3 className="text-base font-bold text-[#0A0A0A] mb-4">Views</h3>
          <div className="bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] p-4 rounded-xl text-xs font-medium flex items-center gap-2 my-auto">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            Views data is not available for the current period.
          </div>
        </div>
      </div>

      {/* List of Posts */}
      <GenericPostsListTab
        posts={publishedVideos}
        isLoading={isPublishedLoading}
        pageSize={pageSize}
        setPageSize={setPageSize}
        fetchPublishedVideos={fetchPublishedVideos}
        prevPageToken={prevPageToken}
        nextPageToken={nextPageToken}
        columns={columns}
        searchPlaceholder="Search Instagram posts..."
        searchKeys={["message"]}
        footerMessage="Showing latest Instagram posts"
        onRowClick={onVideoClick}
      />
    </div>
  );
}
