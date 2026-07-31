const express = require('express');
const router = express.Router();

/**
 * @openapi
 * tags:
 *   name: System Core V2
 *   description: System Health, Metrics & Global Platform Configuration (v2 Envelope API)
 */

/**
 * @openapi
 * /v2/system/health:
 *   get:
 *     summary: System healthcheck endpoint
 *     tags: [System Core V2]
 *     responses:
 *       200:
 *         description: System operational status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "System healthy" }
 *                 data:
 *                   type: object
 *                   properties:
 *                     status: { type: string, example: "UP" }
 *                     timestamp: { type: string }
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    message: 'System healthy',
    data: {
      status: 'UP',
      timestamp: new Date().toISOString()
    }
  });
});

module.exports = router;
