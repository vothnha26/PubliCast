import assert from 'node:assert';
import { validatePostForm } from './postValidation.js';
import { PLATFORMS } from '../constants/platforms.js';

console.log("🧪 Starting Automated Validation Tests for postValidation.js...");

// Test 1: Shared template post validation (No errors when valid)
{
  const errors = validatePostForm({
    selectedPlatforms: [PLATFORMS.FACEBOOK],
    facebookType: 'post',
    postMedia: [{ path: 'test.jpg', previewUrl: 'http://localhost/test.jpg' }],
    captionText: 'Hello world'
  });
  assert.strictEqual(errors.length, 0, 'Test 1 Failed: Expected 0 errors for valid Facebook post');
  console.log("✅ Test 1 Passed: Valid shared template post passes validation.");
}

// Test 2: Fix Bug #5 — Per-account independent media validation
// Account A has 2 images, Account B has 3 images.
// Previously, flatMap merged them into 5 images causing false-positive validation errors if limit was smaller.
{
  const errors = validatePostForm({
    selectedPlatforms: [PLATFORMS.INSTAGRAM],
    instagramType: 'post',
    captionText: 'Multi account post',
    networkCustom: {
      instagram: {
        useTemplate: true,
        perAccount: {
          'acc-1': {
            useTemplate: false,
            caption: 'Caption A',
            mediaUrls: [{ path: 'a1.jpg' }, { path: 'a2.jpg' }]
          },
          'acc-2': {
            useTemplate: false,
            caption: 'Caption B',
            mediaUrls: [{ path: 'b1.jpg' }, { path: 'b2.jpg' }, { path: 'b3.jpg' }]
          }
        }
      }
    }
  });

  // Neither account A (2 photos) nor account B (3 photos) exceeds Instagram limits
  assert.strictEqual(errors.length, 0, 'Test 2 Failed: Multi-account media should be validated independently without flatMap merging.');
  console.log("✅ Test 2 Passed: Fix Bug #5 verified (Per-account media validated independently).");
}

// Test 3: Fix Bug #6 — Custom media format resolution
// Account has custom JPG media, global has video. Format check should use custom media item format (.jpg), not global video format (.mp4).
{
  const errors = validatePostForm({
    selectedPlatforms: [PLATFORMS.INSTAGRAM],
    instagramType: 'post',
    videoFileUrl: 'http://localhost/video.mp4',
    uploadedVideoPath: 'video.mp4',
    networkCustom: {
      instagram: {
        useTemplate: false,
        mediaUrls: [{ path: 'photo.jpg' }]
      }
    }
  });

  // Instagram post allows image. Format resolved from slot media ('photo.jpg') -> 'jpg', not 'mp4'.
  assert.strictEqual(errors.length, 0, 'Test 3 Failed: Format should be extracted from custom slot media item.');
  console.log("✅ Test 3 Passed: Fix Bug #6 verified (Slot media format resolved directly from custom item).");
}

// Test 5: Verify NO double-push of media error when platformLimits is provided (Bug #3.2 & #4.1)
{
  const errors = validatePostForm({
    selectedPlatforms: [PLATFORMS.YOUTUBE],
    youtubeType: 'video',
    postMedia: [],
    captionText: '',
    youtubeTitle: 'Test Title',
    youtubeMadeForKids: false,
    platformLimits: [
      {
        platform: 'YOUTUBE',
        subType: 'VIDEO',
        maxCaptionLength: 5000
      }
    ]
  });

  const youtubeErrors = errors.filter(e => e.includes('YouTube uploads require a video file'));
  assert.strictEqual(youtubeErrors.length, 1, 'Test 5 Failed: YouTube missing video error should ONLY be pushed once (no double-push).');
  console.log("✅ Test 5 Passed: Bug #3.2 verified (No double-push of media error).");
}

// Test 6: Verify buildNetworkOverrides for Threads chain post
{
  const { buildNetworkOverrides } = await import('./buildNetworkOverrides.js');
  const overrides = buildNetworkOverrides({
    networkCustom: {
      threads: {
        useTemplate: false,
        threadPosts: [
          { text: 'First post in thread', mediaUrls: [] },
          { text: 'Second post in thread', mediaUrls: [{ path: 'image.jpg' }] }
        ]
      }
    },
    selectedPlatforms: [PLATFORMS.THREADS],
    selectedAccountIds: ['acc-threads-1'],
    activeBrand: {
      socialAccounts: [
        { id: 'acc-threads-1', platform: 'THREADS' }
      ]
    }
  });

  assert.strictEqual(overrides.length, 1, 'Test 6 Failed: Expected 1 override for Threads');
  assert.strictEqual(overrides[0].platform, 'THREADS');
  assert.strictEqual(overrides[0].threadPosts.length, 2);
  assert.strictEqual(overrides[0].threadPosts[1].mediaUrls[0], 'image.jpg');
  console.log("✅ Test 6 Passed: buildNetworkOverrides for Threads chain verified.");
}

// Test 7: Verify buildNetworkOverrides per-account customization & orphan guard
{
  const { buildNetworkOverrides } = await import('./buildNetworkOverrides.js');
  const overrides = buildNetworkOverrides({
    networkCustom: {
      facebook: {
        useTemplate: false,
        caption: 'Custom FB Caption',
        mediaUrls: [{ path: 'fb.jpg' }]
      },
      youtube: {
        useTemplate: false,
        caption: 'Custom YT Description',
        mediaUrls: []
      }
    },
    selectedPlatforms: [PLATFORMS.FACEBOOK], // YouTube NOT selected
    selectedAccountIds: ['acc-fb-1'],
    activeBrand: {
      socialAccounts: [
        { id: 'acc-fb-1', platform: 'FACEBOOK' },
        { id: 'acc-yt-1', platform: 'YOUTUBE' }
      ]
    }
  });

  assert.strictEqual(overrides.length, 1, 'Test 7 Failed: Expected only 1 override for selected platform Facebook');
  assert.strictEqual(overrides[0].platform, 'FACEBOOK');
  assert.strictEqual(overrides[0].caption, 'Custom FB Caption');
  assert.strictEqual(overrides[0].mediaUrls[0], 'fb.jpg');
  console.log("✅ Test 7 Passed: buildNetworkOverrides selected platform filtering & serialization verified.");
}

// Test 8: Verify NO double-push of media error when platformLimits is NOT provided (Static registry fallback)
{
  const errors = validatePostForm({
    selectedPlatforms: [PLATFORMS.TIKTOK],
    postMedia: [],
    captionText: 'Test TikTok post'
  });

  const tikTokErrors = errors.filter(e => e.includes('TikTok posts require a video file'));
  assert.strictEqual(tikTokErrors.length, 1, 'Test 8 Failed: TikTok missing video error should ONLY be pushed once in fallback static mode.');
  console.log("✅ Test 8 Passed: Static registry fallback verified (No double-push of media error).");
}

console.log("🎉 All 8 Automated Validation Tests Passed Successfully!");

