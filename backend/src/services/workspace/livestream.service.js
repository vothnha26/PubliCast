const livestreamRepository = require('../../repositories/workspace/livestream.repository');
const QueryPipeline = require('../../core/query-pipeline/query.pipeline');
const LivestreamSearchFilter = require('./livestream/filters/search.filter');
const LivestreamPlatformFilter = require('./livestream/filters/platform.filter');
const LivestreamStatusFilter = require('./livestream/filters/status.filter');
const LivestreamDateRangeFilter = require('./livestream/filters/date-range.filter');
const { SEPARATORS, DEFAULT_CONFIG } = require('../../utils/constants');

const ALLOWED_SORT_FIELDS = ['scheduledAt', 'title', 'peakViewers', 'totalViews', 'durationMinutes'];
const ALLOWED_SORT_ORDERS = ['asc', 'desc'];

class LivestreamService {
  constructor() {
    this.queryPipeline = new QueryPipeline([
      new LivestreamSearchFilter(),
      new LivestreamPlatformFilter(),
      new LivestreamStatusFilter(),
      new LivestreamDateRangeFilter()
    ]);
  }

  /**
   * Get stream details by ID
   */
  async getStreamById(id) {
    const stream = await livestreamRepository.findById(id);
    if (!stream) return null;
    return this._formatStreamResponse(stream);
  }

  /**
   * Get filtered stream history with pagination
   */
  async getStreamHistory(queryParams, brandId) {
    const { page = 1, limit = 10, sortBy = 'scheduledAt', sortOrder = 'desc' } = queryParams;
    const { skip, take } = this._getPagination(page, limit);
    const order = this._getSortOrder(sortBy, sortOrder);

    const where = this.queryPipeline.apply({ brandId }, queryParams);
    const { streams, total } = await livestreamRepository.findManyAndCount(where, { skip, take, orderBy: order });

    return {
      data: streams.map(s => this._formatStreamResponse(s)),
      meta: { total, page: Math.max(1, parseInt(page) || 1), limit: take, totalPages: Math.ceil(total / take) }
    };
  }

  // ============= Private Helper Methods =============

  _getPagination(page, limit) {
    const safePage = Math.max(1, parseInt(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit) || 10));
    return { skip: (safePage - 1) * safeLimit, take: safeLimit };
  }

  _getSortOrder(sortBy, sortOrder) {
    const safeSortBy = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : 'scheduledAt';
    const safeSortOrder = ALLOWED_SORT_ORDERS.includes(sortOrder) ? sortOrder : 'desc';
    return { [safeSortBy]: safeSortOrder };
  }

  _formatStreamResponse(s) {
    return {
      id: s.id,
      title: s.title,
      description: s.description,
      thumbnail: s.thumbnailUrl,
      date: new Date(s.scheduledAt).toLocaleDateString(DEFAULT_CONFIG.LOCALE, { year: 'numeric', month: 'short', day: 'numeric' }),
      start: new Date(s.scheduledAt).toLocaleTimeString(DEFAULT_CONFIG.LOCALE, { hour: '2-digit', minute: '2-digit', hour12: false }),
      duration: this._formatDuration(s.durationMinutes),
      platforms: s.targetPlatforms ? s.targetPlatforms.split(SEPARATORS.COMMA).map(p => p.trim()) : [],
      peak: s.peakViewers,
      views: s.totalViews,
      status: s.status.toLowerCase(),
      creator: s.creator?.name || 'Unknown'
    };
  }

  _formatDuration(mins) {
    if (!mins) return '0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }
}

module.exports = new LivestreamService();
