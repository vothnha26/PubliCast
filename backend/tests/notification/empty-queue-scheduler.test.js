const emptyQueueSchedulerService = require('../../src/services/core/empty-queue-scheduler.service');
const prisma = require('../../src/config/prisma');
const notificationService = require('../../src/services/core/notification.service');

describe('EmptyQueueSchedulerService Unit Tests', () => {
  afterEach(() => {
    emptyQueueSchedulerService.stop();
    jest.restoreAllMocks();
  });

  test('start() initializes cron job and stop() cleans it up', () => {
    emptyQueueSchedulerService.start();
    expect(emptyQueueSchedulerService.job).not.toBeNull();

    emptyQueueSchedulerService.stop();
    expect(emptyQueueSchedulerService.job).toBeNull();
  });

  test('scanAndNotify() alerts a brand with zero scheduled posts', async () => {
    jest.spyOn(prisma.brand, 'findMany').mockResolvedValue([
      { id: 'brand-1', name: 'Empty Brand' }
    ]);
    jest.spyOn(prisma.post, 'count').mockResolvedValue(0);
    jest.spyOn(prisma.systemNotification, 'findFirst').mockResolvedValue(null);
    const notifySpy = jest.spyOn(notificationService, 'notifyBrandMembers').mockResolvedValue();

    await emptyQueueSchedulerService.scanAndNotify();

    expect(notifySpy).toHaveBeenCalledWith(
      'brand-1',
      expect.objectContaining({ title: 'Empty content queue' }),
      'notifyEmptyQueue'
    );
  });

  test('scanAndNotify() does not alert a brand that has scheduled posts', async () => {
    jest.spyOn(prisma.brand, 'findMany').mockResolvedValue([
      { id: 'brand-2', name: 'Busy Brand' }
    ]);
    jest.spyOn(prisma.post, 'count').mockResolvedValue(3);
    const notifySpy = jest.spyOn(notificationService, 'notifyBrandMembers').mockResolvedValue();

    await emptyQueueSchedulerService.scanAndNotify();

    expect(notifySpy).not.toHaveBeenCalled();
  });

  test('scanAndNotify() does not re-alert within the 7-day re-alert window', async () => {
    jest.spyOn(prisma.brand, 'findMany').mockResolvedValue([
      { id: 'brand-3', name: 'Recently Alerted Brand' }
    ]);
    jest.spyOn(prisma.post, 'count').mockResolvedValue(0);
    jest.spyOn(prisma.systemNotification, 'findFirst').mockResolvedValue({ id: 'existing-alert' });
    const notifySpy = jest.spyOn(notificationService, 'notifyBrandMembers').mockResolvedValue();

    await emptyQueueSchedulerService.scanAndNotify();

    expect(notifySpy).not.toHaveBeenCalled();
  });

  test('scanAndNotify() continues checking other brands when one brand check throws', async () => {
    jest.spyOn(prisma.brand, 'findMany').mockResolvedValue([
      { id: 'brand-fail', name: 'Fails' },
      { id: 'brand-ok', name: 'OK' }
    ]);
    jest.spyOn(prisma.post, 'count').mockImplementation(({ where }) => {
      if (where.brandId === 'brand-fail') return Promise.reject(new Error('DB error'));
      return Promise.resolve(0);
    });
    jest.spyOn(prisma.systemNotification, 'findFirst').mockResolvedValue(null);
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const notifySpy = jest.spyOn(notificationService, 'notifyBrandMembers').mockResolvedValue();

    await emptyQueueSchedulerService.scanAndNotify();

    expect(notifySpy).toHaveBeenCalledWith('brand-ok', expect.anything(), 'notifyEmptyQueue');
    expect(notifySpy).not.toHaveBeenCalledWith('brand-fail', expect.anything(), expect.anything());
  });
});
