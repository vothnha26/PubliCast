import { WidgetThumbnailRenderer } from "../../components/shared/WidgetThumbnailRenderer";

export const WIDGET_THUMBNAIL_PRESETS = {
  fbGrowth: { type: "growth", points: [10, 14, 11, 17, 15, 24, 21] },
  fbBalance: { type: "balance", acquired: [12, 8, 17, 13, 19], lost: [20, 23, 18, 24, 17] },
  fbViews: { type: "bar", values: [11, 7, 20, 15, 25, 10, 18] },
  fbInteractions: { type: "growth", points: [7, 10, 9, 16, 13, 19, 23] },
  fbTypesBreakdown: { type: "donut", ratio: 0.58 },
  fbViewsBreakdown: { type: "donut", ratio: 0.71 },
  fbRankingOfPosts: { type: "ranking" },
  igGrowth: { type: "growth", points: [8, 11, 9, 14, 13, 18, 16] },
  igRankingOfPosts: { type: "ranking" },
  ytGrowth: { type: "growth", points: [9, 12, 10, 18, 15, 22, 20] },
  ytRankingOfVideos: { type: "ranking" },
  ttGrowth: { type: "growth", points: [7, 13, 8, 16, 14, 21, 19] },
  ttBalance: { type: "balance", acquired: [10, 12, 14, 16, 18], lost: [8, 10, 9, 11, 12] },
  ttViews: { type: "bar", values: [9, 12, 15, 13, 18, 16, 20] },
  ttInteractions: { type: "growth", points: [8, 10, 12, 15, 14, 18, 21] },
  ttPosts: { type: "ranking" },
  dcGrowth: { type: "growth", points: [6, 9, 8, 12, 11, 17, 15] },
  tgGrowth: { type: "growth", points: [7, 10, 9, 15, 12, 18, 17] }
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const scaleSeries = (values, maxValue = null) => {
  const cleaned = (values || []).map((v) => Number(v) || 0);
  const max = maxValue ?? Math.max(...cleaned, 1);
  return cleaned.map((v) => clamp(Math.round((v / max) * 30), 3, 30));
};

const getChannel = (previewData, platform) => {
  if (!previewData || !Array.isArray(previewData.channels)) return null;
  return previewData.channels.find((ch) => ch.platform?.toLowerCase() === platform);
};

const mapGrowthSeries = (rows, keys, fallbackKey = keys[0]) => {
  const source = Array.isArray(rows) ? rows : [];
  const values = source.map((row) => {
    for (const key of keys) {
      if (typeof row?.[key] === "number") return row[key];
    }
    return typeof row?.[fallbackKey] === "number" ? row[fallbackKey] : 0;
  });
  return scaleSeries(values);
};

const getRankingItems = (rows, valueKeys, nameKey = "name") => {
  const items = (Array.isArray(rows) ? rows : [])
    .map((row, index) => {
      let value = 0;
      for (const key of valueKeys) {
        if (typeof row?.[key] === "number") {
          value = row[key];
          break;
        }
      }
      return {
        name: row?.[nameKey] || row?.title || row?.date || `Item ${index + 1}`,
        value
      };
    })
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  if (!items.length) {
    return [
      { name: "Top Item #1", val: "85%" },
      { name: "Top Item #2", val: "60%" },
      { name: "Top Item #3", val: "40%" }
    ];
  }

  const max = Math.max(...items.map((item) => item.value), 1);
  return items.map((item) => ({
    name: String(item.name).slice(0, 14),
    val: `${Math.round((item.value / max) * 100)}%`
  }));
};

const MiniChip = ({ label, value, color }) => (
  <div className="rounded-md border border-border bg-card px-2 py-1 shadow-sm">
    <div className="text-[5.5px] uppercase tracking-wider text-muted-foreground font-bold">{label}</div>
    <div className="text-[7px] font-black text-foreground leading-none mt-0.5" style={{ color }}>{value}</div>
  </div>
);

const TinyHeader = ({ title, subtitle, color }) => (
  <div className="flex items-start justify-between gap-2">
    <div className="min-w-0">
      <div className="text-[8px] font-black text-foreground truncate">{title}</div>
      <div className="text-[5.5px] text-muted-foreground font-semibold truncate">{subtitle}</div>
    </div>
    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
  </div>
);

const renderPresetThumbnail = (widgetKey, color, preset) => {
  switch (preset.type) {
    case "balance":
      return WidgetThumbnailRenderer.renderBalanceChart(color, preset.acquired, preset.lost);
    case "bar":
      return WidgetThumbnailRenderer.renderBarChart(color, preset.values);
    case "donut":
      return WidgetThumbnailRenderer.renderDonutChart(color, "#E5E7EB", preset.ratio);
    case "ranking":
      return WidgetThumbnailRenderer.renderRankingList(color);
    case "growth":
    default:
      return WidgetThumbnailRenderer.renderGrowthChart(color, preset.points);
  }
};

const renderFacebookWidget = (widgetKey, color, previewData, preset) => {
  const facebook = getChannel(previewData, "facebook");
  const fbGrowthRows = facebook?.analyticsData?.growth || [];
  const fbBalanceRows = facebook?.analyticsData?.balance || fbGrowthRows;
  const fbPostsRows = facebook?.analyticsData?.postsPeriod || [];
  const fbInteractions = facebook?.analyticsData?.interactions || {};

  if (widgetKey === "fbGrowth") {
    const latest = fbGrowthRows.at?.(-1) || {};
    return (
      <div className="space-y-1.5">
        <TinyHeader title="Facebook Growth" subtitle="Followers, Views, Page Visits" color={color} />
        <div className="grid grid-cols-3 gap-1">
          <MiniChip label="Followers" value={`${latest.followers ?? 0}`} color={color} />
          <MiniChip label="Views" value={`${latest.views ?? 0}`} color={color} />
          <MiniChip label="Visits" value={`${latest.pageVisits ?? 0}`} color={color} />
        </div>
        {WidgetThumbnailRenderer.renderGrowthChart(color, mapGrowthSeries(fbGrowthRows, ["followers", "views", "pageVisits"]))}
      </div>
    );
  }

  if (widgetKey === "fbBalance") {
    const last = fbBalanceRows.at?.(-1) || {};
    return (
      <div className="space-y-1.5">
        <TinyHeader title="Balance of Followers" subtitle="New vs Lost followers" color={color} />
        <div className="grid grid-cols-2 gap-1">
          <MiniChip label="Acquired" value={`${last.acquired ?? 0}`} color={color} />
          <MiniChip label="Lost" value={`${last.lost ?? 0}`} color="#F472B6" />
        </div>
        {WidgetThumbnailRenderer.renderBalanceChart(color, scaleSeries(fbBalanceRows.map((row) => row?.acquired || 0)), scaleSeries(fbBalanceRows.map((row) => row?.lost || 0)))}
      </div>
    );
  }

  if (widgetKey === "fbViews") {
    return (
      <div className="space-y-1.5">
        <TinyHeader title="Posts Viewed" subtitle="Views by period" color={color} />
        <div className="grid grid-cols-3 gap-1">
          <MiniChip label="Posts" value={`${fbPostsRows.length || 0}`} color={color} />
          <MiniChip label="Views" value={`${fbPostsRows.reduce((s, r) => s + (r.views || 0), 0)}`} color={color} />
          <MiniChip label="Reacts" value={`${fbPostsRows.reduce((s, r) => s + (r.reactions || 0), 0)}`} color={color} />
        </div>
        {WidgetThumbnailRenderer.renderBarChart(color, scaleSeries(fbPostsRows.map((row) => row?.views || 0)))}
      </div>
    );
  }

  if (widgetKey === "fbInteractions") {
    return (
      <div className="space-y-1.5">
        <TinyHeader title="Interactions" subtitle="Reactions, Comments, Shares" color={color} />
        <div className="grid grid-cols-3 gap-1">
          <MiniChip label="React" value={`${fbInteractions.reactions || 0}`} color="#818CF8" />
          <MiniChip label="Comment" value={`${fbInteractions.comments || 0}`} color="#4ADE80" />
          <MiniChip label="Share" value={`${fbInteractions.shares || 0}`} color="#F472B6" />
        </div>
        {WidgetThumbnailRenderer.renderGrowthChart(color, mapGrowthSeries(fbGrowthRows, ["reactions", "comments", "shares"]))}
      </div>
    );
  }

  if (widgetKey === "fbTypesBreakdown") {
    const album = fbInteractions.typesBreakdown?.album || 0;
    const image = fbInteractions.typesBreakdown?.image || 0;
    const ratio = album + image > 0 ? album / (album + image) : preset.ratio;
    return (
      <div className="space-y-1.5">
        <TinyHeader title="Types Breakdown" subtitle="Post format mix" color={color} />
        <div className="grid grid-cols-2 gap-1">
          <MiniChip label="Album" value={`${album}%`} color="#818CF8" />
          <MiniChip label="Image" value={`${image}%`} color="#F472B6" />
        </div>
        {WidgetThumbnailRenderer.renderDonutChart(color, "#E5E7EB", ratio)}
      </div>
    );
  }

  if (widgetKey === "fbViewsBreakdown") {
    const organic = fbInteractions.viewsBreakdown?.organic || 0;
    const promoted = fbInteractions.viewsBreakdown?.promoted || 0;
    const ratio = organic + promoted > 0 ? organic / (organic + promoted) : preset.ratio;
    return (
      <div className="space-y-1.5">
        <TinyHeader title="Views Breakdown" subtitle="Organic vs Promoted" color={color} />
        <div className="grid grid-cols-2 gap-1">
          <MiniChip label="Organic" value={`${organic}%`} color="#4ADE80" />
          <MiniChip label="Promoted" value={`${promoted}%`} color="#A855F7" />
        </div>
        {WidgetThumbnailRenderer.renderDonutChart(color, "#E5E7EB", ratio)}
      </div>
    );
  }

  if (widgetKey === "fbRankingOfPosts") {
    return (
      <div className="space-y-1.5">
        <TinyHeader title="Ranking of posts" subtitle="Top performing posts" color={color} />
        {WidgetThumbnailRenderer.renderRankingList(color, getRankingItems(fbPostsRows, ["views", "reactions"], "name"))}
      </div>
    );
  }

  return null;
};

const renderPlatformWidget = (widgetKey, color, previewData, preset) => {
  const instagram = getChannel(previewData, "instagram");
  const youtube = getChannel(previewData, "youtube");
  const tiktok = getChannel(previewData, "tiktok");
  const telegram = getChannel(previewData, "telegram");
  const igGrowthRows = instagram?.analyticsData?.growth || [];
  const ytGrowthRows = youtube?.analyticsData?.growth || [];
  const ttGrowthRows = tiktok?.analyticsData?.growth || [];
  const tgGrowthRows = telegram?.analyticsData?.growth || [];

  if (widgetKey === "igGrowth") {
    return (
      <div className="space-y-1.5">
        <TinyHeader title="Instagram Growth" subtitle="Followers, following, posts" color={color} />
        <div className="grid grid-cols-3 gap-1">
          <MiniChip label="Followers" value={`${instagram?.followers || instagram?.analyticsData?.summary?.followers || 0}`} color={color} />
          <MiniChip label="Posts" value={`${instagram?.mediaCount || instagram?.analyticsData?.summary?.posts || 0}`} color={color} />
          <MiniChip label="Reach" value={`${instagram?.reach || 0}`} color={color} />
        </div>
        {WidgetThumbnailRenderer.renderGrowthChart(color, mapGrowthSeries(igGrowthRows, ["followers", "views"]))}
      </div>
    );
  }

  if (widgetKey === "igRankingOfPosts") {
    return (
      <div className="space-y-1.5">
        <TinyHeader title="Ranking of posts" subtitle="Top Instagram posts" color={color} />
        {WidgetThumbnailRenderer.renderRankingList(color, getRankingItems(igGrowthRows, ["followers", "views"], "name"))}
      </div>
    );
  }

  if (widgetKey === "ytGrowth") {
    return (
      <div className="space-y-1.5">
        <TinyHeader title="YouTube Growth" subtitle="Subscribers, views, videos" color={color} />
        <div className="grid grid-cols-3 gap-1">
          <MiniChip label="Subs" value={`${youtube?.followers || 0}`} color={color} />
          <MiniChip label="Views" value={`${youtube?.impressions || 0}`} color={color} />
          <MiniChip label="Videos" value={`${youtube?.postsCount || 0}`} color={color} />
        </div>
        {WidgetThumbnailRenderer.renderGrowthChart(color, mapGrowthSeries(ytGrowthRows, ["subscribersGained", "views"]))}
      </div>
    );
  }

  if (widgetKey === "ytRankingOfVideos") {
    return (
      <div className="space-y-1.5">
        <TinyHeader title="Ranking of videos" subtitle="Top YouTube videos" color={color} />
        {WidgetThumbnailRenderer.renderRankingList(color, getRankingItems(ytGrowthRows, ["views", "subscribersGained"], "name"))}
      </div>
    );
  }

  if (widgetKey === "ttGrowth") {
    return (
      <div className="space-y-1.5">
        <TinyHeader title="TikTok Performance" subtitle="Views, likes, followers" color={color} />
        <div className="grid grid-cols-3 gap-1">
          <MiniChip label="Views" value={`${tiktok?.impressions || 0}`} color={color} />
          <MiniChip label="Likes" value={`${tiktok?.likes || 0}`} color={color} />
          <MiniChip label="Followers" value={`${tiktok?.followers || 0}`} color={color} />
        </div>
        {WidgetThumbnailRenderer.renderGrowthChart(color, mapGrowthSeries(ttGrowthRows, ["views", "likes"]))}
      </div>
    );
  }

  if (widgetKey === "ttBalance") {
    const last = ttGrowthRows.at?.(-1) || {};
    return (
      <div className="space-y-1.5">
        <TinyHeader title="Balance of Followers" subtitle="New vs Lost followers" color={color} />
        <div className="grid grid-cols-2 gap-1">
          <MiniChip label="Gained" value={`${last.followers ?? 0}`} color={color} />
          <MiniChip label="Lost" value={`${last.likes ?? 0}`} color="#F472B6" />
        </div>
        {WidgetThumbnailRenderer.renderBalanceChart(color, scaleSeries(ttGrowthRows.map((row) => row?.followers || 0)), scaleSeries(ttGrowthRows.map((row) => row?.likes || 0)))}
      </div>
    );
  }

  if (widgetKey === "ttViews") {
    return (
      <div className="space-y-1.5">
        <TinyHeader title="Views" subtitle="Video views by period" color={color} />
        <div className="grid grid-cols-3 gap-1">
          <MiniChip label="Views" value={`${tiktok?.impressions || 0}`} color={color} />
          <MiniChip label="Likes" value={`${tiktok?.likes || 0}`} color={color} />
          <MiniChip label="Posts" value={`${ttGrowthRows.length || 0}`} color={color} />
        </div>
        {WidgetThumbnailRenderer.renderBarChart(color, scaleSeries(ttGrowthRows.map((row) => row?.views || 0)))}
      </div>
    );
  }

  if (widgetKey === "ttInteractions") {
    return (
      <div className="space-y-1.5">
        <TinyHeader title="Interactions" subtitle="Likes, comments, shares" color={color} />
        <div className="grid grid-cols-3 gap-1">
          <MiniChip label="Likes" value={`${tiktok?.likes || 0}`} color="#818CF8" />
          <MiniChip label="Comments" value={`${tiktok?.comments || 0}`} color="#4ADE80" />
          <MiniChip label="Shares" value={`${tiktok?.shares || 0}`} color="#F472B6" />
        </div>
        {WidgetThumbnailRenderer.renderGrowthChart(color, mapGrowthSeries(ttGrowthRows, ["likes", "comments", "shares"]))}
      </div>
    );
  }

  if (widgetKey === "ttPosts") {
    return (
      <div className="space-y-1.5">
        <TinyHeader title="List of posts" subtitle="Top TikTok posts" color={color} />
        {WidgetThumbnailRenderer.renderRankingList(color, getRankingItems(ttGrowthRows, ["views", "likes"], "name"))}
      </div>
    );
  }

  if (widgetKey === "tgGrowth") {
    return (
      <div className="space-y-1.5">
        <TinyHeader title="Telegram Analytics" subtitle="Subscribers, views, forwards" color={color} />
        <div className="grid grid-cols-3 gap-1">
          <MiniChip label="Subs" value={`${telegram?.followers || 0}`} color={color} />
          <MiniChip label="Views" value={`${telegram?.impressions || 0}`} color={color} />
          <MiniChip label="Fwd" value={`${telegram?.shares || 0}`} color={color} />
        </div>
        {WidgetThumbnailRenderer.renderGrowthChart(color, mapGrowthSeries(tgGrowthRows, ["views", "followers"]))}
      </div>
    );
  }

  return null;
};

export const renderWidgetThumbnail = (widgetKey, color, previewData = null) => {
  const preset = WIDGET_THUMBNAIL_PRESETS[widgetKey];
  if (!preset) return WidgetThumbnailRenderer.renderGrowthChart(color);
  if (!previewData) return renderPresetThumbnail(widgetKey, color, preset);

  const fb = renderFacebookWidget(widgetKey, color, previewData, preset);
  if (fb) return fb;

  const platform = renderPlatformWidget(widgetKey, color, previewData, preset);
  if (platform) return platform;

  return renderPresetThumbnail(widgetKey, color, preset);
};
