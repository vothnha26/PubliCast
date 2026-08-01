const fs = require('fs');
const path = require('path');
const reportRepository = require('../../repositories/workspace/report.repository');
const analyticsFacade = require('./analytics.facade');
const reportStrategyFactory = require('./strategies/report-strategy.factory');
const prisma = require('../../config/prisma');
const { REPORT_FORMATS, REPORT_FREQUENCIES } = require('../../utils/constants');

class ReportService {
  /**
   * Helper to parse date range strings from UI to Date objects
   * @param {string} dateRangeStr 
   * @returns {{dateFrom: Date, dateTo: Date}}
   */
  parseDateRange(dateRangeStr) {
    // Check if it is a custom date range: "YYYY-MM-DD - YYYY-MM-DD" or "DD/MM/YYYY - DD/MM/YYYY"
    if (dateRangeStr && dateRangeStr.includes(' - ')) {
      const parts = dateRangeStr.split(' - ');
      if (parts.length === 2) {
        let from, to;
        if (parts[0].includes('/')) {
          // DD/MM/YYYY
          const [d1, m1, y1] = parts[0].split('/');
          const [d2, m2, y2] = parts[1].split('/');
          from = new Date(y1, m1 - 1, d1);
          to = new Date(y2, m2 - 1, d2);
        } else {
          // YYYY-MM-DD
          from = new Date(parts[0]);
          to = new Date(parts[1]);
        }

        if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
          from.setHours(0, 0, 0, 0);
          to.setHours(23, 59, 59, 999);
          return { dateFrom: from, dateTo: to };
        }
      }
    }

    const dateTo = new Date();
    let dateFrom = new Date();

    switch (dateRangeStr) {
      case 'Tháng này':
        dateFrom.setDate(1);
        dateFrom.setHours(0, 0, 0, 0);
        break;
      case 'Tháng trước':
        dateFrom.setMonth(dateFrom.getMonth() - 1);
        dateFrom.setDate(1);
        dateFrom.setHours(0, 0, 0, 0);
        
        dateTo.setDate(0); // Last day of previous month
        dateTo.setHours(23, 59, 59, 999);
        break;
      case '7 ngày qua':
        dateFrom.setDate(dateTo.getDate() - 7);
        dateFrom.setHours(0, 0, 0, 0);
        break;
      case '30 ngày qua':
      default:
        dateFrom.setDate(dateTo.getDate() - 30);
        dateFrom.setHours(0, 0, 0, 0);
        break;
    }

