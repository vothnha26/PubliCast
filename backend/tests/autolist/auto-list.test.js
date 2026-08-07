const { IntervalScheduleStrategy, SpecificTimesScheduleStrategy } = require('../../src/utils/scheduler-strategies');
const autoListService = require('../../src/services/workspace/auto-list.service');
const autoListRepository = require('../../src/repositories/workspace/auto-list.repository');
const postRepository = require('../../src/repositories/workspace/post.repository');
const authorizationFacade = require('../../src/services/auth/authorization.facade');
const prisma = require('../../src/config/prisma');

jest.mock('../../src/repositories/workspace/auto-list.repository', () => ({
  findById: jest.fn(),
  updateStats: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  lockForUpdate: jest.fn()
}));

jest.mock('../../src/repositories/workspace/post.repository', () => ({
  create: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn()
}));

jest.mock('../../src/services/workspace/post/publish-qstash.service', () => ({
  upsertPublishJob: jest.fn(),
  removePublishJob: jest.fn(),
  enqueueImmediate: jest.fn()
}));

jest.mock('../../src/services/auth/authorization.facade', () => ({
  checkPermission: jest.fn()
}));

// recalculateQueueSchedules/deleteAutoList now run inside prisma.$transaction —
// the mock just invokes the callback with a fake tx object, letting the
// existing autoListRepository/postRepository mocks (called with `tx` as an
// extra arg) keep working unchanged, since they ignore what `client`/`tx` is.
jest.mock('../../src/config/prisma', () => ({
  $transaction: jest.fn((callback) => callback({})),
  autoList: {
    update: jest.fn()
  },
  post: {
    update: jest.fn(),
    updateMany: jest.fn()
  }
}));

