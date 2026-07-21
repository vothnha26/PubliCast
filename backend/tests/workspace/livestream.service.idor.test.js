/**
 * Regression tests for issue #50: getStreamById must verify the caller
 * belongs to the stream's own brand instead of returning any stream by id.
 */
jest.mock('../../src/repositories/workspace/livestream.repository', () => ({
  findById: jest.fn(),
  findManyAndCount: jest.fn()
}));
jest.mock('../../src/services/auth/authorization.facade', () => ({
  checkBrandAccess: jest.fn()
}));

const livestreamService = require('../../src/services/workspace/livestream.service');
const livestreamRepository = require('../../src/repositories/workspace/livestream.repository');
const authorizationFacade = require('../../src/services/auth/authorization.facade');

function mockStream(overrides = {}) {
  return {
    id: 'stream-1',
    brandId: 'brand-1',
    title: 'Launch stream',
    scheduledAt: new Date(),
    durationMinutes: 30,
    targetPlatforms: 'facebook',
    status: 'ENDED',
    creator: { name: 'Alice' },
    ...overrides
  };
}

describe('LivestreamService.getStreamById (#50)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns the stream when the caller belongs to its brand', async () => {
    livestreamRepository.findById.mockResolvedValue(mockStream());
    authorizationFacade.checkBrandAccess.mockResolvedValue(true);

    const result = await livestreamService.getStreamById('stream-1', 'user-1');

    expect(result).not.toBeNull();
    expect(result.id).toBe('stream-1');
    expect(authorizationFacade.checkBrandAccess).toHaveBeenCalledWith('user-1', 'brand-1');
  });

  test('throws 403 when the caller does not belong to the stream brand', async () => {
    livestreamRepository.findById.mockResolvedValue(mockStream({ brandId: 'brand-victim' }));
    authorizationFacade.checkBrandAccess.mockResolvedValue(false);

    await expect(livestreamService.getStreamById('stream-1', 'attacker'))
      .rejects.toThrow('Bạn không có quyền truy cập livestream này.');
  });

  test('returns null when the stream does not exist (no access check performed)', async () => {
    livestreamRepository.findById.mockResolvedValue(null);

    const result = await livestreamService.getStreamById('missing-id', 'user-1');

    expect(result).toBeNull();
    expect(authorizationFacade.checkBrandAccess).not.toHaveBeenCalled();
  });
});
