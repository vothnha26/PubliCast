const notificationService = require('../../src/services/core/notification.service');
const notificationRepository = require('../../src/repositories/core/notification.repository');
const brandRepository = require('../../src/repositories/workspace/brand.repository');
const userRepository = require('../../src/repositories/auth/user.repository');
const authorizationFacade = require('../../src/services/auth/authorization.facade');

jest.mock('../../src/repositories/core/notification.repository', () => ({
  create: jest.fn(),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
  findManyAndCount: jest.fn(),
  count: jest.fn()
}));

jest.mock('../../src/repositories/workspace/brand.repository', () => ({
  userCanAccessBrand: jest.fn()
}));

jest.mock('../../src/repositories/auth/user.repository', () => ({
  findCreatedAt: jest.fn()
}));

jest.mock('../../src/services/auth/authorization.facade', () => ({
  checkBrandAccess: jest.fn()
}));

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no lower bound on global notifications, matching this suite's
    // pre-existing expectations of a bare { isGlobal: true } condition.
    userRepository.findCreatedAt.mockResolvedValue(null);
  });

  describe('markAsRead', () => {
    it('scopes update by notification id and authenticated user', async () => {
      notificationRepository.markAsRead.mockResolvedValue({ count: 1 });

      await notificationService.markAsRead('notif-1', 'user-1', null, 'USER');

      expect(notificationRepository.markAsRead).toHaveBeenCalledWith({
        id: 'notif-1',
        OR: [
          { userId: 'user-1' },
          { isGlobal: true }
        ]
      }, 'user-1');
    });

    it('checks brand access before marking brand notifications as read', async () => {
      brandRepository.userCanAccessBrand.mockResolvedValue(true);
      notificationRepository.markAsRead.mockResolvedValue({ count: 1 });

      await notificationService.markAsRead('notif-1', 'user-1', 'brand-1', 'USER');

      expect(brandRepository.userCanAccessBrand).toHaveBeenCalledWith('user-1', 'brand-1');
      expect(notificationRepository.markAsRead).toHaveBeenCalledWith({
        id: 'notif-1',
        OR: [
          { userId: 'user-1' },
          { brandId: 'brand-1' },
          { isGlobal: true }
        ]
      }, 'user-1');
    });

    it('rejects brand notification access when user is not a brand member', async () => {
      brandRepository.userCanAccessBrand.mockResolvedValue(false);

      await expect(notificationService.markAsRead('notif-1', 'user-1', 'brand-1', 'USER'))
        .rejects.toThrow('Access denied for this brand');

      expect(notificationRepository.markAsRead).not.toHaveBeenCalled();
    });

    it('returns not found when scoped update does not match any notification', async () => {
      notificationRepository.markAsRead.mockResolvedValue({ count: 0 });

      await expect(notificationService.markAsRead('missing-id', 'user-1', null, 'USER'))
        .rejects.toThrow('Notification not found or access denied');
    });
  });

  describe('create', () => {
    it('creates and formats a valid notification', async () => {
      notificationRepository.create.mockResolvedValue({
        id: 'notif-1',
        userId: 'user-1',
        brandId: null,
        title: 'Post published',
        message: 'Your post was published successfully',
        type: 'content',
        isRead: false,
        isGlobal: false,
        actionUrl: '/planner',
        createdAt: new Date(),
        readReceipts: []
      });

      const result = await notificationService.create({
        userId: 'user-1',
        title: ' Post published ',
        message: ' Your post was published successfully ',
        type: 'content',
        actionUrl: '/planner'
      });

      expect(notificationRepository.create).toHaveBeenCalledWith({
        userId: 'user-1',
        brandId: null,
        title: 'Post published',
        message: 'Your post was published successfully',
        type: 'content',
        isGlobal: false,
        actionUrl: '/planner'
      });
      expect(result).toMatchObject({
        id: 'notif-1',
        title: 'Post published',
        desc: 'Your post was published successfully',
        category: 'content'
      });
    });

    it('allows only admin users to create global notifications via actor context', async () => {
      await expect(notificationService.create({
        title: 'System maintenance',
        message: 'Maintenance tonight',
        isGlobal: true
      }, { userId: 'owner-1', role: 'OWNER' })).rejects.toThrow('Only admin can create global notifications');

      expect(notificationRepository.create).not.toHaveBeenCalled();
    });

    it('requires non-admin users to create only brand-scoped notifications', async () => {
      await expect(notificationService.create({
        userId: 'user-2',
        title: 'Direct notice',
        message: 'Owner should not create direct user-only notification'
      }, { userId: 'owner-1', role: 'OWNER' })).rejects.toThrow('Non-admin users can only create brand-scoped notifications');

      expect(notificationRepository.create).not.toHaveBeenCalled();
    });

    it('checks brand access for non-admin notification creation', async () => {
      brandRepository.userCanAccessBrand.mockResolvedValue(false);

      await expect(notificationService.create({
        brandId: 'brand-1',
        title: 'Brand notice',
        message: 'Only brand members can create this'
      }, { userId: 'owner-1', role: 'OWNER' })).rejects.toThrow('Access denied for this brand');

      expect(notificationRepository.create).not.toHaveBeenCalled();
    });

    it('rejects a non-admin sending a notification to a target user outside their brand (#81)', async () => {
      // OWNER has legitimate access to their own brand...
      brandRepository.userCanAccessBrand.mockResolvedValue(true);
      // ...but the target userId supplied in the body is a stranger who
      // doesn't belong to that brand at all.
      authorizationFacade.checkBrandAccess.mockResolvedValue(false);

      await expect(notificationService.create({
        brandId: 'brand-1',
        userId: 'victim-outside-brand',
        title: 'Bạn đã trúng thưởng!',
        message: 'Nhấn vào đây để nhận quà',
        actionUrl: 'https://evil.example.com/phish'
      }, { userId: 'owner-1', role: 'OWNER' })).rejects.toThrow('Target user is not a member of this brand');

      expect(authorizationFacade.checkBrandAccess).toHaveBeenCalledWith('victim-outside-brand', 'brand-1');
      expect(notificationRepository.create).not.toHaveBeenCalled();
    });

    it('allows a non-admin to notify a target user who IS a member of their brand', async () => {
      brandRepository.userCanAccessBrand.mockResolvedValue(true);
      authorizationFacade.checkBrandAccess.mockResolvedValue(true);
      notificationRepository.create.mockResolvedValue({
        id: 'notif-2', userId: 'teammate-1', brandId: 'brand-1',
        title: 'Task assigned', message: 'You have a new task', type: 'SYSTEM',
        isRead: false, isGlobal: false, actionUrl: null, createdAt: new Date(), readReceipts: []
      });

      await notificationService.create({
        brandId: 'brand-1',
        userId: 'teammate-1',
        title: 'Task assigned',
        message: 'You have a new task'
      }, { userId: 'owner-1', role: 'OWNER' });

      expect(notificationRepository.create).toHaveBeenCalled();
    });

    it('admin can still notify any user regardless of brand membership', async () => {
      notificationRepository.create.mockResolvedValue({
        id: 'notif-3', userId: 'any-user', brandId: null,
        title: 'System notice', message: 'Maintenance window', type: 'SYSTEM',
        isRead: false, isGlobal: false, actionUrl: null, createdAt: new Date(), readReceipts: []
      });

      await notificationService.create({
        userId: 'any-user',
        title: 'System notice',
        message: 'Maintenance window'
      }, { userId: 'admin-1', role: 'ADMIN' });

      expect(authorizationFacade.checkBrandAccess).not.toHaveBeenCalled();
      expect(notificationRepository.create).toHaveBeenCalled();
    });
  });

  describe('getNotifications', () => {
    it('filters unread notifications using read receipts for the current user', async () => {
      notificationRepository.findManyAndCount.mockResolvedValue({
        notifications: [],
        total: 0
      });
      notificationRepository.count.mockResolvedValue(0);

      await notificationService.getNotifications({ isRead: 'false' }, 'user-1', null, 'USER');

      expect(notificationRepository.findManyAndCount).toHaveBeenCalledWith({
        AND: [
          {
            OR: [
              { userId: 'user-1' },
              { isGlobal: true }
            ]
          },
          { isRead: false },
          { readReceipts: { none: { userId: 'user-1' } } }
        ]
      }, { skip: 0, take: 50 }, 'user-1');
    });

    it('formats a notification as read when the current user has a read receipt', async () => {
      const createdAt = new Date();
      notificationRepository.findManyAndCount.mockResolvedValue({
        notifications: [{
          id: 'notif-1',
          title: 'Brand notice',
          message: 'Visible to brand',
          type: 'system',
          isRead: false,
          actionUrl: null,
          createdAt,
          readReceipts: [{ id: 'receipt-1', readAt: createdAt }]
        }],
        total: 1
      });
      notificationRepository.count.mockResolvedValue(0);

      const result = await notificationService.getNotifications({}, 'user-1', null, 'USER');

      expect(result.data[0].isRead).toBe(true);
    });

    it('scopes global notifications to those created at or after the user signed up (bug: new users saw the entire system global-notification history)', async () => {
      const signupDate = new Date('2026-07-23T00:00:00.000Z');
      userRepository.findCreatedAt.mockResolvedValue(signupDate);
      notificationRepository.findManyAndCount.mockResolvedValue({ notifications: [], total: 0 });
      notificationRepository.count.mockResolvedValue(0);

      await notificationService.getNotifications({}, 'new-user-1', null, 'USER');

      expect(notificationRepository.findManyAndCount).toHaveBeenCalledWith({
        OR: [
          { userId: 'new-user-1' },
          { isGlobal: true, createdAt: { gte: signupDate } }
        ]
      }, { skip: 0, take: 50 }, 'new-user-1');
    });
  });
});
