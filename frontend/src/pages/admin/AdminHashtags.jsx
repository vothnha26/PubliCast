import { useState, useEffect } from "react";
import { Hash, RefreshCw, Layers, Calendar, Clock, Loader2, Sparkles, AlertCircle } from "lucide-react";
import apiService from "../../services/api";
import { toast } from "sonner";

// SOLID: Tránh magic strings bằng cách khai báo constants
const PLATFORM_LABELS = {
  TIKTOK: "TikTok Trend",
  INSTAGRAM: "Instagram Insights"
};

const PLATFORM_COLORS = {
  TIKTOK: "bg-black text-white border-black",
  INSTAGRAM: "bg-pink-100 text-pink-700 border-pink-200"
};

export function AdminHashtags() {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiService.get("/admin/hashtags");
      setSnapshots(res.data.snapshots || []);
      if (res.data.snapshots && res.data.snapshots.length > 0) {
        setSelectedSnapshot(res.data.snapshots[0]);
      }
    } catch (error) {
      toast.error("Không thể tải danh sách snapshot hashtag.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    toast.info("Đang bắt đầu đồng bộ dữ liệu hashtag từ API ngoại...");
    try {
      const res = await apiService.post("/admin/hashtags/sync");
      setSnapshots(res.data.snapshots || []);
      if (res.data.snapshots && res.data.snapshots.length > 0) {
        setSelectedSnapshot(res.data.snapshots[0]);
      }
      toast.success("Đồng bộ dữ liệu hashtag trending thành công!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Đồng bộ thất bại. Vui lòng kiểm tra RapidAPI config.");
      console.error(error);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-10 max-w-[1200px] mx-auto space-y-8 font-sans">
      
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-8 rounded-[24px] border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Hash className="text-purple-600" size={24} />
            Global Hashtags Configuration
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Đồng bộ và phân phối hashtag trending từ RapidAPI TokAPI xuống cho toàn bộ user hệ thống sử dụng chung.
          </p>
        </div>
        
        <button
          onClick={handleSync}
          disabled={syncing || loading}
          className="px-6 py-3 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-md hover:bg-purple-700 disabled:bg-purple-300 transition-all flex items-center gap-2 cursor-pointer"
        >
          {syncing ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RefreshCw size={14} />
          )}
          ĐỒNG BỘ TỪ API
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-xs text-gray-400 font-bold gap-2">
          <Loader2 size={24} className="animate-spin text-purple-600" />
          Đang tải dữ liệu snapshots...
        </div>
      ) : snapshots.length === 0 ? (
        <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center mx-auto text-purple-600">
            <AlertCircle size={24} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800">Chưa có snapshot hashtag nào</h3>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              Hệ thống chưa lưu trữ dữ liệu trending snapshot nào trong DB. Nhấn nút <strong>Đồng bộ từ API</strong> phía trên để kéo dữ liệu đầu tiên về.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Snapshots List (Left/Col 1 & 2) */}
          <div className="lg:col-span-2 bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-8 py-5 border-b border-gray-50 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">Lịch sử Snapshots ({snapshots.length})</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50 border-b border-gray-100">
                  <tr>
                    {["Nền tảng", "Ngày snapshot", "Số lượng tags", "Cập nhật lúc", ""].map(h => (
                      <th key={h} className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {snapshots.map((snap) => {
                    const tags = snap.dataJson ? JSON.parse(snap.dataJson) : [];
                    const isSelected = selectedSnapshot?.id === snap.id;
                    return (
                      <tr 
                        key={snap.id} 
                        onClick={() => setSelectedSnapshot(snap)}
                        className={`hover:bg-purple-50/20 transition-all cursor-pointer ${isSelected ? 'bg-purple-50/40' : ''}`}
                      >
                        <td className="px-8 py-5">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${PLATFORM_COLORS[snap.platform] || 'bg-gray-100 text-gray-500'}`}>
                            {PLATFORM_LABELS[snap.platform] || snap.platform}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-xs font-semibold text-gray-700">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-gray-400" />
                            {new Date(snap.snapshotDate).toLocaleDateString("vi-VN")}
                          </div>
                        </td>
                        <td className="px-8 py-5 text-xs font-bold text-purple-700">
                          {tags.length} hashtags
                        </td>
                        <td className="px-8 py-5 text-xs text-gray-400 font-semibold font-mono">
                          <div className="flex items-center gap-1.5">
                            <Clock size={12} className="text-gray-400" />
                            {new Date(snap.fetchedAt).toLocaleTimeString("vi-VN")}
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">
                            {isSelected ? "Đang chọn" : "Xem chi tiết"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Details (Right/Col 3) */}
          <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-6 space-y-6">
            <div className="border-b border-gray-50 pb-4">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <Sparkles size={14} className="text-purple-600 animate-pulse" />
                Hashtags List Details
              </h3>
              <p className="text-[10px] text-gray-400 mt-1">
                Danh sách hashtag thực tế lưu trong snapshot được chọn.
              </p>
            </div>

            {selectedSnapshot ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Nguồn snapshot:</span>
                  <span className="text-xs font-bold text-gray-800">
                    {PLATFORM_LABELS[selectedSnapshot.platform] || selectedSnapshot.platform}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 max-h-[400px] overflow-y-auto pr-1">
                  {(selectedSnapshot.dataJson ? JSON.parse(selectedSnapshot.dataJson) : []).map((tag, i) => {
                    // tag có thể là string hoặc object tuỳ API
                    const tagText = typeof tag === 'object' ? tag.hashtag || tag.name : tag;
                    return (
                      <span
                        key={i}
                        className="text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-100/60 px-3 py-1 rounded-full hover:bg-purple-100 transition-colors"
                      >
                        {tagText.startsWith('#') ? tagText : `#${tagText}`}
                      </span>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400 py-4 text-center font-medium">Chọn một snapshot để xem chi tiết.</p>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
