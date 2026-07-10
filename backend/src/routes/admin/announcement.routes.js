const express = require('express');
const announcementController = require('../../controllers/admin/announcement.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/authorization.middleware');
const { USER_ROLES } = require('../../utils/constants');

const router = express.Router();

// Áp dụng bảo vệ xác thực và chỉ cho phép ADMIN truy cập
router.use(verifyAuth);
router.use(authorize(USER_ROLES.ADMIN));

/**
 * GET /api/admin/announcements
 * Lấy danh sách toàn bộ thông báo hệ thống
 */
router.get('/', announcementController.getAnnouncements);

/**
 * POST /api/admin/announcements
 * Tạo và phát thông báo hệ thống mới
 */
router.post('/', announcementController.createAnnouncement);

/**
 * DELETE /api/admin/announcements/:id
 * Xóa thông báo hệ thống đã phát
 */
router.delete('/:id', announcementController.deleteAnnouncement);

module.exports = router;
