import { Check } from "lucide-react";

function FeatureBlock({ pill, headline, body, checks, cta, visual, imageRight }) {
  const textBlock = (
    <div className="flex-1 max-w-[440px]">
      <span
        className="inline-block mb-4 px-3 py-1"
        style={{ fontSize: 10, fontWeight: 500, textTransform: "uppercase", backgroundColor: "#0A0A0A", color: "#fff", borderRadius: 6 }}
      >
        {pill}
      </span>
      <h3 style={{ fontSize: 28, fontWeight: 500, color: "#0A0A0A", lineHeight: 1.25, marginBottom: 16 }}>
        {headline}
      </h3>
      <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.7, marginBottom: 20 }}>{body}</p>
      <ul className="space-y-2 mb-6">
        {checks.map((c) => (
          <li key={c} className="flex items-center gap-2" style={{ fontSize: 12, color: "#0A0A0A" }}>
            <Check size={14} className="shrink-0" />
            {c}
          </li>
        ))}
      </ul>
      <button
        className="hover:underline transition-all duration-150"
        style={{ fontSize: 13, color: "#0A0A0A" }}
      >
        {cta} →
      </button>
    </div>
  );

  const visualBlock = <div className="flex-1">{visual}</div>;

  return (
    <div className={`flex flex-col md:flex-row items-center gap-12 py-16 ${imageRight ? "" : "md:flex-row-reverse"}`} style={{ borderBottom: "0.5px solid #F3F4F6" }}>
      {imageRight ? (
        <>
          {textBlock}
          {visualBlock}
        </>
      ) : (
        <>
          {visualBlock}
          {textBlock}
        </>
      )}
    </div>
  );
}

