const testimonials = [
  {
    stars: 5,
    quote: "PubliCast completely replaced 4 different tools we were using. The multi-platform scheduling alone saved us hours every week.",
    name: "Sarah Chen",
    role: "Content Director",
    brand: "Pixel Studios",
    platform: "YT",
    platformColor: "#FF0000",
    initials: "SC",
    avatarBg: "#1877F2",
  },
  {
    stars: 5,
    quote: "The approval system is a game-changer for our agency. Clients can review posts without needing a separate platform. Incredibly smooth.",
    name: "Marcus Thompson",
    role: "Agency Owner",
    brand: "Bright Social",
    platform: "IG",
    platformColor: "#E1306C",
    initials: "MT",
    avatarBg: "#16A34A",
  },
  {
    stars: 5,
    quote: "Analytics across all social media channels in one dashboard? I can finally see the full picture of my content performance without spreadsheets.",
    name: "Priya Nair",
    role: "Creator & Educator",
    brand: "LearnWithPriya",
    platform: "TK",
    platformColor: "#0A0A0A",
    initials: "PN",
    avatarBg: "#9146FF",
  },
];

export function Testimonials() {
  return (
    <section className="py-24" style={{ backgroundColor: "#F8F8F7", fontFamily: "'DM Sans', sans-serif" }}>
      <div className="max-w-[1100px] mx-auto px-6">
        <div className="text-center mb-14">
          <p style={{ fontSize: 10, fontWeight: 500, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.8px" }}>
            TESTIMONIALS
          </p>
          <h2 style={{ fontSize: 32, fontWeight: 500, color: "#0A0A0A", marginTop: 8 }}>What our users say</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {testimonials.map((t) => (
            <div key={t.name} className="bg-white rounded-xl p-6 relative" style={{ border: "0.5px solid #E5E7EB" }}>
              {/* Platform badge */}
              <div
                className="absolute top-4 right-4 w-6 h-6 rounded-md flex items-center justify-center"
                style={{ backgroundColor: t.platformColor }}
              >
                <span style={{ fontSize: 9, color: "#fff", fontWeight: 700 }}>{t.platform}</span>
              </div>
              {/* Stars */}
              <div style={{ fontSize: 14, color: "#F59E0B", marginBottom: 12 }}>★★★★★</div>
              {/* Quote */}
              <p style={{ fontSize: 14, color: "#0A0A0A", fontStyle: "italic", lineHeight: 1.7, marginBottom: 16 }}>
                "{t.quote}"
              </p>
              {/* Author */}
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: t.avatarBg }}
                >
                  <span style={{ fontSize: 11, color: "#fff", fontWeight: 500 }}>{t.initials}</span>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "#0A0A0A" }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: "#6B7280" }}>{t.role} · {t.brand}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
