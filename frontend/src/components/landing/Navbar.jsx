import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Menu, X, ChevronDown, Wifi } from "lucide-react";
import { usePostCreator } from "../../context/PostCreatorContext";

const productDropdownData = {
  col1: {
    title: "Planner & Publish",
    icon: "📅",
    items: [
      { name: "Planner", desc: "Visual content calendar", path: "/planner" },
      { name: "Post Creator", desc: "Rich editor for all platforms", isCreator: true },
      { name: "Approval System", desc: "Team review workflows", path: "/manage/tasks" },
      { name: "SmartLinks", desc: "Bio link management", path: "/smartlinks" },
      { name: "AI Assistant", desc: "AI-powered content help", path: "/ai" },
    ],
  },
  col3: {
    title: "Analytics & Grow",
    icon: "📊",
    items: [
      { name: "Analytics", desc: "Unified performance data", path: "/dashboard" },
      { name: "Reports", desc: "Client-ready reports", path: "/manage/reports" },
      { name: "Competitors", desc: "Benchmark your growth", path: "/manage/competitors" },
      { name: "Inbox", desc: "All messages in one place", path: "/manage/inbox" },
    ],
  },
};

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [platformsOpen, setPlatformsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { openPostCreator } = usePostCreator();

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target )) {
        setProductOpen(false);
        setPlatformsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleProductClick = (item) => {
    setProductOpen(false);
    if (item.isCreator) {
      navigate("/dashboard");
      setTimeout(() => openPostCreator(), 100);
    } else if (item.path) {
      navigate(item.path);
    }
  };

  return (
    <nav
      style={{ fontFamily: "'DM Sans', sans-serif", borderBottom: "0.5px solid #E5E7EB" }}
      className="sticky top-0 z-50 bg-card"
    >
      <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between" ref={dropdownRef}>
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0 no-underline">
          <div className="w-7 h-7 bg-[#0A0A0A] rounded-lg flex items-center justify-center">
            <Wifi size={14} color="#FFF" />
          </div>
          <span style={{ fontSize: 15, fontWeight: 500, color: "#0A0A0A" }}>StreamHub</span>
        </Link>

        {/* Center Nav */}
        <div className="hidden md:flex items-center gap-6">
          {/* Product Dropdown */}
          <div className="relative">
            <button
              className="flex items-center gap-1 transition-colors duration-150 cursor-pointer"
              style={{ fontSize: 13, color: productOpen ? "#0A0A0A" : "#6B7280" }}
              onMouseEnter={() => { setProductOpen(true); setPlatformsOpen(false); }}
            >
              Product <ChevronDown size={12} />
            </button>
            {productOpen && (
              <div
                className="absolute top-8 left-0 bg-card rounded-xl p-4 z-50"
                style={{ border: "0.5px solid #E5E7EB", width: 420, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
                onMouseLeave={() => setProductOpen(false)}
              >
                <div className="grid grid-cols-2 gap-4">
                  {Object.values(productDropdownData).map((col) => (
                    <div key={col.title}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-xs">{col.icon}</span>
                        <span style={{ fontSize: 11, fontWeight: 500, color: "#9CA3AF" }}>{col.title}</span>
                      </div>
                      {col.items.map((item) => (
                        <button
                          key={item.name}
                          onClick={() => handleProductClick(item)}
                          className="block w-full text-left px-2 py-1.5 rounded-md hover:bg-background transition-colors duration-150 cursor-pointer"
                        >
                          <div style={{ fontSize: 13, color: "#0A0A0A", fontWeight: 500 }}>{item.name}</div>
                          <div style={{ fontSize: 11, color: "#9CA3AF" }}>{item.desc}</div>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Platforms Dropdown */}
          <div className="relative">
            <button
              className="flex items-center gap-1 transition-colors duration-150 cursor-pointer"
              style={{ fontSize: 13, color: platformsOpen ? "#0A0A0A" : "#6B7280" }}
              onMouseEnter={() => { setPlatformsOpen(true); setProductOpen(false); }}
            >
              Platforms <ChevronDown size={12} />
            </button>
            {platformsOpen && (
              <div
                className="absolute top-8 left-0 bg-card rounded-xl p-3 z-50"
                style={{ border: "0.5px solid #E5E7EB", width: 180, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
                onMouseLeave={() => setPlatformsOpen(false)}
              >
                {["YouTube", "Instagram", "TikTok", "Facebook", "Twitch", "X"].map((p) => (
                  <button key={p} onClick={() => { navigate("/manage/connections?tab=connections"); setPlatformsOpen(false); }} className="block w-full text-left px-2 py-1.5 rounded-md hover:bg-background transition-colors cursor-pointer" style={{ fontSize: 13, color: "#0A0A0A" }}>
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={() => navigate("/pricing")} className="hover:text-foreground transition-colors duration-150 cursor-pointer text-[13px] color-[#6B7280]" style={{ color: "#6B7280" }}>Pricing</button>
          <button onClick={() => navigate("/manage/team")} className="hover:text-foreground transition-colors duration-150 cursor-pointer text-[13px] color-[#6B7280]" style={{ color: "#6B7280" }}>Agencies</button>
          <button onClick={() => navigate("/start")} className="hover:text-foreground transition-colors duration-150 cursor-pointer text-[13px] color-[#6B7280]" style={{ color: "#6B7280" }}>Resources</button>
        </div>

        {/* Right */}
        <div className="hidden md:flex items-center gap-3">
          <button
            className="hover:text-foreground transition-colors duration-150 cursor-pointer"
            style={{ fontSize: 13, color: "#0A0A0A" }}
            onClick={() => navigate("/login")}
          >
            Log in
          </button>
          <button
            className="bg-[#0A0A0A] text-white hover:bg-[#1E1E1E] transition-all duration-150 cursor-pointer transform active:scale-95"
            style={{ fontSize: 12, fontWeight: 700, height: 36, padding: "0 16px", borderRadius: 12 }}
            onClick={() => navigate("/signup")}
          >
            Get started free →
          </button>
        </div>

        {/* Mobile Hamburger */}
        <button className="md:hidden cursor-pointer" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-card px-6 pb-4 border-t border-border animate-in slide-in-from-top duration-300">
          {[
            { label: "Product", path: "/dashboard" },
            { label: "Platforms", path: "/manage/connections" },
            { label: "Pricing", path: "/pricing" },
            { label: "Agencies", path: "/manage/team" },
          ].map((link) => (
            <button key={link.label} onClick={() => { navigate(link.path); setMenuOpen(false); }} className="block w-full text-left py-3 cursor-pointer" style={{ fontSize: 14, color: "#0A0A0A", borderBottom: "0.5px solid #F3F4F6" }}>
              {link.label}
            </button>
          ))}
          <div className="flex flex-col gap-3 mt-4">
            <button onClick={() => { navigate("/login"); setMenuOpen(false); }} className="w-full py-2.5 rounded-xl text-center cursor-pointer font-bold text-sm" style={{ color: "#0A0A0A", border: "0.5px solid #E5E7EB" }}>Log in</button>
            <button onClick={() => { navigate("/signup"); setMenuOpen(false); }} className="w-full py-2.5 rounded-xl bg-[#0A0A0A] text-white text-center cursor-pointer font-bold text-sm">Get started free</button>
          </div>
        </div>
      )}
    </nav>
  );
}
