const express = require('express');
const profileController = require('../controllers/profile.controller');
const { verifyAuth } = require('../middlewares/auth.middleware');
const { authorizeUser, authorizeAdmin } = require('../middlewares/authorization.middleware');

const router = express.Router();

// User profile - requires USER role
router.get('/user/profile', verifyAuth, authorizeUser, profileController.getUserProfile);

// Admin profile - requires ADMIN role
router.get('/admin/profile', verifyAuth, authorizeAdmin, profileController.getAdminProfile);

module.exports = router;
