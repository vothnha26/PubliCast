import { Calendar, Radio, TrendingUp, Users, MessageCircle } from "lucide-react";

function MiniCalendar() {
  return (
    <div className="mt-4 p-2 rounded-lg bg-background" style={{ height: 60 }}>
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: 14 }).map((_, i) => (
          <div
            key={i}
            className="rounded-sm"
            style={{
              height: 6,
              backgroundColor: [1, 4, 7, 10].includes(i) ? "#0A0A0A" : "#E5E7EB",
            }}
          />
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5 mt-1">
        {Array.from({ length: 14 }).map((_, i) => (
          <div
            key={i}
            className="rounded-sm"
            style={{
              height: 6,
              backgroundColor: [2, 5, 9, 12].includes(i) ? "#6B7280" : "#F3F4F6",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function MiniChart() {
  return (
    <div className="mt-4 px-1" style={{ height: 60 }}>
      <svg viewBox="0 0 200 55" className="w-full h-full">
        <polyline
          points="0,50 30,35 60,40 90,20 120,25 150,10 180,15 200,5"
          fill="none"
          stroke="#0A0A0A"
          strokeWidth="1.5"
        />
        <polyline
          points="0,45 30,42 60,38 90,35 120,30 150,28 180,25 200,22"
          fill="none"
          stroke="#9CA3AF"
          strokeWidth="1"
          strokeDasharray="3 2"
        />
      </svg>
    </div>
  );
}

function PlatformToggles() {
  const platforms = [
    { name: "YouTube", color: "#FF0000", abbr: "YT" },
    { name: "Facebook", color: "#1877F2", abbr: "FB" },
    { name: "TikTok", color: "#FFFFFF", abbr: "TK" },
    { name: "Instagram", color: "#E1306C", abbr: "IG" },
    { name: "Twitch", color: "#9146FF", abbr: "TW" },
  ];
  return (
    <div className="mt-3 space-y-2">
      {platforms.map((p) => (
        <div key={p.name} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-sm flex items-center justify-center"
              style={{ backgroundColor: p.color }}
            >
              <span style={{ fontSize: 7, color: "#fff", fontWeight: 700 }}>{p.abbr}</span>
            </div>
            <span style={{ fontSize: 11, color: "#DDD" }}>{p.name}</span>
          </div>
          <div className="w-7 h-3.5 bg-[#16A34A] rounded-full flex items-center justify-end pr-0.5">
            <div className="w-2.5 h-2.5 bg-card rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function MessageRows() {
  const messages = [
    { color: "#FF0000", text: "Love this product! 🔥", user: "Sarah K." },
    { color: "#1877F2", text: "When's the next stream?", user: "Mike T." },
    { color: "#0A0A0A", text: "Just bought! Thanks for the...", user: "Ana L." },
  ];
  return (
    <div className="mt-4 space-y-2">
      {messages.map((m) => (
        <div key={m.user} className="flex items-start gap-2">
          <div className="w-0.5 h-full rounded-full mt-0.5 self-stretch" style={{ backgroundColor: m.color, minHeight: 32 }} />
          <div>
            <div style={{ fontSize: 10, fontWeight: 500, color: "#0A0A0A" }}>{m.user}</div>
            <div style={{ fontSize: 10, color: "#6B7280" }}>{m.text}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Features() {
  return (
    <section className="bg-card py-24" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="max-w-[1100px] mx-auto px-6">
        <div className="text-center mb-14">
          <p style={{ fontSize: 10, fontWeight: 500, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.8px" }}>
            EVERYTHING YOU NEED
          </p>
          <h2
            className="mx-auto mt-2"
            style={{ fontSize: 32, fontWeight: 500, color: "#0A0A0A", maxWidth: 480, lineHeight: 1.25 }}
          >
            One tool for all your social media channels
          </h2>
        </div>

        {/* Top 3 cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Card 1 – Planner */}
          <div className="bg-card rounded-xl p-7" style={{ border: "0.5px solid #E5E7EB" }}>
            <div className="w-10 h-10 bg-[#0A0A0A] rounded-lg flex items-center justify-center mb-4">
              <Calendar size={18} color="#fff" />
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, color: "#0A0A0A", marginBottom: 8 }}>Content Planner</div>
            <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.6 }}>
              Schedule posts across all your platforms from a single calendar. Set it and forget it.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-4">
              {["Instagram", "Facebook", "TikTok", "YouTube", "+4 more"].map((tag) => (
                <span key={tag} className="px-2 py-0.5 rounded" style={{ fontSize: 10, color: "#6B7280", border: "0.5px solid #E5E7EB" }}>
                  {tag}
                </span>
              ))}
            </div>
            <MiniCalendar />
          </div>

          {/* Card 2 – Multi-Account Manager */}
          <div className="bg-[#0A0A0A] rounded-xl p-7 relative" style={{ border: "0.5px solid #1E1E1E" }}>
            <div
              className="absolute top-4 right-4 flex items-center gap-1.5 px-2 py-1 rounded"
              style={{ backgroundColor: "#16A34A" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-card animate-pulse" />
              <span style={{ fontSize: 9, color: "#fff", fontWeight: 500 }}>Active Sync</span>
            </div>
            <div className="w-10 h-10 bg-[#1E1E1E] rounded-lg flex items-center justify-center mb-4">
              <Radio size={18} color="#fff" />
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, color: "#FFFFFF", marginBottom: 8 }}>Multi-Channel Sync</div>
            <p style={{ fontSize: 13, color: "#9CA3AF", lineHeight: 1.6 }}>
              Publish to YouTube, Facebook, TikTok, Instagram, Threads — all at once in one click.
            </p>
            <PlatformToggles />
          </div>

          {/* Card 3 – Analytics */}
          <div className="bg-card rounded-xl p-7" style={{ border: "0.5px solid #E5E7EB" }}>
            <div className="w-10 h-10 bg-[#0A0A0A] rounded-lg flex items-center justify-center mb-4">
              <TrendingUp size={18} color="#fff" />
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, color: "#0A0A0A", marginBottom: 8 }}>Analytics & Reports</div>
            <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.6 }}>
              Track every metric, benchmark competitors, and export beautiful reports in one click.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-4">
              {["Engagement", "Reach", "Ads", "Competitors"].map((tag) => (
                <span key={tag} className="px-2 py-0.5 rounded" style={{ fontSize: 10, color: "#6B7280", border: "0.5px solid #E5E7EB" }}>
                  {tag}
                </span>
              ))}
            </div>
            <MiniChart />
          </div>
        </div>

        {/* Bottom 2 cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-[740px] mx-auto">
          {/* Card 4 – Team */}
          <div className="bg-card rounded-xl p-7" style={{ border: "0.5px solid #E5E7EB" }}>
            <div className="w-10 h-10 bg-[#0A0A0A] rounded-lg flex items-center justify-center mb-4">
              <Users size={18} color="#fff" />
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, color: "#0A0A0A", marginBottom: 8 }}>Team Collaboration</div>
            <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.6 }}>
              Roles, permissions, approval workflows — built for agencies and teams of any size.
            </p>
            <div className="flex gap-2 mt-4">
              {[
                { label: "Owner", bg: "#0A0A0A", color: "#fff" },
                { label: "Editor", bg: "#6B7280", color: "#fff" },
                { label: "Client", bg: "#E5E7EB", color: "#6B7280" },
                { label: "Analyst", bg: "#F3F4F6", color: "#9CA3AF" },
              ].map((r) => (
                <span key={r.label} className="px-2 py-0.5 rounded" style={{ fontSize: 10, backgroundColor: r.bg, color: r.color }}>
                  {r.label}
                </span>
              ))}
            </div>
          </div>

          {/* Card 5 – Inbox */}
          <div className="bg-card rounded-xl p-7" style={{ border: "0.5px solid #E5E7EB" }}>
            <div className="w-10 h-10 bg-[#0A0A0A] rounded-lg flex items-center justify-center mb-4">
              <MessageCircle size={18} color="#fff" />
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, color: "#0A0A0A", marginBottom: 8 }}>Unified Inbox</div>
            <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.6 }}>
              Reply to DMs and comments from every platform in one feed. Never miss a message.
            </p>
            <MessageRows />
          </div>
        </div>
      </div>
    </section>
  );
}
