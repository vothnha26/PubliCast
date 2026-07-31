import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { 
  Loader2, 
  AlertCircle, 
  ArrowUpRight, 
  Twitter, 
  Instagram, 
  Youtube, 
  Facebook, 
  Globe, 
  Mail, 
  Share2, 
  Video, 
  Send,
  Linkedin,
  Github,
  Chrome 
} from "lucide-react";
import smartLinkService from "../../services/smartlink.service";

const THEMES = [
  { id: "midnight", name: "Midnight Black", bg: "bg-slate-950", text: "text-white", buttonBg: "bg-slate-800 hover:bg-slate-700", buttonText: "text-white", border: "border-slate-800" },
  { id: "sunset", name: "Sunset Orange", bg: "bg-gradient-to-tr from-amber-500 to-rose-500", text: "text-white", buttonBg: "bg-white/10 hover:bg-white/20 backdrop-blur-sm", buttonText: "text-white", border: "border-white/10" },
  { id: "mint", name: "Mint Glassmorphism", bg: "bg-gradient-to-tr from-teal-50 to-emerald-100", text: "text-slate-800", buttonBg: "bg-white/70 hover:bg-white/90 shadow-sm border border-emerald-200/50", buttonText: "text-slate-800", border: "border-emerald-200" },
  { id: "cyberpunk", name: "Cyberpunk Neon", bg: "bg-[#0c0f1d]", text: "text-[#00ffcc]", buttonBg: "bg-slate-900 hover:bg-slate-850 border border-[#ff0055] shadow-[0_0_8px_rgba(255,0,85,0.4)]", buttonText: "text-[#00ffcc]", border: "border-[#ff0055]" }
];

const renderSocialIcon = (platform, size = 15) => {
  const p = (platform || "").toLowerCase().trim();
  if (p === "twitter" || p === "x") return <Twitter size={size} />;
  if (p === "instagram") return <Instagram size={size} />;
  if (p === "youtube") return <Youtube size={size} />;
  if (p === "facebook") return <Facebook size={size} />;
  if (p === "email" || p === "mail") return <Mail size={size} />;
  if (p === "website" || p === "globe") return <Globe size={size} />;
  if (p === "tiktok") return <Video size={size} />;
  if (p === "linkedin") return <Linkedin size={size} />;
  if (p === "github") return <Github size={size} />;
  if (p === "telegram") return <Send size={size} />;
  return <Share2 size={size} />;
};

