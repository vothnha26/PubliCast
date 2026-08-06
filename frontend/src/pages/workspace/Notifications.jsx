import { useCallback, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Radio, CheckCircle, XCircle, AlertTriangle, Users, TrendingUp, CreditCard, FileText, Loader2, ExternalLink } from "lucide-react";
import { useFilters } from "../../hooks/useFilters";
import notificationService from "../../services/notification.service";
import { toast } from "sonner";
import { openNotificationStream } from "../../utils/notification-stream";
import { useBrand } from "../../context/BrandContext";
import { useTranslation } from "react-i18next";

const TYPE_ICONS = {
  stream: <Radio size={14} style={{ color: "#FFF" }} />,
  content: <FileText size={14} style={{ color: "#FFF" }} />,
  team: <Users size={14} style={{ color: "#FFF" }} />,
  platform: <AlertTriangle size={14} style={{ color: "#FFF" }} />,
  system: <CreditCard size={14} style={{ color: "#FFF" }} />,
  milestone: <TrendingUp size={14} style={{ color: "#FFF" }} />
};

export function NotificationsPage() {
  const { t } = useTranslation("notifications");
  const { activeBrand } = useBrand();
  const navigate = useNavigate();
  const { filters, updateFilters, clearFilters, searchParamsString } = useFilters({
    category: "all",
    isRead: "",
    startDate: "",
    endDate: "",
    page: "1",
    limit: "20"
  });

  const activeCategory = filters.category || "all";
  const [notifData, setNotifData] = useState({ data: [], meta: { categoryCounts: {} } });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchNotifications = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      const queryParams = new URLSearchParams(searchParamsString);
      if (activeBrand?.id && !queryParams.has("brandId")) {
        queryParams.set("brandId", activeBrand.id);
      }
      const paramsObj = Object.fromEntries(queryParams.entries());
      const response = await notificationService.getNotifications(paramsObj);
      
      const rawData = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.notifications)
            ? response.notifications
            : [];

      const meta = response?.meta || { categoryCounts: {} };

      setNotifData({
        data: rawData,
        meta
      });
      setErrorMessage("");
    } catch (error) {
      const message = error.message || t("toasts.loadFailed");
      setErrorMessage(message);
      if (!silent) {
        toast.error(message);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [searchParamsString, activeBrand]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    let stream;
    try {
      stream = openNotificationStream();
      const refreshSilently = () => fetchNotifications({ silent: true });
      stream.addEventListener("notification.created", refreshSilently);
      stream.addEventListener("notification.read", (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload?.notificationId) {
            setNotifData(prev => ({
              ...prev,
              data: (prev?.data || []).map(n => n.id === payload.notificationId ? { ...n, isRead: true } : n)
            }));
          }
        } catch (err) {
          console.error("Error parsing notification.read payload", err);
        }
        refreshSilently();
      });
      stream.addEventListener("notifications.read_all", (e) => {
        setNotifData(prev => ({
          ...prev,
          data: (prev?.data || []).map(n => ({ ...n, isRead: true }))
        }));
        refreshSilently();
      });
      stream.onerror = () => {
        console.error("Notification stream disconnected");
      };
    } catch (error) {
      console.error("Notification stream error:", error);
    }

    return () => {
      stream?.close();
    };
  }, [searchParamsString, fetchNotifications]);

  const markAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id, activeBrand?.id);
      // Optimistic update
      setNotifData(prev => ({
        ...prev,
        data: (prev?.data || []).map(n => n.id === id ? { ...n, isRead: true } : n)
      }));
      window.dispatchEvent(new Event("notifications:changed"));
    } catch (error) {
      toast.error(t("toasts.markReadFailed"));
    }
  };

  const markAllRead = async () => {
    try {
      await notificationService.markAllRead(activeBrand?.id);
      setNotifData(prev => ({
        ...prev,
        data: (prev?.data || []).map(n => ({ ...n, isRead: true }))
      }));
      window.dispatchEvent(new Event("notifications:changed"));
      toast.success(t("toasts.markAllReadSuccess"));
    } catch (error) {
      toast.error(t("toasts.markAllReadFailed"));
    }
  };

  const notifications = notifData.data || [];
  const counts = notifData.meta?.categoryCounts || {};
  const currentPage = notifData.meta?.page || 1;
  const totalPages = notifData.meta?.totalPages || 1;
  const total = notifData.meta?.total || 0;
  const showUnreadOnly = filters.isRead === "false";
  const hasDateFilter = Boolean(filters.startDate || filters.endDate);

  // Định nghĩa màu sắc pastel & sinh động cho từng loại thông báo
  const CATEGORY_STYLES = {
    stream: { bg: "bg-red-50 dark:bg-red-950/20", text: "text-red-500", iconBg: "#EF4444" },
    content: { bg: "bg-emerald-50 dark:bg-emerald-950/20", text: "text-emerald-500", iconBg: "#10B981" },
    team: { bg: "bg-blue-50 dark:bg-blue-950/20", text: "text-blue-500", iconBg: "#3B82F6" },
    platform: { bg: "bg-amber-50 dark:bg-amber-950/20", text: "text-amber-500", iconBg: "#F59E0B" },
    system: { bg: "bg-indigo-50 dark:bg-indigo-950/20", text: "text-indigo-500", iconBg: "#6366F1" },
    milestone: { bg: "bg-purple-50 dark:bg-purple-950/20", text: "text-purple-500", iconBg: "#8B5CF6" }
  };

  const categories = [
    { label: t("categories.all"), count: counts.all || 0, key: "all", icon: <Bell size={14} /> },
    { label: t("categories.content"), count: counts.content || 0, key: "content", icon: <FileText size={14} /> },
    { label: t("categories.team"), count: counts.team || 0, key: "team", icon: <Users size={14} /> },
    { label: t("categories.platform"), count: counts.platform || 0, key: "platform", icon: <AlertTriangle size={14} /> },
    { label: t("categories.system"), count: counts.system || 0, key: "system", icon: <CreditCard size={14} /> },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-app-bg font-sans" style={{ padding: "30px 40px" }}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Controls Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
          <div>
            <h1 className="text-xl font-black text-[var(--foreground)] tracking-tight">{t("title")}</h1>
            <p className="text-xs font-medium text-[var(--muted-foreground)] mt-1">
              {t("subtitle", { count: notifications.length, total })}
            </p>
          </div>

          {/* Filtering Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] rounded-xl px-3 py-1.5 shadow-sm">
              <span className="text-[9px] font-extrabold text-[var(--muted-foreground)] uppercase">{t("fromDate")}</span>
              <input
                type="date"
                value={filters.startDate || ""}
                onChange={(e) => {
                  const newStart = e.target.value;
                  if (newStart && filters.endDate && newStart > filters.endDate) {
                    toast.error(t("toasts.dateOrderError"));
                    return;
                  }
                  updateFilters({ startDate: newStart });
                }}
                className="text-xs font-bold text-[var(--foreground)] bg-transparent border-none outline-none focus:ring-0 cursor-pointer"
                aria-label="Start date"
              />
            </div>

            <div className="flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] rounded-xl px-3 py-1.5 shadow-sm">
              <span className="text-[9px] font-extrabold text-[var(--muted-foreground)] uppercase">{t("toDate")}</span>
              <input
                type="date"
                value={filters.endDate || ""}
                onChange={(e) => {
                  const newEnd = e.target.value;
                  if (newEnd) {
                    if (!filters.startDate) {
                      toast.error(t("toasts.selectStartDateFirst"));
                      return;
                    }
                    if (filters.startDate > newEnd) {
                      toast.error(t("toasts.dateOrderError"));
                      return;
                    }
                  }
                  updateFilters({ endDate: newEnd });
                }}
                className="text-xs font-bold text-[var(--foreground)] bg-transparent border-none outline-none focus:ring-0 cursor-pointer"
                aria-label="End date"
              />
            </div>

            <button
              onClick={() => updateFilters({ isRead: showUnreadOnly ? "" : "false" })}
              className={`text-xs font-bold px-4 py-2 rounded-xl border border-[var(--border)] cursor-pointer transition-all shadow-sm ${
                showUnreadOnly 
                  ? "bg-purple-600 text-white border-purple-600 hover:bg-purple-700" 
                  : "bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)]/50"
              }`}
            >
              {t("unread")}
            </button>
            
            {(filters.category !== "all" || filters.isRead || hasDateFilter) && (
              <button
                onClick={clearFilters}
                className="text-xs font-semibold px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]/50 cursor-pointer transition-all shadow-sm"
              >
                {t("clearFilters")}
              </button>
            )}

            <button
              onClick={markAllRead}
              disabled={loading || (counts.all || 0) === 0}
              className={`text-xs font-extrabold px-3 py-2 rounded-xl transition-all cursor-pointer ${
                loading || (counts.all || 0) === 0 
                  ? "text-gray-300 cursor-not-allowed" 
                  : "text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/20"
              }`}
            >
              {t("markAllRead")}
            </button>
          </div>
        </div>

        {/* Horizontal Navigation Categories Bar */}
        <div className="flex flex-wrap items-center gap-2 p-1 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => updateFilters({ category: cat.key })}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer text-xs font-bold transition-all duration-200 ${
                  isActive 
                    ? "bg-purple-600 text-white shadow-md shadow-purple-100 dark:shadow-none" 
                    : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                {cat.count > 0 && (
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    isActive 
                      ? "bg-card text-purple-600" 
                      : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                  }`}>
                    {cat.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Notif content status switcher */}
        {errorMessage && !loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[var(--muted-foreground)] gap-3 bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-sm">
            <XCircle size={40} className="text-red-500" />
            <span className="text-xs font-bold uppercase tracking-wider">{t("loadErrorTitle")}</span>
            <span className="text-xs text-muted-foreground">{errorMessage}</span>
            <button
              onClick={() => fetchNotifications()}
              className="mt-2 text-xs font-bold px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)] cursor-pointer transition-all shadow-sm"
            >
              {t("tryAgain")}
            </button>
          </div>
        ) : loading ? (
          <div className="flex flex-col gap-3.5 animate-pulse">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="flex items-start gap-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 h-24 shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-[var(--muted)] shrink-0" />
                <div className="flex-1 space-y-2.5">
                  <div className="w-1/3 h-4 bg-[var(--muted)] rounded-lg" />
                  <div className="w-2/3 h-3 bg-[var(--muted)]/60 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[var(--muted-foreground)] gap-4 bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-sm">
            <div className="w-16 h-16 rounded-full bg-purple-50 dark:bg-purple-950/20 flex items-center justify-center text-purple-600">
              <Bell size={28} className="animate-bounce" />
            </div>
            <div className="text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--foreground)] block">{t("emptyTitle")}</span>
              <span className="text-xs text-muted-foreground mt-1 block">{t("emptyDesc")}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {notifications.map((notif) => {
              const borderLeftColor = notif.isRead ? "border-[var(--border)]" : "border-l-4 border-l-purple-600";
              const catStyle = CATEGORY_STYLES[notif.category] || { bg: "bg-muted dark:bg-gray-800/20", text: "text-muted-foreground", iconBg: "#6B7280" };
              
              return (
                <div
                  key={notif.id}
                  className={`flex items-start gap-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 transition-all duration-200 hover:shadow-md relative group ${borderLeftColor} ${
                    notif.isRead ? "opacity-70" : "shadow-sm"
                  }`}
                >
                  {/* Category squircle icon badge (Pastel & Vivid design) */}
                  <div
                    className={`flex items-center justify-center rounded-xl shrink-0 w-10 h-10 shadow-sm ${catStyle.bg} ${catStyle.text}`}
                  >
                    {TYPE_ICONS[notif.category] || <Bell size={16} />}
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0 pr-8">
                    <div className={`text-sm text-[var(--foreground)] mb-1 leading-snug ${notif.isRead ? "font-semibold" : "font-extrabold"}`}>
                      {notif.title}
                    </div>
                    <div className="text-xs font-medium text-[var(--muted-foreground)] leading-relaxed">
                      {notif.desc}
                    </div>
                    <div className="text-[10px] font-bold text-muted-foreground mt-2 flex items-center gap-1.5">
                      <span>•</span>
                      <span>{notif.time}</span>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-2 self-center shrink-0">
                    {notif.action && (
                      <button
                        className="px-3.5 py-1.5 rounded-xl border border-[var(--border)] text-xs font-bold text-[var(--foreground)] bg-[var(--card)] hover:bg-[var(--muted)] cursor-pointer transition-all shadow-sm flex items-center gap-1.5"
                        onClick={() => {
                          // actionUrl is always meant to be an internal app
                          // route (every value set anywhere in the backend
                          // starts with "/"). Previously anything not
                          // starting with "/" fell through to
                          // window.location.href, so a crafted notification
                          // with actionUrl="https://evil.example.com" (or a
                          // "javascript:" URL in some browsers) would
                          // redirect the user off-site — an open-redirect /
                          // phishing vector (#110). Only ever client-side
                          // navigate to a same-origin relative path.
                          if (notif.actionUrl && notif.actionUrl.startsWith("/")) {
                            navigate(notif.actionUrl);
                          }
                          markAsRead(notif.id);
                        }}
                      >
                        {notif.action}
                        <ExternalLink size={10} className="opacity-60" />
                      </button>
                    )}

                    {!notif.isRead && (
                      <button 
                        onClick={() => markAsRead(notif.id)}
                        className="p-2 rounded-lg bg-[var(--muted)]/50 hover:bg-purple-100 hover:text-purple-700 dark:hover:bg-purple-950/30 text-[var(--muted-foreground)] transition-all cursor-pointer"
                        title={t("markAsRead")}
                      >
                        <CheckCircle size={15} />
                      </button>
                    )}
                  </div>

                  {/* Optional Blue dot indicator for Unread */}
                  {!notif.isRead && (
                    <div className="absolute top-5 right-5 w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination controls */}
        {!loading && totalPages >= 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--border)]">
            <span className="text-xs font-semibold text-[var(--muted-foreground)]">
              {t("pageInfo", { current: currentPage, total: totalPages })}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => updateFilters({ page: currentPage - 1 })}
                className={`px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-bold transition-all ${
                  currentPage <= 1 
                    ? "bg-muted text-gray-300 dark:bg-[var(--muted)]/30 dark:text-muted-foreground cursor-not-allowed" 
                    : "bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)]/50 cursor-pointer"
                }`}
              >
                {t("previous")}
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => updateFilters({ page: currentPage + 1 })}
                className={`px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-bold transition-all ${
                  currentPage >= totalPages 
                    ? "bg-muted text-gray-300 dark:bg-[var(--muted)]/30 dark:text-muted-foreground cursor-not-allowed" 
                    : "bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)]/50 cursor-pointer"
                }`}
              >
                {t("next")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

