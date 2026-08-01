import { format } from "date-fns";
import { EMPTY_ANALYTICS_DATA } from "@/mocks/dashboardFallback";

const COUNTRY_MAP = {
  VN: { name: "Vietnam", flag: "🇻🇳" },
  US: { name: "United States", flag: "🇺🇸" },
  IN: { name: "India", flag: "🇮🇳" },
  JP: { name: "Japan", flag: "🇯🇵" },
  GB: { name: "United Kingdom", flag: "🇬🇧" },
  DE: { name: "Germany", flag: "🇩🇪" },
  FR: { name: "France", flag: "🇫🇷" },
  BR: { name: "Brazil", flag: "🇧🇷" },
};

/**
 * Parses the raw audienceDemographicsJson blob on a metrics entry into
 * chart-ready shapes. Extracted from usePlatformDashboard's realData
 * useMemo (frontend/src/hooks/usePlatformDashboard.js) so both the old
 * platform-grouped dashboard and the new per-channel Insights tab
 * (useChannelInsights) share one implementation instead of drifting apart.
 *
 * @param {object|null} metrics - one entry from GET /social/metrics (has .analytics[0].socialAnalytics.audienceDemographicsJson)
 * @param {string} platform - lowercase platform id, e.g. "youtube", "facebook"
 * @param {{from?: Date, to?: Date}} dateRange - only used for facebook/tiktok/instagram's date-filtered arrays
 */
export function parseAnalyticsData(metrics, platform, dateRange = {}) {
  if (!metrics?.analytics?.[0]?.socialAnalytics?.audienceDemographicsJson) {
    if (platform === "instagram") {
      return {
        demographics: { gender: [], age: [], countries: [], trafficSource: [] },
        balance: [],
        growth: [],
        clicks: [],
        postsPeriod: [],
        interactions: {},
        summary: {},
      };
    }
    return EMPTY_ANALYTICS_DATA;
  }

  try {
    const raw = JSON.parse(metrics.analytics[0].socialAnalytics.audienceDemographicsJson);

    if (platform === "facebook" || platform === "tiktok" || platform === "instagram") {
      const fromStr = dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : null;
      const toStr = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : null;
      const filterByRange = (arr) => {
        if (!arr?.length || !fromStr || !toStr) return arr || [];
        return arr.filter((item) => item.date >= fromStr && item.date <= toStr);
      };

      return {
        demographics: { gender: [], age: [], countries: [], trafficSource: [] },
        balance: filterByRange(raw.balance || []),
        growth: filterByRange(raw.growth || []).map((g) => ({
          ...g,
          value: g.views || 0,
          new: g.acquired || raw.balance?.find((b) => b.date === g.date)?.acquired || 0,
          lost: g.lost || raw.balance?.find((b) => b.date === g.date)?.lost || 0,
          videos: g.totalContent || 0,
        })),
        clicks: filterByRange(raw.clicks || []),
        postsPeriod: filterByRange(raw.postsPeriod || []),
        interactions: raw.interactions || {},
        summary: raw.summary || {},
        stories: raw.stories || [],
      };
    }

    const ageMap = {};
    const genderMap = { Male: 0, Female: 0 };
    (raw.demographics || [])
      .filter((row) => Array.isArray(row) && row.length >= 3)
      .forEach(([age, gender, percentage]) => {
        ageMap[age] = (ageMap[age] || 0) + percentage;
        if (gender === "male") genderMap.Male += percentage;
        if (gender === "female") genderMap.Female += percentage;
      });

    let age = Object.entries(ageMap).map(([name, value]) => ({
      name: name.replace("age", ""),
      value: Math.round(value),
    }));
    let gender = [
      { name: "Male", value: Math.round(genderMap.Male), color: "#818CF8" },
      { name: "Female", value: Math.round(genderMap.Female), color: "#F472B6" },
    ];

    if (genderMap.Male === 0 && genderMap.Female === 0) {
      gender = [];
    }

    const totalTrafficViews = (raw.trafficSource || []).reduce((a, b) => a + (Array.isArray(b) ? b[1] || 0 : 0), 0) || 1;
    let trafficSource = (raw.trafficSource || [])
      .filter((row) => Array.isArray(row) && row.length >= 2)
      .map(([source, views]) => ({
        name: source ? source.replace("insightTrafficSourceType", "").replace(/_/g, " ") : "Unknown",
        value: views || 0,
        percentage: `${Math.round(((views || 0) / totalTrafficViews) * 100)}%`,
        color: "#818CF8",
      }));

    const totalGeoViews = (raw.geographic || []).reduce((a, b) => a + (Array.isArray(b) ? b[1] || 0 : 0), 0) || 1;
    let countries = (raw.geographic || [])
      .filter((row) => Array.isArray(row) && row.length >= 2)
      .map(([code, views]) => {
        const mapped = COUNTRY_MAP[code] || { name: code, flag: "📍" };
        return {
          name: mapped.name,
          value: Math.round(((views || 0) / totalGeoViews) * 100),
          flag: mapped.flag,
          progress: Math.round(((views || 0) / totalGeoViews) * 100),
        };
      });

    const growth = (raw.growth || [])
      .map((row) => {
        if (typeof row === "object" && !Array.isArray(row)) {
          return {
            date: row.date,
            name: row.date ? row.date.split("-").slice(1).join("/") : "Unknown",
            value: row.views || 0,
            new: row.subscribersGained || 0,
            lost: row.subscribersLost || 0,
            videos: row.totalContent || 0,
          };
        }
        if (Array.isArray(row) && row.length >= 4) {
          const [day, views, gained, lost] = row;
          return {
            date: day,
            name: day ? day.split("-").slice(1).join("/") : "Unknown",
            value: views || 0,
            new: gained || 0,
            lost: lost || 0,
            videos: 0,
          };
        }
        return null;
      })
      .filter(Boolean);

    return {
      demographics: { age, gender, countries, trafficSource },
      balance: growth,
      growth: growth,
    };
  } catch (e) {
    console.error("Error parsing analytics data:", e);
    return {
      demographics: { gender: [], age: [], countries: [], trafficSource: [] },
      balance: [],
      growth: [],
      clicks: [],
      postsPeriod: [],
      interactions: {},
      summary: {},
    };
  }
}
