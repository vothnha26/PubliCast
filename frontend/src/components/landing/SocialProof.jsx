export function SocialProof() {
  const logos = ["Notion", "Linear", "Vercel", "Figma", "Stripe", "Loom"];

  return (
    <div
      className="bg-white py-5"
      style={{
        borderTop: "0.5px solid #E5E7EB",
        borderBottom: "0.5px solid #E5E7EB",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div className="max-w-[1100px] mx-auto px-6">
        <div className="flex flex-wrap items-center justify-center gap-10">
          <span style={{ fontSize: 12, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.8px" }}>
            Trusted by 150,000+ creators &amp; teams
          </span>
          <div className="flex items-center gap-8 flex-wrap justify-center">
            {logos.map((logo) => (
              <div
                key={logo}
                className="flex items-center justify-center"
                style={{ width: 80, opacity: 0.4 }}
              >
                <span style={{ fontSize: 14, fontWeight: 600, color: "#0A0A0A", letterSpacing: -0.3 }}>
                  {logo}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span style={{ fontSize: 13, color: "#F59E0B" }}>★★★★★</span>
            <span style={{ fontSize: 12, color: "#6B7280" }}>4.8 / 5 on G2</span>
          </div>
        </div>
      </div>
    </div>
  );
}





