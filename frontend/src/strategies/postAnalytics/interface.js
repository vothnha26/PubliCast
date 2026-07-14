/**
 * @typedef {Object} PostPreview
 * @property {string} id - Database ID hoặc Platform Post ID
 * @property {string} title - Tiêu đề hoặc Caption rút gọn
 * @property {string} thumbnail - URL ảnh thu nhỏ
 * @property {string} platform - Tên nền tảng (lowercase)
 * @property {string} publishedAt - Thời gian đăng bài dạng ISO string
 * @property {string} status - Trạng thái bài đăng (ví dụ: 'published')
 */

/**
 * @typedef {Object} SectionResult
 * @property {'success' | 'error' | 'loading'} status - Trạng thái tải của phân đoạn dữ liệu
 * @property {any} data - Dữ liệu thực tế của phân đoạn
 * @property {any} [error] - Thông tin lỗi nếu có
 */

/**
 * @typedef {Object} PlatformStrategyResult
 * @property {SectionResult} metadata - Dữ liệu bài viết cơ bản (title, thumbnail...)
 * @property {SectionResult} insights - Các chỉ số tĩnh (like, share, reactions...)
 * @property {SectionResult} [analytics] - Dữ liệu tăng trưởng theo thời gian (timeseries)
 */

/**
 * @typedef {Object} PlatformAnalyticsStrategy
 * @property {(brandId: string, postId: string, dateRange?: {from: Date, to: Date}) => Promise<PlatformStrategyResult>} fetchData - Tải dữ liệu insights & analytics (hỗ trợ partial failure)
 * @property {string[]} supportedTabs - Danh sách các tab con được hỗ trợ (ví dụ: ['overview', 'reactions', 'audience'])
 * @property {boolean} supportsDateRange - Nền tảng này có API phụ thuộc khoảng ngày (timeseries analytics) hay không.
 *   Khi true, PostAnalyticsDetailPage sẽ hiển thị <DateRangeFilter> trong thanh tab. Khi false (ví dụ TikTok,
 *   nơi chỉ có lifetime history không lọc theo ngày), bộ lọc ngày sẽ bị ẩn đi thay vì hiển thị vô nghĩa.
 * @property {(data: PlatformStrategyResult) => React.ReactNode} renderHeaderStats - Trực quan hóa các thẻ chỉ số nhanh ở Header
 * @property {(tab: string, data: PlatformStrategyResult, dateRange: {from: Date, to: Date}, setDateRange: Function) => React.ReactNode} renderTabContent - Trực quan hóa tab được chọn
 */

export {};
