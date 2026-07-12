const express = require('express');
const multer = require('multer');
const calendarEventController = require('../../controllers/workspace/calendar-event.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const checkPermission = require('../../middlewares/permission.middleware');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Auth verification
router.use(verifyAuth);

/**
 * GET /api/calendar-events
 */
router.get('/', calendarEventController.getEvents);

/**
 * POST /api/calendar-events
 */
router.post('/', checkPermission('CREATE_POSTS'), calendarEventController.createEvent);

/**
 * POST /api/calendar-events/import-ics
 */
router.post('/import-ics', checkPermission('CREATE_POSTS'), upload.single('file'), calendarEventController.importIcs);

/**
 * GET /api/calendar-events/export-ics
 */
router.get('/export-ics', calendarEventController.exportIcs);

/**
 * DELETE /api/calendar-events/:id
 */
router.delete('/:id', checkPermission('DELETE_POSTS'), calendarEventController.deleteEvent);

module.exports = router;
