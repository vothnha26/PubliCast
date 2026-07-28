const express = require('express');
const tiktokControllerV2 = require('../../controllers/social/tiktok.controller.v2');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const checkPermission = require('../../middlewares/permission.middleware');
const { requireBrandMember } = checkPermission;

const router = express.Router();

router.get('/published-videos', verifyAuth, requireBrandMember, tiktokControllerV2.getTikTokPublishedVideos);

module.exports = router;