    return { dateFrom, dateTo };
  }

  /**
   * Generate an instant custom report
   * @param {string} brandId 
   * @param {string} userId 
   * @param {Object} payload 
   */
  async generateInstantReport(brandId, userId, payload) {
    const { title, format, dateRange, platforms, isWhiteLabel, brandLogoUrl, brandColorHex, includedSections, selectedWidgets } = payload;

    // 1. Fetch Brand Info
    const brand = await prisma.brand.findUnique({
      where: { id: brandId }
    });

    if (!brand) {
      throw new Error('Thương hiệu không tồn tại.');
    }

    // 2. Parse date range
    const { dateFrom, dateTo } = this.parseDateRange(dateRange);

    // 3. Get aggregated analytics data via Facade
    const aggregatedData = await analyticsFacade.getAggregatedData(
      brandId, 
      dateFrom, 
      dateTo, 
      platforms
    );

    // 4. Get generator strategy via Factory
    const strategy = reportStrategyFactory.getStrategy(format);

    const sections = Array.isArray(includedSections) && includedSections.length > 0
      ? includedSections
      : ['Overview', 'Channels', 'TopPosts'];

    // 5. Generate file buffer
    const { buffer, contentType, extension } = await strategy.generate(
      title,
      brand,
      aggregatedData,
      {
        isWhiteLabel,
        brandLogoUrl,
        brandColorHex,
        includedSections: sections,
        selectedWidgets: selectedWidgets || null
      }
    );

    // 6. Ensure upload directory exists and save file
    const reportsDir = path.join(__dirname, '../../../uploads/reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const fileName = `report_${brandId}_${Date.now()}.${extension}`;
    const filePath = path.join(reportsDir, fileName);
    fs.writeFileSync(filePath, buffer);

    // 7. Save Report Record to Database
    const dbFormat = format === 'Excel' ? REPORT_FORMATS.CSV : format;

    const reportRecord = await reportRepository.create({
      brandId,
      createdByUserId: userId,
      title,
      description: `Báo cáo phân tích dữ liệu khoảng thời gian: ${dateRange}.`,
      dateFrom,
      dateTo,
      includedPlatforms: JSON.stringify(platforms),
      includedSections: JSON.stringify(selectedWidgets || sections),
      isWhiteLabel: !!isWhiteLabel,
      brandLogoUrl: brandLogoUrl || null,
      brandColorHex: brandColorHex || null,
      format: dbFormat,
      fileUrl: `/uploads/reports/${fileName}`,
      // Persisted at generation time (buffer.length is already known here)
      // so getReportsByBrand never needs a blocking fs.statSync per row (#76).
      sizeBytes: buffer.length,
      generatedAt: new Date()
    });

    return {
      ...reportRecord,
      size: this._formatSize(buffer.length)
    };
  }

  _formatSize(bytes) {
    if (bytes == null) return 'Unknown';
    const sizeInKb = Math.round(bytes / 1024);
    return sizeInKb > 1000 ? `${(sizeInKb / 1024).toFixed(1)} MB` : `${sizeInKb} KB`;
  }

  /**
   * Fetch all reports for a brand
   * @param {string} brandId 
   */
  async getReportsByBrand(brandId) {
    const reports = await reportRepository.findManyByBrand(brandId);

    // Size now read from the sizeBytes column (persisted at generation time
    // — see generateInstantReport) instead of a blocking fs.existsSync +
    // fs.statSync per row, which serialized the event loop behind disk I/O
    // on every list request (#76). Reports created before this column
    // existed simply show 'Unknown', same as any other unset field.
    return reports.map(r => {
      const sizeStr = this._formatSize(r.sizeBytes);

      let platforms = [];
      try {
        platforms = JSON.parse(r.includedPlatforms);
      } catch (e) {
        platforms = [r.includedPlatforms];
      }

      return {
        id: r.id,
        title: r.title,
        type: r.format === REPORT_FORMATS.CSV ? 'Excel' : r.format, // Match frontend type
        size: sizeStr,
        date: r.generatedAt ? new Date(r.generatedAt).toLocaleDateString('vi-VN') : new Date(r.createdAt).toLocaleDateString('vi-VN'),
        creator: r.creator?.name || 'Hệ thống',
        downloads: r.downloads || 0,
        platforms,
        fileUrl: r.fileUrl
      };
    });
  }

  /**
   * Resolve the physical file path + content type for a report download,
   * enforcing brand ownership first. Report files live under uploads/reports
   * (served publicly by express.static), so this check is the only thing
   * standing between "brand owns this report" and anyone with the URL.
   * @param {string} id
   * @param {string} brandId
   */
  async getReportFileForDownload(id, brandId) {
    const report = await reportRepository.findById(id);
    if (!report) {
      const error = new Error('Báo cáo không tồn tại.');
      error.statusCode = 404;
      throw error;
    }

    if (report.brandId !== brandId) {
      const error = new Error('Bạn không có quyền tải báo cáo này.');
      error.statusCode = 403;
      throw error;
    }

    if (!report.fileUrl) {
      const error = new Error('Báo cáo không có tệp đính kèm.');
      error.statusCode = 404;
      throw error;
    }

    const reportsDir = path.join(__dirname, '../../../uploads/reports');
    const fileName = path.basename(report.fileUrl);
    const filePath = path.join(reportsDir, fileName);

    if (!fs.existsSync(filePath)) {
      const error = new Error('Tệp báo cáo không còn tồn tại trên máy chủ.');
      error.statusCode = 404;
      throw error;
    }

    const contentType = report.format === REPORT_FORMATS.CSV
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/pdf';

    // Fire-and-forget: a failed counter increment must never block the
    // actual download the user is waiting on.
    reportRepository.incrementDownloads(id).catch(err => {
      console.error(`[ReportService] Failed to increment download count for report ${id}:`, err.message);
    });

    return { filePath, fileName, contentType, title: report.title };
  }

  /**
   * Delete a report
   * @param {string} id
   * @param {string} brandId
   */
  async deleteReport(id, brandId) {
    const report = await reportRepository.findById(id);
    if (!report) {
      throw new Error('Báo cáo không tồn tại.');
    }

    if (report.brandId !== brandId) {
      throw new Error('Bạn không có quyền xóa báo cáo này.');
    }

    // Delete physical file
    if (report.fileUrl) {
      const reportsDir = path.join(__dirname, '../../../uploads/reports');
      const fileName = path.basename(report.fileUrl);
      const filePath = path.join(reportsDir, fileName);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.error(`[ReportService] Error deleting physical file ${filePath}:`, e);
        }
      }
    }

    // Delete record from DB
    await reportRepository.delete(id);
    return true;
  }

  /**
   * Fetch live preview analytics data
   * @param {string} brandId
   * @param {string} dateRange
   * @param {string[]} platforms
   */
  async getPreviewData(brandId, dateRange, platforms, socialAccountId) {
    const { dateFrom, dateTo } = this.parseDateRange(dateRange);
    return await analyticsFacade.getAggregatedData(brandId, dateFrom, dateTo, platforms, socialAccountId);
  }

  /**
   * Generate and send report via email immediately
   */
  async sendReportImmediately(brandId, userId, payload) {
    const { title, format, dateRange, platforms, isWhiteLabel, brandLogoUrl, brandColorHex, includedSections, selectedWidgets, emails, message } = payload;

    // 1. Fetch Brand Info
    const brand = await prisma.brand.findUnique({
      where: { id: brandId }
    });

    if (!brand) {
      throw new Error('Thương hiệu không tồn tại.');
    }

    // 2. Parse date range
    const { dateFrom, dateTo } = this.parseDateRange(dateRange);

    // 3. Get aggregated analytics data via Facade
    const aggregatedData = await analyticsFacade.getAggregatedData(
      brandId, 
      dateFrom, 
      dateTo, 
      platforms
    );

    // 4. Get generator strategy via Factory
    const strategy = reportStrategyFactory.getStrategy(format);

    const sections = Array.isArray(includedSections) && includedSections.length > 0
      ? includedSections
      : ['Overview', 'Channels', 'TopPosts'];

    // 5. Generate file buffer
    const { buffer, contentType, extension } = await strategy.generate(
      title,
      brand,
      aggregatedData,
      {
        isWhiteLabel,
        brandLogoUrl,
        brandColorHex,
        includedSections: sections,
        selectedWidgets: selectedWidgets || null
      }
    );

    const fileName = `report_${brandId}_${Date.now()}.${extension}`;

    // 6. Send via email service
    const emailService = require('../core/email.service');
    const subject = `[PubliCast Báo cáo] ${title}`;
    const textContent = message || `Xin chào,\n\nĐây là báo cáo phân tích định kỳ từ PubliCast cho thương hiệu ${brand.name}.\n\nTrân trọng.`;

    await emailService.sendReport(
      emails,
      subject,
      textContent,
      buffer,
      fileName,
      contentType
    );

    return true;
  }

  /**
   * Get scheduled report configuration for a brand.
   * Previously read/wrote uploads/reports/config_<brandId>.json — lost on
   * ephemeral/container redeploys, invisible to a second backend instance,
   * and written non-atomically (a crash mid fs.writeFileSync left an
   * unparseable file the daily scan silently skipped). Now a DB row (#75).
   */
  async getScheduleConfig(brandId) {
    const defaults = {
      receiveEmail: false,
      emailsList: [],
      emailText: 'Monthly report for you.',
      dayOfMonth: 1,
      format: 'PDF',
      platforms: ['Facebook', 'YouTube']
    };

    const row = await reportRepository.findScheduleConfigByBrand(brandId);
    if (!row) return defaults;

    return {
      receiveEmail: row.receiveEmail,
      emailsList: this._safeJsonParseArray(row.emailsList),
      emailText: row.emailText,
      dayOfMonth: row.dayOfMonth,
      format: row.format,
      platforms: this._safeJsonParseArray(row.platforms)
    };
  }

  /**
   * Save scheduled report configuration for a brand — a single atomic
   * upsert instead of a read-then-write file (#75).
   */
  async saveScheduleConfig(brandId, configData) {
    await reportRepository.upsertScheduleConfig(brandId, {
      receiveEmail: !!configData.receiveEmail,
      emailsList: JSON.stringify(configData.emailsList || []),
      emailText: configData.emailText || 'Monthly report for you.',
      dayOfMonth: String(configData.dayOfMonth ?? 1),
      format: configData.format || 'PDF',
      platforms: JSON.stringify(configData.platforms || ['Facebook', 'YouTube'])
    });
    return true;
  }

  _safeJsonParseArray(str) {
    try {
      const parsed = JSON.parse(str);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
}

const reportService = new ReportService();
module.exports = reportService;
