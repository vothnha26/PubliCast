import { useNavigate } from "react-router-dom";
import { WifiOff } from "lucide-react";

export function ErrorPage({ type }) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-full px-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
        {type === "offline" ? (
          <WifiOff size={48} color="#D1D5DB" className="mx-auto mb-6" />
        ) : (
          <div style={{ fontSize: 72, fontWeight: 500, color: "#E5E7EB", lineHeight: 1, marginBottom: 12 }}>
            {type}
          </div>
        )}

        <div style={{ borderTop: type !== "offline" ? "0.5px solid #E5E7EB" : "none", marginBottom: 20 }} />

        {type === "404" && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 500, color: "#0A0A0A", marginBottom: 8 }}>Page not found</h2>
            <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.6, marginBottom: 24 }}>
              The page you're looking for doesn't exist or has moved. Check the URL or go back to where you came from.
            </p>
            <div className="flex gap-3 justify-center mb-8">
              <button onClick={() => window.history.back()} className="px-5 py-2.5 rounded-lg hover:bg-[#F8F8F7] transition-colors cursor-pointer" style={{ fontSize: 14, border: "0.5px solid #E5E7EB", color: "#0A0A0A" }}>
                ← Go Back
              </button>
              <button onClick={() => navigate("/dashboard")} className="px-5 py-2.5 rounded-lg bg-[#0A0A0A] text-white hover:bg-[#1E1E1E] transition-colors cursor-pointer" style={{ fontSize: 14 }}>
                Go to Dashboard
              </button>
            </div>
            
            <div>
              <p style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 12 }}>Looking for something?</p>
              <div className="space-y-2">
                {["Content Planner", "Analytics", "Stream Schedule", "Team Settings"].map((link) => (
                  <button key={link} onClick={() => navigate(link.toLowerCase().replace(" ", "-"))} className="block mx-auto hover:underline cursor-pointer" style={{ fontSize: 13, color: "#0A0A0A" }}>
                    → {link}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {type === "500" && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 500, color: "#0A0A0A", marginBottom: 8 }}>Something went wrong on our end</h2>
            <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.6, marginBottom: 24 }}>
              Our team has been notified and is working on a fix. Try refreshing the page or come back in a few minutes.
            </p>
            <div className="flex gap-3 justify-center mb-6">
              <button onClick={() => window.location.reload()} className="px-5 py-2.5 rounded-lg bg-[#0A0A0A] text-white cursor-pointer" style={{ fontSize: 14 }}>
                Refresh Page
              </button>
              <button className="px-5 py-2.5 rounded-lg cursor-pointer" style={{ fontSize: 14, border: "0.5px solid #E5E7EB", color: "#0A0A0A" }}>
                Check Status Page ↗
              </button>
            </div>
            <div className="p-3 rounded-lg" style={{ border: "0.5px solid #E5E7EB", backgroundColor: "#fff" }}>
              <p style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>System status</p>
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#16A34A]" />
                <span style={{ fontSize: 12, color: "#0A0A0A" }}>All systems operational</span>
              </div>
              <p style={{ fontSize: 10, color: "#9CA3AF", marginTop: 4 }}>Last updated: 2 minutes ago</p>
            </div>
          </>
        )}

        {type === "offline" && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 500, color: "#0A0A0A", marginBottom: 8 }}>You're offline</h2>
            <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.6, marginBottom: 24 }}>
              Check your internet connection and try again. Your drafts have been saved locally.
            </p>
            <button className="px-5 py-2.5 rounded-lg bg-[#0A0A0A] text-white mb-6 cursor-pointer" style={{ fontSize: 14 }}>
              Try Again
            </button>
            <div className="flex items-center justify-center gap-2">
              <span style={{ fontSize: 12, color: "#9CA3AF" }}>Checking connection</span>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF]"
                  style={{ animation: `pulse 1s ${i * 0.3}s infinite` }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function ErrorPages() {
  return (
    <div className="p-6 space-y-8" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <h1 style={{ fontSize: 15, fontWeight: 500, color: "#0A0A0A" }}>Error Pages Preview</h1>
      <div className="grid grid-cols-3 gap-4">
        {["404", "500", "offline"].map((type) => (
          <div key={type} className="bg-white rounded-xl overflow-hidden" style={{ border: "0.5px solid #E5E7EB", height: 400 }}>
            <div className="px-4 py-2" style={{ borderBottom: "0.5px solid #E5E7EB", backgroundColor: "#F8F8F7" }}>
              <span style={{ fontSize: 11, color: "#9CA3AF" }}>Error {type}</span>
            </div>
            <ErrorPage type={type} />
          </div>
        ))}
      </div>
    </div>
  );
}
