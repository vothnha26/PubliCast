const PostSocialAccountFilter = require('../../src/services/workspace/post/filters/social-account.filter');

describe('PostSocialAccountFilter', () => {
  let filter;

  beforeEach(() => {
    filter = new PostSocialAccountFilter();
  });

  it('should not mutate where clause if socialAccountId is not present in queryParams', () => {
    const where = {};
    filter.apply(where, {});
    expect(where).toEqual({});
  });

  it('should add OR conditions for socialAccountId when socialAccountId query param is present', () => {
    const where = {};
    const queryParams = { socialAccountId: 'acc_123456' };
    filter.apply(where, queryParams);

    expect(where.OR).toBeDefined();
    expect(where.OR).toEqual([
      {
        networkOverrides: {
          some: {
            socialAccountId: 'acc_123456',
          },
        },
      },
      {
        networkOverrides: {
          none: {
            socialAccountId: { not: null },
          },
        },
      },
    ]);
  });

  it('should preserve existing OR conditions if already present in where', () => {
    const where = { OR: [{ title: { contains: 'test' } }] };
    const queryParams = { socialAccountId: 'acc_789' };
    filter.apply(where, queryParams);

    expect(where.OR.length).toBe(3);
    expect(where.OR[0]).toEqual({ title: { contains: 'test' } });
    expect(where.OR[1]).toEqual({
      networkOverrides: {
        some: {
          socialAccountId: 'acc_789',
        },
      },
    });
  });
});
