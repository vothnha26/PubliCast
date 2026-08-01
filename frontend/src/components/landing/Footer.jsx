import { Link } from "react-router-dom";

const footerLinks = {
  Product: ["Planner", "Automation", "Analytics", "Inbox", "SmartLinks", "Ads", "Reports"],
  Company: ["About", "Blog", "Careers", "Press", "Partners", "Agencies"],
  Support: ["Help Center", "Tutorials", "Status", "API Docs", "Contact"],
};

export function Footer() {
  return (
    <footer
      className="py-16 pb-8"
      style={{ backgroundColor: "#0A0A0A", fontFamily: "'DM Sans', sans-serif" }}
    >
      <div className="max-w-[1100px] mx-auto px-6">
        {/* Top section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Col 1 – Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4 no-underline">
              <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center">
                <span style={{ fontSize: 12, color: "#0A0A0A", fontWeight: 700 }}>S</span>
              </div>
              <span style={{ fontSize: 15, fontWeight: 500, color: "#fff" }}>PubliCast</span>
            </Link>
            <p style={{ fontSize: 13, color: "#777", lineHeight: 1.6, marginBottom: 20 }}>
              The all-in-one social media management and scheduling platform.
            </p>
            {/* Social icons */}
            <div className="flex gap-3">
              {["X", "in", "YT", "IG"].map((s) => (
                <button
                  key={s}
                  className="w-8 h-8 rounded-md flex items-center justify-center hover:text-white transition-colors duration-150 cursor-pointer"
                  style={{ backgroundColor: "#161616", color: "#666", fontSize: 10, fontWeight: 600 }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#fff", marginBottom: 16 }}>{title}</div>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link}>
                    <button
                      className="hover:text-white transition-colors duration-150 cursor-pointer"
                      style={{ fontSize: 12, color: "#777" }}
                    >
                      {link}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{ borderTop: "0.5px solid #1E1E1E", marginBottom: 24 }} />

        {/* Bottom row */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <span style={{ fontSize: 11, color: "#555" }}>© 2026 PubliCast. All rights reserved.</span>
          <div className="flex items-center gap-4">
            {["Privacy Policy", "Terms of Service", "Cookie Settings"].map((link) => (
              <button key={link} className="hover:text-white transition-colors duration-150 cursor-pointer" style={{ fontSize: 11, color: "#555" }}>
                {link}
              </button>
            ))}
            <button
              className="px-3 py-1 rounded-md flex items-center gap-1 cursor-pointer"
              style={{ backgroundColor: "#1E1E1E", color: "#777", fontSize: 11, border: "0.5px solid #2A2A2A" }}
            >
              🌐 English ▾
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
