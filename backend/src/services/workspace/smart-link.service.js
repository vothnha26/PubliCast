const smartLinkRepository = require('../../repositories/workspace/smart-link.repository');
const linkItemRepository = require('../../repositories/workspace/link-item.repository');
const backgroundValidatorFactory = require('./smart-link/background-validators/background-validator.factory');
const linkProcessorFactory = require('./smart-link/link-processors/link-processor.factory');

class SmartLinkService {
  async getSmartLinkByBrand(brandId) {
    if (!brandId) {
      const error = new Error('Brand ID is required');
      error.statusCode = 400;
      throw error;
    }
    return await smartLinkRepository.findByBrandId(brandId);
  }

  async getPublicSmartLinkBySlug(slug) {
    if (!slug) {
      const error = new Error('Slug is required');
      error.statusCode = 400;
      throw error;
    }
    const smartLink = await smartLinkRepository.findBySlug(slug);
    if (!smartLink || !smartLink.isPublished) {
      const error = new Error('SmartLink not found or is not published');
      error.statusCode = 404;
      throw error;
    }
    return smartLink;
  }

  async updateSmartLink(id, brandId, data) {
    if (!id || !brandId) {
      const error = new Error('ID and Brand ID are required');
      error.statusCode = 400;
      throw error;
    }

    // Check ownership
    const existing = await smartLinkRepository.findById(id);
    if (!existing) {
      const error = new Error('SmartLink not found');
      error.statusCode = 404;
      throw error;
    }
    if (existing.brandId !== brandId) {
      const error = new Error('Unauthorized brand access');
      error.statusCode = 403;
      throw error;
    }

    // Validate slug uniqueness if updating slug
    if (data.slug && data.slug !== existing.slug) {
      const slugTaken = await smartLinkRepository.findBySlug(data.slug);
      if (slugTaken && slugTaken.id !== id) {
        const error = new Error('Slug is already in use');
        error.statusCode = 400;
        throw error;
      }
    }

    // 1. Validate background using Strategy Pattern
    if (data.backgroundType && data.backgroundValue) {
      const validator = backgroundValidatorFactory.getValidator(data.backgroundType);
      const isValid = validator.validate(data.backgroundValue);
      if (!isValid) {
        const error = new Error(`Invalid background value: "${data.backgroundValue}" for type ${data.backgroundType}`);
        error.statusCode = 400;
        throw error;
      }
    }

    // 2. Process links using Link Processor Strategy Pattern
    if (data.links && Array.isArray(data.links)) {
      data.links = data.links.map(link => {
        const processor = linkProcessorFactory.getProcessor(link.url);
        return processor.process(link);
      });
    }

    return await smartLinkRepository.update(id, data);
  }

  async createSmartLink(brandId, data) {
    if (!brandId) {
      const error = new Error('Brand ID is required');
      error.statusCode = 400;
      throw error;
    }

    // Validate slug uniqueness
    if (data.slug) {
      const existingSlug = await smartLinkRepository.findBySlug(data.slug);
      if (existingSlug) {
        const error = new Error('Slug is already in use');
        error.statusCode = 400;
        throw error;
      }
    }

    // 1. Validate background using Strategy Pattern
    if (data.backgroundType && data.backgroundValue) {
      const validator = backgroundValidatorFactory.getValidator(data.backgroundType);
      const isValid = validator.validate(data.backgroundValue);
      if (!isValid) {
        const error = new Error(`Invalid background value: "${data.backgroundValue}" for type ${data.backgroundType}`);
        error.statusCode = 400;
        throw error;
      }
    }

    // 2. Process links using Link Processor Strategy Pattern
    if (data.links && Array.isArray(data.links)) {
      data.links = data.links.map(link => {
        const processor = linkProcessorFactory.getProcessor(link.url);
        return processor.process(link);
      });
    }

    return await smartLinkRepository.create({
      ...data,
      brandId
    });
  }

