const mockRedis = {
  incrBy: jest.fn(),
  get: jest.fn(),
  ttl: jest.fn(),
  expire: jest.fn(),
  del: jest.fn()
};
jest.mock('../../src/config/redis', () => mockRedis);

global.fetch = jest.fn();

const tokApiHashtagProvider = require('../../src/services/workspace/hashtag/tokapi-hashtag.provider');

describe('TokApiHashtagProvider', () => {
  const originalKey = process.env.RAPIDAPI_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RAPIDAPI_KEY = 'test-key';
    mockRedis.get.mockResolvedValue('0');
    mockRedis.ttl.mockResolvedValue(3600);
    mockRedis.incrBy.mockResolvedValue(1);
  });

  afterAll(() => {
    process.env.RAPIDAPI_KEY = originalKey;
  });

  it('should return null without calling fetch when RAPIDAPI_KEY is not configured', async () => {
    delete process.env.RAPIDAPI_KEY;

    const result = await tokApiHashtagProvider.searchHashtag('work');

    expect(result).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should return null and skip fetch when the daily quota is already exhausted', async () => {
    mockRedis.get.mockResolvedValue('20'); // TOKAPI_HASHTAG.DAILY_LIMIT

    const result = await tokApiHashtagProvider.searchHashtag('work');

    expect(result).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should map a successful response to platformHashtagId/totalPosts/totalReach', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        challenge_list: [
          {
            challenge_info: {
              cid: '6122',
              cha_name: 'work',
              use_count: 25009187,
              view_count: 322131013453
            }
          }
        ]
      })
    });

    const result = await tokApiHashtagProvider.searchHashtag('#work');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('keyword=work'),
      expect.objectContaining({
        headers: expect.objectContaining({ 'x-rapidapi-key': 'test-key' })
      })
    );
    expect(result).toEqual({
      platformHashtagId: '6122',
      name: 'work',
      totalPosts: 25009187,
      totalReach: 322131013453
    });
    expect(mockRedis.incrBy).toHaveBeenCalled();
  });

  it('should return null when no hashtag matches the keyword', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ challenge_list: [] })
    });

    const result = await tokApiHashtagProvider.searchHashtag('zzzznomatch');

    expect(result).toBeNull();
  });

  it('should return null when the HTTP response is not ok', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 429 });

    const result = await tokApiHashtagProvider.searchHashtag('work');

    expect(result).toBeNull();
  });

  it('should return null (fail closed on the caller side) when fetch throws', async () => {
    global.fetch.mockRejectedValue(new Error('network error'));

    const result = await tokApiHashtagProvider.searchHashtag('work');

    expect(result).toBeNull();
  });
});
