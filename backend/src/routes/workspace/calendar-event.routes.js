const express = require('express');
const multer = require('multer');
const calendarEventController = require('../../controllers/workspace/calendar-event.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const checkPermission = require('../../middlewares/permission.middleware');

const router = express.Router();
// ICS files are plain text calendars — a few MB comfortably covers even
// thousands of events. Without this, multer's default (no limit) plus
// memoryStorage meant an uploaded file of arbitrary size was held entirely
// in RAM before parsing ever started.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Auth verification
router.use(verifyAuth);

/**
 * GET /api/calendar-events
 * brandId is optional (omitting it returns only shared/system events), so
 * brand-ownership is checked inline in the controller rather than via a
 * route-level middleware that would 400 on a missing brandId.
 */
router.get('/', calendarEventController.getEvents);

/**
 * POST /api/calendar-events
 */
router.post('/', checkPermission('CREATE_POSTS'), calendarEventController.createEvent);

/**
 * POST /api/calendar-events/import-ics
 * multer MUST run before checkPermission — this is a multipart/form-data
 * request, so req.body.brandId does not exist until multer parses the body.
 * With the old order, checkPermission always read req.body as empty and 400'd
 * with "brandId is required" regardless of what the client sent.
 */
router.post('/import-ics', upload.single('file'), checkPermission('CREATE_POSTS'), calendarEventController.importIcs);

/**
 * GET /api/calendar-events/export-ics
 * Exports both calendar events AND scheduled/published Post content (caption,
 * status) for the brand — requires brand membership, not just a valid JWT.
 */
router.get('/export-ics', checkPermission.requireBrandMember, calendarEventController.exportIcs);

/**
 * DELETE /api/calendar-events/:id
 */
router.delete('/:id', checkPermission('DELETE_POSTS'), calendarEventController.deleteEvent);

module.exports = router;