describe('AutoList Queue Scheduler Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authorizationFacade.checkPermission.mockResolvedValue(true);
  });

  // AUTOLIST_001: Tạo mới và cấu hình Autolist (Validate đầu vào)
  describe('AUTOLIST_001: createAutoList & updateAutoList', () => {
    it('should format and save valid Autolist settings and emit created event', async () => {
      const mockCreated = { id: 'list-999', name: 'New List' };
      autoListRepository.create.mockResolvedValue(mockCreated);
      autoListRepository.findById.mockResolvedValue(mockCreated);

      const data = {
        name: 'New List',
        scheduleType: 'INTERVAL',
        intervalMinutes: 120,
        activeDays: 'Mo,Tu,We,Th,Fr',
        isActive: true,
        loopEnabled: false
      };

      const result = await autoListService.createAutoList('brand-1', data);

      expect(autoListRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        name: 'New List',
        brandId: 'brand-1',
        intervalMinutes: 120,
        activeDays: 'Mo,Tu,We,Th,Fr',
        isActive: true
      }));
      expect(result).toEqual(mockCreated);
    });
  });

  // AUTOLIST_002: Lập lịch theo Khoảng thời gian (Interval)
  describe('AUTOLIST_002: IntervalScheduleStrategy', () => {
    it('should generate slots spaced by intervalMinutes correctly', () => {
      const strategy = new IntervalScheduleStrategy();
      const mockAutoList = {
        intervalMinutes: 120, // 2 hours
        activeDays: 'Mo,Tu,We,Th,Fr,Sa,Su'
      };
      
      const fromDate = new Date('2026-05-22T10:00:00Z');
      const slots = strategy.calculateNextSlots(mockAutoList, 3, fromDate);
      
      expect(slots).toHaveLength(3);
      expect(slots[0].toISOString()).toBe('2026-05-22T12:00:00.000Z');
      expect(slots[1].toISOString()).toBe('2026-05-22T14:00:00.000Z');
      expect(slots[2].toISOString()).toBe('2026-05-22T16:00:00.000Z');
    });
  });

  // AUTOLIST_003: Lập lịch theo Mốc giờ cố định (Specific Times)
  describe('AUTOLIST_003: SpecificTimesScheduleStrategy', () => {
    it('should generate slots matching specificTimes', () => {
      const strategy = new SpecificTimesScheduleStrategy();
      const mockAutoList = {
        specificTimes: '09:00,18:00',
        activeDays: 'Mo,Tu,We,Th,Fr,Sa,Su'
      };
      
      const fromDate = new Date('2026-05-20T12:00:00');
      const slots = strategy.calculateNextSlots(mockAutoList, 2, fromDate);
      
      expect(slots).toHaveLength(2);
      expect(slots[0].getHours()).toBe(18);
      expect(slots[1].getHours()).toBe(9);
    });
  });

  // AUTOLIST_004: Bộ lọc ngày hoạt động (Active Days Filter)
  describe('AUTOLIST_004: Active Days Filter Logic', () => {
    it('should generate slots skipping weekends when activeDays is weekdays only', () => {
      const strategy = new IntervalScheduleStrategy();
      const mockAutoList = {
        intervalMinutes: 60,
        activeDays: 'Mo,Tu,We,Th,Fr' // Weekend skipped
      };
      
      // Start from Friday night (2026-05-22 is a Friday) at 23:30
      const fromDate = new Date('2026-05-22T23:30:00Z');
      const slots = strategy.calculateNextSlots(mockAutoList, 1, fromDate);
      
      expect(slots).toHaveLength(1);
      expect(slots[0].getDay()).toBe(1); // Should roll over to Monday (Day 1)
    });
  });

  // AUTOLIST_005: Tự động lặp lại hàng đợi (Auto Loop)
  describe('AUTOLIST_005: Auto Loop Mechanism', () => {
    it('should duplicate published posts as new DRAFTs to preserve history when loop is enabled', async () => {
      const mockAutoList = {
        id: 'list-123',
        name: 'Looping Queue',
        scheduleType: 'INTERVAL',
        intervalMinutes: 60,
        activeDays: 'Mo,Tu,We,Th,Fr,Sa,Su',
        isActive: true,
        loopEnabled: true,
        posts: [
          { id: 'post-1', status: 'PUBLISHED', platformPostId: 'FB_12345', publishedAt: new Date(), brandId: 'brand-1', createdByUserId: 'user-1', title: 'Post 1', caption: 'Hello', type: 'TEXT', targetPlatforms: 'FACEBOOK', autoListId: 'list-123' }
        ]
      };

      autoListRepository.findById.mockResolvedValue(mockAutoList);
      autoListRepository.updateStats.mockResolvedValue({});
      postRepository.create.mockResolvedValue({ id: 'post-1-dup', status: 'DRAFT' });

      await autoListService.recalculateQueueSchedules('list-123');

      // Verify that it duplicates the post
      expect(postRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Post 1',
          status: 'DRAFT',
          autoListId: 'list-123'
        }),
        expect.anything()
      );
      // Ensure the old post is detached from autolist to preserve history
      expect(postRepository.update).toHaveBeenCalledWith('post-1', { autoListId: null }, expect.anything());
      // Whole recalculate ran inside a single transaction, locked before any read/write
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(autoListRepository.lockForUpdate).toHaveBeenCalledWith('list-123', expect.anything());
    });
  });

  // AUTOLIST_006: Kéo thả thay đổi thứ tự bài viết (Reorder Posts)
  describe('AUTOLIST_006: reorderPosts', () => {
    it('should update createdAt timestamps sequentially and recalculate schedules', async () => {
      const mockAutoList = { id: 'list-123', posts: [] };
      autoListRepository.findById.mockResolvedValue(mockAutoList);
      postRepository.update.mockResolvedValue({});

      const recalculateSpy = jest.spyOn(autoListService, 'recalculateQueueSchedules').mockResolvedValue({});

      await autoListService.reorderPosts('list-123', ['post-c', 'post-a', 'post-b'], 'user-1');

      // Should update createdAt sequentially for all 3 posts
      expect(postRepository.update).toHaveBeenCalledTimes(3);
      expect(postRepository.update.mock.calls[0][0]).toBe('post-c');
      expect(postRepository.update.mock.calls[1][0]).toBe('post-a');
      expect(postRepository.update.mock.calls[2][0]).toBe('post-b');

      // Recalculates queue schedules immediately
      expect(recalculateSpy).toHaveBeenCalledWith('list-123');
      recalculateSpy.mockRestore();
    });
  });

  // AUTOLIST_007: Bật/Tắt trạng thái hàng đợi (Toggle Active Status)
  describe('AUTOLIST_007: toggleStatus', () => {
    it('should pause Autolist, convert scheduled posts to DRAFTs, and remove publish jobs from queue', async () => {
      const mockAutoList = {
        id: 'list-123',
        isActive: true,
        posts: [
          { id: 'post-1', status: 'SCHEDULED' },
          { id: 'post-2', status: 'DRAFT' }
        ]
      };
      autoListRepository.findById.mockResolvedValue(mockAutoList);
      autoListRepository.update.mockResolvedValue({ ...mockAutoList, isActive: false });
      
      const { removePublishJob } = require('../../src/services/workspace/post/publish-qstash.service');

      await autoListService.toggleStatus('list-123', 'user-1');

      // Updates active state
      expect(autoListRepository.update).toHaveBeenCalledWith('list-123', { isActive: false });
      // Removes active job from queue
      expect(removePublishJob).toHaveBeenCalledWith('post-1');
      expect(removePublishJob).not.toHaveBeenCalledWith('post-2');
    });
  });

  // BUG_AUTOLIST_001: Khắc phục lỗi trôi lịch biểu (Schedule Drift Bug)
  describe('BUG_AUTOLIST_001: Schedule Drift Bug Verification', () => {
    it('should calculate new post schedules based on previous published posts, preventing drift', async () => {
      const prevPublishedAt = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      const mockAutoList = {
        id: 'list-123',
        name: 'Weekly Queue',
        scheduleType: 'INTERVAL',
        intervalMinutes: 60,
        activeDays: 'Mo,Tu,We,Th,Fr,Sa,Su',
        isActive: true,
        posts: [
          { id: 'post-1', status: 'PUBLISHED', publishedAt: prevPublishedAt },
          { id: 'post-2', status: 'DRAFT', scheduledAt: null }
        ]
      };

      autoListRepository.findById.mockResolvedValue(mockAutoList);
      autoListRepository.updateStats.mockResolvedValue({});
      postRepository.update.mockResolvedValue({});

      await autoListService.recalculateQueueSchedules('list-123');

      expect(postRepository.update).toHaveBeenCalled();
      const updateCall = postRepository.update.mock.calls.find(c => c[0] === 'post-2');
      expect(updateCall).toBeDefined();
      // 3rd arg is the transaction client threaded through by recalculateQueueSchedules
      expect(updateCall[2]).toBeDefined();
      
      const updatedData = updateCall[1];
      expect(updatedData.status).toBe('SCHEDULED');
      expect(updatedData.scheduledAt).toBeDefined();

      // Diff should be close to 60 minutes if fromDate uses the previous post's publishedAt
      const diffFromPrevPost = updatedData.scheduledAt.getTime() - mockAutoList.posts[0].publishedAt.getTime();
      const minutesDiff = Math.round(diffFromPrevPost / (1000 * 60));
      
      expect(minutesDiff).toBe(60);
    });
  });

  // AUTOLIST_008: Permission enforcement for :id-based actions
  describe('AUTOLIST_008: _assertCanManage permission guard', () => {
    const mockAutoList = { id: 'list-123', brandId: 'brand-1', posts: [] };

    it('throws 404 when the AutoList does not exist', async () => {
      autoListRepository.findById.mockResolvedValue(null);

      await expect(
        autoListService.getAutoListDetails('missing-list', 'user-1')
      ).rejects.toMatchObject({ statusCode: 404 });

      expect(authorizationFacade.checkPermission).not.toHaveBeenCalled();
    });

    it('throws 403 and does not mutate when the operator lacks permission', async () => {
      autoListRepository.findById.mockResolvedValue(mockAutoList);
      authorizationFacade.checkPermission.mockResolvedValue(false);

      await expect(
        autoListService.updateAutoList('list-123', { name: 'Hacked' }, 'user-2')
      ).rejects.toMatchObject({ statusCode: 403 });

      expect(autoListRepository.update).not.toHaveBeenCalled();
    });

    it('rejects deleteAutoList without calling repository.delete when unauthorized', async () => {
      autoListRepository.findById.mockResolvedValue(mockAutoList);
      authorizationFacade.checkPermission.mockResolvedValue(false);

      await expect(
        autoListService.deleteAutoList('list-123', 'user-2')
      ).rejects.toMatchObject({ statusCode: 403 });

      expect(autoListRepository.delete).not.toHaveBeenCalled();
    });

    it('rejects toggleStatus without calling repository.update when unauthorized', async () => {
      autoListRepository.findById.mockResolvedValue({ ...mockAutoList, isActive: true });
      authorizationFacade.checkPermission.mockResolvedValue(false);

      await expect(
        autoListService.toggleStatus('list-123', 'user-2')
      ).rejects.toMatchObject({ statusCode: 403 });

      expect(autoListRepository.update).not.toHaveBeenCalled();
    });

    it('rejects reorderPosts without touching postRepository when unauthorized', async () => {
      autoListRepository.findById.mockResolvedValue(mockAutoList);
      authorizationFacade.checkPermission.mockResolvedValue(false);

      await expect(
        autoListService.reorderPosts('list-123', ['post-a'], 'user-2')
      ).rejects.toMatchObject({ statusCode: 403 });

      expect(postRepository.update).not.toHaveBeenCalled();
    });

    it('checks permission against the AutoList brandId, not a caller-supplied one', async () => {
      autoListRepository.findById.mockResolvedValue(mockAutoList);

      await autoListService.getAutoListDetails('list-123', 'user-1');

      expect(authorizationFacade.checkPermission).toHaveBeenCalledWith('user-1', 'brand-1', 'CREATE_POSTS');
    });
  });

  // AUTOLIST_010: recalculateQueueSchedules/deleteAutoList concurrency safety (A1+A3)
  describe('AUTOLIST_010: transaction + row lock around recalculateQueueSchedules/deleteAutoList', () => {
    it('locks before reading, inside a single transaction, when the queue is not empty', async () => {
      const mockAutoList = {
        id: 'list-123',
        scheduleType: 'INTERVAL',
        intervalMinutes: 60,
        activeDays: 'Mo,Tu,We,Th,Fr,Sa,Su',
        isActive: true,
        loopEnabled: false,
        posts: [{ id: 'post-1', status: 'DRAFT' }]
      };
      const callOrder = [];
      autoListRepository.lockForUpdate.mockImplementation(async () => { callOrder.push('lock'); });
      autoListRepository.findById.mockImplementation(async () => { callOrder.push('findById'); return mockAutoList; });
      autoListRepository.updateStats.mockResolvedValue({});
      postRepository.update.mockResolvedValue({});

      await autoListService.recalculateQueueSchedules('list-123');

      expect(callOrder[0]).toBe('lock');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('exits early without touching posts when the AutoList no longer exists', async () => {
      autoListRepository.lockForUpdate.mockResolvedValue(undefined);
      autoListRepository.findById.mockResolvedValue(null);

      await expect(autoListService.recalculateQueueSchedules('list-gone')).resolves.toBeUndefined();

      expect(autoListRepository.updateStats).not.toHaveBeenCalled();
      expect(postRepository.update).not.toHaveBeenCalled();
    });

    it('deleteAutoList locks the row and is idempotent if already deleted by a concurrent request', async () => {
      autoListRepository.findById
        .mockResolvedValueOnce({ id: 'list-123', brandId: 'brand-1', posts: [] }) // _assertCanManage
        .mockResolvedValueOnce(null); // fresh re-read inside the transaction — already gone
      authorizationFacade.checkPermission.mockResolvedValue(true);

      await expect(autoListService.deleteAutoList('list-123', 'user-1')).resolves.toBeUndefined();

      expect(autoListRepository.lockForUpdate).toHaveBeenCalledWith('list-123', expect.anything());
      expect(autoListRepository.delete).not.toHaveBeenCalled();
    });

    it('deleteAutoList removes pending publish jobs and deletes within the same transaction', async () => {
      const mockAutoList = {
        id: 'list-123',
        brandId: 'brand-1',
        posts: [{ id: 'post-1', status: 'SCHEDULED' }]
      };
      autoListRepository.findById.mockResolvedValue(mockAutoList);
      authorizationFacade.checkPermission.mockResolvedValue(true);
      const { removePublishJob } = require('../../src/services/workspace/post/publish-qstash.service');

      await autoListService.deleteAutoList('list-123', 'user-1');

      expect(removePublishJob).toHaveBeenCalledWith('post-1');
      expect(autoListRepository.delete).toHaveBeenCalledWith('list-123', expect.anything());
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  // AUTOLIST_009: updateLastPostedAt guards against a deleted AutoList
  describe('AUTOLIST_009: updateLastPostedAt deleted-AutoList guard', () => {
    it('resolves silently when the AutoList no longer exists (P2025)', async () => {
      autoListRepository.update.mockRejectedValue(Object.assign(new Error('Record not found'), { code: 'P2025' }));

      await expect(autoListService.updateLastPostedAt('list-gone', new Date())).resolves.toBeUndefined();
    });

    it('rethrows non-P2025 errors', async () => {
      autoListRepository.update.mockRejectedValue(new Error('Connection lost'));

      await expect(autoListService.updateLastPostedAt('list-123', new Date())).rejects.toThrow('Connection lost');
    });
  });
});
