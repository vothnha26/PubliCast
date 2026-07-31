import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { subDays } from "date-fns";
import { 
  Link2, 
  Plus, 
  Palette, 
  BarChart3, 
  Eye, 
  MousePointerClick, 
  Trash2, 
  ArrowUpRight,
  Share2,
  X,
  Save,
  Globe,
  Loader2,
  Copy,
  ArrowDown,
  Settings2,
  Image,
  Video,
  Instagram,
  FileText,
  RotateCcw,
  CopyCheck,
  ChevronRight,
  Edit3,
  Twitter,
  Youtube,
  Facebook,
  Mail,
  Send,
  Linkedin,
  Github,
  Chrome
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useBrand } from "../../context/BrandContext";
import smartLinkService from "../../services/smartlink.service";
import { uploadMediaFile } from "../../services/mediaUpload.service";
import { SmartLinksAnalyticsPanel } from "./components/SmartLinksAnalyticsPanel";

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

// 10 Bio-Link themes matching the grid in screenshot 4
const THEMES = [
  { id: "midnight", name: "Midnight Black", bg: "bg-slate-950", text: "text-white", buttonBg: "bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800", buttonText: "text-white", border: "border-slate-800", previewBg: "from-slate-900 to-slate-950" },
  { id: "sunset", name: "Sunset Orange", bg: "bg-gradient-to-tr from-amber-500 to-rose-500", text: "text-white", buttonBg: "bg-white/10 hover:bg-white/20 backdrop-blur-sm", buttonText: "text-white", border: "border-white/10", previewBg: "from-amber-500 to-rose-500" },
  { id: "mint", name: "Mint Glassmorphism", bg: "bg-gradient-to-tr from-teal-50 to-emerald-100", text: "text-slate-800", buttonBg: "bg-white/70 hover:bg-white/90 shadow-sm border border-emerald-200/50", buttonText: "text-slate-850", border: "border-emerald-200", previewBg: "from-teal-50 to-emerald-100" },
  { id: "cyberpunk", name: "Cyberpunk Neon", bg: "bg-[#0c0f1d]", text: "text-[#00ffcc]", buttonBg: "bg-slate-900/80 hover:bg-slate-850/80 border border-[#ff0055] shadow-[0_0_8px_rgba(255,0,85,0.4)]", buttonText: "text-[#00ffcc]", border: "border-[#ff0055]", previewBg: "from-[#0c0f1d] to-[#151933]" },
  { id: "ocean", name: "Ocean Breeze", bg: "bg-gradient-to-tr from-blue-600 to-cyan-500", text: "text-white", buttonBg: "bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/20", buttonText: "text-white", border: "border-white/20", previewBg: "from-blue-600 to-cyan-500" },
  { id: "lavender", name: "Lavender Dream", bg: "bg-gradient-to-tr from-purple-500 to-indigo-500", text: "text-white", buttonBg: "bg-white/20 hover:bg-white/30 backdrop-blur-sm", buttonText: "text-white", border: "border-white/10", previewBg: "from-purple-500 to-indigo-500" },
  { id: "minimal", name: "Minimal Gray", bg: "bg-slate-100", text: "text-slate-800", buttonBg: "bg-white hover:bg-slate-50 border border-slate-200 shadow-sm", buttonText: "text-slate-850", border: "border-slate-200", previewBg: "from-slate-100 to-slate-200" },
  { id: "warm", name: "Warm Sandy", bg: "bg-gradient-to-tr from-amber-100 to-orange-100", text: "text-amber-900", buttonBg: "bg-white/80 hover:bg-white border border-amber-200/50 shadow-sm", buttonText: "text-amber-950", border: "border-amber-200", previewBg: "from-amber-100 to-orange-100" },
  { id: "confetti", name: "Confetti Celebration", bg: "bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]", text: "text-slate-800", buttonBg: "bg-slate-800 hover:bg-slate-700 text-white", buttonText: "text-white", border: "border-slate-800", previewBg: "from-white to-slate-50" },
  { id: "forest", name: "Emerald Forest", bg: "bg-gradient-to-tr from-green-700 to-emerald-600", text: "text-white", buttonBg: "bg-white/10 hover:bg-white/20 border border-white/10", buttonText: "text-white", border: "border-white/10", previewBg: "from-green-700 to-emerald-600" }
];

