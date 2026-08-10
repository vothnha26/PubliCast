import assert from 'node:assert';
import { getNetworkEntrySlot, setNetworkEntrySlot } from './networkEntrySlot.js';
import { buildDefaultNetworkCustom } from '../constants/postComposerNetwork.js';

console.log("🧪 Running Network Sync & Inheritance Tests...");

// Test 1: updateNetworkCaption preserves existing shared media when entering custom mode
{
  const postMedia = [{ path: 'image1.jpg', previewUrl: 'http://localhost/image1.jpg' }];
  const getEffectiveInitialMedia = () => [...postMedia];
  const caption = "Shared Caption";

  let networkCustom = buildDefaultNetworkCustom();
  const platformId = 'facebook';
  const accountId = null;

  // Simulate updateNetworkCaption
  const entry = networkCustom[platformId] || { useTemplate: true, caption: "", mediaUrls: [] };
  const current = getNetworkEntrySlot(entry, accountId);
  const wasTemplate = current.useTemplate !== false;
  const effectiveInitialMedia = getEffectiveInitialMedia();

  const mediaUrlsToKeep = wasTemplate && (current.mediaUrls?.length || 0) === 0
    ? effectiveInitialMedia
    : (current.mediaUrls || []);

  networkCustom[platformId] = setNetworkEntrySlot(entry, accountId, {
    ...current,
    useTemplate: false,
    caption: "Custom FB Caption",
    mediaUrls: mediaUrlsToKeep
  });

  const fbSlot = getNetworkEntrySlot(networkCustom[platformId], accountId);
  assert.strictEqual(fbSlot.useTemplate, false, 'FB should be custom mode');
  assert.strictEqual(fbSlot.caption, 'Custom FB Caption', 'FB caption should be updated');
  assert.strictEqual(fbSlot.mediaUrls.length, 1, 'FB media should be preserved from shared postMedia');
  assert.strictEqual(fbSlot.mediaUrls[0].path, 'image1.jpg', 'FB media path matches image1.jpg');
  console.log("✅ Test 1 Passed: updateNetworkCaption preserves shared media on initial edit.");
}

// Test 2: updateNetworkMedia preserves existing shared caption when entering custom mode
{
  const caption = "Shared Caption Text";
  let networkCustom = buildDefaultNetworkCustom();
  const platformId = 'instagram';
  const accountId = null;

  const entry = networkCustom[platformId] || { useTemplate: true, caption: "", mediaUrls: [] };
  const current = getNetworkEntrySlot(entry, accountId);
  const wasTemplate = current.useTemplate !== false;

  const captionToKeep = wasTemplate && !current.caption
    ? caption
    : (current.caption ?? "");

  const newMedia = [{ path: 'custom-ig.jpg' }];

  networkCustom[platformId] = setNetworkEntrySlot(entry, accountId, {
    ...current,
    useTemplate: false,
    caption: captionToKeep,
    mediaUrls: newMedia
  });

  const igSlot = getNetworkEntrySlot(networkCustom[platformId], accountId);
  assert.strictEqual(igSlot.useTemplate, false);
  assert.strictEqual(igSlot.caption, 'Shared Caption Text', 'Shared caption should be preserved when editing media');
  assert.strictEqual(igSlot.mediaUrls.length, 1);
  assert.strictEqual(igSlot.mediaUrls[0].path, 'custom-ig.jpg');
  console.log("✅ Test 2 Passed: updateNetworkMedia preserves shared caption on initial edit.");
}

// Test 3: Subsequent media deletion on customized channel retains 0 media
{
  let networkCustom = buildDefaultNetworkCustom();
  const platformId = 'facebook';
  const accountId = null;

  // Custom FB slot with 1 media
  networkCustom[platformId] = {
    useTemplate: false,
    caption: 'Custom FB Caption',
    mediaUrls: [{ path: 'fb1.jpg' }]
  };

  // Delete media
  const entry = networkCustom[platformId];
  const current = getNetworkEntrySlot(entry, accountId);
  const wasTemplate = current.useTemplate !== false;

  const captionToKeep = wasTemplate && !current.caption ? "Shared" : (current.caption ?? "");

  networkCustom[platformId] = setNetworkEntrySlot(entry, accountId, {
    ...current,
    useTemplate: false,
    caption: captionToKeep,
    mediaUrls: []
  });

  const fbSlot = getNetworkEntrySlot(networkCustom[platformId], accountId);
  assert.strictEqual(fbSlot.useTemplate, false);
  assert.strictEqual(fbSlot.caption, 'Custom FB Caption');
  assert.strictEqual(fbSlot.mediaUrls.length, 0, 'Media was explicitly deleted to 0 items');
  console.log("✅ Test 3 Passed: Explicit media deletion to 0 items is maintained without auto-reseeding.");
}

console.log("🎉 All Network Sync Tests Passed!");