function PublishingVisual() {
  const platforms = [
    { name: "YouTube", abbr: "YT", color: "#FF0000", status: "Published" },
    { name: "Facebook", abbr: "FB", color: "#1877F2", status: "Published" },
    { name: "TikTok", abbr: "TK", color: "#000", status: "Scheduled" },
    { name: "Instagram", abbr: "IG", color: "#E1306C", status: "Published" },
  ];
  return (
    <div className="bg-[#0A0A0A] rounded-xl p-6" style={{ border: "0.5px solid #1E1E1E" }}>
      <div className="flex items-center justify-between mb-4">
        <span style={{ fontSize: 12, fontWeight: 500, color: "#fff" }}>Publishing Monitor</span>
        <span className="flex items-center gap-1.5 px-2 py-1 rounded" style={{ fontSize: 9, backgroundColor: "#16A34A", color: "#fff" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-card animate-pulse" /> SYNC ACTIVE
        </span>
      </div>
      <div className="space-y-3">
        {platforms.map((p) => (
          <div key={p.name} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "#161616", border: "0.5px solid #2A2A2A" }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ backgroundColor: p.color }}>
                <span style={{ fontSize: 9, color: "#fff", fontWeight: 700 }}>{p.abbr}</span>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, color: "#DDD" }}>{p.name}</div>
                <div style={{ fontSize: 10, color: "#666" }}>Auto-scheduled</div>
              </div>
            </div>
            <div className="text-right">
              <div style={{ fontSize: 12, fontWeight: 500, color: "#fff" }}>{p.status}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlannerVisual() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const events = {
    Mon: ["📸 Instagram post", "🎥 YouTube video"],
    Tue: [],
    Wed: ["📘 Facebook update"],
    Thu: ["🎵 TikTok reel", "📸 Instagram story"],
    Fri: ["📘 Facebook story"],
    Sat: ["📊 Thread"],
    Sun: [],
  };

  return (
    <div className="bg-card rounded-xl p-5" style={{ border: "0.5px solid #E5E7EB" }}>
      <div className="flex items-center justify-between mb-4">
        <span style={{ fontSize: 12, fontWeight: 500, color: "#0A0A0A" }}>May 2026</span>
        <div className="flex gap-1">
          <button className="px-2 py-0.5 rounded text-xs" style={{ border: "0.5px solid #E5E7EB", color: "#6B7280" }}>Week</button>
          <button className="px-2 py-0.5 rounded text-xs bg-[#0A0A0A] text-white">Month</button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => (
          <div key={d} style={{ fontSize: 9, color: "#9CA3AF", textAlign: "center", marginBottom: 4 }}>{d}</div>
        ))}
        {days.map((d) => (
          <div key={d} className="rounded-md p-1 min-h-[60px]" style={{ border: "0.5px solid #F3F4F6", backgroundColor: events[d].length ? "#F8F8F7" : "transparent" }}>
            {events[d].map((e) => (
              <div key={e} className="rounded px-1 py-0.5 mb-1 bg-[#0A0A0A]">
                <span style={{ fontSize: 8, color: "#fff" }}>{e.split(" ").slice(1).join(" ")}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsVisual() {
  return (
    <div className="bg-card rounded-xl p-5" style={{ border: "0.5px solid #E5E7EB" }}>
      <div className="flex items-center justify-between mb-4">
        <span style={{ fontSize: 12, fontWeight: 500, color: "#0A0A0A" }}>Performance</span>
        <span style={{ fontSize: 10, color: "#9CA3AF" }}>Last 30 days</span>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "Total Reach", value: "2.4M", delta: "↑ 12.4%" },
          { label: "Engagement", value: "4.8%", delta: "↑ 0.6%" },
          { label: "New Followers", value: "+1.2K", delta: "↑ 8.2%" },
        ].map((s) => (
          <div key={s.label} className="p-3 rounded-lg" style={{ border: "0.5px solid #E5E7EB" }}>
            <div style={{ fontSize: 9, color: "#9CA3AF" }}>{s.label}</div>
            <div style={{ fontSize: 15, fontWeight: 500, color: "#0A0A0A" }}>{s.value}</div>
            <div style={{ fontSize: 10, color: "#16A34A" }}>{s.delta}</div>
          </div>
        ))}
      </div>
      <svg viewBox="0 0 300 80" className="w-full h-20">
        <polyline points="0,70 40,55 80,60 120,35 160,40 200,20 240,25 300,5" fill="none" stroke="#0A0A0A" strokeWidth="1.5" />
        <polyline points="0,75 40,70 80,65 120,60 160,55 200,50 240,45 300,40" fill="none" stroke="#9CA3AF" strokeWidth="1" strokeDasharray="3 2" />
      </svg>
    </div>
  );
}

export function FeatureDeepDive() {
  return (
    <section className="py-20" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="max-w-[1100px] mx-auto px-6">
        <FeatureBlock
          pill="PUBLISHING"
          headline="Publish on every platform — simultaneously"
          body="Stop juggling multiple social media apps. PubliCast schedules and publishes your posts to YouTube, Facebook, TikTok, Instagram, and Threads in one setup. Control everything from one screen."
          checks={[
            "Multi-platform auto-posting",
            "Platform-specific caption tuning",
            "Unified media library",
            "Publishing status monitoring",
          ]}
          cta="Explore Publishing"
          visual={<PublishingVisual />}
          imageRight={true}
        />
        <FeatureBlock
          pill="PLANNER"
          headline="Plan a month of content in minutes"
          body="Drag, drop, schedule. See all your posts in one calendar. Submit for approval, reschedule on the fly, and publish at the perfect time automatically."
          checks={[
            "Monthly calendar view",
            "Best time to post AI suggestions",
            "Bulk scheduling",
            "Multi-platform post customization",
          ]}
          cta="See the Planner"
          visual={<PlannerVisual />}
          imageRight={false}
        />
        <FeatureBlock
          pill="ANALYTICS"
          headline="Data that actually tells you something"
          body="Track your social growth and ad campaigns in one unified dashboard. Compare competitors, generate reports, and share results with clients in one click."
          checks={[
            "Social media performance analytics",
            "Competitor benchmarking",
            "PDF/CSV report export",
            "Scheduled report delivery",
          ]}
          cta="Explore Analytics"
          visual={<AnalyticsVisual />}
          imageRight={true}
        />
      </div>
    </section>
  );
}
