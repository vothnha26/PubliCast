import React, { useState } from "react";
import {
  AlertCircle, ChevronDown, Youtube, Instagram, Send, MessageSquare, Linkedin
} from "lucide-react";
import { usePostCreatorFormContext } from "../../../context/PostCreatorFormContext";

function parseValidationError(err) {
  const match = err.match(/^\[([A-Z_]+)(?:\s*-\s*[A-Z_]+)?\]\s*(.*)$/);
  if (match) return { platform: match[1].toLowerCase(), message: match[2] };
  return { platform: null, message: err };
}

function ErrorIcon({ platform }) {
  switch (platform) {
    case "facebook":
      return (
        <svg className="w-3.5 h-3.5 text-[#1877F2] fill-[#1877F2] shrink-0" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );
    case "instagram":
      return <Instagram size={14} className="text-[#DD2A7B] shrink-0" />;
    case "tiktok":
      return (
        <svg className="w-3.5 h-3.5 fill-current text-black shrink-0" viewBox="0 0 24 24">
          <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.09-1.5-1.1-1.02-1.7-2.48-1.9-3.96-.03 2.49 0 4.99 0 7.48-.02 1.9-.38 3.82-1.39 5.43-1.46 2.42-4.13 3.84-6.93 3.55-3.05-.2-5.78-2.44-6.39-5.46-.73-3.27.97-6.9 4.13-7.91 1.09-.34 2.24-.39 3.37-.2v4.02c-1.22-.32-2.58-.09-3.55.74-.95.83-1.29 2.19-1.03 3.4.31 1.65 1.84 2.91 3.53 2.78 1.94-.04 3.42-1.8 3.25-3.73-.02-2.91 0-5.83 0-8.74.02-3.11-.02-6.22.02-9.33z" />
        </svg>
      );
    case "youtube":
      return <Youtube size={14} className="text-[#FF0000] fill-[#FF0000] shrink-0" />;
    case "linkedin":
      return <Linkedin size={14} className="text-[#0077B5] fill-[#0077B5] shrink-0" />;
    case "telegram":
      return <Send size={12} className="text-[#0088cc] fill-[#0088cc] shrink-0 rotate-45" />;
    case "discord":
      return <MessageSquare size={14} className="text-[#5865F2] shrink-0" />;
    default:
      return <AlertCircle size={14} className="text-red-400 shrink-0" />;
  }
}

export function ComposerErrorPanel() {
  const { getValidationErrors } = usePostCreatorFormContext();
  const [open, setOpen] = useState(true);

  const errors = getValidationErrors();
  if (errors.length === 0) return null;

  return (
    <div className="shrink-0 border-t border-red-100 bg-white">
      {/* Header row – always visible */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between px-6 py-3 cursor-pointer transition-colors ${
          open ? "bg-red-50/80" : "bg-white hover:bg-red-50/40"
        }`}
      >
        <div className="flex items-center gap-2.5">
          {/* Pulsing dot */}
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          <AlertCircle size={14} className="text-red-500 shrink-0" />
          <span className="text-[11px] font-black text-red-700 uppercase tracking-wider font-sans">
            {errors.length} error{errors.length > 1 ? "s" : ""}
          </span>
        </div>
        <ChevronDown
          size={15}
          className={`text-red-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Collapsible error list */}
      <div
        className={`overflow-y-auto transition-all duration-300 ${
          open ? "max-h-[220px]" : "max-h-0"
        }`}
      >
        <div className="px-6 pb-4 pt-2 space-y-2">
          {errors.map((err, idx) => {
            const parsed = parseValidationError(err);
            return (
              <div
                key={idx}
                className="flex items-center gap-2.5 py-1.5 text-left"
              >
                <ErrorIcon platform={parsed.platform} />
                <span className="text-[12px] font-medium text-gray-700 font-sans leading-snug">
                  {parsed.message}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
