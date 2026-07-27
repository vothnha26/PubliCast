/**
 * Regression tests for #75: report-scheduler.service.js previously scanned
 * uploads/reports/config_<brandId>.json files on disk — lost on ephemeral
 * redeploys, invisible to a second backend instance, and non-atomic to
 * write. It must now scan ReportScheduleConfig rows via the repository.
 */
const mockRedis = {
  set: jest.fn(),
  eval: jest.fn()
};
jest.mock('../../src/config/redis', () => mockRedis);

const reportSchedulerService = require('../../src/services/reports/report-scheduler.service');
const reportService = require('../../src/services/reports/report.service');
const reportRepository = require('../../src/repositories/workspace/report.repository');

jest.mock('../../src/services/reports/report.service');
jest.mock('../../src/repositories/workspace/report.repository', () => ({
  findAllEnabledScheduleConfigs: jest.fn()
}));

function configRow(overrides = {}) {
  return {
    brandId: 'test-brand-id',
    brand: { id: 'test-brand-id', name: 'Test Brand' },
    emailsList: JSON.stringify(['recipient@example.com']),
    emailText: 'Test Report Message',
    dayOfMonth: String(new Date().getDate()),
    format: 'PDF',
    platforms: JSON.stringify(['Facebook']),
    ...overrides
  };
}

describe('ReportSchedulerService Tests (#75 — DB-backed)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should trigger email delivery if scheduled day matches current day', async () => {
    reportRepository.findAllEnabledScheduleConfigs.mockResolvedValue([configRow()]);
    reportService.sendReportImmediately.mockResolvedValue(true);

    await reportSchedulerService.scanAndSendReports();

    expect(reportService.sendReportImmediately).toHaveBeenCalledWith(
      'test-brand-id',
      null,
      expect.objectContaining({
        format: 'PDF',
        dateRange: 'Tháng trước',
        platforms: ['Facebook'],
        emails: ['recipient@example.com'],
        message: 'Test Report Message'
      })
    );
  });

  it('should NOT trigger email delivery if scheduled day does not match current day', async () => {
    const today = new Date();
    const differentDay = today.getDate() === 5 ? 6 : 5;
    reportRepository.findAllEnabledScheduleConfigs.mockResolvedValue([
      configRow({ dayOfMonth: String(differentDay), format: 'CSV', platforms: JSON.stringify(['YouTube']) })
    ]);

    await reportSchedulerService.scanAndSendReports();

    expect(reportService.sendReportImmediately).not.toHaveBeenCalled();
  });

  it('should NOT trigger email delivery if there are no email recipients', async () => {
    reportRepository.findAllEnabledScheduleConfigs.mockResolvedValue([
      configRow({ emailsList: JSON.stringify([]) })
    ]);

    await reportSchedulerService.scanAndSendReports();

    expect(reportService.sendReportImmediately).not.toHaveBeenCalled();
  });

  it('does not call findAllEnabledScheduleConfigs\'s where:receiveEmail:true filter twice — trusts the repository to have already filtered', async () => {
    // receiveEmail:false rows are excluded by the repository's own where
    // clause (see report.repository.js#findAllEnabledScheduleConfigs) — the
    // scheduler itself no longer re-checks a `receiveEmail` flag.
    reportRepository.findAllEnabledScheduleConfigs.mockResolvedValue([]);

    await reportSchedulerService.scanAndSendReports();

    expect(reportRepository.findAllEnabledScheduleConfigs).toHaveBeenCalledTimes(1);
    expect(reportService.sendReportImmediately).not.toHaveBeenCalled();
  });

  it('continues processing remaining configs when one row is malformed', async () => {
    reportRepository.findAllEnabledScheduleConfigs.mockResolvedValue([
      configRow({ brandId: 'brand-bad', emailsList: 'not valid json{{' }),
      configRow({ brandId: 'brand-good' })
    ]);
    reportService.sendReportImmediately.mockResolvedValue(true);

    await reportSchedulerService.scanAndSendReports();

    // brand-bad's corrupt emailsList parses to [] (safeJsonParseArray), so
    // it's skipped for having no recipients — brand-good still sends.
    expect(reportService.sendReportImmediately).toHaveBeenCalledTimes(1);
    expect(reportService.sendReportImmediately).toHaveBeenCalledWith('brand-good', null, expect.any(Object));
  });

  describe('runScanWithLock', () => {
    it('should run the scan when the lock is acquired, then release it', async () => {
      mockRedis.set.mockResolvedValue('OK'); // acquireLock succeeds
      mockRedis.eval.mockResolvedValue(1); // releaseLock succeeds
      reportRepository.findAllEnabledScheduleConfigs.mockResolvedValue([configRow()]);
      reportService.sendReportImmediately.mockResolvedValue(true);

      await reportSchedulerService.runScanWithLock();

      expect(mockRedis.set).toHaveBeenCalledWith(
        'lock:report-scheduler:daily-scan',
        expect.any(String),
        expect.objectContaining({ NX: true })
      );
      expect(reportService.sendReportImmediately).toHaveBeenCalled();
      expect(mockRedis.eval).toHaveBeenCalled(); // lock released
    });

    it('should skip the scan entirely when another instance already holds the lock', async () => {
      mockRedis.set.mockResolvedValue(null); // acquireLock fails — already locked
      reportRepository.findAllEnabledScheduleConfigs.mockResolvedValue([configRow()]);

      await reportSchedulerService.runScanWithLock();

      expect(reportService.sendReportImmediately).not.toHaveBeenCalled();
      expect(mockRedis.eval).not.toHaveBeenCalled(); // never acquired, nothing to release
    });
  });
});