export function SmartLinksPage() {
  const { t } = useTranslation("smartlinks");
  const { activeBrand } = useBrand();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [smartLinkId, setSmartLinkId] = useState(null);
  const [slug, setSlug] = useState("");
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 29),
    to: new Date()
  });
  
  // Metricool Tab Levels
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "analytics" ? "analytics" : "settings";
  const [activeTab, setActiveTabState] = useState(initialTab); // settings | analytics
  const [activeSubTab, setActiveSubTab] = useState("buttons"); // buttons | media | appearance

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set("tab", tab);
      return next;
    }, { replace: true });
  };

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab") === "analytics" ? "analytics" : "settings";
    if (tabFromUrl !== activeTab) {
      setActiveTabState(tabFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  
  // Profile Meta
  const [profileName, setProfileName] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarError, setAvatarError] = useState(false);
  const [isPublished, setIsPublished] = useState(true);
  
  // Stats
  const [totalClicksCount, setTotalClicksCount] = useState(0);
  const [analyticsSummary, setAnalyticsSummary] = useState(null);
  const [analyticsTimeline, setAnalyticsTimeline] = useState([]);
  const [analyticsLinks, setAnalyticsLinks] = useState([]);
  const [links, setLinks] = useState([]);
  const [activeTheme, setActiveTheme] = useState(THEMES[0]);

  // Social Icons list (for Add Icon section in photo 2) - Bắt đầu từ mảng rỗng để không có mockdata
  const [socialIcons, setSocialIcons] = useState([]);

  // New Link Builder States
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, newSetUrl] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [isFeatureLocked, setIsFeatureLocked] = useState(false);

  const [smartLinksList, setSmartLinksList] = useState([]);

  // Apply a SmartLink data object to local state
  const applySmartLinkData = (data) => {
    if (!data) return;
    setSmartLinkId(data.id);
    setSlug(data.slug);
    setProfileName(data.pageTitle);
    setProfileBio(data.bio || "");
    setAvatarUrl(data.profileImageUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80");
    setIsPublished(data.isPublished);
    setTotalClicksCount(data.totalClicks || 0);

    // Parse social icons from new socialLinks field, with fallback for legacy buttonStyle data
    let parsedSocials = [];
    const socialPayload = data.socialLinks || (data.buttonStyle && data.buttonStyle.includes("|") ? data.buttonStyle.split("|")[1] : "");
    if (socialPayload) {
      const parts = socialPayload.split(";");
      parts.forEach((p, idx) => {
        if (p.includes("=")) {
          const [platform, url] = p.split("=");
          parsedSocials.push({
            id: `s-${idx}-${Date.now()}`,
            platform,
            url,
            isActive: true
          });
        }
      });
    }
    setSocialIcons(parsedSocials);
    
    // Parse links and color styles stored in linkStyle field, with fallback for legacy iconUrl style strings
    const processedLinks = (data.links || []).map(l => {
      let bgColor = "";
      let textColor = "";
      let borderColor = "";
      let actualIconUrl = l.iconUrl || "";
      const styleSource = l.linkStyle || l.iconUrl || "";
      
      if (styleSource && styleSource.startsWith("style:")) {
        const parts = styleSource.replace("style:", "").split(";");
        parts.forEach(p => {
          const [key, val] = p.split("=");
          if (key === "bgColor") bgColor = val;
          if (key === "textColor") textColor = val;
          if (key === "borderColor") borderColor = val;
        });
        if (!l.iconUrl || l.iconUrl.startsWith("style:")) {
          actualIconUrl = "";
        }
      }

      // Assign default colors based on index if not set
      if (!bgColor) {
        const defaultPalettes = [
          { bg: "#E65C9C", text: "#FFFFFF", border: "#E65C9C" },
          { bg: "#DFB527", text: "#FFFFFF", border: "#DFB527" },
          { bg: "#4A90E2", text: "#FFFFFF", border: "#4A90E2" },
          { bg: "#7E57C2", text: "#FFFFFF", border: "#7E57C2" }
        ];
        const palette = defaultPalettes[l.position % defaultPalettes.length];
        bgColor = palette.bg;
        textColor = palette.text;
        borderColor = palette.border;
      }
      
      return {
        ...l,
        bgColor,
        textColor,
        borderColor,
        iconUrl: actualIconUrl,
        linkStyle: l.linkStyle || (styleSource.startsWith("style:") ? styleSource : "")
      };
    });
    
    setLinks(processedLinks);
    fetchAnalytics(data.id);
    
    // Find saved theme
    const matchedTheme = THEMES.find(t => t.id === data.backgroundValue);
    if (matchedTheme) {
      setActiveTheme(matchedTheme);
    }
  };

  // Fetch SmartLinks List for current brand
  const fetchSmartLinksList = async (targetIdToSelect = null) => {
    if (!activeBrand) return;
    setLoading(true);
    setIsFeatureLocked(false);
    try {
      const res = await smartLinkService.getSmartLinks(activeBrand.id);
      const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setSmartLinksList(list);

      if (list.length > 0) {
        let selected = list.find(item => item.id === targetIdToSelect);
        if (!selected) {
          selected = list.find(item => item.id === smartLinkId) || list[0];
        }
        applySmartLinkData(selected);
      } else {
        await createInitialSmartLink();
      }
    } catch (err) {
      console.error("Error fetching SmartLinks list:", err);
      if (err?.response?.status === 403 || err?.status === 403) {
        setIsFeatureLocked(true);
      } else {
        toast.error(t("toasts.loadError"));
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDateStr = (date) => {
    if (!date) return "";
    const d = new Date(date);
    let month = "" + (d.getMonth() + 1);
    let day = "" + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = "0" + month;
    if (day.length < 2) day = "0" + day;

    return [year, month, day].join("-");
  };

  const fetchAnalytics = async (id, range = dateRange) => {
    if (!id || !range?.from || !range?.to) return;
    try {
      const fromStr = formatDateStr(range.from);
      const toStr = formatDateStr(range.to);
      const res = await smartLinkService.getAnalytics(id, activeBrand.id, fromStr, toStr);
      const analytics = res || null;
      setAnalyticsSummary(analytics?.summary || null);
      setAnalyticsTimeline(Array.isArray(analytics?.timeline) ? analytics.timeline : []);
      const analyticsLinksArr = Array.isArray(analytics?.links) ? analytics.links : [];
      setAnalyticsLinks(analyticsLinksArr);

      if (analytics?.summary?.buttonClicks !== undefined) {
        setTotalClicksCount(analytics.summary.buttonClicks);
      }

      if (analyticsLinksArr.length > 0) {
        const clickMap = new Map(analyticsLinksArr.map(l => [l.id, l.clicks]));
        setLinks(prevLinks => prevLinks.map(l => ({
          ...l,
          clicks: clickMap.has(l.id) ? clickMap.get(l.id) : (l.clicks || 0)
        })));
      }
    } catch (err) {
      console.error("Error fetching SmartLink analytics:", err);
      setAnalyticsSummary(null);
      setAnalyticsTimeline([]);
      setAnalyticsLinks([]);
    }
  };

  const createInitialSmartLink = async () => {
    try {
      const initialSlug = `${activeBrand.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Math.floor(1000 + Math.random() * 9000)}`;
      const payload = {
        brandId: activeBrand.id,
        slug: initialSlug,
        pageTitle: activeBrand.name,
        bio: "Get the most out of your LINK IN BIO with SmartLinks!",
        profileImageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
        backgroundType: "THEME",
        backgroundValue: "sunset",
        buttonStyle: "rounded",
        socialLinks: "",
        isPublished: true,
        links: []
      };
      
      const res = await smartLinkService.createSmartLink(payload);
      const data = res?.data || res;
      if (data) {
        toast.success(t("toasts.initSuccess"));
        await fetchSmartLinksList(data.id);
      }
    } catch (err) {
      console.error("Error creating initial SmartLink:", err);
      if (err?.response?.status === 403 || err?.status === 403) {
        setIsFeatureLocked(true);
      } else {
        toast.error(t("toasts.initError"));
      }
    }
  };

  // Create new blank SmartLink for brand
  const handleCreateNewSmartLink = async () => {
    if (!activeBrand) return;
    try {
      const newSlug = `${activeBrand.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Math.floor(1000 + Math.random() * 9000)}`;
      const payload = {
        brandId: activeBrand.id,
        slug: newSlug,
        pageTitle: `${activeBrand.name} - SmartLink ${smartLinksList.length + 1}`,
        bio: "Get the most out of your LINK IN BIO with SmartLinks!",
        profileImageUrl: avatarUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
        backgroundType: "THEME",
        backgroundValue: "sunset",
        buttonStyle: "rounded",
        socialLinks: "",
        isPublished: true,
        links: []
      };

      const res = await smartLinkService.createSmartLink(payload);
      const newSmartLink = res?.data || res;
      if (newSmartLink) {
        toast.success("Đã tạo SmartLink mới thành công!");
        await fetchSmartLinksList(newSmartLink.id);
      }
    } catch (err) {
      console.error("Error creating new SmartLink:", err);
      toast.error(err?.response?.data?.message || "Không thể tạo SmartLink mới");
    }
  };

  // Clone active SmartLink
  const handleCloneSmartLink = async () => {
    if (!smartLinkId || !activeBrand) return;
    try {
      const res = await smartLinkService.cloneSmartLink(smartLinkId, activeBrand.id);
      const cloned = res?.data || res;
      if (cloned) {
        toast.success(t("toasts.cloneSuccess") || "Đã nhân bản SmartLink thành công!");
        await fetchSmartLinksList(cloned.id);
      }
    } catch (err) {
      console.error("Error cloning SmartLink:", err);
      toast.error(err?.response?.data?.message || "Không thể nhân bản SmartLink");
    }
  };

  // Delete active SmartLink
  const handleDeleteSmartLink = async () => {
    if (!smartLinkId || !activeBrand) return;
    if (smartLinksList.length <= 1) {
      toast.error("Không thể xóa SmartLink duy nhất của Thương hiệu");
      return;
    }

    if (!window.confirm("Bạn có chắc chắn muốn xóa SmartLink này không? Hành động này không thể hoàn tác.")) {
      return;
    }

    try {
      await smartLinkService.deleteSmartLink(smartLinkId, activeBrand.id);
      toast.success("Đã xóa SmartLink thành công!");
      await fetchSmartLinksList();
    } catch (err) {
      console.error("Error deleting SmartLink:", err);
      toast.error(err?.response?.data?.message || "Không thể xóa SmartLink");
    }
  };

  useEffect(() => {
    fetchSmartLinksList();
  }, [activeBrand]);

  useEffect(() => {
    if (smartLinkId) {
      fetchAnalytics(smartLinkId, dateRange);
    }
  }, [smartLinkId, dateRange]);

  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState("");
  const [renameSlug, setRenameSlug] = useState("");
  const [renaming, setRenaming] = useState(false);

  const handleOpenRenameModal = () => {
    setRenameTitle(profileName || "");
    setRenameSlug(slug || "");
    setIsRenameOpen(true);
  };

  const handleSaveRename = async (e) => {
    if (e) e.preventDefault();
    if (!renameTitle.trim() || !renameSlug.trim()) {
      toast.error("Vui lòng nhập đầy đủ Tên và URL slug!");
      return;
    }
    setRenaming(true);
    try {
      const sanitizedSlug = renameSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
      const serializedSocials = socialIcons.map(si => `${si.platform}=${si.url}`).join(";");
      const payload = {
        brandId: activeBrand.id,
        slug: sanitizedSlug,
        pageTitle: renameTitle.trim(),
        bio: profileBio,
        profileImageUrl: avatarUrl,
        backgroundType: "THEME",
        backgroundValue: activeTheme?.id || "sunset",
        buttonStyle: "rounded",
        socialLinks: serializedSocials,
        isPublished,
        links: links.map((l, index) => {
          const styleStr = `style:bgColor=${l.bgColor || "#E65C9C"};textColor=${l.textColor || "#FFFFFF"};borderColor=${l.borderColor || "#E65C9C"}`;
          return {
            id: l.id.startsWith("l-") ? undefined : l.id,
            title: l.title,
            url: l.url,
            emoji: l.emoji,
            iconUrl: l.iconUrl || null,
            linkStyle: styleStr,
            isActive: l.isActive !== undefined ? l.isActive : l.active,
            position: index
          };
        })
      };

      const res = await smartLinkService.updateSmartLink(smartLinkId, payload);
      if (res) {
        setProfileName(renameTitle.trim());
        setSlug(sanitizedSlug);
        toast.success("Đã đổi tên SmartLink thành công!");
        await fetchSmartLinksList(smartLinkId);
        setIsRenameOpen(false);
      }
    } catch (err) {
      console.error("Error renaming SmartLink:", err);
      toast.error(err?.response?.data?.message || "Không thể đổi tên SmartLink");
    } finally {
      setRenaming(false);
    }
  };

  // Save changes to server
  const handleSaveChanges = async () => {
    if (!smartLinkId) return;
    setSaving(true);
    try {
      const serializedSocials = socialIcons.map(si => `${si.platform}=${si.url}`).join(";");

      const payload = {
        brandId: activeBrand.id,
        slug,
        pageTitle: profileName,
        bio: profileBio,
        profileImageUrl: avatarUrl,
        backgroundType: "THEME",
        backgroundValue: activeTheme.id,
        buttonStyle: "rounded",
        socialLinks: serializedSocials,
        isPublished,
        links: links.map((l, index) => {
          // Serialize button color styling into linkStyle field
          const styleStr = `style:bgColor=${l.bgColor || "#E65C9C"};textColor=${l.textColor || "#FFFFFF"};borderColor=${l.borderColor || "#E65C9C"}`;
          return {
            id: l.id.startsWith("l-") ? undefined : l.id, // backend will create new if no ID
            title: l.title,
            url: l.url,
            emoji: l.emoji,
            iconUrl: l.iconUrl || null,
            linkStyle: styleStr,
            isActive: l.isActive !== undefined ? l.isActive : l.active,
            position: index
          };
        })
      };

      const res = await smartLinkService.updateSmartLink(smartLinkId, payload);
      if (res) {
        toast.success(t("toasts.saveSuccess"));
        await fetchSmartLinksList(smartLinkId); // reload clean data from server and refresh dropdown
      }
    } catch (err) {
      console.error("Error saving SmartLink:", err);
      toast.error(err.message || t("toasts.saveError"));
    } finally {
      setSaving(false);
    }
  };

  // Add Link Button
  const handleAddLink = (e) => {
    if (e) e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) {
      toast.error(t("toasts.addLinkError"));
      return;
    }

    const defaultPalettes = [
      { bg: "#E65C9C", text: "#FFFFFF", border: "#E65C9C" }, // Pink
      { bg: "#DFB527", text: "#FFFFFF", border: "#DFB527" }, // Yellow/Orange
      { bg: "#4A90E2", text: "#FFFFFF", border: "#4A90E2" }, // Blue
      { bg: "#7E57C2", text: "#FFFFFF", border: "#7E57C2" }  // Purple
    ];
    const palette = defaultPalettes[links.length % defaultPalettes.length];

      const newLinkItem = {
        id: `l-${Date.now()}`,
        title: newTitle,
        url: newUrl.startsWith("http") ? newUrl : `https://${newUrl}`,
        emoji: "🔗",
        isActive: true,
        clicks: 0,
        position: links.length,
        bgColor: palette.bg,
        textColor: palette.text,
        borderColor: palette.border,
        iconUrl: "",
        linkStyle: ""
      };

    setLinks(prev => [...prev, newLinkItem]);
    toast.success(t("toasts.addLinkSuccess"));
    setIsAddOpen(false);
    setNewTitle("");
    newSetUrl("");
  };

  // Clone Link
  const handleCloneLink = (link) => {
    const cloned = {
      ...link,
      id: `l-${Date.now()}`,
      title: `${link.title} (Clone)`,
      position: links.length,
      clicks: 0
    };
    setLinks(prev => [...prev, cloned]);
    toast.info(t("toasts.cloneLink"));
  };

  // Update Link Field
  const updateLinkField = (id, field, value) => {
    setLinks(prev => prev.map(l => 
      l.id === id ? { ...l, [field]: value } : l
    ));
  };

  // Toggle Link visibility
  const handleToggleLink = (id) => {
    setLinks(prev => prev.map(l => 
      l.id === id ? { ...l, isActive: !l.isActive } : l
    ));
  };

  // Delete Link
  const handleDeleteLink = (id) => {
    setLinks(prev => prev.filter(l => l.id !== id));
    toast.info(t("toasts.deleteLink"));
  };

  const handleCopyLink = () => {
    if (!slug) return;
    const publicUrl = `${window.location.origin}/s/${slug}`;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success(t("toasts.copySuccess"));
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !activeBrand) return;

    try {
      const media = await uploadMediaFile(file, activeBrand.id);
      setAvatarUrl(media.url);
      toast.success(t("toasts.avatarUploadSuccess"));
    } catch (err) {
      console.error("Error uploading avatar:", err);
      toast.error(err?.response?.data?.message || t("toasts.avatarUploadError"));
    } finally {
      event.target.value = "";
    }
  };

  const handleLinkIconUpload = async (event, linkId) => {
    const file = event.target.files?.[0];
    if (!file || !activeBrand || !linkId) return;

    try {
      const media = await uploadMediaFile(file, activeBrand.id);
      updateLinkField(linkId, "iconUrl", media.url);
      toast.success(t("toasts.iconUploadSuccess"));
    } catch (err) {
      console.error("Error uploading link icon:", err);
      toast.error(err?.response?.data?.message || t("toasts.iconUploadError"));
    } finally {
      event.target.value = "";
    }
  };

  const getLinkRenderStyle = (link) => {
    const styleSource = link.linkStyle || link.iconUrl || "";
    let bgColor = link.bgColor || "";
    let textColor = link.textColor || "";
    let borderColor = link.borderColor || "";

    if (styleSource && styleSource.startsWith("style:")) {
      const parts = styleSource.replace("style:", "").split(";");
      parts.forEach((p) => {
        const [key, val] = p.split("=");
        if (key === "bgColor" && !bgColor) bgColor = val;
        if (key === "textColor" && !textColor) textColor = val;
        if (key === "borderColor" && !borderColor) borderColor = val;
      });
    }

    return {
      bgColor: bgColor || "#E65C9C",
      textColor: textColor || "#FFFFFF",
    };
  };

  if (isFeatureLocked) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#F3F4F6]">
        <div className="bg-white rounded-3xl p-8 max-w-lg w-full text-center border border-slate-200 shadow-xl space-y-6 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 text-white flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
            <Link2 size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-slate-900">Yêu cầu nâng cấp gói dịch vụ</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Tính năng <span className="font-bold text-slate-800">SmartLinks (Link-in-Bio & URL Shortener)</span> là tính năng nâng cao dành riêng cho tài khoản gói <span className="font-bold text-slate-800">PRO</span> hoặc <span className="font-bold text-slate-800">AGENCY</span>. Vui lòng nâng cấp gói để mở khóa và trải nghiệm.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => window.location.href = '/workspace/settings?tab=billing'}
              className="w-full py-3 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
            >
              Nâng cấp gói ngay 🚀
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#F3F4F6] p-6 space-y-6">
      
      {/* Metricool Header top bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm gap-4">
        <div className="flex items-center gap-3">
          {/* Custom Select dropdown */}
          <div className="relative shrink-0">
            <select 
              value={smartLinkId || ""} 
              onChange={(e) => {
                const targetId = e.target.value;
                const found = smartLinksList.find(s => s.id === targetId);
                if (found) {
                  applySmartLinkData(found);
                }
              }}
              className="appearance-none bg-[#F9FAFB] border border-slate-300 rounded-xl px-4 py-2.5 pr-10 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer shadow-sm max-w-[260px] truncate"
            >
              {smartLinksList.map(s => (
                <option key={s.id} value={s.id}>
                  {s.pageTitle} ({s.slug})
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
              <ChevronRight size={16} className="rotate-90" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button 
              onClick={handleCreateNewSmartLink}
              title="Tạo SmartLink mới"
              className="flex items-center gap-1.5 bg-[#F3F4F6] hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-lg transition-colors uppercase border border-slate-200 cursor-pointer active:scale-95"
            >
              <Plus size={14} /> {t("header.newBtn")}
            </button>
            <button 
              onClick={handleOpenRenameModal}
              title="Đổi tên & Đường dẫn (Slug) SmartLink này"
              className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-2 rounded-lg transition-colors uppercase border border-indigo-200 cursor-pointer active:scale-95"
            >
              <Edit3 size={14} /> ĐỔI TÊN
            </button>
            <button 
              onClick={handleCloneSmartLink}
              title="Nhân bản SmartLink này"
              className="flex items-center gap-1.5 bg-[#F3F4F6] hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-lg transition-colors uppercase border border-slate-200 cursor-pointer active:scale-95"
            >
              <Copy size={14} /> {t("header.cloneBtn")}
            </button>
            <button 
              onClick={handleDeleteSmartLink}
              title="Xóa SmartLink này"
              className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-650 text-xs font-bold px-3 py-2 rounded-lg transition-colors uppercase border border-red-100 cursor-pointer active:scale-95"
            >
              <Trash2 size={14} /> {t("header.deleteBtn")}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <button
            onClick={() => {
              fetchSmartLinksList(smartLinkId);
              toast.info(t("toasts.resetSuccess"));
            }}
            className="flex items-center gap-1.5 bg-white border border-slate-350 hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-sm active:scale-95 uppercase cursor-pointer"
          >
            <RotateCcw size={15} /> {t("header.resetBtn")}
          </button>
          <button
            onClick={handleSaveChanges}
            disabled={saving}
            className="flex items-center gap-1.5 bg-[#4F5B66] hover:bg-[#3d4750] text-white text-sm font-semibold px-6 py-2 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 uppercase"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {t("header.saveBtn")}
          </button>
        </div>
      </div>

      {/* Quick Overview & Click Stats Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-3 border-r border-slate-100 pr-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Eye size={18} />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tổng Lượt Xem</div>
            <div className="text-lg font-black text-slate-800">{analyticsSummary?.visits || 0}</div>
          </div>
        </div>

        <div className="flex items-center gap-3 border-r border-slate-100 pr-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <MousePointerClick size={18} />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tổng Lượt Click</div>
            <div className="text-lg font-black text-slate-800">{totalClicksCount || analyticsSummary?.buttonClicks || 0}</div>
          </div>
        </div>

        <div className="flex items-center gap-3 border-r border-slate-100 pr-4">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <BarChart3 size={18} />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tỷ Lệ Click (CTR)</div>
            <div className="text-lg font-black text-slate-800">{analyticsSummary?.ctr !== undefined ? `${analyticsSummary.ctr}%` : '0.0%'}</div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="truncate">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Link Công Khai</div>
            <div className="text-xs font-mono font-bold text-slate-700 truncate">{window.location.origin}/s/{slug}</div>
          </div>
          <button
            onClick={handleCopyLink}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shrink-0 cursor-pointer"
            title="Sao chép link công khai"
          >
            {copied ? <CopyCheck size={16} className="text-emerald-600" /> : <Copy size={16} />}
          </button>
        </div>
      </div>

      {/* Main Container Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Customizable Column (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Main Tab Level: SETTINGS | ANALYTICS */}
          <div className="flex border-b border-slate-200 bg-white px-6 pt-4 rounded-t-2xl shadow-sm">
            <button
              onClick={() => setActiveTab("settings")}
              className={`pb-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-all mr-8 ${
                activeTab === "settings" 
                  ? "border-[#4F5B66] text-[#4F5B66]" 
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              {t("tabs.settings")}
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`pb-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-all ${
                activeTab === "analytics" 
                  ? "border-[#4F5B66] text-[#4F5B66]" 
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              {t("tabs.analytics")}
            </button>
          </div>

          {/* TAB CONTENT: SETTINGS */}
          {activeTab === "settings" && (
            <div className="bg-white rounded-b-2xl border-x border-b border-slate-200 p-6 space-y-6 shadow-sm mt-[-24px]">
              
              {/* General Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-700">{t("general.sectionTitle")}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">{t("general.nameLabel")}</label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-800 focus:border-slate-455 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">{t("general.urlLabel")}</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1 flex items-center">
                        <span className="absolute left-3 text-xs text-slate-455 font-mono">https://mtr.bio/</span>
                        <input
                          type="text"
                          value={slug}
                          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                          className="w-full pl-28 pr-3 py-2 rounded-xl border border-slate-300 text-sm font-mono text-slate-800 focus:border-slate-455 outline-none transition-all"
                        />
                      </div>
                      <button 
                        onClick={handleCopyLink}
                        className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 active:scale-95"
                      >
                        {copied ? <CopyCheck size={14} className="text-emerald-600" /> : <Copy size={14} />}
                        {t("general.copyBtn")}
                      </button>
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-500">{t("media.bioLabel")}</label>
                    <textarea
                      placeholder={t("media.bioPlaceholder")}
                      value={profileBio}
                      onChange={(e) => setProfileBio(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-800 focus:border-slate-455 outline-none transition-all min-h-[80px]"
                    />
                  </div>
                </div>
              </div>

              {/* Subtabs Menu: BUTTONS | MEDIA | APPEARANCE */}
              <div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                {[
                  { id: "buttons", name: t("subtabs.buttons") },
                  { id: "media", name: t("subtabs.media") },
                  { id: "appearance", name: t("subtabs.appearance") }
                ].map((sTab) => (
                  <button
                    key={sTab.id}
                    onClick={() => setActiveSubTab(sTab.id)}
                    className={`flex-1 text-center py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                      activeSubTab === sTab.id 
                        ? "bg-white text-slate-800 shadow-sm border border-slate-200/50" 
                        : "text-slate-550 hover:bg-slate-100"
                    }`}
                  >
                    {sTab.name}
                  </button>
                ))}
              </div>

              {/* SUBTAB CONTENT: BUTTONS */}
              {activeSubTab === "buttons" && (
                <div className="space-y-6">
                  {/* Action row */}
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setIsAddOpen(true)}
                      className="flex-1 flex items-center justify-center gap-2 border border-slate-300 hover:bg-slate-55 rounded-2xl py-3 text-xs font-bold text-slate-750 transition-all shadow-sm active:scale-98 cursor-pointer"
                    >
                      <Link2 size={15} /> {t("buttons.addButton")}
                    </button>
                    <button 
                      onClick={() => toast.info(t("toasts.sectionComingSoon"))}
                      className="flex-1 flex items-center justify-center gap-2 border border-slate-300 hover:bg-slate-55 rounded-2xl py-3 text-xs font-bold text-slate-750 transition-all shadow-sm active:scale-98 cursor-pointer"
                    >
                      <FileText size={15} /> {t("buttons.addSection")}
                    </button>
                  </div>

                  {/* Links Editor List (Styled matching screenshot 1) */}
                  <div className="space-y-4">
                    {links.map((link, index) => (
                      <div 
                        key={link.id}
                        className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm relative flex gap-3 transition-all hover:border-slate-350"
                      >
                        {/* 6 dot drag handle */}
                        <div className="flex flex-col justify-center items-center cursor-grab active:cursor-grabbing text-slate-400 shrink-0 select-none px-1">
                          <div className="grid grid-cols-2 gap-1 w-3">
                            <span className="w-1 h-1 bg-slate-400 rounded-full" />
                            <span className="w-1 h-1 bg-slate-400 rounded-full" />
                            <span className="w-1 h-1 bg-slate-400 rounded-full" />
                            <span className="w-1 h-1 bg-slate-400 rounded-full" />
                            <span className="w-1 h-1 bg-slate-400 rounded-full" />
                            <span className="w-1 h-1 bg-slate-400 rounded-full" />
                          </div>
                        </div>

                        {/* Editor inputs fields */}
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">{t("buttons.textLabel")}</label>
                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full shadow-2xs">
                              <MousePointerClick size={12} /> {link.clicks || 0} clicks
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <input
                                type="text"
                                value={link.title}
                                onChange={(e) => updateLinkField(link.id, "title", e.target.value)}
                                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:border-slate-400 outline-none font-semibold"
                                placeholder="Tiêu đề nút..."
                              />
                            </div>
                            <div className="space-y-1">
                              <input
                                type="text"
                                value={link.url}
                                onChange={(e) => updateLinkField(link.id, "url", e.target.value)}
                                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:border-slate-400 outline-none font-mono text-xs"
                                placeholder="https://..."
                              />
                            </div>
                          </div>

                          {/* Action & Style Picker Row */}
                          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
                            
                            {/* Color customization buttons */}
                            <div className="flex items-center gap-4">
                              
                              {/* Text Color */}
                              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-500">
                                <span 
                                  className="w-4 h-4 rounded-full border border-slate-300 shadow-sm block" 
                                  style={{ backgroundColor: link.textColor || "#FFFFFF" }}
                                />
                                {t("buttons.textColorLabel")}
                                <input 
                                  type="color" 
                                  value={link.textColor || "#FFFFFF"}
                                  onChange={(e) => updateLinkField(link.id, "textColor", e.target.value)}
                                  className="sr-only"
                                />
                              </label>

                              {/* Bg Color */}
                              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-500">
                                <span 
                                  className="w-4 h-4 rounded-full border border-slate-300 shadow-sm block" 
                                  style={{ backgroundColor: link.bgColor || "#E65C9C" }}
                                />
                                {t("buttons.bgColorLabel")}
                                <input 
                                  type="color" 
                                  value={link.bgColor || "#E65C9C"}
                                  onChange={(e) => updateLinkField(link.id, "bgColor", e.target.value)}
                                  className="sr-only"
                                />
                              </label>

                              {/* Border Color */}
                              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-500">
                                <span 
                                  className="w-4 h-4 rounded-full border border-slate-300 shadow-sm block" 
                                  style={{ backgroundColor: link.borderColor || "#E65C9C" }}
                                />
                                {t("buttons.borderColorLabel")}
                                <input 
                                  type="color" 
                                  value={link.borderColor || "#E65C9C"}
                                  onChange={(e) => updateLinkField(link.id, "borderColor", e.target.value)}
                                  className="sr-only"
                                />
                              </label>

                            </div>

                            {/* Disable toggle & actions */}
                            <div className="flex items-center gap-3 ml-auto">
                              
                              {/* Disable label & Switch */}
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-450 font-bold">{t("buttons.disableLabel")}</span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleLink(link.id)}
                                  className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ${
                                    !link.isActive ? "bg-red-400" : "bg-[#D1D5DB]"
                                  }`}
                                >
                                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${
                                    !link.isActive ? "translate-x-4" : "translate-x-0"
                                  }`} />
                                </button>
                              </div>

                              {/* Clone */}
                              <button 
                                onClick={() => handleCloneLink(link)}
                                className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs font-bold border border-slate-200 px-2 py-1 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
                                type="button"
                              >
                                {t("buttons.cloneBtn")}
                              </button>

                              <label className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs font-bold border border-slate-200 px-2 py-1 rounded-lg hover:bg-slate-50 transition-all cursor-pointer">
                                {t("buttons.iconBtn")}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleLinkIconUpload(e, link.id)}
                                />
                              </label>

                              {/* Delete (Trash) */}
                              <button 
                                onClick={() => handleDeleteLink(link.id)}
                                className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                type="button"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>

                          </div>
                        </div>

                      </div>
                    ))}
                  </div>

                  {/* Add Icon Section (Matching screenshot 2) */}
                  <div className="border-t border-slate-100 pt-6 space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t("buttons.addIconTitle")}</h4>
                    
                    <div className="space-y-3">
                      {socialIcons.map((sIcon) => (
                        <div key={sIcon.id} className="flex items-center gap-3 bg-[#F9FAFB] p-3 rounded-xl border border-slate-200">
                          
                          {/* Platform Logo */}
                          <div className="text-slate-700 shrink-0 w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-slate-200 shadow-sm">
                            {renderSocialIcon(sIcon.platform, 16)}
                          </div>

                          {/* Select type */}
                          <select 
                            value={sIcon.platform}
                            onChange={(e) => {
                              const updated = socialIcons.map(si => si.id === sIcon.id ? { ...si, platform: e.target.value } : si);
                              setSocialIcons(updated);
                            }}
                            className="bg-white border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none"
                          >
                            <option value="twitter">Twitter / X</option>
                            <option value="instagram">Instagram</option>
                            <option value="youtube">YouTube</option>
                            <option value="facebook">Facebook</option>
                            <option value="tiktok">TikTok</option>
                            <option value="email">Email</option>
                            <option value="website">Website / Portfolio</option>
                            <option value="linkedin">LinkedIn</option>
                            <option value="github">GitHub</option>
                            <option value="telegram">Telegram</option>
                            <option value="threads">Threads</option>
                          </select>

                          {/* URL Input */}
                          <input
                            type="text"
                            value={sIcon.url}
                            onChange={(e) => {
                              const updated = socialIcons.map(si => si.id === sIcon.id ? { ...si, url: e.target.value } : si);
                              setSocialIcons(updated);
                            }}
                            className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none font-mono"
                            placeholder="https://..."
                          />

                          {/* Delete social icon */}
                          <button 
                            onClick={() => {
                              setSocialIcons(prev => prev.filter(si => si.id !== sIcon.id));
                              toast.info(t("toasts.deleteLink"));
                            }}
                            className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        const newIcon = { id: `s-${Date.now()}`, platform: "instagram", url: "https://", isActive: true };
                        setSocialIcons(prev => [...prev, newIcon]);
                        toast.success(t("toasts.addLinkSuccess"));
                      }}
                      className="w-full flex items-center justify-center gap-1.5 border border-dashed border-slate-300 hover:bg-slate-50 py-2.5 rounded-xl text-xs font-bold text-slate-550 transition-all cursor-pointer"
                    >
                      <Plus size={14} /> {t("icons.addBtn")}
                    </button>
                  </div>
                </div>
              )}

              {/* SUBTAB CONTENT: MEDIA (Matching screenshot 3) */}
              {activeSubTab === "media" && (
                <div className="space-y-4 py-4 text-center">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button 
                      onClick={() => toast.info(t("toasts.driveComingSoon"))}
                      className="flex flex-col items-center justify-center p-6 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all gap-2 group cursor-pointer"
                    >
                      <span className="p-3 bg-white text-blue-500 rounded-full shadow-sm group-hover:scale-105 transition-transform"><Image size={20} /></span>
                      <span className="text-xs font-bold text-slate-700">{t("media.addMediaBtn")} (Image)</span>
                    </button>
                    <button 
                      onClick={() => toast.info(t("toasts.videoComingSoon"))}
                      className="flex flex-col items-center justify-center p-6 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all gap-2 group cursor-pointer"
                    >
                      <span className="p-3 bg-white text-purple-500 rounded-full shadow-sm group-hover:scale-105 transition-transform"><Video size={20} /></span>
                      <span className="text-xs font-bold text-slate-700">{t("media.addMediaBtn")} (Video)</span>
                    </button>
                    <button 
                      onClick={() => toast.info(t("toasts.igComingSoon"))}
                      className="flex flex-col items-center justify-center p-6 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all gap-2 group cursor-pointer"
                    >
                      <span className="p-3 bg-white text-pink-550 rounded-full shadow-sm group-hover:scale-105 transition-transform"><Instagram size={20} /></span>
                      <span className="text-xs font-bold text-slate-700">{t("media.addMediaBtn")} (Instagram)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* SUBTAB CONTENT: APPEARANCE (Matching screenshot 4) */}
              {activeSubTab === "appearance" && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t("appearance.sectionTitle")}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {THEMES.map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => {
                          setActiveTheme(theme);
                          toast.success(t("toasts.themeSelected", { name: theme.name }));
                        }}
                        className={`flex flex-col items-center text-center p-2 rounded-xl border-2 transition-all cursor-pointer ${
                          activeTheme.id === theme.id 
                            ? "border-slate-800 bg-slate-50 shadow-sm scale-102" 
                            : "border-slate-200 hover:bg-slate-50/50"
                        }`}
                      >
                        {/* Theme simulated phone icon */}
                        <div className={`w-16 h-28 rounded-xl bg-gradient-to-b ${theme.previewBg} p-2 flex flex-col justify-between items-center overflow-hidden border shadow-sm`}>
                          <div className="w-4 h-4 bg-white/20 rounded-full" />
                          <div className="w-full space-y-1">
                            <div className="w-full h-2.5 bg-white/40 rounded-sm" />
                            <div className="w-full h-2.5 bg-white/40 rounded-sm" />
                            <div className="w-full h-2.5 bg-white/40 rounded-sm" />
                          </div>
                          <div className="w-8 h-1 bg-white/10 rounded-full" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-700 mt-2 block truncate w-full">{theme.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB CONTENT: ANALYTICS (Matching screenshot 5) */}
          {activeTab === "analytics" && (
            <SmartLinksAnalyticsPanel
              analyticsSummary={analyticsSummary}
              analyticsTimeline={analyticsTimeline}
              analyticsLinks={analyticsLinks}
              fallbackLinks={links}
              totalClicksCount={totalClicksCount}
              dateRange={dateRange}
              setDateRange={setDateRange}
            />
          )}

        </div>

        {/* Right Mobile Preview Column (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center sticky top-6">
          <span className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-2 select-none flex items-center gap-1.5">
            <Eye size={13} /> Live Preview
          </span>
          
          <div className="relative w-80 h-[580px] bg-slate-950 rounded-[45px] shadow-2xl p-3 border-[6px] border-slate-800 flex flex-col overflow-hidden">
            
            {/* Phone Notch */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-32 h-5 bg-slate-950 rounded-full z-20 flex items-center justify-center">
              <div className="w-16 h-1.5 bg-slate-800 rounded-full" />
            </div>

            {/* View Live Floating button (Matching screenshot 1) */}
            {slug && (
              <a 
                href={`/s/${slug}`} 
                target="_blank" 
                rel="noreferrer"
                className="absolute top-8 right-6 z-30 bg-white/95 hover:bg-white text-slate-800 text-[10px] font-bold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1 transition-all active:scale-95 border border-slate-200"
              >
                <Globe size={11} /> VIEW LIVE
              </a>
            )}

            {/* Screen Inner */}
            <div className={`w-full h-full rounded-[35px] overflow-y-auto flex flex-col items-center pt-10 px-5 pb-6 relative transition-all duration-500 ${activeTheme.bg} ${activeTheme.text}`}>
              
              {/* Profile details */}
              <div className="flex flex-col items-center text-center mt-6 mb-6">
                
                {/* Logo / Profile Avatar */}
                <label className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-md mb-3 border border-slate-100 overflow-hidden shrink-0 cursor-pointer relative group">
                  {!avatarError && avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt="Logo" 
                      className="w-full h-full object-cover"
                      onError={() => setAvatarError(true)} 
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-extrabold text-xl">
                      {(profileName || activeBrand?.name || "P").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      setAvatarError(false);
                      handleAvatarUpload(e);
                    }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/35 text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-all">
                    Upload
                  </span>
                </label>

                <h4 className="text-base font-extrabold tracking-tight leading-tight">{profileName || activeBrand?.name || ""}</h4>
                <p className="text-[10px] opacity-75 mt-2 px-2 max-w-[220px] leading-relaxed font-semibold">
                  {profileBio || "Get the most out of your LINK IN BIO with SmartLinks!"}
                </p>
              </div>

              {/* Links rendering with custom colors defined in items */}
              <div className="w-full flex-1 flex flex-col gap-3">
                {links
                  .filter(l => l.isActive)
                  .map((link) => {
                    const hasCustomIconUrl = link.iconUrl && !link.iconUrl.startsWith("style:");
                    return (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => {
                          if (link.id && !String(link.id).startsWith("l-")) {
                            smartLinkService.registerClick(link.id)
                              .then(() => {
                                if (smartLinkId) fetchAnalytics(smartLinkId);
                              })
                              .catch(err => console.error("Click track error:", err));
                          }
                        }}
                        style={{
                          backgroundColor: getLinkRenderStyle(link).bgColor,
                          color: getLinkRenderStyle(link).textColor,
                          borderColor: getLinkRenderStyle(link).borderColor
                        }}
                        className="w-full rounded-2xl py-3 px-4 text-xs font-bold text-center border transition-all hover:scale-[1.02] transform active:scale-98 duration-200 flex justify-between items-center group shadow-sm"
                      >
                        {hasCustomIconUrl ? (
                          <img src={link.iconUrl} alt="" className="w-5 h-5 object-contain shrink-0 rounded" />
                        ) : (
                          <span className="w-5 h-5 flex items-center justify-center shrink-0 text-base">{link.emoji || "🔗"}</span>
                        )}
                        <span className="mx-2 truncate text-center flex-1">{link.title}</span>
                        <ArrowUpRight size={14} className="opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
                      </a>
                    );
                  })}
              </div>

              {/* Social Icons row bottom (Matching screenshot 2) */}
              {socialIcons.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-3 mt-6 pt-4 border-t border-white/10 w-full">
                  {socialIcons.map(sIcon => (
                    <a 
                      key={sIcon.id} 
                      href={sIcon.url.startsWith("http") ? sIcon.url : `https://${sIcon.url}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 flex items-center justify-center transition-all border border-white/5"
                      title={sIcon.platform}
                    >
                      {renderSocialIcon(sIcon.platform, 14)}
                    </a>
                  ))}
                </div>
              )}

              {/* Watermark logo */}
              <div className="text-[8px] opacity-40 font-bold tracking-widest uppercase mt-6 select-none flex items-center gap-1">
                <Chrome size={8} /> Powered by PubliCast
              </div>

            </div>

          </div>
        </div>

      </div>

      {/* Modal: Add Link */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 relative shadow-2xl border border-slate-200 mx-4">
            
            <button 
              onClick={() => setIsAddOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Plus className="text-emerald-500 w-5 h-5" />
              {t("addLink.title")}
            </h3>

            <form onSubmit={handleAddLink} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">{t("addLink.titleLabel")}</label>
                <input
                  type="text"
                  placeholder={t("addLink.titlePlaceholder")}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:border-slate-400 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">{t("addLink.urlLabel")}</label>
                <input
                  type="text"
                  placeholder={t("addLink.urlPlaceholder")}
                  value={newUrl}
                  onChange={(e) => newSetUrl(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:border-slate-400 outline-none transition-colors"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  {t("addLink.cancelBtn")}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#4F5B66] hover:bg-[#3d4750] text-white transition-all shadow-sm"
                >
                  {t("addLink.addBtn")}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Modal Đổi tên SmartLink */}
      {isRenameOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Edit3 size={18} />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Đổi tên SmartLink</h3>
              </div>
              <button 
                type="button"
                onClick={() => setIsRenameOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRename} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Tên trang SmartLink (Page Title)
                </label>
                <input
                  type="text"
                  value={renameTitle}
                  onChange={(e) => setRenameTitle(e.target.value)}
                  placeholder="Ví dụ: Trang chính, Chiến dịch Mùa Hè..."
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Đường dẫn URL (Slug)
                </label>
                <input
                  type="text"
                  value={renameSlug}
                  onChange={(e) => setRenameSlug(e.target.value)}
                  placeholder="slug-custom"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Slug xem công khai: <span className="font-semibold text-indigo-600">{renameSlug || 'slug'}</span>
                </p>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRenameOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={renaming}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {renaming ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
