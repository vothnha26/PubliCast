/**
 * Regression tests for #75: report schedule config was previously stored as
 * uploads/reports/config_<brandId>.json — lost on ephemeral/container
 * redeploys, invisible to a second backend instance, and written
 * non-atomically (a crash mid fs.writeFileSync left an unparseable file the
 * daily scan silently skipped). It must now be a DB row.
 */
jest.mock('../../src/repositories/workspace/report.repository', () => ({
  findScheduleConfigByBrand: jest.fn(),
  upsertScheduleConfig: jest.fn()
}));
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn()
}));

const fs = require('fs');
const reportRepository = require('../../src/repositories/workspace/report.repository');
const reportService = require('../../src/services/reports/report.service');

describe('ReportService schedule config — DB-backed (#75)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getScheduleConfig', () => {
    it('returns defaults without touching the filesystem when no row exists yet', async () => {
      reportRepository.findScheduleConfigByBrand.mockResolvedValue(null);

      const config = await reportService.getScheduleConfig('brand-1');

      expect(config.receiveEmail).toBe(false);
      expect(config.emailsList).toEqual([]);
      expect(fs.existsSync).not.toHaveBeenCalled();
      expect(fs.readFileSync).not.toHaveBeenCalled();
    });

    it('returns the parsed DB row when one exists', async () => {
      reportRepository.findScheduleConfigByBrand.mockResolvedValue({
        receiveEmail: true,
        emailsList: JSON.stringify(['a@example.com', 'b@example.com']),
        emailText: 'Custom message',
        dayOfMonth: '15',
        format: 'PDF',
        platforms: JSON.stringify(['Facebook'])
      });

      const config = await reportService.getScheduleConfig('brand-1');

      expect(config.receiveEmail).toBe(true);
      expect(config.emailsList).toEqual(['a@example.com', 'b@example.com']);
      expect(config.dayOfMonth).toBe('15');
      expect(config.platforms).toEqual(['Facebook']);
    });

    it('degrades to an empty array instead of throwing when a JSON column is corrupt', async () => {
      reportRepository.findScheduleConfigByBrand.mockResolvedValue({
        receiveEmail: true,
        emailsList: 'not valid json{{',
        emailText: 'Custom message',
        dayOfMonth: '1',
        format: 'PDF',
        platforms: 'also not valid json'
      });

      const config = await reportService.getScheduleConfig('brand-1');

      expect(config.emailsList).toEqual([]);
      expect(config.platforms).toEqual([]);
    });
  });

  describe('saveScheduleConfig', () => {
    it('upserts via the repository instead of writing a file', async () => {
      reportRepository.upsertScheduleConfig.mockResolvedValue({});

      await reportService.saveScheduleConfig('brand-1', {
        receiveEmail: true,
        emailsList: ['a@example.com'],
        emailText: 'Hi',
        dayOfMonth: 5,
        format: 'PDF',
        platforms: ['Facebook', 'YouTube']
      });

      expect(reportRepository.upsertScheduleConfig).toHaveBeenCalledWith('brand-1', {
        receiveEmail: true,
        emailsList: JSON.stringify(['a@example.com']),
        emailText: 'Hi',
        dayOfMonth: '5',
        format: 'PDF',
        platforms: JSON.stringify(['Facebook', 'YouTube'])
      });
      expect(fs.writeFileSync).not.toHaveBeenCalled();
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });
});
