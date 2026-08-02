import { useState, useMemo } from "react";
import { Search, RefreshCw, MessageSquare, Loader2, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useChannelCommunity } from "../../../hooks/channels/useChannelCommunity";
import { useBrand } from "../../../context/BrandContext";
import { ConversationItem } from "../../../components/inbox/ConversationItem";
import { InboxHeader } from "../../../components/inbox/InboxHeader";
import { PostsGridSidebar } from "../../../components/inbox/PostsGridSidebar";
import { ThreadDetailView } from "../../../components/inbox/ThreadDetailView";
import inboxService from "../../../services/inbox.service";
import { INBOX_VIEW_MODE, INBOX_ITEM_TYPE, INBOX_TABS_ORDER, POST_COMMENT_FILTER } from "../../../constants/inbox";

export function ChannelCommunityTab({ socialAccountId, platform }) {
  const { t } = useTranslation(["manage", "common"]);
  const { activeBrand } = useBrand();
  const [viewMode, setViewMode] = useState(INBOX_VIEW_MODE.BY_POST);
  const [filterType, setFilterType] = useState(INBOX_ITEM_TYPE.ALL);
  const [postCommentFilter, setPostCommentFilter] = useState(POST_COMMENT_FILTER.ALL);
  const [isPostsPanelCollapsed, setIsPostsPanelCollapsed] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [newCommentText, setNewCommentText] = useState("");
  const [localThreadLoading, setLocalThreadLoading] = useState(false);

  const {
    tabFilter, setTabFilter,
    searchTerm, setSearchTerm,
    currentPage, setCurrentPage,
    inboxData, fetchedPosts = [], loading, postsLoading,
    activeConv, setActiveConv,
    thread, setThread, videoContext, setVideoContext, threadLoading,
    isSyncing, isReplying, isPostingNewComment,
    handleSync, handleUpdateStatus, handleReply, handlePostNewComment,
  } = useChannelCommunity(socialAccountId);

  const channelAccount = activeBrand?.socialAccounts?.find((sa) => sa.id === socialAccountId);
  const channelTitle = channelAccount?.displayName || channelAccount?.username || channelAccount?.accountName || platform;

  // Comment sync only actually runs for YouTube/Facebook (see the inbox
  // sync strategies registered in inbox.service.js) — TikTok's sync is
  // disabled (TikTok Research API access not granted) and Bluesky/Instagram
  // have no comment sync strategy at all. Post listing itself still works
  // for every platform, so only comments are affected — tell the user that
  // explicitly instead of leaving an empty comment list unexplained.
  const COMMENT_SYNC_SUPPORTED_PLATFORMS = ["YOUTUBE", "FACEBOOK"];
  const isCommentSyncSupported = COMMENT_SYNC_SUPPORTED_PLATFORMS.includes((platform || "").toUpperCase());

  // Group unique posts for 'by_post' 3-column video grid view
  const postsList = useMemo(() => {
    const postsMap = new Map();

    // 1. Add all channel / DB posts (including 0 comments)
    if (Array.isArray(fetchedPosts)) {
      fetchedPosts.forEach((post, index) => {
        const key = post.id || post.videoId || post.videoContext?.id;
        if (key && !postsMap.has(key)) {
          let thumb = post.thumbnailUrl || post.mediaUrl || post.videoContext?.thumbnailUrl;
          if (thumb && (thumb.includes('dicebear') || thumb.includes('avataaars') || thumb === post.avatar)) {
            thumb = null;
          }
          let ytId = post.videoContext?.id || post.videoId;
          if (!ytId && typeof key === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(key)) {
            ytId = key;
          }
          if (!thumb && ytId) {
            thumb = `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
          }

          postsMap.set(key, {
            id: key,
            title: post.title || post.videoContext?.title || `Bài viết #${index + 1}`,
            thumbnailUrl: thumb,
            mediaUrl: thumb,
            videoContext: post.videoContext || {
              id: key,
              title: post.title || `Bài viết #${index + 1}`,
              thumbnailUrl: thumb,
              channelTitle: post.channelTitle || `${platform || "Social"} Channel`
            },
            commentCount: post.commentCount || 0,
            unreadCount: post.unreadCount || 0,
            rawItem: post.rawItem || null,
          });
        }
      });
    }

    // 2. Add / Update from synced inbox items
    if (inboxData.data && inboxData.data.length > 0) {
      inboxData.data.forEach((item, index) => {
        let ytId = item.videoContext?.id;
        if (!ytId && item.platformItemId && typeof item.platformItemId === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(item.platformItemId)) {
          ytId = item.platformItemId;
        }
        const key = ytId || item.platformItemId || item.id;

        if (!postsMap.has(key)) {
          let thumb = item.videoContext?.thumbnailUrl || item.videoContext?.thumbnail || item.mediaUrl || item.thumbnailUrl || item.postMediaUrl;
          if (thumb && (thumb.includes('dicebear') || thumb.includes('avataaars') || thumb === item.avatar)) {
            thumb = null;
          }
          if (!thumb && ytId) {
            thumb = `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
          }

          const title = item.videoContext?.title || `Bài viết #${index + 1} (${item.platform || platform || "Social"})`;

          postsMap.set(key, {
            id: key,
            title,
            thumbnailUrl: thumb,
            mediaUrl: thumb,
            videoContext: item.videoContext || {
              id: key,
              title,
              thumbnailUrl: thumb,
              channelTitle: `${item.platform || platform || "Social"} Channel`
            },
            commentCount: 1,
            unreadCount: item.unread ? 1 : 0,
            rawItem: item,
          });
        } else {
          const existing = postsMap.get(key);
          existing.commentCount = (existing.commentCount || 0) + 1;
          if (item.unread) existing.unreadCount = (existing.unreadCount || 0) + 1;
        }
      });
    }

    return Array.from(postsMap.values());
  }, [fetchedPosts, inboxData.data, platform]);

  const filteredPostsList = useMemo(() => {
    if (postCommentFilter === "has") return postsList.filter(p => (p.commentCount || 0) > 0);
    if (postCommentFilter === "none") return postsList.filter(p => !(p.commentCount > 0));
    return postsList;
  }, [postsList, postCommentFilter]);

  const activePostId = useMemo(() => {
    if (!activeConv) return postsList[0]?.id || null;
    return activeConv.videoContext?.id || activeConv.platformItemId || activeConv.id;
  }, [activeConv, postsList]);

  // Fetch comments for selected post / video
  const handleSelectPost = async (post) => {
    const selectedItem = post.rawItem || {
      id: post.id,
      user: post.title || "Post User",
      avatar: post.thumbnailUrl,
      platform: post.platform || platform || "Social",
      socialAccountId: post.socialAccountId || socialAccountId || null,
      videoContext: post.videoContext,
      unread: post.unreadCount > 0,
      status: "unresolved",
      isSyntheticPost: true
    };

    setActiveConv(selectedItem);

    if (activeBrand?.id && post.id) {
      setLocalThreadLoading(true);
      try {
        const response = await inboxService.getCommentsByPost(activeBrand.id, post.id);
        setThread(response?.thread || []);
        setVideoContext(response?.videoContext || null);
      } catch (e) {
        console.error("Failed to fetch comments for post:", e);
      } finally {
        setLocalThreadLoading(false);
      }
    }
  };

  const onReply = async (attachmentUrl) => {
    const ok = await handleReply(replyText, attachmentUrl);
    if (ok) setReplyText("");
  };

  const onPostNewComment = async (attachmentUrl) => {
    const ok = await handlePostNewComment(newCommentText, attachmentUrl);
    if (ok) setNewCommentText("");
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background overflow-hidden">
      {/* Top Header Controls (By post / List mode toggle + Filter types) */}
      <InboxHeader
        activeBrand={activeBrand}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        filterType={filterType}
        onFilterTypeChange={setFilterType}
        totalUnread={inboxData.meta?.totalUnread || 0}
        channelTitle={channelTitle}
        postCommentFilter={postCommentFilter}
        onPostCommentFilterChange={setPostCommentFilter}
      />

      {!isCommentSyncSupported && (
        <div className="mx-4 mt-3 px-3.5 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center gap-2.5 shrink-0">
          <AlertTriangle size={15} className="text-amber-500 shrink-0" />
          <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
            {t("inbox.commentSyncUnsupported", { platform: platform || channelTitle })}
          </span>
        </div>
      )}

      {/* Main Body */}
      <div className="flex-1 flex gap-4 p-4 min-h-0 overflow-hidden">
        {/* Left Sidebar: By Post (3-column grid) OR Traditional List */}
        {viewMode === "by_post" ? (
          <PostsGridSidebar
            posts={filteredPostsList}
            activePostId={activePostId}
            onSelectPost={handleSelectPost}
            loading={loading || postsLoading}
            collapsed={isPostsPanelCollapsed}
            onToggleCollapsed={setIsPostsPanelCollapsed}
          />
        ) : (
          <div className="w-[340px] shrink-0 bg-card rounded-2xl border border-border shadow-sm flex flex-col overflow-hidden">
            <div className="px-4 pt-4 flex items-center justify-between">
              <h3 className="text-[13px] font-bold text-foreground">{t("inbox.title", "Cộng đồng")}</h3>
              <button onClick={() => handleSync(platform)} disabled={isSyncing} className="p-1.5 hover:bg-muted rounded-full text-muted-foreground cursor-pointer border-none bg-transparent">
                <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
              </button>
            </div>

            <div className="p-4 pb-2">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t("inbox.searchConversation")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="flex px-2 border-b border-border">
              {INBOX_TABS_ORDER.map((tVal) => (
                <button
                  key={tVal}
                  onClick={() => { setTabFilter(tVal); setCurrentPage(1); }}
                  className="flex-1 py-3 text-[11px] font-bold uppercase tracking-widest relative bg-transparent border-none cursor-pointer"
                  style={{ color: tabFilter === tVal ? "var(--foreground)" : "var(--muted-foreground)" }}
                >
                  {t(`inbox.tabs.${tVal.toLowerCase()}`)}
                  {tabFilter === tVal && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {loading ? (
                <div className="h-40 flex items-center justify-center"><Loader2 className="animate-spin text-muted-foreground" size={32} /></div>
              ) : inboxData.data?.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-muted rounded-3xl flex items-center justify-center text-muted-foreground"><MessageSquare size={32} /></div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase">
                    {t("inbox.noConversations", { tab: t(`inbox.tabs.${tabFilter.toLowerCase()}`).toLowerCase() })}
                  </p>
                </div>
              ) : (
                inboxData.data.map((conv) => (
                  <ConversationItem key={conv.id} conv={conv} activeConv={activeConv} onSelect={setActiveConv} onUpdateStatus={handleUpdateStatus} />
                ))
              )}
            </div>

            {inboxData.meta && inboxData.meta.totalPages > 1 && (
              <div className="px-4 py-3 border-t border-border flex items-center justify-between bg-card text-[11px] font-bold text-muted-foreground">
                <button
                  onClick={() => setCurrentPage((p) => p - 1)}
                  disabled={currentPage <= 1}
                  className="px-2.5 py-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-muted transition-colors"
                >
                  {t("inbox.pagination.previous")}
                </button>
                <span>{t("inbox.pagination.pageOf", { current: currentPage, total: inboxData.meta.totalPages })}</span>
                <button
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={currentPage >= inboxData.meta.totalPages}
                  className="px-2.5 py-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-muted transition-colors"
                >
                  {t("inbox.pagination.next")}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Shared Thread Detail Panel Component */}
        <ThreadDetailView
          activeConv={activeConv}
          videoContext={videoContext}
          thread={thread}
          threadLoading={threadLoading || localThreadLoading}
          activeBrand={activeBrand}
          replyText={replyText}
          setReplyText={setReplyText}
          onReply={onReply}
          isReplying={isReplying}
          onUpdateStatus={handleUpdateStatus}
          platform={platform}
          newCommentText={newCommentText}
          setNewCommentText={setNewCommentText}
          onPostNewComment={onPostNewComment}
          isPostingNewComment={isPostingNewComment}
        />
      </div>
    </div>
  );
}
