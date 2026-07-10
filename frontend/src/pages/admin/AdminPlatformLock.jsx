import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, Lock, Unlock, AlertTriangle, Edit3, X, Check, Loader2, RefreshCw, Smartphone, Tv, Eye
} from "lucide-react";
import apiService from "../../services/api";
import { toast } from "sonner";

export function AdminPlatformLock() {
  const [limits, setLimits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  
  // Modal state
  const [selectedLimit, setSelectedLimit] = useState(null);
  const [lockReason, setLockReason] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // View rules modal state
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingLimit, setViewingLimit] = useState(null);

  // Fetch all platform limits
  const fetchLimits = async () => {
    setLoading(true);
    try {
      // Admin limits endpoint
      const response = await apiService.get("/admin/platform-limits");
      setLimits(response.data?.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể tải cấu hình nền tảng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLimits();
  }, []);

  // Handle toggle switch click
  const handleToggle = async (limit) => {
    if (limit.isLocked) {
      // Unlock immediately
      setTogglingId(limit.id);
      try {
        const response = await apiService.patch(`/admin/platform-limits/${limit.id}/lock`, {
          isLocked: false
        });
        toast.success(`Đã mở khóa nền tảng ${limit.platform} (${limit.subType})`);
        
        // Update local state
        setLimits(prev => prev.map(item => item.id === limit.id ? { ...item, isLocked: false, lockReason: null } : item));
      } catch (error) {
        toast.error(error.response?.data?.message || "Không thể mở khóa nền tảng");
      } finally {
        setTogglingId(null);
      }
    } else {
      // Open modal to get lock reason
      setSelectedLimit(limit);
      setLockReason("Bảo trì API hệ thống");
      setIsModalOpen(true);
    }
  };

  // Submit lock
  const handleLockSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLimit) return;

    setTogglingId(selectedLimit.id);
    setIsModalOpen(false);

    try {
      const response = await apiService.patch(`/admin/platform-limits/${selectedLimit.id}/lock`, {
        isLocked: true,
        lockReason: lockReason.trim()
      });
      
      toast.success(`Đã khóa nền tảng ${selectedLimit.platform} (${selectedLimit.subType})`);
      
      // Update local state
      setLimits(prev => prev.map(item => item.id === selectedLimit.id ? { ...item, isLocked: true, lockReason: lockReason.trim() } : item));
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể khóa nền tảng");
    } finally {
      setTogglingId(null);
      setSelectedLimit(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8F8F7]" style={{ padding: "40px 60px" }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div className="flex gap-5">
           <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-gray-100 text-[#DC2626]">
              <Lock size={28} />
           </div>
           <div>
              <h1 className="text-2xl font-bold text-[#0A0A0A]">Platform Availability & Governance</h1>
              <p className="text-gray-500 mt-1">Quản lý trạng thái khóa hoạt động các nền tảng mạng xã hội trên toàn hệ thống.</p>
           </div>
        </div>
        <div>
          <button 
            onClick={fetchLimits}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Tải Lại
          </button>
        </div>
      </div>

      {/* Info Warning Card */}
      <div className="mb-10 p-6 rounded-[32px] bg-amber-50 border border-amber-100 flex items-start gap-4">
         <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white shrink-0 shadow-lg">
            <AlertTriangle size={24} />
         </div>
         <div>
            <h3 className="text-sm font-black text-amber-800 uppercase tracking-widest">Lưu ý quan trọng</h3>
            <p className="text-sm text-amber-700 font-medium mt-1">
              Khi một nền tảng bị khóa (Locked), người dùng sẽ không thể chọn nền tảng này trong trình soạn thảo bài viết (Post Composer). 
              Các bài đăng tự động hoặc được lên lịch sẵn cho nền tảng bị khóa sẽ hiển thị cảnh báo tạm hoãn đăng.
            </p>
         </div>
      </div>

      {/* Grid Platform limits */}
      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
           <thead>
              <tr className="bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">
                 <th className="px-8 py-4">Nền tảng</th>
                 <th className="px-8 py-4">Phân loại đăng</th>
                 <th className="px-8 py-4">Giới hạn tệp tin</th>
                 <th className="px-8 py-4">Trạng thái khóa</th>
                 <th className="px-8 py-4">Lý do khóa</th>
                 <th className="px-8 py-4 text-right">Hành động</th>
              </tr>
           </thead>
           <tbody className="divide-y divide-gray-50">
              {loading && limits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#0A0A0A] mb-3" />
                      <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">Đang tải danh sách...</span>
                    </div>
                  </td>
                </tr>
              ) : limits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-10 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <ShieldAlert size={28} className="text-gray-300 mb-2" />
                      <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">Không có cấu hình nào</span>
                    </div>
                  </td>
                </tr>
              ) : limits.map((limit) => {
                const isItemToggling = togglingId === limit.id;
                return (
                  <tr key={limit.id} className="hover:bg-gray-55/30 transition-colors">
                     <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-lg font-bold">
                              {limit.platform[0]}
                           </div>
                           <div>
                              <div className="text-sm font-bold text-[#0A0A0A]">{limit.platform}</div>
                              <div className="text-[10px] text-gray-400 font-semibold tracking-wide uppercase">ID: {limit.id.substring(0, 8)}</div>
                           </div>
                        </div>
                     </td>
                     <td className="px-8 py-5">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter bg-gray-100 text-gray-700 border border-gray-200">
                           {limit.subType}
                        </span>
                     </td>
                     <td className="px-8 py-5 text-xs text-gray-600 font-mono">
                        {limit.maxFileSizeMb ? `${limit.maxFileSizeMb} MB` : 'N/A'}
                     </td>
                     <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                           <div className={`w-2 h-2 rounded-full ${limit.isLocked ? "bg-red-500 animate-pulse" : "bg-green-500"}`} />
                           <span className={`text-[10px] font-black uppercase tracking-wider ${limit.isLocked ? "text-red-650" : "text-green-700"}`}>
                             {limit.isLocked ? "Đã khóa" : "Hoạt động"}
                           </span>
                        </div>
                     </td>
                     <td className="px-8 py-5">
                        {limit.isLocked ? (
                          <div className="text-xs font-semibold text-red-600 bg-red-50/50 px-3 py-1.5 rounded-xl inline-block max-w-[250px] truncate" title={limit.lockReason}>
                            {limit.lockReason || "Không có lý do cụ thể"}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 font-medium">—</span>
                        )}
                     </td>
                     <td className="px-8 py-5 text-right">
                         <div className="flex justify-end gap-2">
                           <button
                             onClick={() => {
                               setViewingLimit(limit);
                               setIsViewModalOpen(true);
                             }}
                             className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold transition-all shadow-sm"
                           >
                             <Eye size={13} />
                             Xem chi tiết
                           </button>
                           <button
                             disabled={isItemToggling}
                             onClick={() => handleToggle(limit)}
                             className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                               limit.isLocked
                                 ? "bg-green-600 hover:bg-green-700 text-white"
                                 : "bg-red-600 hover:bg-red-700 text-white"
                             } disabled:opacity-50`}
                           >
                             {isItemToggling ? (
                               <Loader2 size={13} className="animate-spin" />
                             ) : limit.isLocked ? (
                               <Unlock size={13} />
                             ) : (
                               <Lock size={13} />
                             )}
                             {limit.isLocked ? "Mở khóa" : "Tạm khóa"}
                           </button>
                         </div>
                     </td>
                  </tr>
                );
              })}
           </tbody>
        </table>
      </div>

      {/* Lock Reason Dialog Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center px-8 py-6 border-b border-gray-100">
                 <h3 className="text-xl font-bold text-[#0A0A0A]">Khóa Nền Tảng</h3>
                 <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400 hover:text-black">
                   <X size={24} />
                 </button>
              </div>
              <form onSubmit={handleLockSubmit}>
                <div className="p-8 space-y-6">
                   <div className="flex items-center gap-3 p-4 bg-red-50 rounded-2xl border border-red-100 text-red-700">
                     <Lock size={20} className="shrink-0" />
                     <span className="text-xs font-semibold">
                       Bạn đang thực hiện khóa nền tảng <strong>{selectedLimit?.platform} ({selectedLimit?.subType})</strong>.
                     </span>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Lý do tạm khóa</label>
                      <textarea 
                        rows={3}
                        required
                        value={lockReason} 
                        onChange={(e) => setLockReason(e.target.value)} 
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none text-sm font-medium resize-none"
                        placeholder="Ví dụ: API YouTube đang bảo trì đột xuất bởi Google..."
                      />
                   </div>
                </div>
                <div className="px-8 py-6 bg-gray-50 flex gap-3 border-t border-gray-100">
                   <button 
                     type="button" 
                     onClick={() => setIsModalOpen(false)} 
                     className="flex-1 py-3 rounded-2xl border border-gray-200 bg-white text-sm font-bold text-gray-650"
                   >
                     Hủy
                   </button>
                   <button 
                     type="submit" 
                     className="flex-1 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-sm font-bold text-white shadow-lg shadow-red-600/20"
                   >
                     Khóa Hoạt Động
                   </button>
                </div>
              </form>
           </div>
        </div>
      )}

      {/* View Rules Details Modal */}
      {isViewModalOpen && viewingLimit && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center px-8 py-6 border-b border-gray-100">
                 <div>
                    <h3 className="text-xl font-bold text-[#0A0A0A]">Chi Tiết Quy Tắc Validation</h3>
                    <p className="text-xs text-gray-500 mt-1">Nền tảng: <strong className="text-black">{viewingLimit.platform}</strong> ({viewingLimit.subType})</p>
                 </div>
                 <button onClick={() => { setIsViewModalOpen(false); setViewingLimit(null); }} className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400 hover:text-black">
                   <X size={24} />
                 </button>
              </div>
              <div className="p-8 space-y-6 overflow-y-auto">
                 {/* Basic limits info */}
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                       <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Giới Hạn Tệp Tin (File Size)</span>
                       <span className="text-sm font-bold text-gray-800 mt-1 block">
                          {viewingLimit.maxFileSizeMb ? `${viewingLimit.maxFileSizeMb} MB` : 'Không giới hạn'}
                       </span>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                       <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Dung lượng Video tối đa</span>
                       <span className="text-sm font-bold text-gray-800 mt-1 block">
                          {viewingLimit.maxVideoSize ? `${(Number(viewingLimit.maxVideoSize) / (1024 * 1024)).toFixed(1)} MB` : 'Không giới hạn'}
                       </span>
                    </div>
                 </div>

                 {/* Rules JSON Table */}
                 <div className="space-y-3">
                    <h4 className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wider">Danh sách quy tắc kiểm duyệt (Rules Engine)</h4>
                    {(!viewingLimit.rules || Object.keys(viewingLimit.rules).length === 0) ? (
                       <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center text-xs text-gray-400 font-medium">
                          Nền tảng này hiện đang dùng cấu hình kiểm duyệt mặc định, chưa nạp rules JSON.
                       </div>
                    ) : (
                       <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                          <table className="w-full text-left text-xs">
                             <thead>
                                <tr className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                                   <th className="px-4 py-3">Loại (Subtype)</th>
                                   <th className="px-4 py-3">Quy tắc (Field & Op)</th>
                                   <th className="px-4 py-3">Giá trị biên</th>
                                   <th className="px-4 py-3">Thông điệp cảnh báo</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
                                {Object.entries(viewingLimit.rules).flatMap(([subTypeKey, rulesArray]) => {
                                   if (!Array.isArray(rulesArray)) return [];
                                   return rulesArray.map((rule, idx) => (
                                      <tr key={`${subTypeKey}-${idx}`} className="hover:bg-gray-50/50">
                                         <td className="px-4 py-3">
                                            <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[9px] font-bold uppercase">
                                               {subTypeKey}
                                            </span>
                                         </td>
                                         <td className="px-4 py-3 font-mono text-[10px] text-blue-600">
                                            {rule.field} <span className="text-gray-400">({rule.operator})</span>
                                         </td>
                                         <td className="px-4 py-3 font-mono text-[10px] text-amber-600">
                                            {Array.isArray(rule.value) ? `[${rule.value.join(', ')}]` : String(rule.value)}
                                         </td>
                                         <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate" title={rule.message}>
                                            {rule.message}
                                         </td>
                                      </tr>
                                   ));
                                })}
                             </tbody>
                          </table>
                       </div>
                    )}
                 </div>
              </div>
              <div className="px-8 py-6 bg-gray-50 flex border-t border-gray-100 justify-end">
                 <button 
                   onClick={() => { setIsViewModalOpen(false); setViewingLimit(null); }} 
                   className="px-6 py-3 rounded-2xl border border-gray-200 bg-white text-sm font-bold text-gray-650 hover:bg-gray-50 transition-all"
                 >
                   Đóng
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
