/**
 * Test Suite: InboxService - updateReply & deleteReply
 * Kiểm tra luồng sửa/xóa phản hồi qua đúng Strategy.
 * Pattern: Strategy Pattern với mocking để tách biệt logic.
 */
const inboxRepository = require('../../src/repositories/social/inbox.repository');
const { PLATFORMS, INBOX_STATUS, INBOX_TYPES } = require('../../src/utils/constants');

// --- Mocks ---
jest.mock('../../src/repositories/social/inbox.repository', () => ({
  findById: jest.fn(),
  findManyAndCount: jest.fn(),
  findOrCreateInbox: jest.fn(),
  updateInboxLastSync: jest.fn(),
  createInboxItem: jest.fn(),
  updateInboxItem: jest.fn(),
  updateStatus: jest.fn(),
  deleteInboxItem: jest.fn(),
  findInboxItemByPlatformId: jest.fn(),
  upsertInboxItem: jest.fn()
}));

jest.mock('../../src/repositories/social/social-account.repository', () => ({
  findById: jest.fn(),
  findByBrandAndPlatformFirst: jest.fn(),
  findByBrandAndPlatform: jest.fn(),
  findAuthContextByBrandAndPlatform: jest.fn()
}));

jest.mock('../../src/services/auth/authorization.facade', () => ({
  checkBrandAccess: jest.fn()
}));

// Mock Facebook Gateway
const mockFbGateway = {
  updateComment: jest.fn(),
  deleteComment: jest.fn(),
  replyToComment: jest.fn()
};
jest.mock('../../src/services/social/facebook/facebook.gateway', () => mockFbGateway);

// Mock YouTube Gateway
const mockYtGateway = {
  updateComment: jest.fn(),
  deleteComment: jest.fn(),
  insertCommentReply: jest.fn()
};
jest.mock('../../src/services/social/youtube/youtube.gateway', () => mockYtGateway);

// Mock GoogleOAuth
jest.mock('../../src/services/social/google-oauth.service', () => ({
  createClient: jest.fn().mockReturnValue({
    setCredentials: jest.fn()
  })
}));

// Mock social account repository for strategies
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const mockFbAccount = [{
  id: 'sa-fb-1',
  platformAccountId: 'page_id_123',
  accessToken: 'page_access_token',
  displayName: 'My Brand Page',
  profilePictureUrl: 'https://avatar.fb.jpg',
  isConnected: true
}];
const mockYtAccount = [{
  id: 'sa-yt-1',
  platformAccountId: 'channel_id_yt',
  accessToken: 'google_access_token',
  refreshToken: 'google_refresh',
  displayName: 'My YouTube Channel',
  isConnected: true
}];

// Load inboxService after all mocks are set up
let inboxService;
let authorizationFacade;

beforeAll(() => {
  inboxService = require('../../src/services/social/inbox.service');
  authorizationFacade = require('../../src/services/auth/authorization.facade');
});

beforeEach(() => {
  authorizationFacade.checkBrandAccess.mockResolvedValue(true);
});

afterEach(() => {
  jest.clearAllMocks();
});

// =============================================================================
describe('InboxService - updateReply', () => {
  // -------------------------------------------------------------------------
  describe('INBOX_UPDATE_001 - updateReply Facebook Comment thành công', () => {
    it('should find reply, call FacebookCommentStrategy.updateReply, and update DB', async () => {
      const fbReply = {
        id: 'reply-fb-001',
        platform: PLATFORMS.FACEBOOK,
        type: INBOX_TYPES.COMMENT,
        platformItemId: 'fb_comment_id_999',
        inbox: { brandId: 'brand-abc' }
      };

      inboxRepository.findById.mockResolvedValue(fbReply);
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue(mockFbAccount);
      mockFbGateway.updateComment.mockResolvedValue({ success: true });
      inboxRepository.updateInboxItem.mockResolvedValue({ ...fbReply, content: 'Nội dung đã cập nhật' });

      const result = await inboxService.updateReply('brand-abc', 'reply-fb-001', 'Nội dung đã cập nhật', 'user-1');

      expect(inboxRepository.findById).toHaveBeenCalledWith('reply-fb-001');
      expect(mockFbGateway.updateComment).toHaveBeenCalledWith(
        'fb_comment_id_999',
        'Nội dung đã cập nhật',
        'page_access_token'
      );
      expect(inboxRepository.updateInboxItem).toHaveBeenCalledWith(
        'reply-fb-001',
        { content: 'Nội dung đã cập nhật' }
      );
      expect(result.content).toBe('Nội dung đã cập nhật');
    });
  });

  // -------------------------------------------------------------------------
  describe('INBOX_UPDATE_002 - updateReply YouTube Comment thành công', () => {
    it('should find reply, call YoutubeCommentStrategy.updateReply, and update DB', async () => {
      const ytReply = {
        id: 'reply-yt-001',
        platform: PLATFORMS.YOUTUBE,
        type: INBOX_TYPES.COMMENT,
        platformItemId: 'yt_comment_id_456',
        inbox: { brandId: 'brand-abc' }
      };

      inboxRepository.findById.mockResolvedValue(ytReply);
      socialAccountRepository.findAuthContextByBrandAndPlatform.mockResolvedValue(mockYtAccount);
      mockYtGateway.updateComment.mockResolvedValue({ success: true });
      inboxRepository.updateInboxItem.mockResolvedValue({ ...ytReply, content: 'YouTube updated reply' });

      const result = await inboxService.updateReply('brand-abc', 'reply-yt-001', 'YouTube updated reply', 'user-1');

      expect(inboxRepository.findById).toHaveBeenCalledWith('reply-yt-001');
      expect(mockYtGateway.updateComment).toHaveBeenCalledWith(
        expect.any(Object), // auth object
        'yt_comment_id_456',
        'YouTube updated reply'
      );
      expect(inboxRepository.updateInboxItem).toHaveBeenCalledWith(
        'reply-yt-001',
        { content: 'YouTube updated reply' }
      );
      expect(result.content).toBe('YouTube updated reply');
    });
  });

  // -------------------------------------------------------------------------
  describe('INBOX_UPDATE_003 - updateReply khi reply không tồn tại', () => {
    it('should throw error when reply is not found', async () => {
      inboxRepository.findById.mockResolvedValue(null);

      await expect(
        inboxService.updateReply('brand-abc', 'non-existing-reply', 'new text', 'user-1')
      ).rejects.toMatchObject({ status: 404, message: 'Reply not found' });

      expect(mockFbGateway.updateComment).not.toHaveBeenCalled();
      expect(inboxRepository.updateInboxItem).not.toHaveBeenCalled();
    });
  });
});

