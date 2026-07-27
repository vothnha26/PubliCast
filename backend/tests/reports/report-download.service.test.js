const fs = require('fs');

jest.mock('../../src/repositories/workspace/report.repository', () => ({
  findById: jest.fn(),
  incrementDownloads: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn()
}));

const reportRepository = require('../../src/repositories/workspace/report.repository');
const reportService = require('../../src/services/reports/report.service');

describe('ReportService.getReportFileForDownload', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return file info when the report belongs to the requesting brand', async () => {
    reportRepository.findById.mockResolvedValue({
      id: 'report-1',
      brandId: 'brand-abc',
      format: 'PDF',
      title: 'Monthly Report',
      fileUrl: '/uploads/reports/report_brand-abc_123.pdf'
    });
    fs.existsSync.mockReturnValue(true);

    const result = await reportService.getReportFileForDownload('report-1', 'brand-abc');

    expect(result.contentType).toBe('application/pdf');
    expect(result.title).toBe('Monthly Report');
    expect(result.filePath).toContain('report_brand-abc_123.pdf');
  });

  it('should reject when the report belongs to a different brand', async () => {
    reportRepository.findById.mockResolvedValue({
      id: 'report-1',
      brandId: 'brand-abc',
      format: 'PDF',
      title: 'Monthly Report',
      fileUrl: '/uploads/reports/report_brand-abc_123.pdf'
    });

    await expect(
      reportService.getReportFileForDownload('report-1', 'brand-attacker')
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('should throw 404 when the report does not exist', async () => {
    reportRepository.findById.mockResolvedValue(null);

    await expect(
      reportService.getReportFileForDownload('missing', 'brand-abc')
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('should throw 404 when the physical file no longer exists on disk', async () => {
    reportRepository.findById.mockResolvedValue({
      id: 'report-1',
      brandId: 'brand-abc',
      format: 'PDF',
      title: 'Monthly Report',
      fileUrl: '/uploads/reports/report_brand-abc_123.pdf'
    });
    fs.existsSync.mockReturnValue(false);

    await expect(
      reportService.getReportFileForDownload('report-1', 'brand-abc')
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('should resolve CSV/Excel content type for non-PDF reports', async () => {
    reportRepository.findById.mockResolvedValue({
      id: 'report-2',
      brandId: 'brand-abc',
      format: 'CSV',
      title: 'Weekly Report',
      fileUrl: '/uploads/reports/report_brand-abc_456.xlsx'
    });
    fs.existsSync.mockReturnValue(true);

    const result = await reportService.getReportFileForDownload('report-2', 'brand-abc');

    expect(result.contentType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  });

  // Regression tests for #74: `downloads` was previously hardcoded to 0 in
  // getReportsByBrand regardless of actual usage. A real counter is now
  // bumped on every successful download.
  it('increments the real download counter on a successful download (#74)', async () => {
    reportRepository.findById.mockResolvedValue({
      id: 'report-1',
      brandId: 'brand-abc',
      format: 'PDF',
      title: 'Monthly Report',
      fileUrl: '/uploads/reports/report_brand-abc_123.pdf'
    });
    fs.existsSync.mockReturnValue(true);

    await reportService.getReportFileForDownload('report-1', 'brand-abc');

    expect(reportRepository.incrementDownloads).toHaveBeenCalledWith('report-1');
  });

  it('still resolves the download even if incrementing the counter fails (#74)', async () => {
    reportRepository.findById.mockResolvedValue({
      id: 'report-1',
      brandId: 'brand-abc',
      format: 'PDF',
      title: 'Monthly Report',
      fileUrl: '/uploads/reports/report_brand-abc_123.pdf'
    });
    fs.existsSync.mockReturnValue(true);
    reportRepository.incrementDownloads.mockRejectedValueOnce(new Error('DB write failed'));

    await expect(reportService.getReportFileForDownload('report-1', 'brand-abc')).resolves.toMatchObject({
      title: 'Monthly Report'
    });
  });
});
