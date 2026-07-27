import React, { useMemo } from "react";
import { Calendar, ArrowUp, ArrowDown, BarChart3, ChevronDown, X } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { DateRangeFilter } from "../../../components/app/DateRangeFilter";

const ANALYTICS_THEME = {
  visits: {
    label: "Visits",
    stroke: "#DFB527",
    fill: "#DFB527",
    text: "#755D05",
    soft: "#DFB52722"
  },
  clicks: {
    label: "Clicks Buttons",
    stroke: "#4A90E2",
    fill: "#4A90E2",
    text: "#1B4375",
    soft: "#4A90E222"
  },
  images: {
    label: "Clicks Images",
    stroke: "#E65C9C",
    fill: "#E65C9C",
    text: "#7A254F",
    soft: "#E65C9C22"
  }
};

const EMPTY_MESSAGE = "Chưa có dữ liệu analytics cho khoảng thời gian này.";

function formatPercent(value) {
  if (!Number.isFinite(value)) return "0.0%";
  return `${value.toFixed(1)}%`;
}

function AnalyticsTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl">
      <div className="text-xs font-bold text-slate-500 mb-2">{label}</div>
      <div className="space-y-1 text-sm">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-8">
            <span className="flex items-center gap-2 text-slate-600">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className="font-bold text-slate-900">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, delta, theme, direction = "up", isActive = true, onClick }) {
  const Icon = direction === "down" ? ArrowDown : ArrowUp;

  return (
    <div 
      onClick={onClick}
      className={`rounded-2xl border p-5 shadow-sm transition-all duration-200 cursor-pointer select-none active:scale-[0.98] ${
        isActive 
          ? "border-slate-200 bg-white hover:border-slate-350" 
          : "border-slate-100 bg-slate-50 opacity-60 hover:opacity-80"
      }`}
    >
      <span className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: theme.text }}>
        {label}
      </span>
      <div className="mt-3 flex items-end justify-between gap-3">
        <span className="text-3xl font-extrabold" style={{ color: theme.text }}>
          {value}
        </span>
        <span
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold"
          style={{ color: theme.text, backgroundColor: theme.soft }}
        >
          <Icon size={12} />
          {delta}
        </span>
      </div>
    </div>
  );
}

function formatTimelineData(timeline) {
  return Array.isArray(timeline)
    ? timeline.map((day) => ({
        ...day,
        visits: Number(day?.visits || 0),
        clicks: Number(day?.clicks || 0)
      }))
    : [];
}

function buildAnalyticsCards(summary) {
  return [
    {
      key: "visits",
      ...ANALYTICS_THEME.visits,
      value: summary?.visits ?? 0,
      delta: summary ? `${summary.visits} total` : "No data",
      direction: "up"
    },
    {
      key: "buttonClicks",
      ...ANALYTICS_THEME.clicks,
      value: summary?.buttonClicks ?? 0,
      delta: summary ? `${summary.buttonClicks} total` : "No data",
      direction: "up"
    },
    {
      key: "imageClicks",
      ...ANALYTICS_THEME.images,
      value: summary?.imageClicks ?? 0,
      delta: summary ? `${summary.imageClicks} total` : "No data",
      direction: summary?.imageClicks > 0 ? "up" : "down"
    }
  ];
}

function getLinkRenderStyle(link) {
  const styleSource = link.linkStyle || link.iconUrl || "";
  let bgColor = "";
  let textColor = "";
  let borderColor = "";

  if (styleSource && styleSource.startsWith("style:")) {
    const parts = styleSource.replace("style:", "").split(";");
    parts.forEach((p) => {
      const [key, val] = p.split("=");
      if (key === "bgColor") bgColor = val;
      if (key === "textColor") textColor = val;
      if (key === "borderColor") borderColor = val;
    });
  }

  return {
    bgColor: bgColor || "#E65C9C",
    textColor: textColor || "#FFFFFF",
    borderColor: borderColor || "#E65C9C"
  };
}

