import React from "react";
import { GenericDashboardTab } from "./GenericDashboardTab";
import { Users, UserCheck, MessageSquare, Heart, Repeat, ShieldCheck, CheckCircle2, Globe, Sparkles } from "lucide-react";
import { ThreadsPostsListTab } from "./ThreadsPostsListTab";

export function BlueskyDashboardTab({
  metrics,
  realData,
  activeTab,
  publishedVideos,
  isPublishedLoading,
  pageSize,
  setPageSize,
  fetchPublishedVideos,
  prevPageToken,
  nextPageToken,
  onVideoClick
}) {
  const account = metrics?.blueskyAccount || metrics || {};
  const followersCount = account.followersCount || 0;
  const followsCount = account.followsCount || 0;
  const postsCount = account.postsCount || 0;
  const handle = account.handle || account.username || "Bluesky User";
  const displayName = account.displayName || handle;
  const avatarUrl = account.profilePictureUrl || account.avatarUrl || account.avatar;
  const isEmailConfirmed = account.emailConfirmed ?? true;

  const bskyGrowthConfig = [
    {
      key: "followers",
      label: "Followers",
      color: "bg-[#0085FF] text-white",
      chartColor: "#0085FF",
      type: "area",
      value: followersCount
    },
    {
      key: "follows",
      label: "Following",
      color: "bg-[#38BDF8] text-foreground",
      chartColor: "#38BDF8",
      type: "line",
      value: followsCount
    },
    {
      key: "posts",
      label: "Total Posts",
      color: "bg-[#6366F1] text-white",
      chartColor: "#6366F1",
      type: "bar",
      value: postsCount
    }
  ];

  if (activeTab === "posts") {
    return (
      <ThreadsPostsListTab
        realData={realData}
        publishedVideos={publishedVideos}
        isPublishedLoading={isPublishedLoading}
        pageSize={pageSize}
        setPageSize={setPageSize}
        fetchPublishedVideos={fetchPublishedVideos}
        prevPageToken={prevPageToken}
        nextPageToken={nextPageToken}
        onVideoClick={onVideoClick}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Bluesky Header Profile Card */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-blue-500/10">
        <div className="absolute top-0 right-0 w-80 h-80 bg-card/10 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-white/30 shadow-lg"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-card/20 backdrop-blur-md flex items-center justify-center text-2xl font-black border-2 border-white/30">
                  {displayName.substring(0, 2).toUpperCase()}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 bg-card p-1 rounded-full text-[#0085FF] shadow-sm">
                <Globe size={14} />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-white">{displayName}</h2>
                {isEmailConfirmed && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-card/20 backdrop-blur-md text-white border border-white/30">
                    <CheckCircle2 size={10} /> Email Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-100 font-medium mt-0.5">@{handle}</p>
              <div className="flex items-center gap-2 mt-2 text-[11px] text-blue-100/90 font-medium">
                <span className="inline-flex items-center gap-1 bg-black/15 px-2.5 py-1 rounded-lg backdrop-blur-sm">
                  <Sparkles size={12} className="text-yellow-300" /> AT Protocol Decentralized Network
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-card/10 backdrop-blur-md p-3 rounded-2xl border border-white/20 w-full md:w-auto justify-around">
            <div className="text-center px-4">
              <p className="text-[10px] text-blue-100 font-bold uppercase tracking-wider">Followers</p>
              <p className="text-lg font-black text-white mt-0.5">{followersCount.toLocaleString()}</p>
            </div>
            <div className="w-px h-8 bg-card/20" />
            <div className="text-center px-4">
              <p className="text-[10px] text-blue-100 font-bold uppercase tracking-wider">Following</p>
              <p className="text-lg font-black text-white mt-0.5">{followsCount.toLocaleString()}</p>
            </div>
            <div className="w-px h-8 bg-card/20" />
            <div className="text-center px-4">
              <p className="text-[10px] text-blue-100 font-bold uppercase tracking-wider">Posts</p>
              <p className="text-lg font-black text-white mt-0.5">{postsCount.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Người theo dõi</p>
            <p className="text-2xl font-black text-foreground mt-1">{followersCount.toLocaleString()}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0085FF] flex items-center justify-center">
            <Users size={22} />
          </div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Đang theo dõi</p>
            <p className="text-2xl font-black text-foreground mt-1">{followsCount.toLocaleString()}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-500 flex items-center justify-center">
            <UserCheck size={22} />
          </div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tổng số bài viết</p>
            <p className="text-2xl font-black text-foreground mt-1">{postsCount.toLocaleString()}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <MessageSquare size={22} />
          </div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Xác thực Video</p>
            <p className={`text-sm font-black mt-1 ${isEmailConfirmed ? 'text-emerald-600' : 'text-amber-600'}`}>
              {isEmailConfirmed ? 'Sẵn sàng đăng Video' : 'Cần verify Email'}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isEmailConfirmed ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
            <ShieldCheck size={22} />
          </div>
        </div>
      </div>

      {/* Main Growth Chart */}
      <GenericDashboardTab
        title="Bluesky Channel Analytics"
        description="Chỉ số phân tích tăng trưởng Followers, Following và bài viết trên mạng xã hội phân tán Bluesky"
        data={realData?.growth || []}
        metricConfig={bskyGrowthConfig}
        watermark="bluesky"
      />
    </div>
  );
}
