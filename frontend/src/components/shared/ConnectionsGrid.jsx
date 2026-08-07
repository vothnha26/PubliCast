import React from "react";
import {
  Rss, Facebook, Instagram, Twitter,
  Music2, Globe, Store,
  Diamond, Check, X, Youtube, PlayCircle
} from "lucide-react";
import socialService from "../../services/social.service";
import { toast } from "sonner";
import { PlatformIcon } from "./PlatformIcon";

export const NETWORKS = [
  // ... (keep the same array but I'll need it inside the component or export it)
];

export function ConnectionsGrid({ className = "", brand, onDisconnect }) {
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");

    if (success === "threads_connected") {
      toast.success("Threads connected successfully!");
      const url = new URL(window.location.href);
      url.searchParams.delete("success");
      window.history.replaceState({}, document.title, url.pathname + url.search);
      if (onDisconnect) onDisconnect();
      else window.location.reload();
      return;
    }

    if (success === "bluesky_connected") {
      toast.success("Bluesky connected successfully!");
      const url = new URL(window.location.href);
      url.searchParams.delete("success");
      window.history.replaceState({}, document.title, url.pathname + url.search);
      if (onDisconnect) onDisconnect();
      else window.location.reload();
      return;
    }

    if (success === "google_drive_connected") {
      toast.success("Google Drive connected successfully!");
      const url = new URL(window.location.href);
      url.searchParams.delete("success");
      window.history.replaceState({}, document.title, url.pathname + url.search);
      if (onDisconnect) onDisconnect();
      else window.location.reload();
      return;
    }
  }, []);

  const handleConnectGoogleDrive = async () => {
    if (!brand) {
      toast.error("Please select a brand first");
      return;
    }
    try {
      const response = await socialService.getGoogleDriveAuthUrl(brand.id);
      if (response.url) {
        window.location.href = response.url;
      }
    } catch (error) {
      toast.error(error.message || "Failed to start Google Drive connection");
    }
  };

  const handleConnectBluesky = async () => {
    if (!brand) {
      toast.error("Please select a brand first");
      return;
    }
    try {
      const response = await socialService.getBlueskyAuthUrl(brand.id);
      if (response.url) {
        window.location.href = response.url;
      }
    } catch (error) {
      toast.error(error.message || "Failed to start Bluesky connection");
    }
  };

  const handleConnectYouTube = async () => {
    if (!brand) {
      toast.error("Please select a brand first");
      return;
    }
    try {
      const response = await socialService.getGoogleAuthUrl(brand.id);
      if (response.url) {
        window.location.href = response.url;
      }
    } catch (error) {
      toast.error(error.message || "Failed to start YouTube connection");
    }
  };

  const handleConnectFacebook = async () => {
    if (!brand) {
      toast.error("Please select a brand first");
      return;
    }
    try {
      const response = await socialService.getFacebookAuthUrl(brand.id);
      if (response.url) {
        window.location.href = response.url;
      }
    } catch (error) {
      toast.error(error.message || "Failed to start Facebook connection");
    }
  };

  const handleConnectTikTok = async () => {
    if (!brand) {
      toast.error("Please select a brand first");
      return;
    }
    try {
      const response = await socialService.getTikTokAuthUrl(brand.id);
      if (response.url) {
        window.location.href = response.url;
      }
    } catch (error) {
      toast.error(error.message || "Failed to start TikTok connection");
    }
  };

  const handleConnectInstagram = async () => {
    if (!brand) {
      toast.error("Please select a brand first");
      return;
    }
    try {
      const response = await socialService.getInstagramAuthUrl(brand.id);
      if (response.url) {
        window.location.href = response.url;
      }
    } catch (error) {
      toast.error(error.message || "Failed to start Instagram connection");
    }
  };

  const handleConnectThreads = async () => {
    if (!brand) {
      toast.error("Please select a brand first");
      return;
    }
    try {
      const response = await socialService.getThreadsAuthUrl(brand.id);
      if (response.url) {
        window.location.href = response.url;
      }
    } catch (error) {
      toast.error(error.message || "Failed to start Threads connection");
    }
  };

  const handleConnectTwitch = async () => {
    if (!brand) {
      toast.error("Please select a brand first");
      return;
    }
    try {
      const response = await socialService.getTwitchAuthUrl(brand.id);
      if (response.url) {
        window.location.href = response.url;
      }
    } catch (error) {
      toast.error(error.message || "Failed to start Twitch connection");
    }
  };

  const handleConnectReddit = async () => {
    if (!brand) {
      toast.error("Please select a brand first");
      return;
    }
    try {
      const response = await socialService.getRedditAuthUrl(brand.id);
      if (response.url) {
        window.location.href = response.url;
      }
    } catch (error) {
      toast.error(error.message || "Failed to start Reddit connection");
    }
  };

  const getStatus = (platformId) => {
    if (!brand || !brand.socialAccounts) return { connected: false, count: 0 };
    const mapping = {
      "facebook": "FACEBOOK",
      "instagram": "INSTAGRAM",
      "youtube": "YOUTUBE",
      "tiktok": "TIKTOK",
      "x": "TWITTER_X",
      "threads": "THREADS",
      "twitch": "TWITCH",
      "bluesky": "BLUESKY",
      "reddit": "REDDIT",
      "google_drive": "GOOGLE_DRIVE"
    };
    const platform = mapping[platformId];
    const accounts = brand.socialAccounts.filter(sa => sa.platform === platform);
    return {
      connected: accounts.length > 0,
      count: accounts.length,
      handle: accounts[0]?.username || accounts[0]?.displayName
    };
  };

  const networks = [
    { 
      id: "facebook", name: "Facebook", icon: <Facebook size={16} className="text-blue-600" />, 
      btnText: "Connect a Facebook page", btnBg: "bg-blue-600", ...getStatus("facebook")
    },
    { 
      id: "instagram", name: "Instagram", icon: <Instagram size={16} className="text-pink-600" />, 
      btnText: "Connect an Instagram professional account", btnBg: "bg-[#FF0069]", ...getStatus("instagram")
    },
    { 
      id: "threads", name: "Threads", icon: <PlatformIcon platform="Threads" size={16} variant="flat" />, 
      btnText: "Connect a Threads account", btnBg: "bg-black", ...getStatus("threads")
    },
    { 
      id: "youtube", name: "YouTube", icon: <Youtube size={16} className="text-red-600" />, 
      btnText: "Connect a YouTube channel", btnBg: "bg-red-600", ...getStatus("youtube")
    },
    {
      id: "google_drive", name: "Google Drive", icon: <PlatformIcon platform="google_drive" size={16} variant="flat" />,
      btnText: "Connect Google Drive", btnBg: "bg-[#4285F4]", ...getStatus("google_drive")
    },
    { 
      id: "tiktok", name: "TikTok", icon: <Music2 size={16} className="text-black" />, 
      btnText: "Connect a TikTok account", btnBg: "bg-black", ...getStatus("tiktok")
    },
    { 
      id: "x", name: "X (Twitter)", icon: <X size={16} className="text-black" />, 
      btnText: "Connect a Twitter / X account", btnBg: "bg-black", ...getStatus("x")
    },
    {
      id: "twitch", name: "Twitch", icon: <PlayCircle size={16} className="text-purple-600" />,
      btnText: "Connect a Twitch channel", btnBg: "bg-[#9146FF]", ...getStatus("twitch")
    },
    {
      id: "bluesky", name: "Bluesky", icon: <PlatformIcon platform="bluesky" variant="flat" size={16} />,
      btnText: "Connect a Bluesky account", btnBg: "bg-[#0085FF]", ...getStatus("bluesky")
    },
    {
      id: "reddit", name: "Reddit", icon: <Globe size={16} className="text-orange-500" />,
      btnText: "Connect a Reddit account", btnBg: "bg-[#FF4500]", ...getStatus("reddit")
    },
  ];

  return (
    <>
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-12 ${className}`}>
        {networks.map((net) => (
          <div key={net.id} className="space-y-4 relative group">
             {/* Network Label */}
             <div className="flex items-center gap-2 px-1">
                {net.icon}
                <span className="text-[15px] font-bold text-foreground">{net.name}</span>
             </div>

             {/* Connection Button */}
             <div className="relative">
                <button
                  onClick={() => {
                    if (net.id === "youtube") handleConnectYouTube();
                    if (net.id === "google_drive") handleConnectGoogleDrive();
                    if (net.id === "facebook") handleConnectFacebook();
                    if (net.id === "tiktok") handleConnectTikTok();
                    if (net.id === "instagram") handleConnectInstagram();
                    if (net.id === "threads") handleConnectThreads();
                    if (net.id === "twitch") handleConnectTwitch();
                    if (net.id === "bluesky") handleConnectBluesky();
                    if (net.id === "reddit") handleConnectReddit();
                  }}
                  className={`w-full h-[60px] rounded-2xl flex items-center justify-between px-6 transition-all transform active:scale-95 shadow-sm border border-black/5 ${net.btnBg} ${net.btnTextColor || 'text-white'}`}
                >
                   <div className="flex-1 min-w-0 pr-4">
                      {net.connected ? (
                         <div className="flex flex-col items-start text-left">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${net.btnTextColor || 'text-white'}`}>
                               {net.count} {net.count === 1 ? "account connected" : "accounts connected"}
                            </span>
                            <span className={`text-[11px] font-bold underline mt-1 opacity-90 hover:opacity-100 ${net.btnTextColor || 'text-white'}`}>Connect another</span>
                         </div>
                      ) : (
                         <span className="text-[11px] font-black text-left leading-snug uppercase tracking-[1px]">
                            {net.btnText}
                         </span>
                      )}
                   </div>
                   
                   <div className="text-white/40 group-hover:text-white transition-colors shrink-0">
                      {React.cloneElement(net.icon, { size: 20, className: "text-white" })}
                   </div>
                </button>
             </div>
          </div>
        ))}
      </div>


    </>
  );
}
