export const PRODUCT_IDS = {
  YOUTUBE_ANALYTICS: 'youtube_analytics',
  FACEBOOK_MANAGEMENT: 'facebook_management',
  TIKTOK_CREATIVE: 'tiktok_creative',
  INSTAGRAM_INSIGHTS: 'instagram_insights',
  AI_CONTENT_ENGINE: 'ai_content_engine',
  AI_BEST_TIME: 'ai_best_time',
  ADS_MANAGER: 'ads_manager',
  UNIFIED_INBOX: 'unified_inbox',
  CUSTOM_LINKS: 'custom_links',
  GOOGLE_DRIVE: 'google_drive'
};

export const FEATURE_GATE_REGISTRY = {
  [PRODUCT_IDS.AI_CONTENT_ENGINE]: {
    title: "Unlock AI Content Engine",
    description: "Our AI Engine automatically writes high-performing social posts. Upgrade to a Pro plan to generate content instantly."
  },
  [PRODUCT_IDS.UNIFIED_INBOX]: {
    title: "Unlock Unified Inbox",
    description: "Manage all social comments, messages, and mentions in one place. Upgrade to a Pro plan to enable Unified Inbox."
  },
  [PRODUCT_IDS.ADS_MANAGER]: {
    title: "Unlock Ads Manager",
    description: "Create and optimize social media ad campaigns directly from PubliCast. Upgrade to a Pro plan to manage ads."
  },
  [PRODUCT_IDS.CUSTOM_LINKS]: {
    title: "Unlock SmartLinks",
    description: "Create custom branded links and track analytics for your biography or posts. Upgrade to a Pro plan to customize links."
  },
  [PRODUCT_IDS.AI_BEST_TIME]: {
    title: "Unlock Auto Scheduling & Best Time Suggest",
    description: "Publish automatically at peak audience engagement times. Upgrade to a Pro plan to enable AI Best Time optimization."
  },
  [PRODUCT_IDS.GOOGLE_DRIVE]: {
    title: "Unlock Google Drive Integration",
    description: "Import videos and images directly from your Google Drive into the content planner. Upgrade to a Pro plan to connect your Drive account."
  }
};
