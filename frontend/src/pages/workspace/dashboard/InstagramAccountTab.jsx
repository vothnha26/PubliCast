import React from "react";
import { Users, BookOpen, ExternalLink, Heart, MessageCircle, Percent, FileText } from "lucide-react";
import { GenericPostsListTab } from "./GenericPostsListTab";

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
}) {
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
      header: "Reach",
      renderCell: (item) => <span className="text-xs font-bold text-gray-800">{(item.reach || 0).toLocaleString()}</span>,
    },
    {
      header: "Views",
      renderCell: (item) => <span className="text-xs font-bold text-gray-800">{(item.views || 0).toLocaleString()}</span>,
    },
    {
      header: "Engagement",
      renderCell: (item) => (
        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-pink-50 text-pink-700">
          {(item.engagement || 0).toFixed(1)}%
        </span>
      ),
    },
    {
      header: "Likes",
      renderCell: (item) => <span className="text-xs text-gray-500 font-semibold">{(item.reactions || 0).toLocaleString()}</span>,
    },
    {
      header: "Comments",
      renderCell: (item) => <span className="text-xs text-gray-500 font-semibold">{(item.comments || 0).toLocaleString()}</span>,
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

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 shrink-0">
            <Heart size={24} />
          </div>
          <div>
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Likes</span>
            <h4 className="text-2xl font-bold text-[#0A0A0A] mt-1">{totalReactions.toLocaleString()}</h4>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-500 shrink-0">
            <MessageCircle size={24} />
          </div>
          <div>
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Comments</span>
            <h4 className="text-2xl font-bold text-[#0A0A0A] mt-1">{totalComments.toLocaleString()}</h4>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-500 shrink-0">
            <Percent size={24} />
          </div>
          <div>
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Engagement Rate</span>
            <h4 className="text-2xl font-bold text-[#0A0A0A] mt-1">{engagementRate}%</h4>
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
