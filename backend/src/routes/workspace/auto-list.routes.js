const express = require('express');
const autoListController = require('../../controllers/workspace/auto-list.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const checkPermission = require('../../middlewares/permission.middleware');
const { PERMISSION_KEYS } = require('../../utils/constants');

const router = express.Router();

router.use(verifyAuth);

// GET/POST have brandId in the request (query/body), so the standard route
// middleware can check it directly.
router.get('/', checkPermission(PERMISSION_KEYS.CREATE_POSTS), autoListController.getAutoLists);
router.post('/', checkPermission(PERMISSION_KEYS.CREATE_POSTS), autoListController.createAutoList);

// :id-based routes have no brandId in the request — the service resolves the
// AutoList's brandId itself and checks permission there (see auto-list.service.js
// _assertCanManage), same pattern used by team.service.js/role.service.js.
router.get('/:id', autoListController.getAutoListDetails);
router.put('/:id', autoListController.updateAutoList);
router.delete('/:id', autoListController.deleteAutoList);
router.patch('/:id/toggle', autoListController.toggleStatus);
router.put('/:id/reorder', autoListController.reorderPosts);

module.exports = router;
