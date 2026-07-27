import React from "react";

export function StatCard({
  label,
  value,
  delta,
  deltaColor,
  note,
  className = ""
}) {
  return (
    <div
      className={`flex flex-col bg-white border border-gray-100 rounded-2xl p-4 shadow-sm ${className}`}
      style={{ minWidth: 0, width: "100%" }}
    >
      <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 6, minWidth: 0 }} className="font-bold uppercase tracking-wider">{label}</div>
      <div style={{ 
        fontSize: 22, 
        fontWeight: 700, 
        color: "#0A0A0A", 
        lineHeight: 1.2, 
        wordBreak: "break-all", 
        overflowWrap: "anywhere",
        whiteSpace: "normal",
        maxWidth: "100%",
        display: "block"
      }}>{value}</div>
      {delta && (
        <div style={{ fontSize: 11, color: deltaColor || "#16A34A", marginTop: 4, minWidth: 0 }} className="font-bold">{delta}</div>
      )}
      {note && <div style={{ fontSize: 11, color: "#6B7280", marginTop: 4, minWidth: 0 }}>{note}</div>}
    </div>
  );
}
