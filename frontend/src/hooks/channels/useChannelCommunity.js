import { useState, useEffect, useRef } from "react";
import inboxService from "../../services/inbox.service";
import { useBrand } from "../../context/BrandContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import socketClient from "../../services/socket";
import { INBOX_TAB } from "../../constants/inbox";

/**
 * Single-account variant of the unified inbox (frontend/src/pages/manage/Inbox.jsx).
 * Filters by socialAccountId instead of platform — the backend already
 * supports this (InboxSocialAccountFilter), no backend changes needed.
 */
export function useChannelCommunity(socialAccountId) {
  const { t } = useTranslation(["manage", "common"]);
  const { activeBrand } = useBrand();

  const [tabFilter, setTabFilter] = useState(INBOX_TAB.ALL);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [inboxData, setInboxData] = useState({ data: [], meta: {} });
  const [fetchedPosts, setFetchedPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);
  const [activeConv, setActiveConv] = useState(null);
  const [thread, setThread] = useState([]);
  const [videoContext, setVideoContext] = useState(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [isPostingNewComment, setIsPostingNewComment] = useState(false);

  // Fetch all posts (including posts with 0 comments)
  useEffect(() => {
    if (!activeBrand || !socialAccountId) return;
    const loadPosts = async () => {
      setPostsLoading(true);
      try {
        const response = await inboxService.getInboxPosts(activeBrand.id, `socialAccountId=${socialAccountId}`);
        setFetchedPosts(response?.data || response?.posts || (Array.isArray(response) ? response : []));
      } catch (err) {
        console.error("Failed to load channel posts:", err);
      } finally {
        setPostsLoading(false);
      }
    };
    loadPosts();
  }, [activeBrand?.id, socialAccountId]);

  // Monotonically-increasing request ids so a stale in-flight response can't
  // overwrite fresher data — same pattern as InboxPage (#112 K7).
  const inboxRequestIdRef = useRef(0);
  const threadRequestIdRef = useRef(0);

  const fetchInbox = async (showSkeleton = true) => {
    if (!activeBrand || !socialAccountId) return;
    const requestId = ++inboxRequestIdRef.current;
    if (showSkeleton) setLoading(true);
    try {
      const params = new URLSearchParams({
        socialAccountId,
        tab: tabFilter,
        page: String(currentPage),
        ...(searchTerm ? { search: searchTerm } : {}),
      });
      const response = await inboxService.getInbox(activeBrand.id, params.toString());
      if (requestId !== inboxRequestIdRef.current) return;
      setInboxData(response || { data: [], meta: {} });
    } catch (error) {
      console.error("Channel inbox load error:", error);
    } finally {
      if (requestId === inboxRequestIdRef.current && showSkeleton) setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBrand?.id, socialAccountId, tabFilter, currentPage, searchTerm]);

  const fetchThread = async (showSkeleton = true, conv = activeConv) => {
    if (!conv) return;
    // Synthetic posts (0-comment posts sourced directly from the platform
    // API) have no matching InboxItem row — getThread's strict findById
    // lookup would 404. handleSelectPost already fetches whatever
    // thread/videoContext exists via getCommentsByPost.
    if (conv.isSyntheticPost) return;
    const requestId = ++threadRequestIdRef.current;
    if (showSkeleton) {
      setThreadLoading(true);
      setVideoContext(null);
    }
    try {
      const response = await inboxService.getThread(conv.id);
      if (requestId !== threadRequestIdRef.current) return;
      setThread(response?.thread || []);
      if (response?.videoContext) setVideoContext(response.videoContext);
      if (conv.unread) {
        handleUpdateStatus(conv.id, "READ");
      }
    } catch (error) {
      toast.error(t("inbox.loadThreadFailed"));
    } finally {
      if (requestId === threadRequestIdRef.current && showSkeleton) setThreadLoading(false);
    }
  };

  useEffect(() => {
    fetchThread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConv?.id]);

  // Real-time updates, scoped to this account only.
  useEffect(() => {
    if (!activeBrand || !socialAccountId) return;

    socketClient.emit("join_room", { brandId: activeBrand.id });

    const handleNewInboxItem = (data) => {
      if (data.socialAccountId === socialAccountId) {
        fetchInbox(false);
        if (activeConv && (activeConv.id === data.id || activeConv.id === data.parentItemId)) {
          fetchThread(false);
        }
      }
    };

    const handleInboxItemDeleted = (data) => {
      if (data.socialAccountId === socialAccountId) {
        fetchInbox(false);
        if (activeConv && (activeConv.id === data.id || activeConv.platformItemId === data.platformItemId)) {
          setActiveConv(null);
          setThread([]);
        }
      }
    };

    socketClient.on("new_inbox_item", handleNewInboxItem);
    socketClient.on("inbox_item_deleted", handleInboxItemDeleted);

    return () => {
      socketClient.emit("leave_room", { brandId: activeBrand.id });
      socketClient.off("new_inbox_item", handleNewInboxItem);
      socketClient.off("inbox_item_deleted", handleInboxItemDeleted);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBrand?.id, socialAccountId, activeConv?.id]);

  const handleSync = async (platform) => {
    if (!activeBrand) return;
    setIsSyncing(true);
    try {
      // Syncs every account of this platform (backend has no per-account
      // sync yet) — harmless over-sync, not incorrect, for the common case
      // of one account per platform.
      await inboxService.syncInbox(activeBrand.id, platform);
      toast.success(t("inbox.syncSuccess"));
      await fetchInbox(false);
      if (activeConv) await fetchThread(false);
    } catch (e) {
      toast.error(t("inbox.syncFailed") + (e.message || ""));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateStatus = async (itemId, newStatus) => {
    try {
      await inboxService.updateInboxStatus(itemId, newStatus);
      setInboxData((prev) => ({
        ...prev,
        data: prev.data.map((item) =>
          item.id === itemId ? { ...item, status: newStatus.toLowerCase(), unread: newStatus === "UNREAD" } : item
        ),
      }));
      if (activeConv?.id === itemId) {
        setActiveConv((prev) => ({ ...prev, status: newStatus.toLowerCase(), unread: newStatus === "UNREAD" }));
      }
    } catch (e) {
      toast.error(t("inbox.updateStatusFailed"));
    }
  };

  const handleReply = async (replyText, attachmentUrl) => {
    if (!replyText || !activeConv || !activeBrand) return;
    const cleanAttachmentUrl = typeof attachmentUrl === "string" ? attachmentUrl : undefined;
    setIsReplying(true);
    try {
      if (activeConv.isSyntheticPost) {
        // 0-comment post — there's no existing InboxItem to reply to, so
        // post a brand-new top-level comment directly on the platform post.
        await inboxService.postNewComment({
          brandId: activeBrand.id,
          postId: activeConv.id,
          platform: activeConv.platform,
          text: replyText,
          socialAccountId: activeConv.socialAccountId || undefined,
          attachmentUrl: cleanAttachmentUrl
        });
        toast.success(t("inbox.replySuccess"));
        setActiveConv((prev) => (prev ? { ...prev, isSyntheticPost: false } : prev));
        const response = await inboxService.getCommentsByPost(activeBrand.id, activeConv.id);
        if (response?.thread) setThread(response.thread);
        if (response?.videoContext) setVideoContext(response.videoContext);
      } else {
        await inboxService.replyInbox({ brandId: activeBrand.id, itemId: activeConv.id, text: replyText, attachmentUrl: cleanAttachmentUrl });
        toast.success(t("inbox.replySuccess"));
        await fetchThread(false);
      }
      await fetchInbox(false);
      return true;
    } catch (e) {
      toast.error(t("inbox.replyFailed") + (e.message || ""));
      return false;
    } finally {
      setIsReplying(false);
    }
  };

  // Posts a new top-level comment on the post that's currently open, even
  // when it already has other comments — separate from handleReply, which
  // always targets a specific existing comment (reply-to-X semantics).
  const handlePostNewComment = async (text, attachmentUrl) => {
    if (!text || !activeConv || !activeBrand) return;
    const cleanAttachmentUrl = typeof attachmentUrl === "string" ? attachmentUrl : undefined;
    const postId = activeConv.relatedPostId || activeConv.videoContext?.id || activeConv.id;
    const platform = activeConv.platform;
    if (!postId || !platform) return;
    setIsPostingNewComment(true);
    try {
      await inboxService.postNewComment({
        brandId: activeBrand.id,
        postId,
        platform,
        text,
        socialAccountId: activeConv.socialAccountId || undefined,
        attachmentUrl: cleanAttachmentUrl
      });
      toast.success(t("inbox.replySuccess"));
      const response = await inboxService.getCommentsByPost(activeBrand.id, postId);
      if (response?.thread) setThread(response.thread);
      if (response?.videoContext) setVideoContext(response.videoContext);
      await fetchInbox(false);
      return true;
    } catch (e) {
      toast.error(t("inbox.replyFailed") + (e.message || ""));
      return false;
    } finally {
      setIsPostingNewComment(false);
    }
  };

  const handleUpdateReply = async (replyId, newText) => {
    if (!newText || !activeBrand) return;
    try {
      await inboxService.updateInboxReply(replyId, { brandId: activeBrand.id, text: newText });
      toast.success(t("inbox.updateReplySuccess"));
      await fetchThread();
    } catch (e) {
      toast.error(t("inbox.updateReplyFailed") + (e.message || ""));
    }
  };

  const handleDeleteReply = async (replyId) => {
    if (!activeBrand) return;
    try {
      await inboxService.deleteInboxReply(replyId, activeBrand.id);
      toast.success(t("inbox.deleteReplySuccess"));
      await fetchThread();
    } catch (e) {
      toast.error(t("inbox.deleteReplyFailed") + (e.message || ""));
    }
  };

  return {
    tabFilter, setTabFilter,
    searchTerm, setSearchTerm,
    currentPage, setCurrentPage,
    inboxData, fetchedPosts, loading, postsLoading,
    activeConv, setActiveConv,
    thread, videoContext, threadLoading,
    isSyncing, isReplying,
    isPostingNewComment,
    handleSync, handleUpdateStatus, handleReply, handlePostNewComment, handleUpdateReply, handleDeleteReply,
    refetch: fetchInbox,
  };
}
