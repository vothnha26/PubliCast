const express = require('express');
const youtubeControllerV2 = require('../../controllers/social/youtube.controller.v2');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const checkPermission = require('../../middlewares/permission.middleware');
const { requireBrandMember } = checkPermission;

const router = express.Router();

router.post('/track', verifyAuth, requireBrandMember, youtubeControllerV2.trackYouTubeVideo);
router.get('/tracked-videos', verifyAuth, requireBrandMember, youtubeControllerV2.getTrackedVideos);
router.get('/published-videos', verifyAuth, requireBrandMember, youtubeControllerV2.getYouTubePublishedVideos);
router.put('/videos', verifyAuth, requireBrandMember, youtubeControllerV2.updateYouTubeVideo);
router.get('/video-analytics', verifyAuth, requireBrandMember, youtubeControllerV2.getYouTubeVideoAnalytics);
router.get('/video-insights', verifyAuth, requireBrandMember, youtubeControllerV2.getYouTubeVideoInsights);
router.get('/playlists', verifyAuth, requireBrandMember, youtubeControllerV2.getYouTubePlaylists);
router.get('/video-categories', verifyAuth, requireBrandMember, youtubeControllerV2.getYouTubeVideoCategories);
router.get('/search-channels', verifyAuth, requireBrandMember, youtubeControllerV2.searchYouTubeChannels);
router.post('/competitors', verifyAuth, requireBrandMember, youtubeControllerV2.addYouTubeCompetitor);
router.get('/competitors', verifyAuth, requireBrandMember, youtubeControllerV2.getYouTubeCompetitors);
router.delete('/competitors/:id', verifyAuth, youtubeControllerV2.deleteYouTubeCompetitor);

module.exports = router;
