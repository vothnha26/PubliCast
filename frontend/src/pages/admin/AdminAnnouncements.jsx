import { useState, useEffect } from "react";
import { Megaphone, Plus, Trash2, X, Check, Loader2, ExternalLink } from "lucide-react";
import apiService from "../../services/api";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/useConfirm";

const TYPE_LABELS = {
  system: "Hệ thống & Gói cước",
  platform: "Nền tảng liên kết",
  content: "Duyệt nội dung",
  team: "Hoạt động nhóm",
  stream: "Luồng Livestream"
};

const TYPE_COLORS = {
  system: "bg-indigo-100 text-indigo-750 border-indigo-200",
  platform: "bg-amber-100 text-amber-700 border-amber-200",
  content: "bg-emerald-100 text-emerald-700 border-emerald-200",
  team: "bg-blue-100 text-blue-700 border-blue-200",
  stream: "bg-red-100 text-red-700 border-red-200"
};

function AnnouncementModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    type: "system",
    actionUrl: ""
  });
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error("Vui lòng nhập đầy đủ Tiêu đề và Nội dung thông báo");
      return;
    }

    setSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-[#0A0A0A]">Phát thông báo hệ thống</h3>
            <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-bold">New Global Announcement</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400 hover:text-black">
            <X size={24} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-8 space-y-5 overflow-y-auto max-h-[60vh]">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Tiêu đề thông báo</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none text-sm font-bold"
                placeholder="Ví dụ: Bảo trì cổng kết nối TikTok API vào rạng sáng 12/07"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Phân loại</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none text-sm font-semibold"
              >
                <option value="system">Hệ thống & Gói cước (System)</option>
                <option value="platform">Nền tảng liên kết (API/Connection)</option>
                <option value="content">Duyệt nội dung (Content approval)</option>
                <option value="team">Hoạt động nhóm (Team activity)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Nội dung chi tiết</label>
              <textarea
                rows={4}
                required
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none text-sm font-medium resize-none"
                placeholder="Nhập thông tin chi tiết để người dùng nắm rõ. Khuyến khích ghi rõ thời gian bắt đầu và kết thúc bảo trì nếu có."
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Đường dẫn liên kết (Action URL - Tùy chọn)</label>
              <input
                type="text"
                value={formData.actionUrl}
                onChange={(e) => setFormData({ ...formData, actionUrl: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none text-sm font-medium"
                placeholder="/settings hoặc https://status.publicast.com"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-6 bg-gray-50 flex gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border border-gray-200 bg-white text-sm font-bold text-gray-600 hover:bg-gray-100 transition-all"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 rounded-2xl bg-black text-white text-sm font-bold hover:bg-gray-800 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <Check size={16} /> Phát thông báo
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AdminAnnouncements() {
  const confirm = useConfirm();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await apiService.get("/admin/announcements");
      setAnnouncements(res.data.data || []);
    } catch (err) {
      toast.error("Không thể tải danh sách thông báo hệ thống");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleSave = async (data) => {
    try {
      await apiService.post("/admin/announcements", data);
      toast.success("Đã phát thông báo toàn hệ thống thành công!");
      fetchAnnouncements();
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể phát thông báo");
      throw err;
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: "Gỡ bỏ thông báo?",
      description: "Bạn có chắc chắn muốn gỡ bỏ thông báo này? Người dùng sẽ không thấy thông báo này nữa.",
      confirmText: "Gỡ bỏ",
      cancelText: "Hủy",
      variant: "destructive"
    });

    if (isConfirmed) {
      try {
        await apiService.delete(`/admin/announcements/${id}`);
        toast.success("Đã xóa thông báo thành công");
        fetchAnnouncements();
      } catch (err) {
        toast.error("Không thể xóa thông báo");
      }
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8F8F7]" style={{ padding: "40px 60px" }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div className="flex gap-5">
          <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-gray-100 text-black">
            <Megaphone size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#0A0A0A]">System Announcements</h1>
            <p className="text-gray-500 mt-1">Tạo và phát đi các thông báo khẩn cấp toàn hệ thống (bảo trì, cập nhật cước phí).</p>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-[#0A0A0A] text-white rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-xl"
        >
          <Plus size={18} />
          Tạo thông báo mới
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-gray-300" size={40} />
        </div>
      ) : (
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <th className="px-8 py-4">Thông báo</th>
                <th className="px-8 py-4">Phân loại</th>
                <th className="px-8 py-4">Liên kết</th>
                <th className="px-8 py-4">Đã xem (Lượt)</th>
                <th className="px-8 py-4">Thời gian phát</th>
                <th className="px-8 py-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {announcements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-10 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                    Chưa có thông báo nào được phát sóng
                  </td>
                </tr>
              ) : (
                announcements.map((ann) => (
                  <tr key={ann.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-5 max-w-[300px]">
                      <div className="text-sm font-bold text-[#0A0A0A] line-clamp-1">{ann.title}</div>
                      <div className="text-xs text-gray-400 mt-1 line-clamp-2">{ann.message}</div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${TYPE_COLORS[ann.type] || "bg-gray-100 text-gray-700"}`}>
                        {TYPE_LABELS[ann.type] || ann.type}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      {ann.actionUrl ? (
                        <a
                          href={ann.actionUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold"
                        >
                          Xem liên kết <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400 font-medium">—</span>
                      )}
                    </td>
                    <td className="px-8 py-5">
                      <div className="text-sm font-bold text-[#0A0A0A]">{ann.readCount}</div>
                    </td>
                    <td className="px-8 py-5 text-xs text-gray-400 font-medium">
                      {new Date(ann.createdAt).toLocaleString()}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button
                        onClick={() => handleDelete(ann.id)}
                        className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 shadow-sm border border-transparent hover:border-red-100 transition-all opacity-0 group-hover:opacity-100"
                        title="Gỡ thông báo"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <AnnouncementModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
