import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import React, { useState, useEffect } from "react";
import adminService from "../../services/admin.service";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const typeColors = {
  New: { bg: "#DCFCE7", color: "#16A34A" },
  Renewal: { bg: "#F3F4F6", color: "#6B7280" },
  Upgrade: { bg: "#DBEAFE", color: "#1D4ED8" },
  Refund: { bg: "#FEE2E2", color: "#DC2626" },
};

export function RevenueDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRevenue = async () => {
      setLoading(true);
      try {
        const response = await adminService.getRevenueStats();
        setData(response || null);
      } catch (error) {
        toast.error("Failed to load revenue analytics");
      } finally {
        setLoading(false);
      }
    };

    fetchRevenue();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin text-gray-300" size={40} />
      </div>
    );
  }

  return (
    <div className="p-6 overflow-y-auto flex-1" style={{ fontFamily: "'DM Sans', sans-serif", background: "#F8F8F7" }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "#0A0A0A" }}>Revenue Dashboard</h1>
          <p style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>Platform-wide subscription and financial overview</p>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-2 rounded-lg bg-card shadow-sm" style={{ fontSize: 12, border: "0.5px solid #E5E7EB", color: "#6B7280" }}>Last 12 months ▾</button>
          <button className="px-3 py-2 rounded-lg bg-[#0A0A0A] text-white shadow-lg" style={{ fontSize: 12, fontWeight: 700 }}>Download Report</button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {data.kpis.map((kpi) => (
          <div key={kpi.label} className="bg-card rounded-xl p-4 shadow-sm" style={{ border: "0.5px solid #E5E7EB" }}>
            <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 4, fontWeight: 600, uppercase: true }}>{kpi.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#0A0A0A" }}>{kpi.value}</div>
            {kpi.delta && (
              <div style={{ fontSize: 10, color: kpi.delta.includes('↑') ? "#16A34A" : "#DC2626", fontWeight: 700 }}>
                {kpi.delta}
              </div>
            )}
            {/* Sparkline */}
            <svg viewBox="0 0 80 16" className="w-full mt-2" style={{ height: 16 }}>
              <polyline
                points="0,14 12,10 24,11 36,6 48,8 60,4 72,5 80,2"
                fill="none"
                stroke="#0A0A0A"
                strokeWidth="1.5"
              />
            </svg>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
         {/* MRR Breakdown */}
         <div className="bg-card rounded-[24px] p-6 col-span-2 shadow-sm" style={{ border: "0.5px solid #E5E7EB" }}>
           <div className="flex items-center justify-between mb-8">
              <span style={{ fontSize: 14, fontWeight: 700, color: "#0A0A0A" }}>MRR Growth</span>
              <span style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600 }}>USD ($)</span>
           </div>
           <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data.mrrTrend}>
                <defs>
                   <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0A0A0A" stopOpacity={0.05}/>
                      <stop offset="95%" stopColor="#0A0A0A" stopOpacity={0}/>
                   </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9CA3AF", fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fontSize: 10, fill: "#9CA3AF", fontWeight: 600 }} axisLine={false} tickLine={false} dx={-10} />
                <Tooltip 
                  contentStyle={{ fontSize: 11, borderRadius: 12, border: "none", background: "#0A0A0A", color: "#FFF", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
                  itemStyle={{ color: "#FFF" }}
                />
                <Area type="monotone" dataKey="mrr" stroke="#0A0A0A" fill="url(#colorMrr)" strokeWidth={2} name="MRR" />
              </AreaChart>
           </ResponsiveContainer>
         </div>

         {/* Distribution */}
         <div className="bg-card rounded-[24px] p-6 shadow-sm flex flex-col items-center justify-center" style={{ border: "0.5px solid #E5E7EB" }}>
            <div className="text-center mb-6">
              <div style={{ fontSize: 24, fontWeight: 800, color: "#0A0A0A" }}>{data.kpis[0].value}</div>
              <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Total MRR</div>
            </div>
            {/* Donut placeholder */}
            <svg viewBox="0 0 100 100" className="w-32 h-32 mb-6">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#F3F4F6" strokeWidth="12" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="#0A0A0A" strokeWidth="12" strokeDasharray="160 251" strokeDashoffset="0" strokeLinecap="round" />
            </svg>
            <div className="w-full space-y-2">
              {[{ name: "Pro Plan", color: "#0A0A0A", pct: "72%" }, { name: "Starter", color: "#6B7280", pct: "18%" }, { name: "Other", color: "#E5E7EB", pct: "10%" }].map((p) => (
                <div key={p.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                    <span style={{ fontSize: 11, color: "#6B7280", fontWeight: 500 }}>{p.name}</span>
                  </div>
                  <span style={{ fontSize: 11, color: "#0A0A0A", fontWeight: 700 }}>{p.pct}</span>
                </div>
              ))}
            </div>
         </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-card rounded-[32px] overflow-hidden shadow-sm" style={{ border: "0.5px solid #E5E7EB" }}>
        <div className="px-8 py-6 border-b border-border flex items-center justify-between">
          <span style={{ fontSize: 15, fontWeight: 700, color: "#0A0A0A" }}>Recent Transactions</span>
          <button className="text-[11px] font-bold text-muted-foreground hover:text-black uppercase tracking-widest transition-colors">View All</button>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ backgroundColor: "#FAFAFA", borderBottom: "0.5px solid #E5E7EB" }}>
              {["User", "Plan", "Amount", "Date", "Status", "Type", "Invoice"].map((h) => (
                <th key={h} className="text-left px-8 py-4" style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.transactions.length === 0 ? (
               <tr><td colSpan={7} className="px-8 py-10 text-center text-muted-foreground text-xs font-bold uppercase">No transactions yet</td></tr>
            ) : (
              data.transactions.map((t, i) => (
                <tr key={i} className="hover:bg-muted/50 transition-colors">
                  <td className="px-8 py-5">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#0A0A0A] text-white flex items-center justify-center text-[10px] font-bold">{t.user.charAt(0)}</div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#0A0A0A" }}>{t.user}</span>
                     </div>
                  </td>
                  <td className="px-8 py-5" style={{ fontSize: 12, color: "#6B7280", fontWeight: 500 }}>{t.plan}</td>
                  <td className="px-8 py-5" style={{ fontSize: 12, color: "#0A0A0A", fontWeight: 700 }}>{t.amount}</td>
                  <td className="px-8 py-5" style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 500 }}>{t.date}</td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.status === "paid" || t.status === "success" ? "#16A34A" : "#DC2626" }} />
                       <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#0A0A0A" }}>{t.status}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-tighter" style={{ ...typeColors[t.type] || typeColors.Renewal }}>{t.type}</span>
                  </td>
                  <td className="px-8 py-5">
                    <button className="p-2 border border-border rounded-lg hover:bg-card hover:shadow-sm transition-all text-muted-foreground hover:text-black">
                       <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
