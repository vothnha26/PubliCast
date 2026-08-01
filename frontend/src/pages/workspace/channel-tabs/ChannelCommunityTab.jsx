import { useState } from "react";
import { Search, RefreshCw, MessageSquare, AlertCircle, EyeOff, CheckCircle, ExternalLink, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useChannelCommunity } from "../../../hooks/channels/useChannelCommunity";
import { useBrand } from "../../../context/BrandContext";
import { ConversationItem, SafeAvatar } from "../../../components/inbox/ConversationItem";
import { VideoContextCard } from "../../../components/inbox/VideoContextCard";
import { ReplyComposer } from "../../../components/inbox/ReplyComposer";

const TABS = ["Unresolved", "Unread", "All"];

export function ChannelCommunityTab({ socialAccountId, platform }) {
  const { t } = useTranslation(["manage", "common"]);
  const { activeBrand } = useBrand();
  const [replyText, setReplyText] = useState("");
  const [editingReplyId, setEditingReplyId] = useState(null);
  const [editingText, setEditingText] = useState("");

  const {
    tabFilter, setTabFilter,
    searchTerm, setSearchTerm,
    currentPage, setCurrentPage,
    inboxData, loading,
    activeConv, setActiveConv,
    thread, videoContext, threadLoading,
    isSyncing, isReplying,
    handleSync, handleUpdateStatus, handleReply, handleUpdateReply, handleDeleteReply,
  } = useChannelCommunity(socialAccountId);

  const onReply = async () => {
    const ok = await handleReply(replyText);
    if (ok) setReplyText("");
  };

  const onSaveEdit = async (msgId) => {
    await handleUpdateReply(msgId, editingText);
    setEditingReplyId(null);
    setEditingText("");
  };

  const onDeleteReply = (msgId) => {
    if (window.confirm(t("inbox.confirmDeleteReply"))) {
      handleDeleteReply(msgId);
    }
  };

  return (
    <div className="flex-1 flex gap-4 p-4 min-h-0">
      {/* Conversation list */}
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
          {TABS.map((tVal) => (
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

      {/* Thread */}
      <div className="flex-1 bg-card rounded-2xl border border-border shadow-sm flex flex-col overflow-hidden relative">
        {!activeConv ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-6">
              <AlertCircle size={40} strokeWidth={1.5} />
            </div>
            <h3 className="text-[15px] font-bold text-muted-foreground uppercase tracking-[0.1em]">{t("inbox.selectConversationPrompt")}</h3>
          </div>
        ) : (
          <>
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-border bg-muted flex shrink-0">
                  <SafeAvatar src={activeConv.avatar} name={activeConv.user} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h4 className="text-[13px] font-bold text-foreground">{activeConv.user}</h4>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="text-muted-foreground" size={10} />
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                      {activeConv.type === "direct_message" ? t("inbox.privateMessages").toUpperCase() : t("inbox.comments").toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleUpdateStatus(activeConv.id, activeConv.unread ? "READ" : "UNREAD")} className="p-2 border-none bg-transparent cursor-pointer" style={{ color: activeConv.unread ? "var(--foreground)" : "var(--muted-foreground)" }}>
                  <EyeOff size={18} />
                </button>
                <button onClick={() => handleUpdateStatus(activeConv.id, "RESOLVED")} className="p-2 border-none bg-transparent cursor-pointer" style={{ color: activeConv.status === "resolved" ? "#22c55e" : "var(--muted-foreground)" }}>
                  <CheckCircle size={18} />
                </button>
                {videoContext && (
                  <a href={`https://www.youtube.com/watch?v=${videoContext.id}`} target="_blank" rel="noopener noreferrer" className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-all">
                    <ExternalLink size={16} />
                  </a>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-8 scrollbar-thin bg-background">
              {threadLoading ? (
                <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-muted-foreground" size={40} /></div>
              ) : (
                <>
                  <VideoContextCard videoContext={videoContext} activeConv={activeConv} />
                  <div className="flex flex-col gap-8">
                    {thread.map((msg, i) => (
                      <div key={i} className={`flex items-start gap-4 w-full group/msg ${msg.from === "me" ? "flex-row-reverse" : ""}`}>
                        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border-2 border-background shadow-sm bg-muted flex items-center justify-center">
                          {msg.from === "me" ? (
                            <div className="w-full h-full bg-[#FF4F9A] flex items-center justify-center text-white text-[11px] font-bold">{activeBrand?.name?.charAt(0) || "C"}</div>
                          ) : (
                            <SafeAvatar src={msg.avatar} name={msg.author} className="w-full h-full object-cover" />
                          )}
                        </div>

                        {msg.from === "me" && editingReplyId !== msg.id && (
                          <div className="opacity-0 group-hover/msg:opacity-100 transition-opacity flex gap-2 self-center mr-2">
                            <button
                              onClick={() => { setEditingReplyId(msg.id); setEditingText(msg.text); }}
                              className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition-all bg-card border border-border px-2 py-1 rounded-lg shadow-sm cursor-pointer"
                            >
                              {t("common:edit")}
                            </button>
                            <button
                              onClick={() => onDeleteReply(msg.id)}
                              className="text-[10px] font-bold text-red-400 hover:text-red-600 transition-all bg-card border border-border px-2 py-1 rounded-lg shadow-sm cursor-pointer"
                            >
                              {t("common:delete")}
                            </button>
                          </div>
                        )}

                        <div className={`max-w-[70%] space-y-1.5 flex flex-col ${msg.from === "me" ? "items-end" : "items-start"}`}>
                          {editingReplyId === msg.id ? (
                            <div className="w-full flex flex-col gap-2 bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl rounded-tr-none">
                              <textarea
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                className="w-full bg-card border border-border text-foreground rounded-xl p-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
                                rows={2}
                              />
                              <div className="flex justify-end gap-2">
                                <button onClick={() => setEditingReplyId(null)} className="px-2.5 py-1 bg-card border border-border rounded-lg text-[10px] font-bold text-muted-foreground hover:bg-muted cursor-pointer">
                                  {t("common:cancel")}
                                </button>
                                <button onClick={() => onSaveEdit(msg.id)} className="px-2.5 py-1 bg-primary text-primary-foreground rounded-lg text-[10px] font-bold cursor-pointer">
                                  {t("common:save")}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              className="px-5 py-3 text-[13px] leading-relaxed shadow-sm whitespace-pre-wrap rounded-2xl border"
                              style={
                                msg.from === "me"
                                  ? { background: "oklch(0.9 0.05 80 / 0.15)", borderColor: "oklch(0.7 0.1 80 / 0.3)", borderTopRightRadius: 0 }
                                  : { background: "oklch(0.6 0.15 280 / 0.1)", borderColor: "oklch(0.6 0.15 280 / 0.25)", borderTopLeftRadius: 0 }
                              }
                            >
                              {msg.text}
                            </div>
                          )}
                          <div className={`flex items-center gap-1.5 px-1 ${msg.from === "me" ? "flex-row-reverse" : ""}`}>
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{msg.from === "me" ? t("inbox.managerRole") : msg.author}</span>
                            <span className="text-[14px] text-muted-foreground leading-none">·</span>
                            <span className="text-[9px] font-bold text-muted-foreground uppercase">{msg.time}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <ReplyComposer replyText={replyText} setReplyText={setReplyText} onReply={onReply} isReplying={isReplying} />
          </>
        )}
      </div>
    </div>
  );
}
