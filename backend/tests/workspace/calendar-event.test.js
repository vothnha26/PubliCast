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

  describe('createEvent — isSystem escalation fix', () => {
    it('should always create the event as isSystem:false regardless of what the caller sends', async () => {
      prisma.calendarEvent.create.mockResolvedValue({ id: 'ev-1', isSystem: false, brandId: 'brand-abc' });

      // Attacker-style payload trying to create a platform-wide event
      await calendarEventService.createEvent(
        { title: 'FAKE HOLIDAY', description: 'x', eventDate: '2026-01-01', isSystem: true },
        'brand-abc'
      );

      expect(prisma.calendarEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          brandId: 'brand-abc',
          isSystem: false
        })
      });
    });

    it('should never null out brandId based on the isSystem flag in the payload', async () => {
      prisma.calendarEvent.create.mockResolvedValue({ id: 'ev-2' });

      await calendarEventService.createEvent(
        { title: 'Another fake holiday', eventDate: '2026-02-01', isSystem: 'true' },
        'brand-abc'
      );

      const call = prisma.calendarEvent.create.mock.calls[0][0];
      expect(call.data.brandId).toBe('brand-abc');
    });
  });

  describe('deleteEvent — system event protection', () => {
    it('should reject deleting a system event even when brandId matches nothing in particular', async () => {
      prisma.calendarEvent.findUnique.mockResolvedValue({ id: 'sys-1', isSystem: true, brandId: null });

      await expect(
        calendarEventService.deleteEvent('sys-1', 'brand-abc')
      ).rejects.toMatchObject({ statusCode: 403 });

      expect(prisma.calendarEvent.delete).not.toHaveBeenCalled();
    });

    it('should reject deleting an event belonging to a different brand', async () => {
      prisma.calendarEvent.findUnique.mockResolvedValue({ id: 'ev-3', isSystem: false, brandId: 'brand-victim' });

      await expect(
        calendarEventService.deleteEvent('ev-3', 'brand-attacker')
      ).rejects.toMatchObject({ statusCode: 403 });

      expect(prisma.calendarEvent.delete).not.toHaveBeenCalled();
    });

    it('should allow deleting a non-system event owned by the caller\'s brand', async () => {
      prisma.calendarEvent.findUnique.mockResolvedValue({ id: 'ev-4', isSystem: false, brandId: 'brand-abc' });
      prisma.calendarEvent.delete.mockResolvedValue({ id: 'ev-4' });

      await calendarEventService.deleteEvent('ev-4', 'brand-abc');

      expect(prisma.calendarEvent.delete).toHaveBeenCalledWith({ where: { id: 'ev-4' } });
    });

    it('should throw 404 when the event does not exist', async () => {
      prisma.calendarEvent.findUnique.mockResolvedValue(null);

      await expect(
        calendarEventService.deleteEvent('missing', 'brand-abc')
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});
