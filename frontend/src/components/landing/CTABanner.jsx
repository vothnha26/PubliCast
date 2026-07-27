import { useNavigate } from "react-router-dom";

const avatarColors = ["#1877F2", "#E1306C", "#16A34A", "#9146FF", "#F59E0B"];

export function CTABanner() {
  const navigate = useNavigate();

  return (
    <section
      className="py-20 text-center"
      style={{ backgroundColor: "#0A0A0A", fontFamily: "'DM Sans', sans-serif" }}
    >
      <div className="max-w-[700px] mx-auto px-6">
        <h2 style={{ fontSize: 36, fontWeight: 500, color: "#fff", marginBottom: 12 }}>
          Start managing everything — for free
        </h2>
        <p style={{ fontSize: 15, color: "#9CA3AF", marginBottom: 32 }}>
          No credit card needed. Set up in 2 minutes.
        </p>

        <div className="flex items-center justify-center gap-3 flex-wrap mb-6">
          <button
            className="bg-white text-[#0A0A0A] hover:bg-[#F3F4F6] transition-colors duration-150 cursor-pointer"
            style={{ height: 44, borderRadius: 12, padding: "0 24px", fontSize: 16, fontWeight: 500 }}
            onClick={() => navigate("/login")}
          >
            Create free account →
          </button>
          <button
            className="hover:bg-white/10 transition-colors duration-150 cursor-pointer"
            style={{ height: 44, borderRadius: 12, padding: "0 24px", fontSize: 16, color: "#fff", border: "0.5px solid rgba(255,255,255,0.2)" }}
          >
            Talk to sales
          </button>
        </div>

        <div className="flex items-center justify-center gap-3">
          {/* Avatar stack */}
          <div className="flex -space-x-2">
            {avatarColors.map((color, i) => (
              <div
                key={i}
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ backgroundColor: color, border: "2px solid #0A0A0A", zIndex: 5 - i }}
              >
                <span style={{ fontSize: 9, color: "#fff" }}>{String.fromCharCode(65 + i)}</span>
              </div>
            ))}
          </div>
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>Join 150,000+ creators and teams</span>
        </div>
      </div>
    </section>
  );
}