export function SmartLinksAnalyticsPanel({
  analyticsSummary,
  analyticsTimeline,
  analyticsLinks,
  fallbackLinks,
  totalClicksCount,
  dateRange,
  setDateRange
}) {
  const chartData = useMemo(() => formatTimelineData(analyticsTimeline), [analyticsTimeline]);
  const cards = useMemo(() => buildAnalyticsCards(analyticsSummary), [analyticsSummary]);
  const rows = analyticsLinks.length > 0 ? analyticsLinks : fallbackLinks;
  const ctrBase = analyticsSummary?.buttonClicks ?? totalClicksCount;

  const [selectedLinkEvolution, setSelectedLinkEvolution] = React.useState(null);
  const [sortKey, setSortKey] = React.useState("clicks");
  const [sortOrder, setSortOrder] = React.useState("desc");
  const [visibleLines, setVisibleLines] = React.useState({
    visits: true,
    clicks: true,
    images: true
  });

  const toggleLine = (key) => {
    setVisibleLines(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const sortedRows = useMemo(() => {
    const sorted = [...rows].map(link => {
      const clicks = Number(link.clicks || 0);
      const ctr = ctrBase > 0 ? (clicks / ctrBase) * 100 : 0;
      return { ...link, clicks, ctr };
    });

    sorted.sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];

      if (sortKey === "title") {
        aVal = a.title?.toLowerCase() || "";
        bVal = b.title?.toLowerCase() || "";
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [rows, sortKey, sortOrder, ctrBase]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortOrder(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("desc");
    }
  };

  return (
    <div className="bg-white rounded-b-2xl border-x border-b border-slate-200 p-6 space-y-6 shadow-sm mt-[-24px]">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-800">
            SmartLinks Analytics
          </h3>
          <p className="mt-1 text-xs text-slate-500">Real metrics from the SmartLinks analytics table.</p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangeFilter date={dateRange} setDate={setDateRange} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {cards.map((card) => {
          let lineKey = "visits";
          if (card.key === "buttonClicks") lineKey = "clicks";
          if (card.key === "imageClicks") lineKey = "images";

          return (
            <StatCard
              key={card.key}
              label={card.label}
              value={card.value}
              delta={card.delta}
              theme={card}
              direction={card.direction}
              isActive={visibleLines[lineKey]}
              onClick={() => toggleLine(lineKey)}
            />
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Timeline</div>
            <div className="mt-1 text-sm font-semibold text-slate-700">Visits and clicks by day</div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <BarChart3 size={14} />
            <span>Live data</span>
          </div>
        </div>

        <div className="h-72 w-full">
          {chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              {EMPTY_MESSAGE}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="smartlinksVisitsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ANALYTICS_THEME.visits.fill} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={ANALYTICS_THEME.visits.fill} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="smartlinksClicksGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ANALYTICS_THEME.clicks.fill} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={ANALYTICS_THEME.clicks.fill} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="smartlinksImagesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ANALYTICS_THEME.images.fill} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={ANALYTICS_THEME.images.fill} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<AnalyticsTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: 16, fontSize: 12, color: "#64748B" }}
                />
                {visibleLines.visits && (
                  <Area type="monotone" dataKey="visits" name={ANALYTICS_THEME.visits.label} stroke={ANALYTICS_THEME.visits.stroke} fill="url(#smartlinksVisitsGradient)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                )}
                {visibleLines.clicks && (
                  <Area type="monotone" dataKey="clicks" name={ANALYTICS_THEME.clicks.label} stroke={ANALYTICS_THEME.clicks.stroke} fill="url(#smartlinksClicksGradient)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                )}
                {visibleLines.images && (
                  <Area type="monotone" dataKey="images" name={ANALYTICS_THEME.images.label} stroke={ANALYTICS_THEME.images.stroke} fill="url(#smartlinksImagesGradient)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                )}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">List of buttons</h4>
          <div className="text-xs font-bold text-slate-500">
            {sortedRows.length} rows
          </div>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
                <th className="px-5 py-3.5">Button</th>
                <th 
                  className="px-5 py-3.5 cursor-pointer hover:text-slate-655 transition-colors"
                  onClick={() => handleSort("isActive")}
                >
                  Status {sortKey === "isActive" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th 
                  className="px-5 py-3.5 text-right cursor-pointer hover:text-slate-655 transition-colors"
                  onClick={() => handleSort("clicks")}
                >
                  Organic Clicks {sortKey === "clicks" ? (sortOrder === "asc" ? " ↓" : " ↓") : ""}
                </th>
                <th 
                  className="px-5 py-3.5 text-right cursor-pointer hover:text-slate-655 transition-colors"
                  onClick={() => handleSort("ctr")}
                >
                  CTR % {sortKey === "ctr" ? (sortOrder === "asc" ? " ↑" : " ↓") : ""}
                </th>
                <th className="px-5 py-3.5 text-right">Evolution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {sortedRows.map((link) => {
                const style = getLinkRenderStyle(link);
                return (
                  <tr key={link.id} className="transition-colors hover:bg-slate-50/20">
                    <td className="px-5 py-4 min-w-[220px]">
                      <div 
                        style={{
                          backgroundColor: style.bgColor,
                          color: style.textColor,
                          borderColor: style.borderColor,
                        }}
                        className="w-full max-w-[240px] rounded-full py-2 px-3 text-center border text-xs font-bold truncate shadow-sm flex items-center justify-center gap-1.5"
                      >
                        {link.emoji && <span className="text-sm shrink-0">{link.emoji}</span>}
                        <span className="truncate flex-1">{link.title || "\u00A0"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-bold ${link.isActive ? "text-teal-650" : "text-rose-650"}`}>
                        {link.isActive ? "Active" : "Deleted"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-extrabold text-slate-950 text-sm">{link.clicks}</td>
                    <td className="px-5 py-4 text-right font-bold text-slate-450 text-sm">{formatPercent(link.ctr)}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => setSelectedLinkEvolution(link)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-slate-750 shadow-sm transition-all active:scale-95 cursor-pointer"
                      >
                        <BarChart3 size={11} className="text-slate-550" />
                        View Evolution
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: View Evolution */}
      {selectedLinkEvolution && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 relative flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedLinkEvolution(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X size={20} />
            </button>

            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-450">Evolution Metric</div>
              <h3 className="mt-1 text-base font-bold text-slate-800 flex items-center gap-2">
                {selectedLinkEvolution.emoji && <span className="text-xl shrink-0">{selectedLinkEvolution.emoji}</span>}
                <span className="truncate">{selectedLinkEvolution.title || "Button Link"}</span>
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">{selectedLinkEvolution.url}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 border-y border-slate-100 py-3 my-1">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450 block">Total clicks in range</span>
                <span className="text-xl font-black text-slate-900">{selectedLinkEvolution.clicks} clicks</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450 block">CTR %</span>
                <span className="text-xl font-black text-slate-900">
                  {ctrBase > 0 ? ((selectedLinkEvolution.clicks / ctrBase) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>

            <div className="h-64 w-full mt-2">
              {!selectedLinkEvolution.timeline || selectedLinkEvolution.timeline.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-450">
                  Chưa có dữ liệu clicks cho khoảng thời gian này.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={selectedLinkEvolution.timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="linkEvolutionGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4A90E2" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#4A90E2" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<AnalyticsTooltip />} />
                    <Area type="monotone" dataKey="clicks" name="Clicks" stroke="#4A90E2" fill="url(#linkEvolutionGradient)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLinkEvolution(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

