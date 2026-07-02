import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Calendar, TrendingUp, Radio, Clock, BarChart2, Settings2,
  Users, FileText, Megaphone, ChevronDown, Wifi,
  MoreHorizontal, Bell, Link2, History, BookOpen, Image, Inbox,
  DollarSign, Shield, Zap, Search, LayoutGrid, Crown
} from "lucide-react";

export function Sidebar() {
  const [brandOpen, setBrandOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  // Determine mode based on path
  const isSuperadminMode = currentPath.startsWith("/admin");
  const isManagementMode = currentPath.startsWith("/manage");
  const isWorkspaceMode = !isSuperadminMode && !isManagementMode;

  const workspaceSections = [
    {
      label: "Overview",
      items: [
        { icon: <LayoutDashboard size={15} />, label: "Dashboard", path: "/dashboard" },
        { icon: <Calendar size={15} />, label: "Planner", path: "/planner", badge: 12 },
        { icon: <Image size={15} />, label: "Media Library", path: "/media-library" },
      ] },
    {
      label: "Livestream",
      items: [
        { icon: <Radio size={15} />, label: "Live Now", path: "/live", live: true },
        { icon: <Clock size={15} />, label: "Schedule Stream", path: "/scheduler" },
        { icon: <BarChart2 size={15} />, label: "Stream Analytics", path: "/scheduler" },
        { icon: <History size={15} />, label: "Stream History", path: "/history" },
        { icon: <Settings2 size={15} />, label: "Stream Settings", path: "/scheduler" },
      ] },
    {
      label: "Content",
      items: [
        { icon: <BookOpen size={15} />, label: "Content Planner", path: "/planner" },
        { icon: <Link2 size={15} />, label: "SmartLinks", path: "/smartlinks" },
      ] },
    {
      label: "AI & Tools",
      items: [
        { icon: <Zap size={15} />, label: "AI Assistant", path: "/ai" },
        { icon: <Search size={15} />, label: "Hashtags", path: "/hashtags" },
        { icon: <History size={15} />, label: "AutoLists", path: "/autolists" },
      ] },
  ];

  const managementSections = [
    {
      label: "Account Management",
      items: [
        { icon: <Inbox size={15} />, label: "Inbox", path: "/manage/inbox", badge: 5 },
        { icon: <Users size={15} />, label: "Team", path: "/manage/team" },
        { icon: <FileText size={15} />, label: "Reports", path: "/manage/reports" },
        { icon: <Megaphone size={15} />, label: "Ads", path: "/manage/ads" },
        { icon: <Users size={15} />, label: "Competitors", path: "/manage/competitors" },
      ] },
  ];

  const superadminSections = [
    {
      label: "Platform Control",
      items: [
        { icon: <DollarSign size={15} />, label: "Revenue", path: "/admin/revenue" },
        { icon: <Shield size={15} />, label: "Audit Log", path: "/admin/audit" },
        { icon: <Settings2 size={15} />, label: "Plans Config", path: "/admin/pricing" },
      ] },
    {
      label: "Global Settings",
      items: [
        { icon: <LayoutGrid size={15} />, label: "System Status", path: "/admin/audit" },
        { icon: <Users size={15} />, label: "All Organizations", path: "/admin/revenue" },
      ] }
  ];

  const activeSections = isSuperadminMode ? superadminSections : (isManagementMode ? managementSections : workspaceSections);

  return (
    <aside
      style={{ width: 220, background: "#0A0A0A", borderRight: "0.5px solid #1E1E1E" }}
      className="flex flex-col h-screen shrink-0 overflow-y-auto sticky top-0"
    >
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 px-4 py-4" style={{ borderBottom: "0.5px solid #1E1E1E" }}>
        <div
          className="flex items-center justify-center rounded-lg shrink-0"
          style={{ width: 28, height: 28, background: "#FFFFFF" }}
        >
          <Wifi size={14} color="#0A0A0A" />
        </div>
        <span style={{ color: "#FFFFFF", fontSize: 14, fontWeight: 500, letterSpacing: "-0.2px" }}>
          StreamHub
        </span>
      </Link>

      {/* Mode Switcher */}
      <div className="px-2 py-3" style={{ borderBottom: "0.5px solid #1E1E1E" }}>
        <div className="flex flex-col gap-1">
           <div className="flex bg-[#161616] p-1 rounded-lg border border-[#2A2A2A]">
              <button
                onClick={() => navigate("/dashboard")}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all"
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  backgroundColor: isWorkspaceMode ? "#FFFFFF" : "transparent",
                  color: isWorkspaceMode ? "#0A0A0A" : "#777"
                }}
              >
                <LayoutGrid size={11} />
                Work
              </button>
              <button
                onClick={() => navigate("/manage/team")}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all"
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  backgroundColor: isManagementMode ? "#FFFFFF" : "transparent",
                  color: isManagementMode ? "#0A0A0A" : "#777"
                }}
              >
                <Users size={11} />
                Manage
              </button>
           </div>
           
           <button
             onClick={() => navigate("/admin/revenue")}
             className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg transition-all border border-[#2A2A2A]"
             style={{
               fontSize: 10,
               fontWeight: 600,
               backgroundColor: isSuperadminMode ? "#DC2626" : "#161616",
               color: isSuperadminMode ? "#FFF" : "#777",
               textTransform: "uppercase",
               letterSpacing: "0.5px"
             }}
           >
             <Crown size={11} />
             Superadmin Panel
           </button>
        </div>
      </div>

      {/* Brand Switcher (Only in Workspace) */}
      {isWorkspaceMode && (
        <div className="px-3 py-3" style={{ borderBottom: "0.5px solid #1E1E1E" }}>
          <button
            onClick={() => setBrandOpen(!brandOpen)}
            className="flex items-center gap-2 w-full rounded-lg cursor-pointer"
            style={{
              background: "#161616",
              border: "0.5px solid #2A2A2A",
              borderRadius: 8,
              padding: "8px 10px" }}
          >
            <div
              className="flex items-center justify-center rounded-full shrink-0"
              style={{ width: 24, height: 24, background: "#333", fontSize: 10, color: "#FFF", fontWeight: 600 }}
            >
              TV
            </div>
            <span style={{ color: "#E0E0E0", fontSize: 12, flex: 1, textAlign: "left" }}>TechVN Brand</span>
            <ChevronDown size={12} color="#666" />
          </button>
          {brandOpen && (
            <div
              className="mt-1 rounded-lg overflow-hidden"
              style={{ background: "#161616", border: "0.5px solid #2A2A2A" }}
            >
              {["TechVN Brand", "CreativeVN", "+ New Brand"].map((brand) => (
                <button
                  key={brand}
                  className="flex items-center gap-2 w-full px-3 py-2 cursor-pointer"
                  style={{ color: brand === "TechVN Brand" ? "#FFF" : "#AAA", fontSize: 12 }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#222")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  onClick={() => setBrandOpen(false)}
                >
                  {brand}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 flex flex-col gap-4">
        {activeSections.map((section) => (
          <div key={section.label}>
            <div
              className="px-2 mb-1.5"
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: "#555",
                textTransform: "uppercase",
                letterSpacing: "0.8px" }}
            >
              {section.label}
            </div>
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const isActive = currentPath === item.path;
                return (
                  <Link
                    key={item.label}
                    to={item.path}
                    className="flex items-center gap-2 w-full text-left cursor-pointer no-underline"
                    style={{
                      padding: "7px 10px",
                      borderRadius: 7,
                      background: isActive ? (isSuperadminMode ? "#DC2626" : "#FFFFFF") : "transparent",
                      color: isActive ? (isSuperadminMode ? "#FFF" : "#0A0A0A") : "#777",
                      fontSize: 12.5,
                      fontWeight: 400,
                      transition: "background 0.1s, color 0.1s" }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = "#161616";
                        e.currentTarget.style.color = "#CCC";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "#777";
                      }
                    }}
                  >
                    <span style={{ color: isActive ? "inherit" : "inherit" }}>{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {item.live && (
                      <span className="flex items-center gap-1">
                        <span
                          className="inline-block rounded-full"
                          style={{
                            width: 6,
                            height: 6,
                            background: "#DC2626",
                            animation: "pulse 1.5s ease-in-out infinite" }}
                        />
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 600,
                            background: "#DC2626",
                            color: "#FFF",
                            padding: "1px 5px",
                            borderRadius: 4,
                            letterSpacing: "0.5px" }}
                        >
                          2
                        </span>
                      </span>
                    )}
                    {item.badge && !item.live && (
                      <span
                        style={{
                          fontSize: 10,
                          background: isActive ? "#0A0A0A" : "#222",
                          color: isActive ? "#FFF" : "#888",
                          padding: "1px 6px",
                          borderRadius: 9999,
                          minWidth: 18,
                          textAlign: "center" }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom User */}
      <div className="px-3 py-3" style={{ borderTop: "0.5px solid #1E1E1E" }}>
        <div className="flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer"
          style={{ borderRadius: 7 }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#161616")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          onClick={() => navigate("/settings")}
        >
          <div
            className="flex items-center justify-center rounded-full shrink-0"
            style={{ width: 28, height: 28, background: isSuperadminMode ? "#DC2626" : "#333", fontSize: 10, color: "#FFF", fontWeight: 600 }}
          >
            {isSuperadminMode ? "SA" : "NM"}
          </div>
          <div className="flex-1 min-w-0">
            <div style={{ color: "#DDD", fontSize: 12, fontWeight: 500 }} className="truncate">
              {isSuperadminMode ? "Super Admin" : "Nguyen Minh"}
            </div>
            <div style={{ color: "#555", fontSize: 10 }}>{isSuperadminMode ? "Root Access" : "Owner"}</div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); navigate("/settings"); }}
            className="cursor-pointer"
            style={{ color: "#555" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#CCC")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
          >
            <MoreHorizontal size={14} />
          </button>
        </div>

        {/* Quick links */}
        <div className="flex items-center gap-1 mt-2 px-2">
          <button
            onClick={() => navigate("/notifications")}
            className="flex items-center justify-center rounded-md cursor-pointer"
            style={{ width: 28, height: 28, color: "#555" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#CCC")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
          >
            <Bell size={13} />
          </button>
          <button
            onClick={() => navigate("/settings")}
            className="flex items-center justify-center rounded-md cursor-pointer"
            style={{ width: 28, height: 28, color: "#555" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#CCC")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
          >
            <Settings2 size={13} />
          </button>
          <button
            onClick={() => navigate("/pricing")}
            className="flex items-center justify-center rounded-md cursor-pointer"
            style={{ width: 28, height: 28, color: "#555" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#CCC")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
          >
            <Zap size={13} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </aside>
  );
}
