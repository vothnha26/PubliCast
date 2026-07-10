import React from "react";
import { Settings, ChevronDown, Link2 } from "lucide-react";
import { usePostCreatorFormContext } from "../../../../context/PostCreatorFormContext";

export function GlobalPresets() {
  const {
    globalOpen,
    setGlobalOpen,
    globalFirstComment,
    setGlobalFirstComment,
    useUrlShortener,
    setUseUrlShortener,
    smartLinkTitle,
    setSmartLinkTitle,
    smartLinkUrl,
    setSmartLinkUrl
  } = usePostCreatorFormContext();

  return (
    <div className="border border-gray-100 rounded-3xl overflow-hidden bg-white shadow-sm transition-all duration-300">
      <div 
        onClick={() => setGlobalOpen(!globalOpen)}
        className="p-5 flex items-center justify-between hover:bg-gray-50/50 transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          <Settings size={18} className="text-gray-400 group-hover:text-black transition-colors" />
          <span className="text-[12px] font-bold text-gray-700 font-sans">Global presets</span>
          <span className="px-2 py-0.5 bg-[#D1FAE5] text-[#065F46] rounded-lg text-[9px] font-bold font-sans">New</span>
        </div>
        <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${globalOpen ? 'rotate-180 text-black' : ''}`} />
      </div>
      
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${globalOpen ? 'max-h-[800px] border-t border-gray-50 p-6' : 'max-h-0'}`}>
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 font-sans">First Comment</label>
            <textarea 
              value={globalFirstComment}
              onChange={(e) => setGlobalFirstComment(e.target.value)}
              placeholder="Write a comment to be posted automatically right after publishing..."
              className="w-full p-4 border border-gray-200 rounded-2xl text-xs font-medium focus:border-black outline-none resize-none h-20 font-sans"
            />
          </div>

          {/* Toggle SmartLinks */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-gray-100/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-xl shadow-sm text-gray-500">
                <Link2 size={16} />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-gray-800 font-sans">SmartLinks (URL Shortener)</div>
                <div className="text-[10px] text-gray-400 font-medium font-sans">Auto-shorten links in your post body and track analytics.</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setUseUrlShortener(!useUrlShortener)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${useUrlShortener ? 'bg-black' : 'bg-gray-200'}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${useUrlShortener ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {/* SmartLinks Form details (hãng khi toggle bật) */}
          {useUrlShortener && (
            <div className="p-5 bg-purple-50/30 rounded-2xl border border-purple-100/60 flex flex-col gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
              
              {/* Description text */}
              <p className="text-[11px] text-purple-700/80 font-medium font-sans leading-relaxed">
                ✨ Create your first Smartlink and automatically add post images or videos with custom links.
              </p>

              {/* Title input */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider font-sans">
                    Title / Link text
                  </label>
                  <span className="text-[9px] font-bold text-gray-400 font-sans">
                    {smartLinkTitle.length} / 30
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={30}
                  value={smartLinkTitle}
                  onChange={(e) => setSmartLinkTitle(e.target.value)}
                  placeholder="e.g. Visit our website"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-semibold focus:border-purple-400 focus:ring-1 focus:ring-purple-400 outline-none font-sans transition-all"
                />
              </div>

              {/* URL input */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider font-sans">
                    Destination URL
                  </label>
                  <span className="text-[9px] font-bold text-gray-400 font-sans">
                    {smartLinkUrl.length} / 500
                  </span>
                </div>
                <input
                  type="url"
                  maxLength={500}
                  value={smartLinkUrl}
                  onChange={(e) => setSmartLinkUrl(e.target.value)}
                  placeholder="https://example.com/promotion"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-semibold focus:border-purple-400 focus:ring-1 focus:ring-purple-400 outline-none font-sans transition-all"
                />
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
