const express = require('express');
const profileController = require('../controllers/profile.controller');
const { verifyAuth } = require('../middlewares/auth.middleware');
const { authorizeUser, authorizeAdmin, authorizeAny } = require('../middlewares/authorization.middleware');
const { editProfileValidation } = require('../middlewares/validation.middleware');

const router = express.Router();

// User profile - requires USER role
router.get('/user/profile', verifyAuth, authorizeUser, profileController.getUserProfile);

// Admin profile - requires ADMIN role
router.get('/admin/profile', verifyAuth, authorizeAdmin, profileController.getAdminProfile);

// Edit profile - requires authentication
router.put('/profile/edit', verifyAuth, editProfileValidation, profileController.editProfile);

module.exports = router;
