const prisma = require('../../config/prisma');

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
   * Parse ICS content and import events
   */
  async importIcs(brandId, icsContent) {
    // Parser dùng regex phân tích file .ics chuẩn
    const lines = icsContent.split(/\r?\n/);
    const events = [];
    let currentEvent = null;

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
            currentEvent.title = value;
          } else if (key === 'DESCRIPTION') {
            currentEvent.description = value.replace(/\\n/g, '\n').replace(/\\,/g, ',');
          } else if (key === 'DTSTART') {
            // Parse date format: 20261224T000000Z hoặc 20261224
            let dateStr = value;
            if (dateStr.includes('VALUE=DATE:')) {
              dateStr = dateStr.split('VALUE=DATE:')[1];
            }
            
            const y = dateStr.substring(0, 4);
            const m = dateStr.substring(4, 6);
            const d = dateStr.substring(6, 8);
            
            if (y && m && d) {
              const dateObj = new Date(`${y}-${m}-${d}T00:00:00.000Z`);
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

    // Lưu vào database
    const createdEvents = [];
    for (const ev of events) {
      const eventRecord = await prisma.calendarEvent.create({
        data: {
          brandId,
          title: ev.title,
          description: ev.description || '',
          eventDate: ev.date,
          isSystem: false
        }
      });
      createdEvents.push(eventRecord);
    }

    return createdEvents;
  }

  /**
   * Create a custom system or brand event
   */
  async createEvent(data, brandId) {
    return prisma.calendarEvent.create({
      data: {
        brandId: data.isSystem ? null : brandId,
        title: data.title,
        description: data.description || '',
        eventDate: new Date(data.eventDate),
        isSystem: data.isSystem === true || data.isSystem === 'true'
      }
    });
  }

  /**
   * Delete an event
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

    // Chỉ xoá được nếu là event hệ thống (admin) hoặc đúng brandId sở hữu
    if (!event.isSystem && event.brandId !== brandId) {
      const err = new Error('Unauthorized to delete this event');
      err.statusCode = 403;
      throw err;
    }

    return prisma.calendarEvent.delete({
      where: { id: eventId }
    });
  }
}

module.exports = new CalendarEventService();
