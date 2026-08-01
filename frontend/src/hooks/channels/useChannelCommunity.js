import { useState, useEffect, useRef } from "react";
import inboxService from "../../services/inbox.service";
import { useBrand } from "../../context/BrandContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import socketClient from "../../services/socket";

/**
 * Single-account variant of the unified inbox (frontend/src/pages/manage/Inbox.jsx).
 * Filters by socialAccountId instead of platform — the backend already
 * supports this (InboxSocialAccountFilter), no backend changes needed.
 */
export function useChannelCommunity(socialAccountId) {
  const { t } = useTranslation(["manage", "common"]);
  const { activeBrand } = useBrand();

  const [tabFilter, setTabFilter] = useState("Unresolved");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [inboxData, setInboxData] = useState({ data: [], meta: {} });
  const [loading, setLoading] = useState(false);
  const [activeConv, setActiveConv] = useState(null);
  const [thread, setThread] = useState([]);
  const [videoContext, setVideoContext] = useState(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);

  // Monotonically-increasing request ids so a stale in-flight response can't
  // overwrite fresher data — same pattern as InboxPage (#112 K7).
  const inboxRequestIdRef = useRef(0);
  const threadRequestIdRef = useRef(0);

  const fetchInbox = async () => {
    if (!activeBrand || !socialAccountId) return;
    const requestId = ++inboxRequestIdRef.current;
    setLoading(true);
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
      if (requestId === inboxRequestIdRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBrand?.id, socialAccountId, tabFilter, currentPage, searchTerm]);

  const fetchThread = async (conv = activeConv) => {
    if (!conv) return;
    const requestId = ++threadRequestIdRef.current;
    setThreadLoading(true);
    setVideoContext(null);
    try {
      const response = await inboxService.getThread(conv.id);
      if (requestId !== threadRequestIdRef.current) return;
      setThread(response?.thread || []);
      setVideoContext(response?.videoContext || null);
      if (conv.unread) {
        handleUpdateStatus(conv.id, "READ");
      }
    } catch (error) {
      toast.error(t("inbox.loadThreadFailed"));
    } finally {
      if (requestId === threadRequestIdRef.current) setThreadLoading(false);
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
        fetchInbox();
        if (activeConv && (activeConv.id === data.id || activeConv.id === data.parentItemId)) {
          fetchThread();
        }
      }
    };

    const handleInboxItemDeleted = (data) => {
      if (data.socialAccountId === socialAccountId) {
        fetchInbox();
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
      await fetchInbox();
      if (activeConv) await fetchThread();
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

  const handleReply = async (replyText) => {
    if (!replyText || !activeConv || !activeBrand) return;
    setIsReplying(true);
    try {
      await inboxService.replyInbox({ brandId: activeBrand.id, itemId: activeConv.id, text: replyText });
      toast.success(t("inbox.replySuccess"));
      await fetchThread();
      await fetchInbox();
      return true;
    } catch (e) {
      toast.error(t("inbox.replyFailed") + (e.message || ""));
      return false;
    } finally {
      setIsReplying(false);
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
    inboxData, loading,
    activeConv, setActiveConv,
    thread, videoContext, threadLoading,
    isSyncing, isReplying,
    handleSync, handleUpdateStatus, handleReply, handleUpdateReply, handleDeleteReply,
    refetch: fetchInbox,
  };
}
