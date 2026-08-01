import { useState } from "react";
import { useNavigate } from "react-router-dom";

const platformIcons = [
  { name: "YT", color: "#FF0000" },
  { name: "FB", color: "#1877F2" },
  { name: "TK", color: "#000000" },
  { name: "IG", color: "#E1306C" },
  { name: "TW", color: "#6441A5" },
  { name: "LI", color: "#0A66C2" },
  { name: "X", color: "#0A0A0A" },
];

function DashboardMockup() {
  const [liveCount] = useState(2);

  return (
    <div className="relative w-full max-w-[1100px] mx-auto mt-14">
      {/* Floating stat badge top-left */}
      <div
        className="absolute -top-4 left-8 z-10 bg-card flex items-center gap-2 px-3 py-2"
        style={{ borderRadius: 8, border: "0.5px solid #E5E7EB" }}
      >
        <span style={{ fontSize: 11, fontWeight: 500, color: "#16A34A" }}>↑ 12.4% viewers today</span>
      </div>

      {/* Floating LIVE badge top-right */}
      <div
        className="absolute -top-4 right-8 z-10 bg-[#0A0A0A] flex items-center gap-2 px-3 py-2"
        style={{ borderRadius: 20, border: "0.5px solid #1E1E1E" }}
      >
        <span className="w-2 h-2 rounded-full bg-[#DC2626] animate-pulse" />
        <span style={{ fontSize: 11, fontWeight: 500, color: "#FFFFFF" }}>{liveCount} streams LIVE</span>
      </div>

      {/* Main dashboard frame */}
      <div
        className="w-full bg-background overflow-hidden relative"
        style={{
          borderRadius: 12,
          border: "0.5px solid #E5E7EB",
          boxShadow: "0 1px 0 #E5E7EB",
          maskImage: "linear-gradient(to bottom, black 70%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 70%, transparent 100%)",
        }}
      >
        {/* Topbar */}
        <div className="bg-card flex items-center justify-between px-4 py-3" style={{ borderBottom: "0.5px solid #E5E7EB" }}>
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-[#0A0A0A] rounded-md" />
            <span style={{ fontSize: 12, color: "#0A0A0A", fontWeight: 500 }}>PubliCast</span>
            <span style={{ fontSize: 10, color: "#9CA3AF" }}>/ Dashboard</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-24 h-6 bg-[#F3F4F6] rounded-md" />
            <div className="w-7 h-7 rounded-full bg-[#E5E7EB]" />
          </div>
        </div>

        {/* Content */}
        <div className="flex">
          {/* Sidebar */}
          <div className="w-48 bg-[#0A0A0A] p-3 min-h-[320px]">
            <div className="bg-[#1E1E1E] rounded-lg px-3 py-2 mb-4">
              <span style={{ fontSize: 11, color: "#E0E0E0" }}>My Brand</span>
            </div>
            {["Dashboard", "Planner", "Live", "Analytics", "Inbox", "Team"].map((item, i) => (
              <div key={item} className={`px-3 py-2 rounded-md mb-1 flex items-center gap-2 ${i === 0 ? "bg-[#1E1E1E]" : ""}`}>
                <div className="w-3 h-3 rounded-sm bg-[#333]" />
                <span style={{ fontSize: 11, color: i === 0 ? "#FFFFFF" : "#666" }}>{item}</span>
              </div>
            ))}
          </div>

          {/* Main */}
          <div className="flex-1 p-4">
            {/* KPI row */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: "Total Reach", value: "2.4M", delta: "↑ 8.2%" },
                { label: "Followers", value: "142K", delta: "↑ 3.1%" },
                { label: "Posts", value: "247", delta: "↑ 12%" },
                { label: "Live Hours", value: "36h", delta: "↑ 5.4%" },
              ].map((kpi) => (
                <div key={kpi.label} className="bg-card rounded-xl p-3" style={{ border: "0.5px solid #E5E7EB" }}>
                  <div style={{ fontSize: 10, color: "#9CA3AF" }}>{kpi.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 500, color: "#0A0A0A" }}>{kpi.value}</div>
                  <div style={{ fontSize: 10, color: "#16A34A" }}>{kpi.delta}</div>
                </div>
              ))}
            </div>

            {/* Chart area */}
            <div className="bg-card rounded-xl p-3 mb-3" style={{ border: "0.5px solid #E5E7EB", height: 120 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "#0A0A0A", marginBottom: 8 }}>Performance Overview</div>
              <svg viewBox="0 0 400 80" className="w-full h-16">
                <polyline
                  points="0,70 40,55 80,60 120,40 160,45 200,25 240,30 280,20 320,15 360,22 400,10"
                  fill="none"
                  stroke="#0A0A0A"
                  strokeWidth="1.5"
                />
                <polyline
                  points="0,75 40,70 80,68 120,65 160,60 200,55 240,50 280,48 320,42 360,38 400,35"
                  fill="none"
                  stroke="#9CA3AF"
                  strokeWidth="1"
                  strokeDasharray="3 2"
                />
              </svg>
            </div>

            {/* Bottom row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card rounded-xl p-3" style={{ border: "0.5px solid #E5E7EB" }}>
                <div style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 6 }}>Upcoming Streams</div>
                {["Product Launch – YT+FB", "Weekly AMA – TW"].map((s) => (
                  <div key={s} className="flex items-center gap-2 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
                    <span style={{ fontSize: 10, color: "#0A0A0A" }}>{s}</span>
                  </div>
                ))}
              </div>
              <div className="bg-card rounded-xl p-3" style={{ border: "0.5px solid #E5E7EB" }}>
                <div style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 6 }}>Scheduled Posts</div>
                {["Instagram · 2:00 PM", "Twitter · 4:30 PM", "Facebook · 9:00 AM"].map((p) => (
                  <div key={p} style={{ fontSize: 10, color: "#6B7280", marginBottom: 2 }}>{p}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating platform icons row bottom-center */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-card px-3 py-2 z-10" style={{ borderRadius: 8, border: "0.5px solid #E5E7EB" }}>
        {platformIcons.map((p) => (
          <div
            key={p.name}
            className="w-6 h-6 flex items-center justify-center rounded-md"
            style={{ backgroundColor: p.color }}
          >
            <span style={{ fontSize: 8, color: "#fff", fontWeight: 700 }}>{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Hero() {
  const navigate = useNavigate();

  return (
    <section className="bg-card pt-24 pb-20 text-center overflow-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="max-w-[760px] mx-auto px-4">
        {/* Announcement pill */}
        <div className="inline-flex items-center bg-[#0A0A0A] text-white mb-8" style={{ borderRadius: 6, padding: "4px 12px", fontSize: 11, fontWeight: 500 }}>
          ✦ NEW — Smart Social Media Scheduler & Analytics &nbsp;→
        </div>

        {/* Headline */}
        <h1
          className="text-center mb-5"
          style={{ fontSize: 52, fontWeight: 500, color: "#0A0A0A", letterSpacing: -1, lineHeight: 1.15 }}
        >
          Plan, schedule, and grow —<br />all in one workspace
        </h1>

        {/* Subheading */}
        <p
          className="mx-auto mb-8"
          style={{ fontSize: 16, color: "#6B7280", maxWidth: 520, lineHeight: 1.6 }}
        >
          Schedule posts, automate publishing on every platform, and track what's actually working. Built for creators, teams, and agencies.
        </p>

        {/* CTA Row */}
        <div className="flex items-center justify-center gap-3 flex-wrap mb-3">
          <button
            className="bg-[#0A0A0A] text-white hover:bg-[#1E1E1E] transition-colors duration-150 cursor-pointer"
            style={{ height: 44, borderRadius: 12, padding: "0 24px", fontSize: 16, fontWeight: 500 }}
            onClick={() => navigate("/login")}
          >
            Start for free →
          </button>
          <button
            className="hover:bg-background transition-colors duration-150 cursor-pointer"
            style={{ height: 44, borderRadius: 12, padding: "0 24px", fontSize: 16, color: "#0A0A0A", border: "0.5px solid #E5E7EB" }}
          >
            Watch demo ▶
          </button>
        </div>

        <p style={{ fontSize: 11, color: "#9CA3AF" }}>No credit card required · Free forever plan</p>
      </div>

      {/* Hero Visual */}
      <div className="px-4">
        <DashboardMockup />
      </div>
    </section>
  );
}
