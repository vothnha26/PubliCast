const fs = require('fs');
const path = require('path');
const reportSchedulerService = require('../../src/services/reports/report-scheduler.service');
const reportService = require('../../src/services/reports/report.service');
const prisma = require('../../src/config/prisma');

jest.mock('../../src/services/reports/report.service');
jest.mock('../../src/config/prisma', () => ({
  brand: {
    findUnique: jest.fn()
  }
}));

describe('ReportSchedulerService Tests', () => {
  const reportsDir = path.join(__dirname, '../../uploads/reports');
  const tempConfigFile = path.join(reportsDir, 'config_test-brand-id.json');

  beforeAll(() => {
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempConfigFile)) {
      fs.unlinkSync(tempConfigFile);
    }
    jest.clearAllMocks();
  });

  it('should trigger email delivery if scheduled day matches current day', async () => {
    // 1. Create a config file scheduled for today
    const today = new Date();
    const currentDay = today.getDate();

    const mockConfig = {
      receiveEmail: true,
      emailsList: ['recipient@example.com'],
      emailText: 'Test Report Message',
      dayOfMonth: currentDay,
      format: 'PDF',
      platforms: ['Facebook']
    };

    fs.writeFileSync(tempConfigFile, JSON.stringify(mockConfig, null, 2), 'utf8');

    prisma.brand.findUnique.mockResolvedValue({ id: 'test-brand-id', name: 'Test Brand' });
    reportService.sendReportImmediately.mockResolvedValue(true);

    // 2. Execute scan
    await reportSchedulerService.scanAndSendReports();

    // 3. Verify sendReportImmediately was triggered with correct arguments
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
    // Set scheduled day to a different day
    const differentDay = today.getDate() === 5 ? 6 : 5;

    const mockConfig = {
      receiveEmail: true,
      emailsList: ['recipient@example.com'],
      emailText: 'Test Report Message',
      dayOfMonth: differentDay,
      format: 'Excel',
      platforms: ['YouTube']
    };

    fs.writeFileSync(tempConfigFile, JSON.stringify(mockConfig, null, 2), 'utf8');

    // Execute scan
    await reportSchedulerService.scanAndSendReports();

    // Verify sendReportImmediately was NOT triggered
    expect(reportService.sendReportImmediately).not.toHaveBeenCalled();
  });

  it('should NOT trigger email delivery if receiveEmail is false', async () => {
    const today = new Date();
    const currentDay = today.getDate();

    const mockConfig = {
      receiveEmail: false,
      emailsList: ['recipient@example.com'],
      emailText: 'Test Report Message',
      dayOfMonth: currentDay,
      format: 'PDF',
      platforms: ['Facebook']
    };

    fs.writeFileSync(tempConfigFile, JSON.stringify(mockConfig, null, 2), 'utf8');

    // Execute scan
    await reportSchedulerService.scanAndSendReports();

    // Verify sendReportImmediately was NOT triggered
    expect(reportService.sendReportImmediately).not.toHaveBeenCalled();
  });
});
