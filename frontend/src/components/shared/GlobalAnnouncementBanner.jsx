import { useState, useEffect } from "react";
import { X, Megaphone, AlertTriangle, Info, ShieldAlert, ArrowRight } from "lucide-react";
import apiService from "../../services/api";
import { openNotificationStream } from "../../utils/notification-stream";

const TYPE_CONFIG = {
  system: { bg: "bg-indigo-600 text-white", icon: <Info size={16} /> },
  platform: { bg: "bg-amber-500 text-white", icon: <AlertTriangle size={16} /> },
  content: { bg: "bg-emerald-600 text-white", icon: <Info size={16} /> },
  stream: { bg: "bg-red-650 text-white", icon: <ShieldAlert size={16} /> }
};

export function GlobalAnnouncementBanner() {
  const [announcement, setAnnouncement] = useState(null);

  const fetchActiveAnnouncement = async () => {
    try {
      // Chỉ lấy các thông báo chưa đọc
      const res = await apiService.get("/notifications?isRead=false&limit=10");
      const unread = res.data?.data || [];
      
      // Tìm thông báo toàn hệ thống (isGlobal = true) chưa đọc mới nhất
      const globalAnn = unread.find(n => n.isGlobal === true);
      setAnnouncement(globalAnn || null);
    } catch (err) {
      console.error("Error fetching global announcement:", err);
    }
  };

  useEffect(() => {
    fetchActiveAnnouncement();

    // Lắng nghe sự kiện thông báo thay đổi để cập nhật banner
    window.addEventListener("notifications:changed", fetchActiveAnnouncement);

    // Lắng nghe qua Server-Sent Events (SSE) để cập nhật thông báo realtime
    let stream;
    try {
      stream = openNotificationStream();
      const handleUpdate = () => fetchActiveAnnouncement();
      stream.addEventListener("notification.created", handleUpdate);
      stream.addEventListener("notification.read", handleUpdate);
      stream.addEventListener("notifications.read_all", handleUpdate);
    } catch (err) {
      console.error("SSE connection in Announcement Banner failed:", err);
    }

    return () => {
      window.removeEventListener("notifications:changed", fetchActiveAnnouncement);
      stream?.close();
    };
  }, []);

  const handleDismiss = async () => {
    if (!announcement) return;
    try {
      // Đánh dấu đã đọc
      await apiService.post(`/notifications/${announcement.id}/read`);
      setAnnouncement(null);
      // Phát sự kiện cập nhật để trang thông báo chung đồng bộ theo
      window.dispatchEvent(new Event("notifications:changed"));
    } catch (err) {
      console.error("Failed to dismiss announcement:", err);
    }
  };

  if (!announcement) return null;

  const config = TYPE_CONFIG[announcement.category] || TYPE_CONFIG.system;

  return (
    <div className={`w-full flex items-center justify-between px-6 py-3 transition-all ${config.bg} shadow-md`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="shrink-0 w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
          {config.icon}
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xs font-black uppercase tracking-widest bg-white/10 px-2 py-0.5 rounded border border-white/15">
            Thông báo
          </span>
          <span className="text-xs font-extrabold truncate" title={announcement.title}>
            {announcement.title}:
          </span>
          <span className="text-xs font-medium opacity-90 truncate" title={announcement.desc}>
            {announcement.desc}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0 ml-4">
        {announcement.actionUrl && (
          <a
            href={announcement.actionUrl}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-[#0A0A0A] rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-gray-150 transition-all no-underline shadow-sm"
          >
            Xem chi tiết <ArrowRight size={10} />
          </a>
        )}
        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-white/20 rounded-md transition-colors text-white"
          title="Bỏ qua thông báo"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
