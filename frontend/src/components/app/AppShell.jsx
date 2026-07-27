import { useState } from "react";
import { CommandPalette } from "../CommandPalette";



const navItems = [
  { label: "Dashboard", page: "dashboard", icon: "🏠" },
  { label: "Planner", page: "planner", icon: "📅" },
  { label: "Live", page: "live", icon: "📡" },
  { label: "Analytics", page: "analytics", icon: "📊" },
  { label: "Inbox", page: "inbox", icon: "💬" },
  { label: "AI Assistant", page: "ai-assistant", icon: "🤖" },
  { label: "Hashtags", page: "hashtag-manager", icon: "🔍" },
  { label: "AutoLists", page: "autolists", icon: "🔄" },
  { label: "Team", page: "team", icon: "👥" },
  { label: "Reports", page: "reports", icon: "📄" },
];

export function AppShell({ children, activePage, onNavigate }) {
  const [cmdOpen, setCmdOpen] = useState(false);

  return (
    <div className="flex h-screen" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Sidebar */}
      <div className="w-48 bg-[#0A0A0A] flex flex-col shrink-0">
        {/* Brand switcher */}
        <div className="px-3 pt-4 pb-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-[#1E1E1E] transition-colors" style={{ border: "0.5px solid #2A2A2A" }}>
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
              <span style={{ fontSize: 9, color: "#fff", fontWeight: 500 }}>TV</span>
            </div>
            <span style={{ fontSize: 12, color: "#E0E0E0" }} className="truncate flex-1">TechVision</span>
            <span style={{ fontSize: 10, color: "#666" }}>▾</span>
          </div>
        </div>

        {/* Cmd+K shortcut */}
        <div className="px-3 py-2">
          <button
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#161616] transition-colors"
            style={{ border: "0.5px solid #2A2A2A" }}
            onClick={() => setCmdOpen(true)}
          >
            <span style={{ fontSize: 11, color: "#555" }}>⌘K Search...</span>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-1 space-y-0.5">
          {navItems.map((item) => (
            <button
              key={item.page}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors duration-150"
              style={{
                backgroundColor: activePage === item.page ? "#1E1E1E" : "transparent",
                color: activePage === item.page ? "#fff" : "#666",
                fontSize: 12,
              }}
              onClick={() => onNavigate(item.page)}
            >
              <span style={{ fontSize: 13 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-2 pb-4 space-y-0.5">
          <button
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#1E1E1E] transition-colors"
            style={{ fontSize: 12, color: "#666" }}
            onClick={() => onNavigate("admin-pricing")}
          >
            <span style={{ fontSize: 13 }}>⚙️</span> Admin Panel
          </button>
          <button
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#1E1E1E] transition-colors"
            style={{ fontSize: 12, color: "#666" }}
            onClick={() => onNavigate("landing")}
          >
            <span style={{ fontSize: 13 }}>🏡</span> Landing Page
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <div className="bg-white flex items-center justify-between px-6 h-14 shrink-0" style={{ borderBottom: "0.5px solid #E5E7EB" }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: "#0A0A0A", textTransform: "capitalize" }}>
            {navItems.find((n) => n.page === activePage)?.label || activePage}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCmdOpen(true)}
              className="px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-[#F8F8F7] transition-colors"
              style={{ fontSize: 12, color: "#9CA3AF", border: "0.5px solid #E5E7EB" }}
            >
              ⌘K
            </button>
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center cursor-pointer">
              <span style={{ fontSize: 11, color: "#fff", fontWeight: 500 }}>TV</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#F8F8F7]">
          {children}
        </div>
      </div>

      <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} onNavigate={(page) => { onNavigate(page); setCmdOpen(false); }} />
    </div>
  );
}




