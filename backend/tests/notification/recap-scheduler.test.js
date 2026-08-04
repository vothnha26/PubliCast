const recapSchedulerService = require('../../src/services/core/recap-scheduler.service');
const prisma = require('../../src/config/prisma');
const notificationService = require('../../src/services/core/notification.service');

describe('RecapSchedulerService Unit Tests', () => {
  afterEach(() => {
    recapSchedulerService.stop();
    jest.restoreAllMocks();
  });

  test('start() initializes both daily and weekly cron jobs, stop() cleans them up', () => {
    recapSchedulerService.start();
    expect(recapSchedulerService.dailyJob).not.toBeNull();
    expect(recapSchedulerService.weeklyJob).not.toBeNull();

    recapSchedulerService.stop();
    expect(recapSchedulerService.dailyJob).toBeNull();
    expect(recapSchedulerService.weeklyJob).toBeNull();
  });

  test('_scanAndSend("daily") sends a recap for a brand with published posts, gated on notifyDailyRecap', async () => {
    jest.spyOn(prisma.brand, 'findMany').mockResolvedValue([{ id: 'brand-1', name: 'Active Brand' }]);
    jest.spyOn(prisma.post, 'count').mockResolvedValue(3);
    const notifySpy = jest.spyOn(notificationService, 'notifyBrandMembers').mockResolvedValue();

    await recapSchedulerService._scanAndSend('daily');

    expect(notifySpy).toHaveBeenCalledWith(
      'brand-1',
      expect.objectContaining({ title: 'Daily post recap', message: expect.stringContaining('3 posts') }),
      'notifyDailyRecap'
    );
  });

  test('_scanAndSend("weekly") sends a report gated on notifyWeeklyReport', async () => {
    jest.spyOn(prisma.brand, 'findMany').mockResolvedValue([{ id: 'brand-1', name: 'Active Brand' }]);
    jest.spyOn(prisma.post, 'count').mockResolvedValue(1);
    const notifySpy = jest.spyOn(notificationService, 'notifyBrandMembers').mockResolvedValue();

    await recapSchedulerService._scanAndSend('weekly');

    expect(notifySpy).toHaveBeenCalledWith(
      'brand-1',
      expect.objectContaining({ title: 'Weekly report card', message: expect.stringContaining('1 post') }),
      'notifyWeeklyReport'
    );
  });

  test('skips brands with zero published posts in the window (avoids empty recap noise)', async () => {
    jest.spyOn(prisma.brand, 'findMany').mockResolvedValue([{ id: 'brand-1', name: 'Idle Brand' }]);
    jest.spyOn(prisma.post, 'count').mockResolvedValue(0);
    const notifySpy = jest.spyOn(notificationService, 'notifyBrandMembers').mockResolvedValue();

    await recapSchedulerService._scanAndSend('daily');

    expect(notifySpy).not.toHaveBeenCalled();
  });

  test('continues to other brands when one brand fails', async () => {
    jest.spyOn(prisma.brand, 'findMany').mockResolvedValue([
      { id: 'brand-fail', name: 'Fails' },
      { id: 'brand-ok', name: 'OK' }
    ]);
    jest.spyOn(prisma.post, 'count').mockImplementation(({ where }) => {
      if (where.brandId === 'brand-fail') return Promise.reject(new Error('DB error'));
      return Promise.resolve(2);
    });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const notifySpy = jest.spyOn(notificationService, 'notifyBrandMembers').mockResolvedValue();

    await recapSchedulerService._scanAndSend('daily');

    expect(notifySpy).toHaveBeenCalledWith('brand-ok', expect.anything(), 'notifyDailyRecap');
    expect(notifySpy).not.toHaveBeenCalledWith('brand-fail', expect.anything(), expect.anything());
  });
});
