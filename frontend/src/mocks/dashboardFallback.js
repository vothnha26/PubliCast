/**
 * dashboardFallback.js
 * Chứa dữ liệu nhân khẩu học giả định làm fallback khi API không có data.
 * Đảm bảo Single Responsibility Principle (SRP) cho usePlatformDashboard hook.
 */

export const FALLBACK_DEMOGRAPHICS = {
  gender: [
    { name: 'Male', value: 62, color: '#818CF8' },
    { name: 'Female', value: 38, color: '#F472B6' }
  ],
  age: [
    { name: '13-17', value: 8 },
    { name: '18-24', value: 35 },
    { name: '25-34', value: 38 },
    { name: '35-44', value: 14 },
    { name: '45+', value: 5 }
  ],
  countries: [
    { name: 'Vietnam', value: 65, flag: '🇻🇳', progress: 65 },
    { name: 'United States', value: 15, flag: '🇺🇸', progress: 15 },
    { name: 'India', value: 10, flag: '🇮🇳', progress: 10 },
    { name: 'Japan', value: 5, flag: '🇯🇵', progress: 5 }
  ],
  trafficSource: [
    { name: 'YouTube Search', value: 12450, percentage: '45%', color: '#818CF8' },
    { name: 'Direct or Unknown', value: 8300, percentage: '30%', color: '#34D399' },
    { name: 'Suggested Videos', value: 4150, percentage: '15%', color: '#F472B6' },
    { name: 'Other', value: 2760, percentage: '10%', color: '#FBBF24' }
  ]
};

export const EMPTY_ANALYTICS_DATA = {
  demographics: FALLBACK_DEMOGRAPHICS,
  balance: [],
  growth: [],
  clicks: [],
  postsPeriod: [],
  interactions: {},
  summary: {}
};
