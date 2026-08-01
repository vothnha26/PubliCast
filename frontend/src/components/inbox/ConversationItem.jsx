import * as React from "react";
import { Youtube, Facebook, Instagram, MessageSquare, EyeOff, CheckCircle } from "lucide-react";

const PLATFORM_COLORS = {
  YouTube: "#FF0000", Facebook: "#1877F2", TikTok: "#010101",
  Instagram: "#E1306C", Twitch: "#9146FF", X: "#000000" };

export const SafeAvatar = ({ src, name, className }) => {
  const [error, setError] = React.useState(false);
  
  if (error || !src || src.length < 5) {
    const initial = name ? name.charAt(0).toUpperCase() : '?';
    return (
      <div className={`flex items-center justify-center font-bold text-white bg-indigo-500 uppercase ${className}`}>
        {initial}
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt="" 
      className={className} 
      onError={() => setError(true)} 
    />
  );
};

export const ConversationItem = ({ conv, activeConv, onSelect, onUpdateStatus }) => {
  return (
    <div
      onClick={() => onSelect(conv)}
      className={`p-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-all relative group ${activeConv?.id === conv.id ? "bg-muted/50" : ""}`}
    >
      <div className="flex items-start gap-4">
        {/* Avatar Stack */}
        <div className="relative shrink-0 w-12 h-12">
          {conv.participants && conv.participants.length > 1 ? (
            <>
              <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-background shadow-sm bg-muted absolute top-0 left-0 z-10 flex">
                <SafeAvatar src={conv.participants[0].avatar} name={conv.participants[0].name} className="w-full h-full object-cover" />
              </div>
              <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-background shadow-sm bg-[#4A3AFF] absolute bottom-0 right-0 z-0 flex items-center justify-center text-[10px] font-bold text-white">
                <SafeAvatar src={conv.participants[1].avatar} name={conv.participants[1].name} className="w-full h-full object-cover" />
              </div>
            </>
          ) : (
            <div className="w-12 h-12 rounded-full overflow-hidden border border-border bg-muted flex">
              <SafeAvatar src={conv.avatar} name={conv.user} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-card shadow-sm border border-border flex items-center justify-center z-20">
            {conv.platform?.toLowerCase() === "facebook" ? (
              <Facebook className="text-[#1877F2] fill-[#1877F2]" size={10} />
            ) : conv.platform?.toLowerCase() === "instagram" ? (
              <Instagram className="text-[#E1306C]" size={10} />
            ) : (
              <Youtube className="text-[#FF0000] fill-[#FF0000]" size={10} />
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-bold text-foreground truncate leading-tight">{conv.user}</span>
            <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">{conv.time}</span>
          </div>
          <div className="flex items-start gap-1.5 mt-1">
            <MessageSquare size={13} className="text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-normal flex-1">{conv.preview}</p>
          </div>
        </div>

        {/* Action Hover Icons */}
        <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all absolute right-4 bottom-4">
          {!conv.unread && (
            <button 
              onClick={(e) => { e.stopPropagation(); onUpdateStatus(conv.id, 'UNREAD'); }}
              className="text-muted-foreground hover:text-foreground"
            >
              <EyeOff size={14} />
            </button>
          )}
          <button 
            onClick={(e) => { e.stopPropagation(); onUpdateStatus(conv.id, 'RESOLVED'); }}
            className="text-muted-foreground hover:text-green-500"
          >
            <CheckCircle size={14} />
          </button>
        </div>
      </div>
      {conv.unread && <div className="absolute top-1/2 -translate-y-1/2 left-0 w-1 h-8 bg-primary rounded-r-full" />}
    </div>
  );
};
