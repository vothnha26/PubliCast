const InboxTypeFilter = require('../../../../src/services/social/inbox/filters/type.filter');
const { INBOX_TYPES, INBOX_STATUS } = require('../../../../src/utils/constants');

describe('InboxTypeFilter Unit Tests', () => {
  let filter;

  beforeEach(() => {
    filter = new InboxTypeFilter();
  });

  test('should do nothing if type is undefined, empty, or "all"', () => {
    const where1 = {};
    filter.apply(where1, {});
    expect(where1).toEqual({});

    const where2 = {};
    filter.apply(where2, { type: 'all' });
    expect(where2).toEqual({});
  });

  test('should set where.type for valid INBOX_TYPES values', () => {
    const where1 = {};
    filter.apply(where1, { type: 'comment' });
    expect(where1.type).toBe(INBOX_TYPES.COMMENT);

    const where2 = {};
    filter.apply(where2, { type: 'DIRECT_MESSAGE' });
    expect(where2.type).toBe(INBOX_TYPES.DIRECT_MESSAGE);
  });

  test('should map UNREAD type parameter to where.status = UNREAD', () => {
    const where = {};
    filter.apply(where, { type: 'UNREAD' });
    expect(where.status).toBe(INBOX_STATUS.UNREAD);
    expect(where.type).toBeUndefined();
  });

  test('should ignore invalid type strings to prevent Prisma enum errors', () => {
    const where = {};
    filter.apply(where, { type: 'INVALID_TYPE_XYZ' });
    expect(where.type).toBeUndefined();
    expect(where.status).toBeUndefined();
  });
});
