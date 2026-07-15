const express = require('express');
const mediaFolderController = require('../../controllers/workspace/media-folder.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const checkPermission = require('../../middlewares/permission.middleware');
const { PERMISSION_KEYS } = require('../../utils/constants');

const router = express.Router();

router.use(verifyAuth);

router.get('/', checkPermission(PERMISSION_KEYS.MANAGE_MEDIA), mediaFolderController.getFolders);
router.post('/', checkPermission(PERMISSION_KEYS.MANAGE_MEDIA), mediaFolderController.createFolder);
router.put('/:id', checkPermission(PERMISSION_KEYS.MANAGE_MEDIA), mediaFolderController.updateFolder);
router.delete('/:id', checkPermission(PERMISSION_KEYS.MANAGE_MEDIA), mediaFolderController.deleteFolder);

module.exports = router;
