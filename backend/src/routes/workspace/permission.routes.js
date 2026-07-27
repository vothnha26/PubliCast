const express = require('express');
const permissionController = require('../../controllers/workspace/permission.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const { authorizeAdmin } = require('../../middlewares/authorization.middleware');

const router = express.Router();

router.use(verifyAuth);

// SystemPermission is a global catalog (not brand-scoped) — creating/deleting a key
// here affects every brand's CustomRole at once, so only system admins may write to it.
// Reading the catalog (e.g. to populate the role-editor UI) stays open to any authenticated user.
router.get('/', permissionController.getPermissions);
router.post('/', authorizeAdmin, permissionController.createPermission);
router.delete('/:key', authorizeAdmin, permissionController.deletePermission);

module.exports = router;
