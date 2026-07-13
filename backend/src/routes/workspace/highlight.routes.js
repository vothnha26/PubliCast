const express = require('express');
const highlightController = require('../../controllers/workspace/highlight.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');

const router = express.Router();

// Middleware to verify Python Worker Secret (optional but recommended)
const verifyWorkerSecret = (req, res, next) => {
  const secret = req.body.secret;
  if (!secret || secret !== process.env.WORKER_SECRET) {
    console.warn('Worker secret missing or invalid');
    if (process.env.WORKER_SECRET) {
      return res.status(403).json({ status: 'fail', message: 'Forbidden' });
    }
  }
  next();
};

// Route for Frontend to submit a YouTube URL
router.post('/import', verifyAuth, highlightController.createHighlight);

// Route for Frontend to poll status
router.get('/:id/status', verifyAuth, highlightController.getHighlight);

// Route for Python Colab Worker to send the completion callback
router.put('/:id/complete', verifyWorkerSecret, highlightController.updateHighlightCallback);

// Route for Frontend to publish highlight to YouTube Shorts
router.post('/:id/publish-youtube', verifyAuth, highlightController.publishHighlightToYouTube);

module.exports = router;
