import React from "react";

export function MetricToggle({ on, onChange, className = "" }) {
  return (
    <div
      onClick={() => onChange && onChange(!on)}
      className={`relative cursor-pointer transition-all duration-200 shrink-0 ${className}`}
      style={{
        width: 30,
        height: 17,
        borderRadius: 9999,
        background: on ? "#FFFFFF" : "#333",
      }}
    >
      <div
        className="absolute top-0.5 transition-all duration-200"
        style={{
          left: on ? 15 : 2,
          width: 13,
          height: 13,
          borderRadius: "50%",
          background: on ? "#0A0A0A" : "#888",
        }}
      />
    </div>
  );
}
