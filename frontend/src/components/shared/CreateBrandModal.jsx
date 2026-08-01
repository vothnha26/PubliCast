import React, { useState } from "react";
import { X, Sparkles, Loader2 } from "lucide-react";

export function CreateBrandModal({ isOpen, onClose, onCreate }) {
  const [brandName, setBrandName] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!brandName.trim()) return;

    setLoading(true);
    try {
      await onCreate({ name: brandName.trim() });
      setBrandName("");
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-6">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-300">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          disabled={loading}
          className="absolute -top-3 -right-3 w-10 h-10 bg-[#2D1D35] text-white rounded-full flex items-center justify-center hover:scale-110 transition-all shadow-lg z-[2100] border-2 border-white cursor-pointer disabled:opacity-50"
        >
          <X size={20} />
        </button>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Sparkles size={18} />
            </div>
            <h2 className="text-lg font-bold text-foreground">Tạo thương hiệu mới</h2>
          </div>
          
          <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
            Thêm một thương hiệu mới giúp bạn quản lý các tài khoản mạng xã hội, lên lịch bài viết và theo dõi số liệu phân tích một cách độc lập.
          </p>

          <div className="space-y-4">
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tên thương hiệu</label>
              <input 
                type="text"
                required
                disabled={loading}
                placeholder="Ví dụ: TechVN Studio, Beauty Salon..."
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border focus:border-black outline-none text-sm font-semibold transition-all shadow-sm focus:ring-1 focus:ring-black/10"
                data-testid="create-brand-name"
              />
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-3 border border-gray-300 rounded-xl text-xs font-bold text-foreground hover:bg-muted transition-all cursor-pointer text-center disabled:opacity-50"
                data-testid="cancel-brand-btn"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={loading || !brandName.trim()}
                className="flex-1 py-3 bg-[#2D1D35] hover:bg-[#3D2D45] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                data-testid="submit-brand-btn"
              >
                {loading && <Loader2 className="animate-spin" size={14} />}
                Tạo mới
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
