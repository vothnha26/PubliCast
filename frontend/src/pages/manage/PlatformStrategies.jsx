import React from "react";

// Individual Strategy implementations for each social platform

const FacebookStrategy = {
  id: "facebook",
  name: "Facebook",
  renderIcon: (size) => (
    <span className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-[#1877F2]">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    </span>
  ),
  renderPreview: (post, brand, postImage, scheduledTimeStr) => {
    const brandName = brand?.name || "Brand Page";
    const brandLogo = brand?.logoUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=60";
    const caption = post?.caption || "";
    
    return (
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden text-left font-sans max-w-full">
        {/* Header */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={brandLogo} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-border" />
            <div>
              <div className="text-sm font-semibold text-foreground hover:underline cursor-pointer">{brandName}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                {scheduledTimeStr} · <span className="inline-block w-3 h-3 bg-muted0 rounded-full text-[8px] text-white text-center leading-3 font-black">🌐</span>
              </div>
            </div>
          </div>
          <span className="text-muted-foreground font-bold hover:text-muted-foreground cursor-pointer">•••</span>
        </div>

        {/* Caption */}
        <div className="px-4 pb-3 text-sm text-foreground leading-relaxed whitespace-pre-wrap">{caption}</div>

        {/* Media */}
        {postImage && (
          <div className="bg-muted border-y border-border">
            <img src={postImage} alt="Post Content" className="w-full object-cover max-h-[350px]" />
          </div>
        )}

        {/* Actions Bar Mockup */}
        <div className="px-4 py-2.5 border-t border-gray-150 flex items-center justify-around text-xs text-muted-foreground font-semibold bg-muted/40">
          <span className="cursor-pointer hover:bg-muted px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all">👍 Like</span>
          <span className="cursor-pointer hover:bg-muted px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all">💬 Comment</span>
          <span className="cursor-pointer hover:bg-muted px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all">➡️ Share</span>
        </div>
      </div>
    );
  }
};

const InstagramStrategy = {
  id: "instagram",
  name: "Instagram",
  renderIcon: (size) => (
    <span className="w-7 h-7 rounded-full bg-pink-50 flex items-center justify-center text-[#E1306C]">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
      </svg>
    </span>
  ),
  renderPreview: (post, brand, postImage) => {
    const brandName = brand?.name || "Brand Page";
    const brandLogo = brand?.logoUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=60";
    const caption = post?.caption || "";
    const instaUsername = brandName.toLowerCase().replace(/\s/g, '');

    return (
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden text-left font-sans max-w-[420px] mx-auto">
        {/* Header */}
        <div className="p-3 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-3">
            <img src={brandLogo} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-border" />
            <span className="text-xs font-bold text-foreground hover:underline cursor-pointer">{instaUsername}</span>
          </div>
          <span className="text-muted-foreground font-bold hover:text-muted-foreground cursor-pointer">•••</span>
        </div>

        {/* Media */}
        <div className="aspect-square bg-muted flex items-center justify-center">
          {postImage ? (
            <img src={postImage} alt="Instagram Post" className="w-full h-full object-cover" />
          ) : (
            <span className="text-muted-foreground text-xs font-semibold">Image Container (1:1)</span>
          )}
        </div>

        {/* Action Icons */}
        <div className="p-3 flex justify-between items-center text-xl text-foreground">
          <div className="flex gap-4">
            <span className="cursor-pointer hover:scale-110 transition-transform">❤️</span>
            <span className="cursor-pointer hover:scale-110 transition-transform">💬</span>
            <span className="cursor-pointer hover:scale-110 transition-transform">📤</span>
          </div>
          <span className="cursor-pointer hover:scale-110 transition-transform">🔖</span>
        </div>

        {/* Likes & Caption */}
        <div className="px-3 pb-4 text-xs">
          <div className="font-bold text-foreground mb-1">Liked by metricool and others</div>
          <p className="leading-relaxed">
            <span className="font-bold mr-1.5 text-foreground">{instaUsername}</span>
            <span className="text-foreground whitespace-pre-wrap">{caption}</span>
          </p>
        </div>
      </div>
    );
  }
};


const YoutubeStrategy = {
  id: "youtube",
  name: "YouTube",
  renderIcon: (size) => (
    <span className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center text-[#FF0000]">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.5 12 3.5 12 3.5s-7.518 0-9.388.503a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11C4.482 20.5 12 20.5 12 20.5s7.518 0 9.388-.503a3.003 3.003 0 0 0 2.11-2.11c.502-1.87.502-5.837.502-5.837s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    </span>
  ),
  renderPreview: (post, brand, postImage, scheduledTimeStr) => {
    const brandName = brand?.name || "Brand Page";
    const brandLogo = brand?.logoUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=60";
    
    return (
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden text-left font-sans max-w-full">
        {/* Media Player Container */}
        <div className="aspect-video bg-black relative flex items-center justify-center group cursor-pointer">
          {postImage ? (
            <img src={postImage} alt="Video Thumbnail" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
          ) : (
            <span className="text-muted-foreground text-xs">Video Player Container (16:9)</span>
          )}
          <div className="absolute w-14 h-14 bg-red-600 rounded-full flex items-center justify-center text-white text-xl shadow-lg group-hover:scale-110 transition-transform">
            ▶
          </div>
        </div>

        {/* Channel and title info */}
        <div className="p-4 flex gap-3">
          <img src={brandLogo} alt="Channel" className="w-9 h-9 rounded-full object-cover border border-border shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">{post?.title || "Untitled Video"}</h4>
            <div className="text-[11px] text-muted-foreground mt-1 flex flex-wrap items-center gap-1.5">
              <span>{brandName}</span>·<span>0 views</span>·<span>{scheduledTimeStr}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
};

const TiktokStrategy = {
  id: "tiktok",
  name: "TikTok",
  renderIcon: (size) => (
    <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-black">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.525.02c1.31.01 2.61.02 3.91.02.08 1.55.76 2.99 1.88 4.07.96.93 2.23 1.48 3.56 1.54v3.83c-1.37-.08-2.71-.53-3.86-1.3-.87-.59-1.58-1.4-2.07-2.34v7.7c.01 4.54-3.66 8.24-8.2 8.25-4.54 0-8.22-3.67-8.23-8.22C-.52 8.91 3.12 5.2 7.67 5.17c1.17-.01 2.32.22 3.39.69v4.03c-.63-.33-1.34-.51-2.05-.5-2.43.04-4.37 2.04-4.33 4.47.04 2.43 2.04 4.37 4.47 4.33 2.41-.04 4.34-1.99 4.34-4.4V0z"/>
      </svg>
    </span>
  ),
  renderPreview: (post, brand, postImage) => {
    const brandName = brand?.name || "Brand Page";
    const brandLogo = brand?.logoUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=60";
    const caption = post?.caption || "";
    const tiktokUsername = brandName.toLowerCase().replace(/\s/g, '');

    return (
      <div className="bg-black border border-gray-800 rounded-2xl shadow-lg overflow-hidden text-left font-sans max-w-[320px] mx-auto aspect-[9/16] relative flex flex-col justify-end text-white">
        {/* Mock background video/image */}
        {postImage ? (
          <img src={postImage} alt="TikTok Background" className="absolute inset-0 w-full h-full object-cover opacity-80" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
            <span className="text-muted-foreground text-xs">Vertical Video Container (9:16)</span>
          </div>
        )}

        {/* Bottom gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 flex justify-between items-end z-10">
          {/* User details and Caption */}
          <div className="flex-1 max-w-[80%]">
            <h5 className="font-bold text-sm hover:underline cursor-pointer mb-1">@{tiktokUsername}</h5>
            <p className="text-xs text-gray-200 line-clamp-3 leading-relaxed whitespace-pre-wrap">{caption}</p>
            <div className="text-xs text-gray-300 mt-2 flex items-center gap-1">
              <span>🎵</span> <marquee className="w-24 text-[11px]">Original Audio - {brandName}</marquee>
            </div>
          </div>

          {/* Action buttons list overlay on the right */}
          <div className="flex flex-col items-center gap-4 shrink-0 pb-2">
            <div className="relative">
              <img src={brandLogo} alt="TikTok Account" className="w-9 h-9 rounded-full object-cover border-2 border-white" />
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-red-500 text-[10px] w-4 h-4 rounded-full text-center leading-4 font-black">＋</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl hover:scale-110 transition-transform cursor-pointer">❤️</span>
              <span className="text-[10px] font-semibold mt-0.5">0</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl hover:scale-110 transition-transform cursor-pointer">💬</span>
              <span className="text-[10px] font-semibold mt-0.5">0</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl hover:scale-110 transition-transform cursor-pointer">📤</span>
              <span className="text-[10px] font-semibold mt-0.5">0</span>
            </div>
            <div className="w-7 h-7 bg-gray-800 rounded-full border border-gray-600 animate-spin" style={{ animationDuration: '4s' }}>
              <img src={brandLogo} alt="Disc" className="w-full h-full rounded-full object-cover" />
            </div>
          </div>
        </div>
      </div>
    );
  }
};

const XStrategy = {
  id: "x",
  name: "X / Twitter",
  renderIcon: (size) => (
    <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-black">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    </span>
  ),
  renderPreview: (post, brand, postImage, scheduledTimeStr) => {
    const brandName = brand?.name || "Brand Page";
    const brandLogo = brand?.logoUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=60";
    const caption = post?.caption || "";
    const handle = brandName.toLowerCase().replace(/\s/g, '');

    return (
      <div className="bg-card border border-border rounded-xl shadow-sm p-4 text-left font-sans max-w-full">
        {/* Header */}
        <div className="flex gap-3">
          <img src={brandLogo} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-border shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-sm font-bold text-foreground truncate hover:underline cursor-pointer">{brandName}</span>
                <span className="text-xs text-muted-foreground truncate">@{handle}</span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">{scheduledTimeStr}</span>
              </div>
              <span className="text-muted-foreground font-bold hover:text-muted-foreground cursor-pointer">•••</span>
            </div>

            {/* Caption */}
            <p className="text-sm text-foreground mt-1 leading-relaxed whitespace-pre-wrap">{caption}</p>

            {/* Media */}
            {postImage && (
              <div className="mt-3 bg-muted rounded-xl border border-border overflow-hidden">
                <img src={postImage} alt="Tweet Content" className="w-full object-cover max-h-[300px]" />
              </div>
            )}

            {/* X Actions icons bar */}
            <div className="mt-4 flex justify-between text-xs text-muted-foreground max-w-[85%] font-medium">
              <span className="cursor-pointer hover:text-blue-500 flex items-center gap-1.5">💬 0</span>
              <span className="cursor-pointer hover:text-green-500 flex items-center gap-1.5">🔁 0</span>
              <span className="cursor-pointer hover:text-red-500 flex items-center gap-1.5">❤️ 0</span>
              <span className="cursor-pointer hover:text-blue-500 flex items-center gap-1.5">📊 0</span>
              <span className="cursor-pointer hover:text-blue-500">📤</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
};

// Fallback Strategy if platform is not matched or unknown
const FallbackStrategy = {
  id: "unknown",
  name: "Other",
  renderIcon: (size, platform) => (
    <span className="w-7 h-7 rounded-full bg-muted text-[10px] font-bold text-muted-foreground flex items-center justify-center uppercase">
      {platform?.slice(0, 2) || "?"}
    </span>
  ),
  renderPreview: (post) => {
    const caption = post?.caption || "";
    return (
      <div className="bg-card p-6 border border-border rounded-xl text-center shadow-sm">
        <h4 className="text-sm font-bold text-foreground">Preview not available for this network</h4>
        <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{caption}</p>
      </div>
    );
  }
};

// Registry containing all platform strategies
const strategies = {
  facebook: FacebookStrategy,
  instagram: InstagramStrategy,
  youtube: YoutubeStrategy,
  tiktok: TiktokStrategy,
  x: XStrategy,
  twitter: XStrategy // Map twitter alias to X
};

export const PlatformRegistry = {
  getStrategy: (platformName) => {
    if (!platformName) return FallbackStrategy;
    const key = platformName.toLowerCase().trim();
    return strategies[key] || FallbackStrategy;
  },

  getIcon: (platformName, size = 18) => {
    const strategy = PlatformRegistry.getStrategy(platformName);
    if (strategy.id === "unknown") {
      return strategy.renderIcon(size, platformName);
    }
    return strategy.renderIcon(size);
  },

  getPreview: (platformName, post, brand, postImage, scheduledTimeStr) => {
    const strategy = PlatformRegistry.getStrategy(platformName);
    return strategy.renderPreview(post, brand, postImage, scheduledTimeStr);
  },

  getAllStrategies: () => {
    // Unique list of main strategies
    return [
      FacebookStrategy,
      InstagramStrategy,
      TiktokStrategy,
      YoutubeStrategy,
      XStrategy
    ];
  }
};
