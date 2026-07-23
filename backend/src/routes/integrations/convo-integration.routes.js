const express = require('express');
const router = express.Router();

const { verifyHmac } = require('../../middlewares/hmac-auth.middleware');
const integrationRateLimiter = require('../../middlewares/integration-rate-limit.middleware');
const convoIntegrationController = require('../../controllers/integrations/convo-integration.controller');

router.post(
  '/verify-token',
  integrationRateLimiter.middleware(),
  verifyHmac(),
  convoIntegrationController.verifyToken
);

router.get(
  '/brand/:brandId/user-permissions',
  verifyHmac('headers'),
  convoIntegrationController.getUserPermissions
);

module.exports = router;