// =============================================================================
describe('InboxService - deleteReply', () => {
  // -------------------------------------------------------------------------
  describe('INBOX_DELETE_001 - deleteReply Facebook Comment thành công', () => {
    it('should find reply, call FacebookCommentStrategy.deleteReply, and delete from DB', async () => {
      const fbReply = {
        id: 'reply-fb-del-001',
        platform: PLATFORMS.FACEBOOK,
        type: INBOX_TYPES.COMMENT,
        platformItemId: 'fb_comment_del_777',
        inbox: { brandId: 'brand-abc' }
      };

      inboxRepository.findById.mockResolvedValue(fbReply);
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue(mockFbAccount);
      mockFbGateway.deleteComment.mockResolvedValue({ success: true });
      inboxRepository.deleteInboxItem.mockResolvedValue(true);

      const result = await inboxService.deleteReply('brand-abc', 'reply-fb-del-001', 'user-1');

      expect(inboxRepository.findById).toHaveBeenCalledWith('reply-fb-del-001');
      expect(mockFbGateway.deleteComment).toHaveBeenCalledWith(
        'fb_comment_del_777',
        'page_access_token'
      );
      expect(inboxRepository.deleteInboxItem).toHaveBeenCalledWith('reply-fb-del-001');
      expect(result).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  describe('INBOX_DELETE_002 - deleteReply YouTube Comment thành công', () => {
    it('should find reply, call YoutubeCommentStrategy.deleteReply, and delete from DB', async () => {
      const ytReply = {
        id: 'reply-yt-del-001',
        platform: PLATFORMS.YOUTUBE,
        type: INBOX_TYPES.COMMENT,
        platformItemId: 'yt_comment_del_888',
        inbox: { brandId: 'brand-abc' }
      };

      inboxRepository.findById.mockResolvedValue(ytReply);
      socialAccountRepository.findAuthContextByBrandAndPlatform.mockResolvedValue(mockYtAccount);
      mockYtGateway.deleteComment.mockResolvedValue({ success: true });
      inboxRepository.deleteInboxItem.mockResolvedValue(true);

      const result = await inboxService.deleteReply('brand-abc', 'reply-yt-del-001', 'user-1');

      expect(inboxRepository.findById).toHaveBeenCalledWith('reply-yt-del-001');
      expect(mockYtGateway.deleteComment).toHaveBeenCalledWith(
        expect.any(Object), // auth object
        'yt_comment_del_888'
      );
      expect(inboxRepository.deleteInboxItem).toHaveBeenCalledWith('reply-yt-del-001');
      expect(result).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  describe('INBOX_DELETE_003 - deleteReply khi reply không tồn tại', () => {
    it('should throw error when reply is not found', async () => {
      inboxRepository.findById.mockResolvedValue(null);

      await expect(
        inboxService.deleteReply('brand-abc', 'ghost-reply-id', 'user-1')
      ).rejects.toMatchObject({ status: 404, message: 'Reply not found' });

      expect(mockFbGateway.deleteComment).not.toHaveBeenCalled();
      expect(inboxRepository.deleteInboxItem).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  describe('INBOX_DELETE_004 - deleteReply khi không có strategy phù hợp', () => {
    it('should throw error when no strategy supports the platform/type combination', async () => {
      const unsupportedReply = {
        id: 'reply-unsupported-001',
        platform: PLATFORMS.TWITCH,    // Platform không có strategy delete
        type: INBOX_TYPES.DIRECT_MESSAGE,
        platformItemId: 'twitch_msg_xyz',
        inbox: { brandId: 'brand-abc' }
      };

      inboxRepository.findById.mockResolvedValue(unsupportedReply);

      await expect(
        inboxService.deleteReply('brand-abc', 'reply-unsupported-001', 'user-1')
      ).rejects.toThrow('No strategy found to delete reply for platform');

      expect(inboxRepository.deleteInboxItem).not.toHaveBeenCalled();
    });
  });
});