export function PublicSmartLinksPage() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [theme, setTheme] = useState(THEMES[0]);
  const [socialIcons, setSocialIcons] = useState([]);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        const res = await smartLinkService.getPublicSmartLink(slug);
        const smartLink = res?.data || res;
        setData(smartLink);
        
        // Match theme
        const matchedTheme = THEMES.find(t => t.id === smartLink.backgroundValue);
        if (matchedTheme) {
          setTheme(matchedTheme);
        }

        // Parse social icons from new socialLinks field, with fallback for legacy buttonStyle data
        let parsedSocials = [];
        const socialPayload = smartLink.socialLinks || (smartLink.buttonStyle && smartLink.buttonStyle.includes("|") ? smartLink.buttonStyle.split("|")[1] : "");
        if (socialPayload) {
          const socialStr = socialPayload;
          if (socialStr) {
            const parts = socialStr.split(";");
            parts.forEach((p, idx) => {
              if (p.includes("=")) {
                const [platform, url] = p.split("=");
                parsedSocials.push({
                  id: `s-${idx}`,
                  platform,
                  url
                });
              }
            });
          }
        }
        setSocialIcons(parsedSocials);
      } catch (err) {
        console.error("Error loading public SmartLink:", err);
        setError("Trang Bio Link này không tồn tại hoặc đã bị gỡ xuống.");
      } finally {
        setLoading(false);
      }
    };

    fetchPublicData();
  }, [slug]);

  const handleLinkClick = async (linkId, url) => {
    try {
      // Async track in background for valid saved link items
      if (linkId && !String(linkId).startsWith("l-")) {
        smartLinkService.registerClick(linkId).catch(err => console.error("Track click error:", err));
      }
      
      // Open link in new window
      const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
      window.open(normalizedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
        <Loader2 className="animate-spin text-[#10B981] w-8 h-8 mb-2" />
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading SmartLink...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-6 text-center">
        <div className="max-w-md p-8 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h3 className="text-lg font-bold">Không tìm thấy trang</h3>
          <p className="text-sm text-slate-400 leading-relaxed">{error}</p>
          <div className="pt-2">
            <a href="/" className="inline-block text-xs font-bold uppercase tracking-wider text-emerald-400 hover:text-emerald-300 transition-colors">
              Quay lại trang chủ PubliCast
            </a>
          </div>
        </div>
      </div>
    );
  }

  const activeLinks = data.links ? data.links.filter(l => l.isActive) : [];

  return (
    <div className={`w-full min-h-screen flex flex-col items-center py-16 px-4 ${theme.bg} ${theme.text}`}>
      
      {/* Profile Area */}
      <div className="flex flex-col items-center text-center max-w-sm mb-12">
        <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-xl mb-4 border border-slate-200 overflow-hidden shrink-0 transform hover:scale-105 transition-transform duration-300">
          {!avatarError && data.profileImageUrl ? (
            <img 
              src={data.profileImageUrl} 
              alt={data.pageTitle} 
              className="w-full h-full object-cover"
              onError={() => setAvatarError(true)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-extrabold text-2xl">
              {(data?.pageTitle || "P").charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <h1 className="text-xl font-bold tracking-tight">{data.pageTitle}</h1>
        {data.bio && (
          <p className="text-sm opacity-80 mt-2 px-4 leading-relaxed max-w-[280px] font-semibold">
            {data.bio}
          </p>
        )}
      </div>

      {/* Links Container */}
      <div className="w-full max-w-md flex flex-col gap-4 flex-1">
        {activeLinks.length === 0 ? (
          <div className="text-center py-12 opacity-65 text-sm">
            Chưa có liên kết công khai nào được thêm.
          </div>
        ) : (
          activeLinks.map((link) => {
            // Parse custom styles if available
            let bgColor = "";
            let textColor = "";
            let borderColor = "";
            const styleSource = link.linkStyle || link.iconUrl || "";
            
            if (styleSource && styleSource.startsWith("style:")) {
              const parts = styleSource.replace("style:", "").split(";");
              parts.forEach(p => {
                const [key, val] = p.split("=");
                if (key === "bgColor") bgColor = val;
                if (key === "textColor") textColor = val;
                if (key === "borderColor") borderColor = val;
              });
            }

            const customStyle = bgColor ? {
              backgroundColor: bgColor,
              color: textColor || "#FFFFFF",
              borderColor: borderColor || bgColor
            } : {};

            const hasCustomIconUrl = link.iconUrl && !link.iconUrl.startsWith("style:");

            return (
              <button
                key={link.id}
                onClick={() => handleLinkClick(link.id, link.url)}
                style={customStyle}
                className={`w-full rounded-2xl py-4 px-6 text-sm font-bold text-center border transition-all transform hover:scale-[1.01] active:scale-[0.99] duration-200 flex justify-between items-center group cursor-pointer shadow-sm ${
                  !bgColor ? `${theme.buttonBg} ${theme.buttonText} ${theme.border}` : ""
                }`}
              >
                {hasCustomIconUrl ? (
                  <img src={link.iconUrl} alt="" className="w-5 h-5 object-contain shrink-0 rounded" />
                ) : (
                  <span className="text-lg w-5 h-5 flex items-center justify-center shrink-0">{link.emoji || "🔗"}</span>
                )}
                <span className="mx-2 truncate flex-1 text-center">{link.title}</span>
                <ArrowUpRight size={16} className="opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
              </button>
            );
          })
        )}
      </div>

      {/* Social Icons bottom */}
      {socialIcons.length > 0 && (
        <div className="flex items-center justify-center gap-4 mt-8 pt-6 border-t border-white/10 w-full max-w-md">
          {socialIcons.map(sIcon => (
            <a 
              key={sIcon.id} 
              href={sIcon.url.startsWith("http") ? sIcon.url : `https://${sIcon.url}`} 
              target="_blank" 
              rel="noreferrer" 
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all border border-white/5"
              title={sIcon.platform}
            >
              {renderSocialIcon(sIcon.platform, 15)}
            </a>
          ))}
        </div>
      )}

      {/* Powered by Watermark */}
      <div className="text-[10px] opacity-40 font-bold tracking-widest uppercase select-none mt-12 hover:opacity-75 transition-opacity cursor-pointer flex items-center gap-1.5">
        <Chrome size={10} />
        <a href="/" target="_blank" rel="noopener noreferrer">
          Powered by PubliCast
        </a>
      </div>

    </div>
  );
}
