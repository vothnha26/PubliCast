const calendarEventService = require('../../src/services/workspace/calendar-event.service');
const prisma = require('../../src/config/prisma');

jest.mock('../../src/config/prisma', () => ({
  calendarEvent: {
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    findUnique: jest.fn()
  },
  post: {
    findMany: jest.fn()
  }
}));

describe('CalendarEventService Export tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('exportIcs', () => {
    it('should query calendar events and posts, then return valid ICS content', async () => {
      const mockEvents = [
        {
          id: 'event_1',
          title: 'Giáng Sinh',
          description: 'Nghỉ lễ Giáng Sinh',
          eventDate: new Date('2026-12-24T00:00:00.000Z'),
          createdAt: new Date('2026-07-11T12:00:00.000Z'),
          isSystem: false,
          brandId: 'brand_123'
        }
      ];

      const mockPosts = [
        {
          id: 'post_1',
          title: 'Bài viết Giáng Sinh',
          caption: 'Chúc mừng Giáng Sinh 2026!',
          status: 'SCHEDULED',
          targetPlatforms: 'FACEBOOK,INSTAGRAM',
          scheduledAt: new Date('2026-12-24T09:00:00.000Z'),
          publishedAt: null,
          createdAt: new Date('2026-12-23T12:00:00.000Z')
        }
      ];

      prisma.calendarEvent.findMany.mockResolvedValue(mockEvents);
      prisma.post.findMany.mockResolvedValue(mockPosts);

      const icsResult = await calendarEventService.exportIcs('brand_123', '2026-12-01', '2026-12-31');

      expect(prisma.calendarEvent.findMany).toHaveBeenCalled();
      expect(prisma.post.findMany).toHaveBeenCalled();

      // Check ICS Format tags
      expect(icsResult).toContain('BEGIN:VCALENDAR');
      expect(icsResult).toContain('VERSION:2.0');
      expect(icsResult).toContain('PRODID:-//PubliCast//Planner Calendar v1.0//EN');
      
      // Check Event content
      expect(icsResult).toContain('BEGIN:VEVENT');
      expect(icsResult).toContain('UID:event_event_1@publicast.com');
      expect(icsResult).toContain('SUMMARY:Giáng Sinh');
      expect(icsResult).toContain('DESCRIPTION:Nghỉ lễ Giáng Sinh');

      // Check Post content
      expect(icsResult).toContain('UID:post_post_1@publicast.com');
      expect(icsResult).toContain('SUMMARY:[⏰ Đã đặt lịch] Bài viết Giáng Sinh');
      expect(icsResult).toContain('FACEBOOK\\, INSTAGRAM');
      expect(icsResult).toContain('END:VCALENDAR');
    });
  });
});
