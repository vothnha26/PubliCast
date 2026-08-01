import React from "react";
import {
  Rss, Facebook, Instagram, Twitter,
  Music2, Globe, Store,
  Diamond, Check, X, Youtube, PlayCircle,
  Send, Loader2
} from "lucide-react";
import socialService from "../../services/social.service";
import { toast } from "sonner";
import { PlatformIcon } from "./PlatformIcon";

export const NETWORKS = [
  // ... (keep the same array but I'll need it inside the component or export it)
];

export function ConnectionsGrid({ className = "", brand, onDisconnect }) {
  const [showTelegramModal, setShowTelegramModal] = React.useState(false);
  const [botToken, setBotToken] = React.useState("");
  const [chatId, setChatId] = React.useState("");

  const [isSubmitting, setIsSubmitting] = React.useState(false);

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
    const status = getStatus("google_drive");
    if (status.connected) {
      try {
        await socialService.disconnectGoogleDriveAccount(brand.id);
        toast.success("Google Drive disconnected");
        if (onDisconnect) onDisconnect();
        else window.location.reload();
      } catch (error) {
        toast.error(error.message || "Failed to disconnect Google Drive");
      }
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

  const handleConnectTelegram = async () => {
    if (!brand) {
      toast.error("Please select a brand first");
      return;
    }
    const status = getStatus("telegram");
    if (status.connected) {
      try {
        await socialService.disconnectTelegramAccount(brand.id);
        toast.success("Telegram channel disconnected");
        if (onDisconnect) onDisconnect();
        else window.location.reload();
      } catch (error) {
        toast.error(error.message || "Failed to disconnect Telegram");
      }
      return;
    }
    setBotToken("");
    setChatId("");
    setShowTelegramModal(true);
  };

  const submitTelegramConnection = async (e) => {
    e.preventDefault();
    if (!botToken || !chatId) {
      toast.error("Bot Token and Chat ID are required");
      return;
    }
    setIsSubmitting(true);
    try {
      await socialService.connectTelegramAccount(brand.id, botToken, chatId);
      toast.success("Telegram connected successfully!");
      setShowTelegramModal(false);
      if (onDisconnect) onDisconnect();
      else window.location.reload();
    } catch (error) {
      toast.error(error.message || "Failed to connect Telegram");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConnectBluesky = async () => {
    if (!brand) {
      toast.error("Please select a brand first");
      return;
    }
    const status = getStatus("bluesky");
    if (status.connected) {
      try {
        await socialService.disconnectBlueskyAccount(brand.id);
        toast.success("Bluesky account disconnected");
        if (onDisconnect) onDisconnect();
        else window.location.reload();
      } catch (error) {
        toast.error(error.message || "Failed to disconnect Bluesky");
      }
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
    const status = getStatus("youtube");
    if (status.connected) {
      try {
        await socialService.disconnectGoogleAccount(brand.id);
        toast.success("YouTube channel disconnected");
        if (onDisconnect) onDisconnect();
        else window.location.reload();
      } catch (error) {
        toast.error(error.message || "Failed to disconnect YouTube");
      }
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
    const status = getStatus("facebook");
    if (status.connected) {
      try {
        await socialService.disconnectFacebookAccount(brand.id);
        toast.success("Facebook page disconnected");
        if (onDisconnect) onDisconnect();
        else window.location.reload();
      } catch (error) {
        toast.error(error.message || "Failed to disconnect Facebook");
      }
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
    const status = getStatus("tiktok");
    if (status.connected) {
      try {
        await socialService.disconnectTikTokAccount(brand.id);
        toast.success("TikTok account disconnected");
        if (onDisconnect) onDisconnect();
        else window.location.reload();
      } catch (error) {
        toast.error(error.message || "Failed to disconnect TikTok");
      }
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
    const status = getStatus("instagram");
    if (status.connected) {
      try {
        await socialService.disconnectInstagramAccount(brand.id);
        toast.success("Instagram account disconnected");
        if (onDisconnect) onDisconnect();
        else window.location.reload();
      } catch (error) {
        toast.error(error.message || "Failed to disconnect Instagram");
      }
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
    const status = getStatus("threads");
    if (status.connected) {
      try {
        await socialService.disconnectThreadsAccount(brand.id);
        toast.success("Threads account disconnected");
        if (onDisconnect) onDisconnect();
        else window.location.reload();
      } catch (error) {
        toast.error(error.message || "Failed to disconnect Threads");
      }
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
    const status = getStatus("twitch");
    if (status.connected) {
      try {
        await socialService.disconnectTwitchAccount(brand.id);
        toast.success("Twitch channel disconnected");
        if (onDisconnect) onDisconnect();
        else window.location.reload();
      } catch (error) {
        toast.error(error.message || "Failed to disconnect Twitch");
      }
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
    const status = getStatus("reddit");
    if (status.connected) {
      try {
        await socialService.disconnectRedditAccount(brand.id);
        toast.success("Reddit account disconnected");
        if (onDisconnect) onDisconnect();
        else window.location.reload();
      } catch (error) {
        toast.error(error.message || "Failed to disconnect Reddit");
      }
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
    if (!brand || !brand.socialAccounts) return { connected: false };
    const mapping = {
      "facebook": "FACEBOOK",
      "instagram": "INSTAGRAM",
      "youtube": "YOUTUBE",
      "tiktok": "TIKTOK",
      "x": "TWITTER_X",
      "telegram": "TELEGRAM",
      "threads": "THREADS",
      "twitch": "TWITCH",
      "bluesky": "BLUESKY",
      "reddit": "REDDIT",
      "google_drive": "GOOGLE_DRIVE"
    };
    const platform = mapping[platformId];
    const account = brand.socialAccounts.find(sa => sa.platform === platform);
    return {
      connected: !!account,
      handle: account?.username || account?.displayName
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
      id: "telegram", name: "Telegram", icon: <Send size={16} className="text-white fill-current" />,
      btnText: "Connect a Telegram channel", btnBg: "bg-[#0088cc]", ...getStatus("telegram")
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
                    if (net.id === "telegram") handleConnectTelegram();
                    if (net.id === "twitch") handleConnectTwitch();
                    if (net.id === "bluesky") handleConnectBluesky();
                    if (net.id === "reddit") handleConnectReddit();
                  }}
                  className={`w-full h-[60px] rounded-2xl flex items-center justify-between px-6 transition-all transform active:scale-95 shadow-sm border border-black/5 ${net.btnBg} ${net.btnTextColor || 'text-white'}`}
                >
                   <div className="flex-1 min-w-0 pr-4">
                      {net.connected ? (
                         <div className="flex flex-col items-start text-left">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${net.btnTextColor || 'text-white'}`}>CONNECTED {net.handle ? `(${net.handle})` : ''}</span>
                            <span className={`text-[11px] font-bold underline mt-1 opacity-90 hover:opacity-100 ${net.btnTextColor ? 'text-red-600' : 'text-white'}`}>Disconnect</span>
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

      {/* Telegram Modal */}
      {showTelegramModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card dark:bg-[#1a1a1a] rounded-[24px] p-6 max-w-md w-full shadow-2xl border border-border dark:border-gray-800 animate-in zoom-in-95 duration-200 text-left">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#0088cc] flex items-center justify-center text-white">
                  <Send size={18} className="fill-current" />
                </div>
                <h3 className="text-lg font-bold text-foreground dark:text-white">Connect Telegram Channel</h3>
              </div>
              <button 
                onClick={() => setShowTelegramModal(false)}
                className="text-muted-foreground hover:text-muted-foreground dark:hover:text-gray-300 p-1.5 hover:bg-muted dark:hover:bg-gray-800 rounded-full transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitTelegramConnection} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground dark:text-gray-300 mb-1.5 uppercase tracking-wider">Bot Token</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. 123456:ABC-DEF1234ghIkl-zyx57W2v1u1"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-border dark:border-gray-700 bg-muted dark:bg-gray-800 text-sm text-foreground dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0088cc] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground dark:text-gray-300 mb-1.5 uppercase tracking-wider">Chat ID (Channel or Group)</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. @mychannel or -100123456789"
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-border dark:border-gray-700 bg-muted dark:bg-gray-800 text-sm text-foreground dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0088cc] transition-all"
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/40 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/40 text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed space-y-1">
                <span className="font-bold block text-xs mb-1">Quick Instructions:</span>
                <p>1. Start a chat with <span className="font-bold">@BotFather</span> on Telegram and create a new bot to get your <span className="font-bold">Bot Token</span>.</p>
                <p>2. Add your bot as an <span className="font-bold">Administrator</span> to your channel/group with post permission.</p>
                <p>3. Provide the <span className="font-bold">Chat ID</span> (e.g. @your_channel_username or the numeric ID starting with -100).</p>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowTelegramModal(false)}
                  className="flex-1 h-11 rounded-xl text-sm font-semibold text-foreground dark:text-gray-300 hover:bg-muted dark:hover:bg-gray-800 transition-all border border-border dark:border-gray-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 h-11 rounded-xl text-sm font-semibold text-white bg-[#0088cc] hover:bg-[#0077b5] disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-[#0088cc]/20"
                >
                  {isSubmitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <span>Connect</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



    </>
  );
}
