import React, { useState, useEffect, useCallback } from "react";
import { Gauge, RefreshCw, AlertTriangle, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import adminService from "../../services/admin.service";
import { toast } from "sonner";

function formatMonthLabel(year, month) {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function AdminPostingUsage() {
  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth() + 1);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminService.getPostingUsageMonthlyOverview(year, month);
      setOverview(response || null);
    } catch (error) {
      toast.error(error.message || "Không thể tải dữ liệu sử dụng đăng bài");
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const shiftMonth = (delta) => {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth < 1) { newMonth = 12; newYear -= 1; }
    if (newMonth > 12) { newMonth = 1; newYear += 1; }
    setMonth(newMonth);
    setYear(newYear);
  };

  const platforms = overview?.platforms || [];

  return (
    <div className="flex-1 overflow-y-auto bg-background" style={{ padding: "40px 60px" }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div className="flex gap-5">
          <div className="w-14 h-14 rounded-2xl bg-card flex items-center justify-center shadow-sm border border-border text-[#DC2626]">
            <Gauge size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Fair Use Posting Usage</h1>
            <p className="text-muted-foreground mt-1">Theo dõi tỷ lệ tài khoản chạm/gần chạm giới hạn đăng bài hằng ngày trên toàn hệ thống.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-card border border-border rounded-xl px-2 py-1.5">
            <button onClick={() => shiftMonth(-1)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold text-foreground px-2 min-w-[120px] text-center">
              {formatMonthLabel(year, month)}
            </span>
            <button onClick={() => shiftMonth(1)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
              <ChevronRight size={16} />
            </button>
          </div>
          <button
            onClick={fetchOverview}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-card border border-border rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Tải Lại
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-6 mb-10">
        <div className="bg-card rounded-[32px] border border-border shadow-sm p-6">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Tổng bài đã đăng (tháng)</div>
          <div className="text-3xl font-black text-foreground">{overview?.totalPublished ?? 0}</div>
        </div>
        <div className="bg-card rounded-[32px] border border-border shadow-sm p-6">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Tổng account-ngày ghi nhận</div>
          <div className="text-3xl font-black text-foreground">{overview?.totalAccountDays ?? 0}</div>
        </div>
      </div>

      {/* Grid Platform usage */}
      <div className="bg-card rounded-[40px] border border-border shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-muted/50 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-gray-50">
              <th className="px-8 py-4">Nền tảng</th>
              <th className="px-8 py-4">Account-ngày</th>
              <th className="px-8 py-4">Tổng bài đăng</th>
              <th className="px-8 py-4">Chạm giới hạn</th>
              <th className="px-8 py-4">Gần giới hạn (≥80%)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && platforms.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-8 py-20 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#0A0A0A] mb-3" />
                    <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Đang tải dữ liệu...</span>
                  </div>
                </td>
              </tr>
            ) : platforms.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-8 py-10 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <TrendingUp size={28} className="text-gray-300 mb-2" />
                    <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Chưa có dữ liệu cho tháng này</span>
                  </div>
                </td>
              </tr>
            ) : platforms.map((p) => {
              const atCapPct = Math.round(p.atCapRate * 100);
              const nearCapPct = Math.round(p.nearCapRate * 100);
              return (
                <tr key={p.platform} className="hover:bg-gray-55/30 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center text-lg font-bold">
                        {p.platform[0]}
                      </div>
                      <div className="text-sm font-bold text-foreground">{p.platform}</div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-sm text-muted-foreground font-mono">{p.accountDays}</td>
                  <td className="px-8 py-5 text-sm text-muted-foreground font-mono">{p.totalPublished}</td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      {atCapPct >= 20 && <AlertTriangle size={14} className="text-red-500" />}
                      <span className={`text-xs font-bold ${atCapPct >= 20 ? "text-red-600" : "text-foreground"}`}>
                        {p.atCapDays} ({atCapPct}%)
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-xs font-bold text-amber-600">{p.nearCapDays} ({nearCapPct}%)</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
