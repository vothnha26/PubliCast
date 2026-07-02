const express = require('express');
const profileController = require('../../controllers/auth/profile.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const {
  authorizeUser,
  authorizeAdmin,
  authorizeAny,
} = require('../../middlewares/authorization.middleware');
const {
  editProfileValidation,
} = require('../../middlewares/validation.middleware');

const multer = require('multer');
const path = require('path');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// User profile - all roles can access their own profile
router.get(
  '/user/profile',
  verifyAuth,
  authorizeAny,
  profileController.getUserProfile
);

// Admin profile - requires ADMIN role
router.get(
  '/admin/profile',
  verifyAuth,
  authorizeAdmin,
  profileController.getAdminProfile
);

// Edit profile - requires authentication
router.put(
  '/profile/edit',
  verifyAuth,
  editProfileValidation,
  profileController.editProfile
);

// Upload avatar - requires authentication
router.post(
  '/upload/avatar',
  verifyAuth,
  upload.single('avatar'),
  profileController.uploadAvatar
);

// Unlink social account - requires authentication
router.delete(
  '/profile/accounts/:provider',
  verifyAuth,
  profileController.unlinkAccount
);

// Change password - requires authentication
router.put(
  '/profile/change-password',
  verifyAuth,
  profileController.changePassword
);

// Set default brand - requires authentication
router.put(
  '/profile/default-brand',
  verifyAuth,
  profileController.setDefaultBrand
);

module.exports = router;