  async getAnalytics(id, brandId, range = {}) {
    if (!id || !brandId) {
      const error = new Error('ID and Brand ID are required');
      error.statusCode = 400;
      throw error;
    }

    const smartLink = await smartLinkRepository.findById(id);
    if (!smartLink) {
      const error = new Error('SmartLink not found');
      error.statusCode = 404;
      throw error;
    }
    if (smartLink.brandId !== brandId) {
      const error = new Error('Unauthorized brand access');
      error.statusCode = 403;
      throw error;
    }

    const { startDate, endDate } = this._resolveDateRange(range);
    const [pageMetrics, clickMetrics] = await Promise.all([
      smartLinkRepository.findDailyMetrics(id, startDate, endDate),
      linkItemRepository.findDailyMetricsBySmartLink(id, startDate, endDate)
    ]);

    const dayMap = this._buildDayMap(startDate, endDate);

    pageMetrics.forEach(metric => {
      const key = this._dateKey(metric.date);
      if (!dayMap.has(key)) return;
      const day = dayMap.get(key);
      day.visits += metric.pageViews || 0;
      day.uniqueVisitors += metric.uniqueVisitors || 0;
    });

    clickMetrics.forEach(metric => {
      const key = this._dateKey(metric.date);
      if (!dayMap.has(key)) return;
      dayMap.get(key).clicks += metric.clicks || 0;
    });

    const timeline = Array.from(dayMap.values());
    const visits = timeline.reduce((sum, day) => sum + day.visits, 0);
    const uniqueVisitors = timeline.reduce((sum, day) => sum + day.uniqueVisitors, 0);
    const buttonClicks = timeline.reduce((sum, day) => sum + day.clicks, 0);
    const ctr = visits > 0 ? Number(((buttonClicks / visits) * 100).toFixed(1)) : 0;

    const links = smartLink.links.map(link => {
      const linkClickMetrics = clickMetrics.filter(m => m.linkItemId === link.id);
      const linkDayMap = new Map();
      const current = new Date(startDate);
      while (current <= endDate) {
        const key = current.toISOString().slice(0, 10);
        linkDayMap.set(key, {
          date: key,
          name: current.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
          clicks: 0
        });
        current.setUTCDate(current.getUTCDate() + 1);
      }
      
      linkClickMetrics.forEach(metric => {
        const key = metric.date.toISOString().slice(0, 10);
        if (linkDayMap.has(key)) {
          linkDayMap.get(key).clicks += metric.clicks || 0;
        }
      });
      
      const linkTimeline = Array.from(linkDayMap.values());
      const totalLinkClicks = linkTimeline.reduce((sum, day) => sum + day.clicks, 0);

      return {
        id: link.id,
        title: link.title,
        url: link.url,
        emoji: link.emoji,
        isActive: link.isActive,
        clicks: totalLinkClicks,
        ctr: buttonClicks > 0 ? Number(((totalLinkClicks / buttonClicks) * 100).toFixed(1)) : 0,
        timeline: linkTimeline,
        linkStyle: link.linkStyle,
        iconUrl: link.iconUrl
      };
    });

    return {
      summary: {
        visits,
        uniqueVisitors,
        buttonClicks,
        imageClicks: 0,
        ctr
      },
      timeline,
      links
    };
  }

  _resolveDateRange(range = {}) {
    let end;
    if (range.to) {
      end = new Date(range.to);
    } else {
      end = new Date();
      end.setUTCHours(0, 0, 0, 0);
    }

    let start;
    if (range.from) {
      start = new Date(range.from);
    } else {
      start = new Date(end);
      start.setUTCDate(start.getUTCDate() - 29);
    }
    start.setUTCHours(0, 0, 0, 0);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      const error = new Error('Invalid date range');
      error.statusCode = 400;
      throw error;
    }

    return { startDate: start, endDate: end };
  }

  _buildDayMap(startDate, endDate) {
    const map = new Map();
    const current = new Date(startDate);
    while (current <= endDate) {
      const key = this._dateKey(current);
      map.set(key, {
        date: key,
        name: current.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
        visits: 0,
        uniqueVisitors: 0,
        clicks: 0
      });
      current.setUTCDate(current.getUTCDate() + 1);
    }
    return map;
  }

  _dateKey(date) {
    const normalized = new Date(date);
    return normalized.toISOString().slice(0, 10);
  }
}

module.exports = new SmartLinkService();
