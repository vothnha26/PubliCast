const calendarEventService = require('../../services/workspace/calendar-event.service');
const authorizationFacade = require('../../services/auth/authorization.facade');
const asyncHandler = require('../../utils/async-handler');
const { v2Success, v2Error } = require('../../utils/response.helper');

class CalendarEventControllerV2 {
  getEvents = asyncHandler(async (req, res) => {
    const { brandId, startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return v2Error(res, 'startDate and endDate are required', 400);
    }

    if (brandId) {
      const hasAccess = await authorizationFacade.checkBrandAccess(req.user.id, brandId);
      if (!hasAccess) {
        return v2Error(res, 'Bạn không có quyền truy cập thương hiệu này.', 403);
      }
    }

    const events = await calendarEventService.getEvents(brandId || null, startDate, endDate);
    v2Success(res, events, 'Calendar events retrieved successfully');
  });

  createEvent = asyncHandler(async (req, res) => {
    const { brandId } = req.body;
    const event = await calendarEventService.createEvent(req.body, brandId);
    v2Success(res, event, 'Calendar event created successfully', 201);
  });

  importIcs = asyncHandler(async (req, res) => {
    const { brandId } = req.body;
    if (!brandId) {
      return v2Error(res, 'brandId is required', 400);
    }

    if (!req.file) {
      return v2Error(res, 'Please upload an ICS (.ics) file', 400);
    }

    const icsContent = req.file.buffer.toString('utf-8');
    const importedPosts = await calendarEventService.importIcs(brandId, icsContent, req.user.id);

    v2Success(res, importedPosts, `Successfully imported ${importedPosts.length} posts`);
  });

  deleteEvent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { brandId } = req.query;
    if (!brandId) {
      return v2Error(res, 'brandId is required', 400);
    }

    await calendarEventService.deleteEvent(id, brandId);
    v2Success(res, null, 'Calendar event deleted successfully');
  });

  // Streams a raw .ics file, not JSON — keeps v1's exact response, no
  // v2Success envelope applicable here.
  exportIcs = asyncHandler(async (req, res) => {
    const { brandId, startDate, endDate } = req.query;
    if (!brandId || !startDate || !endDate) {
      return v2Error(res, 'brandId, startDate, and endDate are required', 400);
    }

    const icsString = await calendarEventService.exportIcs(brandId, startDate, endDate);

    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', 'attachment; filename="publicast-planner.ics"');
    return res.status(200).send(icsString);
  });
}

module.exports = new CalendarEventControllerV2();
