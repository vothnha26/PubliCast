import { useState, useEffect, useRef } from "react";
import { 
  Search, RefreshCw, Youtube, Facebook, Instagram, Filter, MoreHorizontal, 
  Loader2, MessageSquare, AlertCircle, EyeOff, CheckCircle, ExternalLink, Check,
  Settings, Sparkles, Trash2, Plus
} from "lucide-react";
import { useFilters } from "../../hooks/useFilters";
import { useDebounce } from "../../hooks/useDebounce";
import inboxService from "../../services/inbox.service";
import { useBrand } from "../../context/BrandContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import socketClient from "../../services/socket";

// SOLID Components
import { ConversationItem, SafeAvatar } from "../../components/inbox/ConversationItem";
import { VideoContextCard } from "../../components/inbox/VideoContextCard";
import { ReplyComposer } from "../../components/inbox/ReplyComposer";

export function InboxPage() {
  const { t, i18n } = useTranslation(["manage", "common"]);
  const { activeBrand } = useBrand();
  const { filters, updateFilters, clearFilters, searchParamsString } = useFilters({
    tab: "Unresolved",
    platform: "YouTube",
    search: ""
  });

  const tabFilter = filters.tab || "Unresolved";
  const platformFilter = filters.platform || "YouTube";
  const currentPage = parseInt(filters.page || "1", 10);
  const [searchTerm, setSearchTerm] = useState(filters.search || "");
  const debouncedSearch = useDebounce(searchTerm, 300);

  const [inboxData, setInboxData] = useState({ data: [], meta: {} });
  const [loading, setLoading] = useState(false);
  const [activeConv, setActiveConv] = useState(null);
  const [thread, setThread] = useState([]);
  // Monotonically-increasing request ids so an in-flight fetchInbox/fetchThread
  // call that resolves after a newer one (fast filter/brand switch, or a
  // realtime socket event firing fetchInbox mid-flight) discards its stale
  // response instead of overwriting fresher data (#112 K7).
  const inboxRequestIdRef = useRef(0);
  const threadRequestIdRef = useRef(0);
  const [videoContext, setVideoContext] = useState(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [editingReplyId, setEditingReplyId] = useState(null);
  const [editingText, setEditingText] = useState("");

  // Auto-Reply States
  const [isAutoReplyOpen, setIsAutoReplyOpen] = useState(false);
  const [autoReplyActive, setAutoReplyActive] = useState(false);
  const [autoReplyMode, setAutoReplyMode] = useState("KEYWORD");
  const [keywordsList, setKeywordsList] = useState([]);
  const [aiPromptText, setAiPromptText] = useState("");
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [newKeywordInput, setNewKeywordInput] = useState("");
  const [newReplyInput, setNewReplyInput] = useState("");

  const [selectedAutoReplyPlatform, setSelectedAutoReplyPlatform] = useState("FACEBOOK");
  const [selectedSocialAccountId, setSelectedSocialAccountId] = useState("");

  useEffect(() => {
    if (isAutoReplyOpen) {
      const currentPlat = platformFilter.toUpperCase();
      if (currentPlat === "FACEBOOK" || currentPlat === "INSTAGRAM") {
        setSelectedAutoReplyPlatform(currentPlat);
      } else {
        setSelectedAutoReplyPlatform("FACEBOOK");
      }
    }
  }, [isAutoReplyOpen, platformFilter]);

  const filteredAccountsForAutoReply = activeBrand?.socialAccounts?.filter(
    sa => sa.platform === selectedAutoReplyPlatform && sa.isConnected
  ) || [];

  // Depend on a stable, derived key (sorted account ids joined) instead of
  // the raw activeBrand.socialAccounts array — that array is a new
  // reference every time fetchBrands() re-runs in the background (even
  // when its contents are unchanged), which previously reset
  // selectedSocialAccountId back to the first account on every background
  // brand refresh, discarding whatever the user had manually selected (#112 K10).
  const filteredAccountIdsKey = filteredAccountsForAutoReply.map(sa => sa.id).sort().join(',');

  useEffect(() => {
    if (filteredAccountsForAutoReply.length > 0) {
      const exists = filteredAccountsForAutoReply.some(sa => sa.id === selectedSocialAccountId);
      if (!exists) {
        setSelectedSocialAccountId(filteredAccountsForAutoReply[0].id);
      }
    } else {
      setSelectedSocialAccountId("");
    }
  }, [selectedAutoReplyPlatform, filteredAccountIdsKey]);

  // Sync debounced search
  useEffect(() => {
    if (debouncedSearch !== (filters.search || "")) {
      updateFilters({ search: debouncedSearch });
    }
  }, [debouncedSearch]);

  useEffect(() => {
    setSearchTerm(filters.search || "");
  }, [filters.search]);

  // Fetch conversations
  const fetchInbox = async () => {
    if (!activeBrand) return;
    const requestId = ++inboxRequestIdRef.current;
    setLoading(true);
    try {
      const response = await inboxService.getInbox(activeBrand.id, searchParamsString);
      if (requestId !== inboxRequestIdRef.current) return; // a newer fetchInbox call already landed
      setInboxData(response || { data: [], meta: {} });
    } catch (error) {
      console.error("Inbox load error:", error);
    } finally {
      if (requestId === inboxRequestIdRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, [searchParamsString, activeBrand]);

  // Real-time Webhook updates via Socket.io
  useEffect(() => {
    if (!activeBrand) return;

    // Join brand room
    socketClient.emit("join_room", { brandId: activeBrand.id });
    console.log(`🔌 [InboxPage] Joined socket room for brand: ${activeBrand.id}`);

    const handleNewInboxItem = (data) => {
      // Check if new item matches the currently selected platform (ignoring case)
      if (data.platform?.toLowerCase() === platformFilter.toLowerCase()) {
        console.log("⚡ [InboxPage] Received new inbox item realtime:", data);
        fetchInbox();

        // If we are currently viewing this thread, refresh the thread messages
        if (activeConv && (activeConv.id === data.id || activeConv.id === data.parentItemId)) {
          fetchThread();
        }
      }
    };

    const handleInboxItemDeleted = (data) => {
      if (data.platformItemId) {
        console.log("⚡ [InboxPage] Inbox item deleted realtime:", data);
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
      console.log(`🔌 [InboxPage] Left socket room for brand: ${activeBrand.id}`);
    };
  }, [activeBrand?.id, platformFilter, activeConv?.id]);

  // Fetch thread for active conversation
  const fetchThread = async () => {
    if (!activeConv) return;
    const requestId = ++threadRequestIdRef.current;
    setThreadLoading(true);
    setVideoContext(null);
    try {
      const response = await inboxService.getThread(activeConv.id);
      if (requestId !== threadRequestIdRef.current) return; // a newer fetchThread call already landed
      setThread(response?.thread || []);
      setVideoContext(response?.videoContext || null);

      if (activeConv.unread) {
        handleUpdateStatus(activeConv.id, 'READ');
      }
    } catch (error) {
      toast.error(t("inbox.loadThreadFailed"));
    } finally {
      if (requestId === threadRequestIdRef.current) setThreadLoading(false);
    }
  };

  useEffect(() => {
    fetchThread();
  }, [activeConv?.id]);

  const handleSync = async () => {
    if (!activeBrand) return;
    setIsSyncing(true);
    try {
      const platform = platformFilter.toUpperCase();
      await inboxService.syncInbox(activeBrand.id, platform);
      toast.success(t("inbox.syncSuccess"));
      await fetchInbox();
      if (activeConv) {
        await fetchThread();
      }
    } catch (e) {
      toast.error(t("inbox.syncFailed") + (e.message || ""));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateStatus = async (itemId, newStatus) => {
    try {
      await inboxService.updateInboxStatus(itemId, newStatus);
      setInboxData(prev => ({
        ...prev,
        data: prev.data.map(item => 
          item.id === itemId ? { ...item, status: newStatus.toLowerCase(), unread: newStatus === 'UNREAD' } : item
        )
      }));
      if (activeConv?.id === itemId) {
        setActiveConv(prev => ({ ...prev, status: newStatus.toLowerCase(), unread: newStatus === 'UNREAD' }));
      }
    } catch (e) {
      toast.error(t("inbox.updateStatusFailed"));
    }
  };

  const handleReply = async () => {
    if (!replyText || !activeConv || !activeBrand) return;
    setIsReplying(true);
    try {
      await inboxService.replyInbox({
        brandId: activeBrand.id,
        itemId: activeConv.id,
        text: replyText
      });
      toast.success(t("inbox.replySuccess"));
      setReplyText("");
      await fetchThread();
      await fetchInbox();
    } catch (e) {
      toast.error(t("inbox.replyFailed") + (e.message || ""));
    } finally {
      setIsReplying(false);
    }
  };

  const handleUpdateReply = async (replyId, newText) => {
    if (!newText || !activeBrand) return;
    try {
      await inboxService.updateInboxReply(replyId, {
        brandId: activeBrand.id,
        text: newText
      });
      toast.success(t("inbox.updateReplySuccess"));
      setEditingReplyId(null);
      setEditingText("");
      await fetchThread();
    } catch (e) {
      toast.error(t("inbox.updateReplyFailed") + (e.message || ""));
    }
  };

  const handleDeleteReply = async (replyId) => {
    if (!activeBrand) return;
    const isConfirmed = window.confirm(t("inbox.confirmDeleteReply"));
    if (!isConfirmed) return;

    try {
      await inboxService.deleteInboxReply(replyId, activeBrand.id);
      toast.success(t("inbox.deleteReplySuccess"));
      await fetchThread();
    } catch (e) {
      toast.error(t("inbox.deleteReplyFailed") + (e.message || ""));
    }
  };

  const activeFbAccount = activeBrand?.socialAccounts?.find(sa => sa.platform === "FACEBOOK" && sa.isConnected);
  const facebookAccountId = activeFbAccount?.id;

  useEffect(() => {
    if (isAutoReplyOpen && selectedSocialAccountId) {
      const fetchSettings = async () => {
        setLoadingSettings(true);
        try {
          const res = await inboxService.getAutoReplySettings(selectedSocialAccountId);
          const data = res || {};
          if (data) {
            const { isActive, mode, keywordsConfig, aiPrompt } = data;
            setAutoReplyActive(isActive);
            setAutoReplyMode(mode || "KEYWORD");
            setKeywordsList(keywordsConfig || []);
            setAiPromptText(aiPrompt || "");
          }
        } catch (err) {
          toast.error(t("inbox.settingsLoadFailed"));
        } finally {
          setLoadingSettings(false);
        }
      };
      fetchSettings();
    }
  }, [isAutoReplyOpen, selectedSocialAccountId, t]);

  const handleSaveAutoReplySettings = async () => {
    if (!selectedSocialAccountId) {
      toast.warning(t("inbox.connectFirst"));
      return;
    }
    setSavingSettings(true);
    try {
      await inboxService.saveAutoReplySettings(selectedSocialAccountId, {
        isActive: autoReplyActive,
        mode: autoReplyMode,
        keywordsConfig: keywordsList,
        aiPrompt: aiPromptText
      });
      toast.success(t("inbox.settingsSuccess"));
      setIsAutoReplyOpen(false);
    } catch (err) {
      toast.error(t("inbox.settingsFailed") + (err.message || ""));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddKeywordRule = () => {
    if (!newKeywordInput.trim() || !newReplyInput.trim()) {
      toast.error(t("inbox.fillKeywordsError"));
      return;
    }
    const keywords = newKeywordInput.split(',').map(k => k.trim()).filter(Boolean);
    const newRule = { keywords, reply: newReplyInput.trim() };
    setKeywordsList([...keywordsList, newRule]);
    setNewKeywordInput("");
    setNewReplyInput("");
  };

  const handleRemoveKeywordRule = (index) => {
    setKeywordsList(keywordsList.filter((_, i) => i !== index));
  };

  return (
    <div className="h-[calc(100vh-70px)] w-full flex overflow-hidden bg-[#F8F8F7] p-4 gap-4">
      {/* Sidebar (List) */}
      <div className="w-[380px] bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 flex items-center justify-between gap-4 relative border-b border-gray-50">
            <div className="flex gap-2">
              <button
                onClick={() => updateFilters({ platform: "YouTube" })}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                  platformFilter.toLowerCase() === "youtube"
                    ? "bg-red-50 border border-red-100 shadow-sm"
                    : "opacity-40 hover:opacity-80"
                }`}
              >
                <Youtube className="text-[#FF0000] fill-[#FF0000]" size={20} />
              </button>
              <button
                onClick={() => updateFilters({ platform: "Facebook" })}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                  platformFilter.toLowerCase() === "facebook"
                    ? "bg-blue-50 border border-blue-100 shadow-sm"
                    : "opacity-40 hover:opacity-80"
                }`}
              >
                <Facebook className="text-[#1877F2] fill-[#1877F2]" size={20} />
              </button>
              <button
                onClick={() => updateFilters({ platform: "Instagram", guildId: null, socialAccountId: null })}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                  platformFilter.toLowerCase() === "instagram"
                    ? "bg-pink-50 border border-pink-100 shadow-sm"
                    : "opacity-40 hover:opacity-80"
                }`}
              >
                <Instagram className="text-[#E1306C]" size={20} />
              </button>
            </div>
           <div className="flex items-center gap-2">
             {(platformFilter.toLowerCase() === "facebook" || platformFilter.toLowerCase() === "instagram") && (
               <button 
                 onClick={() => setIsAutoReplyOpen(true)}
                 title={t("inbox.autoReplySettings")}
                 className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 cursor-pointer"
               >
                 <Settings size={18} />
               </button>
             )}
             <button onClick={handleSync} disabled={isSyncing} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400"><RefreshCw size={18} className={isSyncing ? "animate-spin" : ""} /></button>
             <button className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-50 text-xl font-light">+</button>
           </div>
        </div>

        <div className="p-4 pb-2 flex gap-2">
           <div className="relative flex-1 group">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
              <input type="text" placeholder={t("inbox.searchConversation")} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-gray-50/50 border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none" />
           </div>
            <div className="relative">
              <button 
                onClick={() => setIsFilterMenuOpen(prev => !prev)}
                className={`w-11 h-11 rounded-xl border flex items-center justify-center text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors ${
                  isFilterMenuOpen || filters.type ? "border-black bg-gray-50" : "border-gray-200"
                }`}
              >
                <Filter size={18} />
              </button>
              
              {isFilterMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40 cursor-default" 
                    onClick={() => setIsFilterMenuOpen(false)} 
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-gray-100 shadow-xl py-2.5 z-50 text-left animate-in fade-in slide-in-from-top-3 duration-200 font-medium">
                    <div className="px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      {t("inbox.filterByType")}
                    </div>
                    
                    <button
                      onClick={() => {
                        updateFilters({ type: null });
                        setIsFilterMenuOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-xs font-bold text-[#0A0A0A] hover:bg-[#F8F8F7] flex items-center justify-between cursor-pointer border-none bg-transparent"
                    >
                      <span>{t("inbox.allMessages")}</span>
                      {(!filters.type || filters.type === 'all') && <Check size={12} className="text-green-500" />}
                    </button>

                    <button
                      onClick={() => {
                        updateFilters({ type: "DIRECT_MESSAGE" });
                        setIsFilterMenuOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-xs font-bold text-[#0A0A0A] hover:bg-[#F8F8F7] flex items-center justify-between cursor-pointer border-none bg-transparent"
                    >
                      <span>{t("inbox.privateMessages")}</span>
                      <div className="flex items-center gap-1.5">
                        <Facebook className="text-[#1877F2] fill-[#1877F2]" size={14} />
                        <Instagram className="text-[#E1306C]" size={14} />
                        <MessageSquare className="text-[#5865F2] fill-[#5865F2]" size={14} />
                        {filters.type === "DIRECT_MESSAGE" && <Check size={12} className="text-green-500 ml-1" />}
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        updateFilters({ type: "COMMENT" });
                        setIsFilterMenuOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-xs font-bold text-[#0A0A0A] hover:bg-[#F8F8F7] flex items-center justify-between cursor-pointer border-none bg-transparent"
                    >
                      <span>{t("inbox.comments")}</span>
                      <div className="flex items-center gap-1.5">
                        <Facebook className="text-[#1877F2] fill-[#1877F2]" size={14} />
                        <Youtube className="text-[#FF0000] fill-[#FF0000]" size={14} />
                        <Instagram className="text-[#E1306C]" size={14} />
                        <MessageSquare className="text-[#5865F2] fill-[#5865F2]" size={14} />
                        {filters.type === "COMMENT" && <Check size={12} className="text-green-500 ml-1" />}
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
        </div>

        <div className="flex px-2 border-b border-gray-50">
           {["Unresolved", "Unread", "All"].map(tVal => (
             <button key={tVal} onClick={() => updateFilters({ tab: tVal })} className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-widest relative ${tabFilter === tVal ? "text-black" : "text-gray-400"}`}>
               {t(`inbox.tabs.${tVal.toLowerCase()}`)}
               {tabFilter === tVal && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />}
             </button>
           ))}
           <button className="px-4 text-gray-300 hover:text-gray-600"><MoreHorizontal size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
           {loading ? (
             <div className="h-40 flex flex-col items-center justify-center gap-3"><Loader2 className="animate-spin text-gray-200" size={32} /></div>
           ) : inboxData.data?.length === 0 ? (
             <div className="p-12 text-center flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-200"><MessageSquare size={32} /></div>
                <p className="text-[11px] font-bold text-gray-400 uppercase">{t("inbox.noConversations", { tab: t(`inbox.tabs.${tabFilter.toLowerCase()}`).toLowerCase() })}</p>
             </div>
           ) : (
             inboxData.data.map(conv => (
               <ConversationItem key={conv.id} conv={conv} activeConv={activeConv} onSelect={setActiveConv} onUpdateStatus={handleUpdateStatus} />
             ))
           )}
        </div>

        {/* Pagination Footer */}
        {inboxData.meta && inboxData.meta.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-50 flex items-center justify-between bg-white text-[11px] font-bold text-gray-500">
            <button
              onClick={() => updateFilters({ page: currentPage - 1 })}
              disabled={currentPage <= 1}
              className="px-2.5 py-1.5 rounded-lg border border-gray-100 disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              {t("inbox.pagination.previous")}
            </button>
            <span>
              {t("inbox.pagination.pageOf", { current: currentPage, total: inboxData.meta.totalPages })}
            </span>
            <button
              onClick={() => updateFilters({ page: currentPage + 1 })}
              disabled={currentPage >= inboxData.meta.totalPages}
              className="px-2.5 py-1.5 rounded-lg border border-gray-100 disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              {t("inbox.pagination.next")}
            </button>
          </div>
        )}
      </div>

      {/* Main Content (Thread) */}
      <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden relative">
         {!activeConv ? (
           <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-500">
              <div className="relative mb-8">
                 <div className="w-64 h-64 bg-[#F8F8F7] rounded-[60px] rotate-12 flex items-center justify-center">
                    <div className="w-48 h-48 bg-white rounded-[50px] -rotate-12 flex items-center justify-center border border-gray-50 shadow-sm">
                       <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center text-gray-200"><AlertCircle size={48} strokeWidth={1.5} /></div>
                    </div>
                 </div>
              </div>
              <h3 className="text-[15px] font-bold text-gray-400 uppercase tracking-[0.1em]">{t("inbox.selectConversationPrompt")}</h3>
           </div>
         ) : (
           <>
             <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                   <div className="relative shrink-0 w-10 h-10">
                      {activeConv.participants?.length > 1 ? (
                        <>
                           <div className="w-7 h-7 rounded-full overflow-hidden border-2 border-white shadow-sm bg-gray-50 absolute top-0 left-0 z-10 flex">
                              <SafeAvatar src={activeConv.participants[0].avatar} name={activeConv.participants[0].name} className="w-full h-full object-cover" />
                           </div>
                           <div className="w-7 h-7 rounded-full overflow-hidden border-2 border-white shadow-sm bg-[#4A3AFF] absolute bottom-0 right-0 z-0 flex items-center justify-center text-[8px] font-bold text-white">
                              <SafeAvatar src={activeConv.participants[1].avatar} name={activeConv.participants[1].name} className="w-full h-full object-cover" />
                           </div>
                        </>
                      ) : (
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-100 bg-gray-50 flex">
                           <SafeAvatar src={activeConv.avatar} name={activeConv.user} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white flex items-center justify-center shadow-sm z-20">
                          {activeConv.platform?.toLowerCase() === "facebook" ? (
                            <Facebook className="text-[#1877F2] fill-[#1877F2]" size={8} />
                          ) : activeConv.platform?.toLowerCase() === "instagram" ? (
                            <Instagram className="text-[#E1306C]" size={8} />
                          ) : (
                            <Youtube className="text-[#FF0000] fill-[#FF0000]" size={8} />
                          )}
                       </div>
                    </div>
                    <div>
                      <h4 className="text-[13px] font-bold text-[#0A0A0A]">{activeConv.user}</h4>
                      <div className="flex items-center gap-1"><MessageSquare className="text-gray-400" size={10} /><span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{activeConv.type === 'direct_message' ? t("inbox.privateMessages").toUpperCase() : t("inbox.comments").toUpperCase()}</span></div>
                   </div>
                </div>
                <div className="flex items-center gap-2">
                   <button onClick={() => handleUpdateStatus(activeConv.id, activeConv.unread ? 'READ' : 'UNREAD')} className={`p-2 transition-colors ${activeConv.unread ? "text-black" : "text-gray-300 hover:text-gray-500"}`}><EyeOff size={18} /></button>
                   <button onClick={() => handleUpdateStatus(activeConv.id, 'RESOLVED')} className={`p-2 transition-colors ${activeConv.status === 'resolved' ? "text-green-500" : "text-gray-300 hover:text-green-500"}`}><CheckCircle size={18} /></button>
                   <div className="w-px h-4 bg-gray-100 mx-1" />
                   {videoContext && (
                     <a href={`https://www.youtube.com/watch?v=${videoContext.id}`} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg transition-all"><ExternalLink size={16} /></a>
                   )}
                </div>
             </div>
 
             <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-8 scrollbar-thin bg-[#FDFDFD]">
                {threadLoading ? (
                  <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-gray-100" size={40} /></div>
                ) : (
                  <>
                    <VideoContextCard videoContext={videoContext} />
                    <div className="flex flex-col gap-8">
                      {thread.map((msg, i) => (
                        <div key={i} className={`flex items-start gap-4 w-full group/msg ${msg.from === "me" ? "flex-row-reverse" : ""}`}>
                           <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border-2 border-white shadow-sm bg-gray-50 flex items-center justify-center">
                              {msg.from === "me" ? (
                                <div className="w-full h-full bg-[#FF4F9A] flex items-center justify-center text-white text-[11px] font-bold">{activeBrand?.name?.charAt(0) || "C"}</div>
                              ) : (
                                <SafeAvatar src={msg.avatar} name={msg.author} className="w-full h-full object-cover" />
                              )}
                           </div>
                           
                           {/* Hover edit/delete action controls */}
                           {msg.from === "me" && editingReplyId !== msg.id && (
                             <div className="opacity-0 group-hover/msg:opacity-100 transition-opacity flex gap-2 self-center mr-2">
                               <button 
                                 onClick={() => { 
                                   setEditingReplyId(msg.id); 
                                   setEditingText(msg.text); 
                                 }} 
                                 className="text-[10px] font-bold text-gray-400 hover:text-black transition-all bg-white border border-gray-100 px-2 py-1 rounded-lg shadow-sm cursor-pointer"
                               >
                                 ✏️ {t("common:edit")}
                               </button>
                               <button 
                                 onClick={() => handleDeleteReply(msg.id)} 
                                 className="text-[10px] font-bold text-red-400 hover:text-red-600 transition-all bg-white border border-gray-100 px-2 py-1 rounded-lg shadow-sm cursor-pointer"
                               >
                                 🗑️ {t("common:delete")}
                               </button>
                             </div>
                           )}

                           <div className={`max-w-[70%] space-y-1.5 flex flex-col ${msg.from === "me" ? "items-end" : "items-start"}`}>
                              {editingReplyId === msg.id ? (
                                <div className="w-full flex flex-col gap-2 bg-[#FEF3C7] border border-[#FDE68A] p-3 rounded-2xl rounded-tr-none">
                                  <textarea
                                    value={editingText}
                                    onChange={(e) => setEditingText(e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded-xl p-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
                                    rows={2}
                                  />
                                  <div className="flex justify-end gap-2">
                                    <button 
                                      onClick={() => setEditingReplyId(null)} 
                                      className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-[10px] font-bold text-gray-500 hover:bg-gray-50 cursor-pointer"
                                    >
                                      {t("common:cancel")}
                                    </button>
                                    <button 
                                      onClick={() => handleUpdateReply(msg.id, editingText)} 
                                      className="px-2.5 py-1 bg-[#0A0A0A] text-white rounded-lg text-[10px] font-bold hover:scale-105 transition-all cursor-pointer"
                                    >
                                      {t("common:save")}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className={`px-5 py-3 text-[13px] leading-relaxed shadow-sm whitespace-pre-wrap ${msg.from === "me" ? "bg-[#FEF3C7] text-[#92400E] rounded-2xl rounded-tr-none border border-[#FDE68A] self-end" : "bg-[#EEF2FF] text-[#1E1B4B] rounded-2xl rounded-tl-none border border-[#E0E7FF] self-start"}`}>{msg.text}</div>
                              )}
                              
                              <div className={`flex items-center gap-1.5 px-1 ${msg.from === "me" ? "flex-row-reverse" : ""}`}>
                                 <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{msg.from === "me" ? t("inbox.managerRole") : msg.author}</span>
                                 <span className="text-[14px] text-gray-200 leading-none">·</span>
                                 <span className="text-[9px] font-bold text-gray-300 uppercase">{msg.time}</span>
                              </div>
                           </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
             </div>

             <ReplyComposer replyText={replyText} setReplyText={setReplyText} onReply={handleReply} isReplying={isReplying} />
           </>
         )}
      </div>

      {/* Auto-Reply Settings Modal */}
      {isAutoReplyOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-[550px] bg-white rounded-3xl border border-gray-100 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
                  selectedAutoReplyPlatform === "FACEBOOK" 
                    ? "bg-blue-50 text-blue-600 border-blue-100" 
                    : "bg-pink-50 text-pink-600 border-pink-100"
                }`}>
                  {selectedAutoReplyPlatform === "FACEBOOK" ? (
                    <Facebook className="fill-blue-600" size={20} />
                  ) : (
                    <Instagram size={20} />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{t("inbox.autoReplyTitle")}</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t("inbox.autoReplySubtitle")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedAutoReplyPlatform}
                  onChange={(e) => setSelectedAutoReplyPlatform(e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-xs rounded-xl px-2.5 py-1.5 outline-none font-bold text-gray-800 focus:border-gray-400"
                >
                  <option value="FACEBOOK">Facebook</option>
                  <option value="INSTAGRAM">Instagram</option>
                </select>
                <button 
                  onClick={() => setIsAutoReplyOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-450 hover:bg-gray-150 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingSettings ? (
                <div className="h-60 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="animate-spin text-gray-300" size={32} />
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">{t("inbox.loadingSettings")}</span>
                </div>
              ) : (
                <>
                  {/* Account Selector Dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">{t("inbox.connectedAccount")}</label>
                    <select
                      value={selectedSocialAccountId}
                      onChange={(e) => setSelectedSocialAccountId(e.target.value)}
                      className="w-full bg-slate-50 border border-gray-200 text-xs rounded-xl px-3 py-2.5 outline-none font-semibold text-gray-800 focus:border-gray-450"
                    >
                      {filteredAccountsForAutoReply.map(sa => (
                        <option key={sa.id} value={sa.id}>
                          {sa.displayName} ({sa.platformAccountId})
                        </option>
                      ))}
                      {filteredAccountsForAutoReply.length === 0 && (
                        <option value="">{t("inbox.noConnectedAccount")}</option>
                      )}
                    </select>
                  </div>

                  {/* Status Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-50/50 border border-gray-100 rounded-2xl">
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">{t("inbox.enableAutoReply")}</h4>
                      <p className="text-[10px] text-gray-400 font-medium">{t("inbox.enableAutoReplyDesc")}</p>
                    </div>
                    <button
                      onClick={() => setAutoReplyActive(!autoReplyActive)}
                      className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-200 focus:outline-none flex items-center ${
                        autoReplyActive ? "bg-black justify-end" : "bg-gray-200 justify-start"
                      }`}
                    >
                      <div className="w-4.5 h-4.5 rounded-full bg-white shadow-sm" />
                    </button>
                  </div>

                  {autoReplyActive && (
                    <div className="space-y-6 animate-in slide-in-from-top-4 duration-300">
                      {/* Mode Selection */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("inbox.responseMode")}</label>
                        <div className="flex gap-2 bg-gray-50 p-1 rounded-xl border border-gray-100">
                          <button
                            onClick={() => setAutoReplyMode("KEYWORD")}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold tracking-wider transition-all flex items-center justify-center gap-2 ${
                              autoReplyMode === "KEYWORD"
                                ? "bg-white text-black shadow-sm"
                                : "text-gray-400 hover:text-gray-600"
                            }`}
                          >
                            💬 {t("inbox.keywordBased")}
                          </button>
                          <button
                            onClick={() => setAutoReplyMode("AI")}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold tracking-wider transition-all flex items-center justify-center gap-2 ${
                              autoReplyMode === "AI"
                                ? "bg-white text-black shadow-sm"
                                : "text-gray-400 hover:text-gray-600"
                            }`}
                          >
                            <Sparkles size={14} className="text-purple-500 fill-purple-100" /> {t("inbox.aiAutoReply")}
                          </button>
                        </div>
                      </div>

                      {/* Keyword-based Config */}
                      {autoReplyMode === "KEYWORD" && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("inbox.activeRules")}</label>
                            {keywordsList.length === 0 ? (
                              <div className="text-center p-6 bg-gray-50/30 border border-dashed border-gray-200 rounded-2xl flex flex-col items-center gap-2">
                                <MessageSquare className="text-gray-300" size={24} />
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{t("inbox.noKeywordRules")}</p>
                              </div>
                            ) : (
                              <div className="space-y-2 max-h-[220px] overflow-y-auto scrollbar-thin pr-1">
                                {keywordsList.map((rule, idx) => (
                                  <div key={idx} className="p-3 bg-white border border-gray-100 rounded-xl flex items-start justify-between gap-3 shadow-sm hover:border-gray-200 transition-colors">
                                    <div className="space-y-1.5 flex-1 min-w-0">
                                      <div className="flex flex-wrap gap-1">
                                        {rule.keywords.map((kw, kwIdx) => (
                                          <span key={kwIdx} className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-md text-[9px] font-bold uppercase tracking-wider">
                                            {kw}
                                          </span>
                                        ))}
                                      </div>
                                      <p className="text-xs text-gray-600 font-medium leading-relaxed italic">"{rule.reply}"</p>
                                    </div>
                                    <button 
                                      onClick={() => handleRemoveKeywordRule(idx)}
                                      className="text-gray-300 hover:text-red-500 transition-colors shrink-0 p-1 cursor-pointer"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Add New Rule */}
                          <div className="p-4 border border-gray-100 rounded-2xl space-y-3 bg-gray-50/30">
                            <h5 className="text-[10px] font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                              <Plus size={12} /> {t("inbox.addNewRule")}
                            </h5>
                            <div className="space-y-3">
                              <div>
                                <input
                                  type="text"
                                  placeholder={t("inbox.keywordsPlaceholder")}
                                  value={newKeywordInput}
                                  onChange={(e) => setNewKeywordInput(e.target.value)}
                                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-gray-400"
                                />
                              </div>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder={t("inbox.replyContentPlaceholder")}
                                  value={newReplyInput}
                                  onChange={(e) => setNewReplyInput(e.target.value)}
                                  className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-gray-400"
                                />
                                <button
                                  type="button"
                                  onClick={handleAddKeywordRule}
                                  className="bg-black text-white hover:bg-gray-800 rounded-xl px-4 py-2 text-xs font-bold transition-colors cursor-pointer"
                                >
                                  {t("inbox.add")}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* AI-based Config */}
                      {autoReplyMode === "AI" && (
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("inbox.aiAgentInstructions")}</label>
                          <textarea
                            rows={4}
                            placeholder={t("inbox.aiAgentInstructionsPlaceholder")}
                            value={aiPromptText}
                            onChange={(e) => setAiPromptText(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-2xl p-3.5 text-xs leading-relaxed focus:outline-none focus:border-gray-400 resize-none"
                          />
                          <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-xl flex gap-2.5">
                            <Sparkles className="text-purple-500 shrink-0 mt-0.5" size={14} />
                            <p className="text-[10px] text-purple-700 font-medium leading-relaxed">
                              <strong>{t("inbox.aiAgentTips")}</strong> {t("inbox.aiAgentTipsDesc")}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-50 flex justify-end gap-3 bg-gray-50/30">
              <button
                onClick={() => setIsAutoReplyOpen(false)}
                className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                {t("common:cancel")}
              </button>
              <button
                onClick={handleSaveAutoReplySettings}
                disabled={savingSettings || loadingSettings}
                className="px-5 py-2 bg-[#0A0A0A] hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer"
              >
                {savingSettings && <Loader2 className="animate-spin" size={12} />}
                {t("inbox.saveSettings")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
