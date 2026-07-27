const express = require('express');
const router = express.Router();
const userController = require('../../controllers/admin/user.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const { authorizeAdmin } = require('../../middlewares/authorization.middleware');

// Áp dụng bảo vệ route: chỉ cho phép tài khoản đăng nhập có role ADMIN
router.use(verifyAuth, authorizeAdmin);

router.get('/', userController.listUsers);
router.patch('/:id/status', userController.changeStatus);
router.patch('/:id/role', userController.changeRole);

module.exports = router;
