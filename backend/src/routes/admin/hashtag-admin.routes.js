const express = require('express');
const hashtagAdminController = require('../../controllers/admin/hashtag-admin.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/authorization.middleware');
const { USER_ROLES } = require('../../utils/constants');

const router = express.Router();

// Áp dụng bảo vệ xác thực và chỉ cho phép ADMIN truy cập
router.use(verifyAuth);
router.use(authorize(USER_ROLES.ADMIN));

/**
 * GET /api/admin/hashtags
 * Lấy toàn bộ snapshot trending hashtag đã lưu trong hệ thống
 */
router.get('/', hashtagAdminController.getTrendingSnapshots);

/**
 * POST /api/admin/hashtags/sync
 * Chủ động kéo dữ liệu trending hashtag mới nhất từ API ngoài và cập nhật xuống DB/Redis
 */
router.post('/sync', hashtagAdminController.syncTrendingHashtags);

module.exports = router;
