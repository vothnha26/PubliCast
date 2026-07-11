const calendarEventService = require('../../services/workspace/calendar-event.service');
const asyncHandler = require('../../utils/async-handler');

class CalendarEventController {
  /**
   * GET /api/calendar-events
   */
  getEvents = asyncHandler(async (req, res) => {
    const { brandId, startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'startDate and endDate are required' });
    }

    const events = await calendarEventService.getEvents(brandId || null, startDate, endDate);
    res.status(200).json({
      message: 'Calendar events retrieved successfully',
      data: events
    });
  });

  /**
   * POST /api/calendar-events
   */
  createEvent = asyncHandler(async (req, res) => {
    const { brandId } = req.body;
    const event = await calendarEventService.createEvent(req.body, brandId);
    res.status(201).json({
      message: 'Calendar event created successfully',
      data: event
    });
  });

  /**
   * POST /api/calendar-events/import-ics
   */
  importIcs = asyncHandler(async (req, res) => {
    const { brandId } = req.body;
    if (!brandId) {
      return res.status(400).json({ message: 'brandId is required' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an ICS (.ics) file' });
    }

    const icsContent = req.file.buffer.toString('utf-8');
    const importedEvents = await calendarEventService.importIcs(brandId, icsContent);

    res.status(200).json({
      message: `Successfully imported ${importedEvents.length} calendar events`,
      data: importedEvents
    });
  });

  /**
   * DELETE /api/calendar-events/:id
   */
  deleteEvent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { brandId } = req.query;

    await calendarEventService.deleteEvent(id, brandId);
    res.status(200).json({
      message: 'Calendar event deleted successfully'
    });
  });

  /**
   * GET /api/calendar-events/export-ics
   */
  exportIcs = asyncHandler(async (req, res) => {
    const { brandId, startDate, endDate } = req.query;
    if (!brandId || !startDate || !endDate) {
      return res.status(400).json({ message: 'brandId, startDate, and endDate are required' });
    }

    const icsString = await calendarEventService.exportIcs(brandId, startDate, endDate);
    
    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', 'attachment; filename="publicast-planner.ics"');
    return res.status(200).send(icsString);
  });
}

module.exports = new CalendarEventController();
