// Placeholder pages for less-prioritized sections

import { useState, useEffect } from "react";
import { BarChart2, Megaphone, Users, FileText, Link2, Search, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useConnections } from "../../context/ConnectionsContext";
import brandService from "../../services/brand.service";
import socialService from "../../services/social.service";
import { toast } from "sonner";

function EmptyPage({ icon, title, subtitle, action, onAction }) {
  return (
    <div className="flex-1 flex items-center justify-center" style={{ background: "#F8F8F7" }}>
      <div className="flex flex-col items-center gap-4 text-center" style={{ maxWidth: 320 }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: "#FFF", border: "0.5px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280" }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 500, color: "#0A0A0A", marginBottom: 6 }}>{title}</div>
          <div style={{ fontSize: 12, color: "#9CA3AF", lineHeight: 1.6 }}>{subtitle}</div>
        </div>
        {action && (
          <button
            onClick={onAction}
            style={{ padding: "9px 20px", borderRadius: 8, background: "#0A0A0A", color: "#FFF", fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none" }}
          >
            {action}
          </button>
        )}
      </div>
    </div>
  );
}

export function AdsPage() {
  return (
    <div className="flex-1 overflow-y-auto" style={{ background: "#F8F8F7", padding: "20px 24px" }}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-5" style={{ borderBottom: "0.5px solid #E5E7EB", paddingBottom: 12 }}>
        {["Facebook Ads", "Google Ads", "TikTok Ads"].map((t, i) => (
          <button key={t} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 12, background: i === 0 ? "#0A0A0A" : "transparent", color: i === 0 ? "#FFF" : "#6B7280", border: i === 0 ? "none" : "0.5px solid #E5E7EB", cursor: "pointer" }}>
            {t}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button style={{ padding: "7px 14px", borderRadius: 8, background: "#0A0A0A", color: "#FFF", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
          + Create Campaign
        </button>
      </div>

      {/* Stats */}
      <div className="flex gap-3 mb-5">
        {[
          { label: "Total Spend", value: "$2,840", delta: "+12%" },
          { label: "Impressions", value: "1.2M", delta: "+18%" },
          { label: "Clicks", value: "48,291", delta: "+9%" },
          { label: "Conversions", value: "1,240", delta: "+24%" },
        ].map((m) => (
          <div key={m.label} style={{ flex: 1, background: "#FFF", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: "12px 16px" }}>
            <div style={{ fontSize: 10, color: "#6B7280", marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 20, fontWeight: 500, color: "#0A0A0A", marginBottom: 2 }}>{m.value}</div>
            <div style={{ fontSize: 10, color: "#16A34A" }}>↑ {m.delta}</div>
          </div>
        ))}
      </div>

      {/* Empty state for campaigns */}
      <div style={{ background: "#FFF", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: "60px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📣</div>
        <div style={{ fontSize: 14, fontWeight: 500, color: "#0A0A0A", marginBottom: 6 }}>Connect your ad accounts to get started</div>
        <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 20 }}>Link your Facebook, Google, or TikTok Ads account to manage campaigns.</div>
        <div className="flex justify-center gap-3">
          {["Facebook Ads", "Google Ads", "TikTok Ads"].map((p) => (
            <button key={p} style={{ padding: "8px 16px", borderRadius: 8, border: "0.5px solid #E5E7EB", fontSize: 12, color: "#6B7280", cursor: "pointer", background: "#FFF" }}>
              Connect {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CompetitorsPage() {
  return (
    <div className="flex-1 overflow-y-auto" style={{ background: "#F8F8F7", padding: "20px 24px" }}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-1">
          {["Instagram", "Twitter/X", "Facebook", "YouTube", "TikTok"].map((p, i) => (
            <button key={p} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 11, background: i === 0 ? "#0A0A0A" : "#FFF", color: i === 0 ? "#FFF" : "#6B7280", border: i === 0 ? "none" : "0.5px solid #E5E7EB", cursor: "pointer" }}>
              {p}
            </button>
          ))}
        </div>
        <button style={{ padding: "7px 14px", borderRadius: 8, background: "#0A0A0A", color: "#FFF", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
          + Add Competitor
        </button>
      </div>

      <div className="flex gap-3 mb-5 overflow-x-auto pb-2">
        {["@techcrunch", "@theverge", "@wired"].map((handle) => (
          <div key={handle} style={{ flex: "0 0 220px", background: "#FFF", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: 14 }}>
            <div className="flex items-center gap-2 mb-3">
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#374151" }}>
                {handle.slice(1, 3).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: "#0A0A0A" }}>{handle}</div>
                <div style={{ fontSize: 10, color: "#9CA3AF" }}>2.4M followers</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {[
                { label: "Posts/week", value: "12" },
                { label: "Avg Engagement", value: "3.2%" },
                { label: "Avg Likes", value: "8.4K" },
                { label: "Avg Comments", value: "342" },
              ].map((m) => (
                <div key={m.label} style={{ background: "#F8F8F7", borderRadius: 6, padding: "6px 8px" }}>
                  <div style={{ fontSize: 9, color: "#9CA3AF" }}>{m.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "#0A0A0A" }}>{m.value}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div style={{ flex: "0 0 220px", border: "0.5px dashed #E5E7EB", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color: "#9CA3AF", fontSize: 12, cursor: "pointer" }}>
          + Add Competitor
        </div>
      </div>

      <div style={{ background: "#FFF", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: "60px 24px", textAlign: "center" }}>
        <Search size={32} style={{ margin: "0 auto 12px", color: "#D1D5DB" }} />
        <div style={{ fontSize: 14, fontWeight: 500, color: "#0A0A0A", marginBottom: 6 }}>Track competitors to benchmark your performance</div>
        <div style={{ fontSize: 12, color: "#9CA3AF" }}>Add competitor accounts to see detailed comparison data</div>
      </div>
    </div>
  );
}

export function ReportsPage() {
  return (
    <EmptyPage
      icon={<FileText size={28} />}
      title="Reports"
      subtitle="Create automated reports with your analytics data and share them with clients or stakeholders."
      action="+ Create Report"
    />
  );
}

export function SmartLinksPage() {
  return (
    <EmptyPage
      icon={<Link2 size={28} />}
      title="SmartLinks"
      subtitle="Create bio link landing pages with all your important links in one place."
      action="+ Create SmartLink"
    />
  );
}

export function ConnectPlatformsPage() {
  const navigate = useNavigate();
  const { openConnections } = useConnections();

  useEffect(() => {
    // Chuyển hướng về dashboard và tự động mở popup quản lý kết nối
    navigate("/dashboard", { replace: true });
    openConnections();
  }, [navigate, openConnections]);

  return (
    <div className="flex-1 flex items-center justify-center bg-[#F8F8F7]" style={{ height: "100vh" }}>
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="animate-spin text-gray-300" size={40} />
        <span className="text-xs text-gray-500 font-medium">Redirecting to connections dashboard...</span>
      </div>
    </div>
  );
}
