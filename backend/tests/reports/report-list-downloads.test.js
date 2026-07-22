/**
 * Regression test for #74: getReportsByBrand previously hardcoded
 * `downloads: 0` in every mapped report row regardless of actual usage.
 * It must now return the real persisted count.
 */
const fs = require('fs');

jest.mock('../../src/repositories/workspace/report.repository', () => ({
  findManyByBrand: jest.fn()
}));
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn().mockReturnValue(false)
}));

const reportRepository = require('../../src/repositories/workspace/report.repository');
const reportService = require('../../src/services/reports/report.service');

describe('ReportService.getReportsByBrand downloads field (#74)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the real persisted downloads count instead of a hardcoded 0', async () => {
    reportRepository.findManyByBrand.mockResolvedValue([
      {
        id: 'report-1',
        title: 'Monthly Report',
        format: 'PDF',
        includedPlatforms: '["FACEBOOK"]',
        downloads: 7,
        fileUrl: '/uploads/reports/report_1.pdf',
        createdAt: new Date('2026-01-01'),
        generatedAt: new Date('2026-01-02'),
        creator: { name: 'Admin' }
      },
      {
        id: 'report-2',
        title: 'Never Downloaded Report',
        format: 'PDF',
        includedPlatforms: '["INSTAGRAM"]',
        downloads: 0,
        fileUrl: '/uploads/reports/report_2.pdf',
        createdAt: new Date('2026-01-01'),
        generatedAt: new Date('2026-01-02'),
        creator: { name: 'Admin' }
      }
    ]);

    const result = await reportService.getReportsByBrand('brand-abc');

    expect(result[0].downloads).toBe(7);
    expect(result[1].downloads).toBe(0);
  });

  // Regression tests for #76: size was previously computed via a blocking
  // fs.existsSync + fs.statSync call per row inside .map — now read directly
  // from the persisted sizeBytes column, with no filesystem access at all.
  it('formats size from the persisted sizeBytes column without touching the filesystem (#76)', async () => {
    reportRepository.findManyByBrand.mockResolvedValue([
      {
        id: 'report-1', title: 'Report', format: 'PDF', includedPlatforms: '["FACEBOOK"]',
        downloads: 0, sizeBytes: 512 * 1024, fileUrl: '/uploads/reports/report_1.pdf',
        createdAt: new Date('2026-01-01'), generatedAt: new Date('2026-01-02'), creator: { name: 'Admin' }
      }
    ]);

    const result = await reportService.getReportsByBrand('brand-abc');

    expect(result[0].size).toBe('512 KB');
    expect(fs.existsSync).not.toHaveBeenCalled();
  });

  it('shows Unknown when sizeBytes was never persisted (e.g. a report row from before this column existed)', async () => {
    reportRepository.findManyByBrand.mockResolvedValue([
      {
        id: 'report-1', title: 'Report', format: 'PDF', includedPlatforms: '["FACEBOOK"]',
        downloads: 0, sizeBytes: null, fileUrl: '/uploads/reports/report_1.pdf',
        createdAt: new Date('2026-01-01'), generatedAt: new Date('2026-01-02'), creator: { name: 'Admin' }
      }
    ]);

    const result = await reportService.getReportsByBrand('brand-abc');

    expect(result[0].size).toBe('Unknown');
  });
});
