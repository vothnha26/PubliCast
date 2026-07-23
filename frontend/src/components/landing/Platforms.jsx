const platforms = [
  { name: "YouTube", abbr: "YT", color: "#FF0000" },
  { name: "Facebook", abbr: "FB", color: "#1877F2" },
  { name: "Instagram", abbr: "IG", color: "#E1306C" },
  { name: "TikTok", abbr: "TK", color: "#000000" },
  { name: "Twitch", abbr: "TW", color: "#9146FF" },
  { name: "X / Twitter", abbr: "X", color: "#0A0A0A" },
  { name: "Pinterest", abbr: "PI", color: "#E60023" },
  { name: "Bluesky", abbr: "BS", color: "#0085FF" },
  { name: "Threads", abbr: "TH", color: "#0A0A0A" },
  { name: "Google Ads", abbr: "GA", color: "#4285F4" },
  { name: "Facebook Ads", abbr: "FA", color: "#1877F2" },
  { name: "TikTok Ads", abbr: "TA", color: "#000000" },
  { name: "Analytics", abbr: "AN", color: "#E37400" },
];

export function Platforms() {
  return (
    <section className="bg-white py-20" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="max-w-[700px] mx-auto px-6 text-center">
        <p style={{ fontSize: 10, fontWeight: 500, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 24 }}>
          WORKS WITH YOUR PLATFORMS
        </p>
        <div className="flex flex-wrap justify-center gap-6">
          {platforms.map((p) => (
            <div key={p.name} className="flex flex-col items-center gap-1.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: p.color }}
              >
                <span style={{ fontSize: 10, color: "#fff", fontWeight: 700 }}>{p.abbr}</span>
              </div>
              <span style={{ fontSize: 11, color: "#6B7280" }}>{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}





