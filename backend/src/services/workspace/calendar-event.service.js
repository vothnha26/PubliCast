const prisma = require('../../config/prisma');

// A 5MB .ics file (Multer's cap) of minimal VEVENT blocks can contain roughly
// 100,000 events — importing that many one row-per-round-trip would hold a
// request open for a very long time and flood the DB connection pool (#63).
const MAX_IMPORT_EVENTS = 1000;

class CalendarEventService {
  /**
   * Get events for a brand within a date range
   */
  async getEvents(brandId, startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    return prisma.calendarEvent.findMany({
      where: {
        OR: [
          { isSystem: true }, // Ngày lễ quốc tế/chung
          { brandId: brandId } // Ngày lễ riêng của brand
        ],
        eventDate: {
          gte: start,
          lte: end
        }
      },
      orderBy: {
        eventDate: 'asc'
      }
    });
  }

  /**
   * Parse ICS content and import events as Posts (DRAFT). exportIcs emits
   * VEVENTs sourced from Post rows (see exportIcs below) with the platform
   * list embedded in DESCRIPTION as "Nền tảng: X, Y" — importIcs mirrors
   * that back into Post.targetPlatforms so an export→import round-trip
   * restores real posts on the Planner calendar, not orphan CalendarEvent
   * notes nothing on the Planner reads.
   */
  async importIcs(brandId, icsContent, createdByUserId) {
    // Parser dùng regex phân tích file .ics chuẩn và hỗ trợ ghép dòng bị gập (folding)
    const rawLines = icsContent.split(/\r?\n/);
    const lines = [];
    for (const line of rawLines) {
      if (line.startsWith(' ') || line.startsWith('\t')) {
        if (lines.length > 0) {
          lines[lines.length - 1] += line.slice(1);
        }
      } else {
        lines.push(line);
      }
    }

    const events = [];
    let currentEvent = null;

    const unescapeValue = (str) => {
      if (!str) return '';
      return str
        .replace(/\\n/gi, '\n')
        .replace(/\\,/g, ',')
        .replace(/\\;/g, ';')
        .replace(/\\\\/g, '\\');
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === 'BEGIN:VEVENT') {
        currentEvent = {};
      } else if (line === 'END:VEVENT') {
        if (currentEvent && currentEvent.title && currentEvent.date) {
          events.push(currentEvent);
        }
        currentEvent = null;
      } else if (currentEvent) {
        // Parse key-value. Ví dụ: SUMMARY:Christmas Eve
        const match = line.match(/^([A-Z0-9-]+)(;[^:]+)?:(.*)$/i);
        if (match) {
          const key = match[1].toUpperCase();
          const value = match[3];

          if (key === 'SUMMARY') {
            // exportIcs prefixes real posts with a status label, e.g.
            // "[⏰ Đã đặt lịch] Product Launch Announcement" — strip it back
            // off so the imported Post.title matches the original.
            currentEvent.title = unescapeValue(value).replace(/^\[[^\]]*\]\s*/, '');
          } else if (key === 'DESCRIPTION') {
            const desc = unescapeValue(value);
            currentEvent.description = desc;
            const platformMatch = desc.match(/Nền tảng:\s*([^\n]+)/);
            if (platformMatch) {
              currentEvent.targetPlatforms = platformMatch[1]
                .split(',')
                .map((p) => p.trim())
                .filter(Boolean)
                .join(',');
            }
          } else if (key === 'DTSTART') {
            // Parse date format: 20261224T000000Z hoặc 20261224
            const dateStr = value;

            const y = dateStr.substring(0, 4);
            const m = dateStr.substring(4, 6);
            const d = dateStr.substring(6, 8);
            
            if (y && m && d) {
              let dateObj;
              if (dateStr.includes('T')) {
                const tStr = dateStr.split('T')[1];
                const hh = tStr.substring(0, 2) || '00';
                const mm = tStr.substring(2, 4) || '00';
                const ss = tStr.substring(4, 6) || '00';
                dateObj = new Date(`${y}-${m}-${d}T${hh}:${mm}:${ss}.000Z`);
              } else {
                dateObj = new Date(`${y}-${m}-${d}T00:00:00.000Z`);
              }
              
              if (!isNaN(dateObj.getTime())) {
                currentEvent.date = dateObj;
              }
            }
          }
        }
      }
    }

    if (events.length === 0) {
      throw new Error('No valid events found in the uploaded ICS file.');
    }
    if (events.length > MAX_IMPORT_EVENTS) {
      const error = new Error(`File ICS chứa quá nhiều sự kiện (${events.length}). Tối đa ${MAX_IMPORT_EVENTS} sự kiện mỗi lần import.`);
      error.statusCode = 400;
      throw error;
    }

    // createMany thay vì loop create tuần tự — tránh N round-trip DB cho 1
    // upload (#63). Không trả về id record đã tạo (giới hạn của createMany),
    // nên đọc lại theo brandId + khoảng thời gian import để trả về cho caller.
    // type luôn IMAGE — file .ics không mang media gốc, người dùng chỉnh lại
    // loại bài viết thật (video/ảnh/...) sau khi import.
    const importStartedAt = new Date();
    await prisma.post.createMany({
      data: events.map(ev => ({
        brandId,
        createdByUserId,
        title: ev.title,
        caption: ev.title,
        type: 'IMAGE',
        status: 'DRAFT',
        targetPlatforms: ev.targetPlatforms || '',
        scheduledAt: ev.date
      }))
    });

    return prisma.post.findMany({
      where: { brandId, isDeleted: false, createdAt: { gte: importStartedAt } },
      orderBy: { scheduledAt: 'asc' }
    });
  }

  /**
   * Create a brand event. isSystem is always false here — there is no admin
   * surface yet for managing shared/system calendar events, so this method
   * never accepts an isSystem flag from the caller (it previously did,
   * letting any authenticated user with CREATE_POSTS create a "holiday"
   * visible to every brand on the platform).
   */
  async createEvent(data, brandId) {
    return prisma.calendarEvent.create({
      data: {
        brandId,
        title: data.title,
        description: data.description || '',
        eventDate: new Date(data.eventDate),
        isSystem: false
      }
    });
  }

  /**
   * Delete a brand-owned event. System events can't be deleted through this
   * path at all — there's no admin surface for managing them yet, and a
   * brand-scoped delete should never be able to remove a platform-wide entry.
   */
  async deleteEvent(eventId, brandId) {
    const event = await prisma.calendarEvent.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      const err = new Error('Event not found');
      err.statusCode = 404;
      throw err;
    }

    if (event.isSystem || event.brandId !== brandId) {
      const err = new Error('Unauthorized to delete this event');
      err.statusCode = 403;
      throw err;
    }

    return prisma.calendarEvent.delete({
      where: { id: eventId }
    });
  }

  /**
   * Export calendar events and scheduled/published posts to ICS string format
   */
  async exportIcs(brandId, startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // 1. Fetch calendar events
    const events = await prisma.calendarEvent.findMany({
      where: {
        OR: [
          { isSystem: true },
          { brandId: brandId }
        ],
        eventDate: {
          gte: start,
          lte: end
        }
      }
    });

    // 2. Fetch posts that are scheduled or published
    const posts = await prisma.post.findMany({
      where: {
        brandId,
        isDeleted: false,
        OR: [
          {
            scheduledAt: {
              gte: start,
              lte: end
            }
          },
          {
            publishedAt: {
              gte: start,
              lte: end
            }
          }
        ]
      }
    });

    // Helper to format date for ICS: YYYYMMDDTHHMMSSZ
    const formatIcsDate = (date) => {
      if (!date) return '';
      const d = new Date(date);
      return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    // Helper to escape values for ICS property compatibility (escapes backslashes, commas, semicolons, and newlines)
    const escapeIcsValue = (str) => {
      if (!str) return '';
      return str
        .replace(/\\/g, '\\\\')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;')
        .replace(/\r?\n/g, '\\n');
    };

    // Build ICS content
    let icsContent = 'BEGIN:VCALENDAR\r\n';
    icsContent += 'VERSION:2.0\r\n';
    icsContent += 'PRODID:-//PubliCast//Planner Calendar v1.0//EN\r\n';
    icsContent += 'CALSCALE:GREGORIAN\r\n';

    // Add Events
    for (const ev of events) {
      const dtStamp = formatIcsDate(ev.createdAt || new Date());
      const dtStart = formatIcsDate(ev.eventDate);
      
      // End date: +1 day since standard events are usually all-day or short
      const endDateObj = new Date(ev.eventDate);
      endDateObj.setDate(endDateObj.getDate() + 1);
      const dtEnd = formatIcsDate(endDateObj);

      icsContent += 'BEGIN:VEVENT\r\n';
      icsContent += `UID:event_${ev.id}@publicast.com\r\n`;
      icsContent += `DTSTAMP:${dtStamp}\r\n`;
      icsContent += `DTSTART:${dtStart}\r\n`;
      icsContent += `DTEND:${dtEnd}\r\n`;
      icsContent += `SUMMARY:${escapeIcsValue(ev.title)}\r\n`;
      icsContent += `DESCRIPTION:${escapeIcsValue(ev.description)}\r\n`;
      icsContent += 'END:VEVENT\r\n';
    }

    // Add Posts
    for (const post of posts) {
      const dtStamp = formatIcsDate(post.createdAt);
      const postDate = post.scheduledAt || post.publishedAt;
      const dtStart = formatIcsDate(postDate);

      // Post standard event duration is 1 hour
      const endDateObj = new Date(postDate);
      endDateObj.setHours(endDateObj.getHours() + 1);
      const dtEnd = formatIcsDate(endDateObj);

      const statusLabel = post.status === 'PUBLISHED' ? '📢 Đã đăng' : '⏰ Đã đặt lịch';
      const platforms = post.targetPlatforms ? post.targetPlatforms.split(',').join(', ') : 'N/A';
      const desc = `Nội dung: ${post.caption || ''}\nNền tảng: ${platforms}\nTrạng thái: ${post.status}`;

      icsContent += 'BEGIN:VEVENT\r\n';
      icsContent += `UID:post_${post.id}@publicast.com\r\n`;
      icsContent += `DTSTAMP:${dtStamp}\r\n`;
      icsContent += `DTSTART:${dtStart}\r\n`;
      icsContent += `DTEND:${dtEnd}\r\n`;
      icsContent += `SUMMARY:${escapeIcsValue(`[${statusLabel}] ${post.title}`)}\r\n`;
      icsContent += `DESCRIPTION:${escapeIcsValue(desc)}\r\n`;
      icsContent += 'END:VEVENT\r\n';
    }

    icsContent += 'END:VCALENDAR\r\n';
    return icsContent;
  }
}

module.exports = new CalendarEventService();
