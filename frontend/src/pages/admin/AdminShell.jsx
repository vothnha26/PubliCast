import { useState } from "react";



const adminNavItems = [
  { label: "Plans & Pricing", page: "admin-pricing", icon: "💳" },
  { label: "Users", page: "admin-users", icon: "👥" },
  { label: "Brands", page: "admin-brands", icon: "🏷" },
  { label: "Revenue", page: "admin-revenue", icon: "📈" },
  { label: "Audit Logs", page: "admin-audit", icon: "📋" },
  { label: "System Settings", page: "admin-settings", icon: "⚙️" },
];

export function AdminShell({ children, activePage, onNavigate }) {
  return (
    <div className="flex h-screen" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Sidebar */}
      <div className="w-52 bg-[#0A0A0A] flex flex-col shrink-0">
        {/* Logo + Admin label */}
        <div className="px-4 pt-5 pb-3">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-card rounded-md flex items-center justify-center">
              <span style={{ fontSize: 10, color: "#0A0A0A", fontWeight: 700 }}>S</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 500, color: "#fff" }}>PubliCast</span>
          </div>
          <div
            className="px-2 py-0.5 rounded"
            style={{ fontSize: 10, fontWeight: 500, color: "#DC2626", textTransform: "uppercase", letterSpacing: "0.8px" }}
          >
            ADMIN PANEL
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-2 space-y-0.5">
          {adminNavItems.map((item) => (
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

        {/* Back to app */}
        <div className="p-3 border-t" style={{ borderColor: "#1E1E1E" }}>
          <button
            className="w-full text-left px-3 py-2 rounded-lg transition-colors hover:bg-[#1E1E1E]"
            style={{ fontSize: 11, color: "#555" }}
            onClick={() => onNavigate("landing")}
          >
            ← Back to App
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <div
          className="bg-card flex items-center justify-between px-6 h-14 shrink-0 border-b border-border"
        >
          <div />
          <div className="flex items-center gap-3">
            <span
              className="px-3 py-1 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 text-[11px] font-medium"
            >
              ⚠ Admin Mode
            </span>
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <span className="text-[11px] font-medium text-muted-foreground">SA</span>
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto bg-background">
          {children}
        </div>
      </div>
    </div>
  );
}





