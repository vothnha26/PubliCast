import assert from 'node:assert';
import { buildNetworkOverrides } from './buildNetworkOverrides.js';
import { setNetworkEntrySlot } from './networkEntrySlot.js';
import { buildDefaultNetworkCustom } from '../constants/postComposerNetwork.js';
import { PLATFORMS } from '../constants/platforms.js';

console.log("🧪 Running Specialized Preset Channel Isolation Tests...");

// Test 1: Facebook per-account preset isolation
{
  const activeBrand = {
    id: 'brand-1',
    socialAccounts: [
      { id: 'fb-account-1', platform: 'FACEBOOK', displayName: 'FB Page 1' },
      { id: 'fb-account-2', platform: 'FACEBOOK', displayName: 'FB Page 2' },
    ]
  };

  let networkCustom = buildDefaultNetworkCustom();

  // Simulate updating preset setting (e.g. title) for fb-account-1
  networkCustom[PLATFORMS.FACEBOOK] = setNetworkEntrySlot(
    networkCustom[PLATFORMS.FACEBOOK],
    'fb-account-1',
    { settings: { title: 'Facebook Title Page 1', reelThumbnail: 'thumb1.jpg' } }
  );

  // Simulate updating preset setting for fb-account-2
  networkCustom[PLATFORMS.FACEBOOK] = setNetworkEntrySlot(
    networkCustom[PLATFORMS.FACEBOOK],
    'fb-account-2',
    { settings: { title: 'Facebook Title Page 2', reelThumbnail: 'thumb2.jpg' } }
  );

  const overrides = buildNetworkOverrides({
    networkCustom,
    selectedPlatforms: [PLATFORMS.FACEBOOK],
    selectedAccountIds: ['fb-account-1', 'fb-account-2'],
    activeBrand
  });

  assert.strictEqual(overrides.length, 2, 'Test 1 Failed: Expected 2 separate overrides for 2 FB accounts');

  const ov1 = overrides.find(o => o.socialAccountId === 'fb-account-1');
  const ov2 = overrides.find(o => o.socialAccountId === 'fb-account-2');

  assert.strictEqual(ov1.settings.title, 'Facebook Title Page 1', 'Account 1 title should be isolated in settings');
  assert.strictEqual(ov2.settings.title, 'Facebook Title Page 2', 'Account 2 title should be isolated in settings');
  console.log("✅ Test 1 Passed: Facebook per-account preset settings are completely isolated.");
}

// Test 2: YouTube per-channel category, privacy, and playlist isolation
{
  const activeBrand = {
    id: 'brand-1',
    socialAccounts: [
      { id: 'yt-channel-gaming', platform: 'YOUTUBE', displayName: 'Gaming Channel' },
      { id: 'yt-channel-vlog', platform: 'YOUTUBE', displayName: 'Vlog Channel' },
    ]
  };

  let networkCustom = buildDefaultNetworkCustom();

  // Gaming Channel settings
  networkCustom[PLATFORMS.YOUTUBE] = setNetworkEntrySlot(
    networkCustom[PLATFORMS.YOUTUBE],
    'yt-channel-gaming',
    { settings: { title: 'Gaming Stream Video', categoryId: '20', privacyStatus: 'public', playlistId: 'playlist-gaming-123', firstComment: 'Sub for more gaming!' } }
  );

  // Vlog Channel settings
  networkCustom[PLATFORMS.YOUTUBE] = setNetworkEntrySlot(
    networkCustom[PLATFORMS.YOUTUBE],
    'yt-channel-vlog',
    { settings: { title: 'Daily Vlog Episode 1', categoryId: '22', privacyStatus: 'unlisted', playlistId: 'playlist-vlog-456', firstComment: 'Welcome to my vlog!' } }
  );

  const overrides = buildNetworkOverrides({
    networkCustom,
    selectedPlatforms: [PLATFORMS.YOUTUBE],
    selectedAccountIds: ['yt-channel-gaming', 'yt-channel-vlog'],
    activeBrand
  });

  assert.strictEqual(overrides.length, 2, 'Test 2 Failed: Expected 2 separate YouTube channel overrides');

  const gamingOv = overrides.find(o => o.socialAccountId === 'yt-channel-gaming');
  const vlogOv = overrides.find(o => o.socialAccountId === 'yt-channel-vlog');

  assert.strictEqual(gamingOv.settings.title, 'Gaming Stream Video');
  assert.strictEqual(gamingOv.settings.categoryId, '20');
  assert.strictEqual(gamingOv.settings.privacyStatus, 'public');
  assert.strictEqual(gamingOv.settings.playlistId, 'playlist-gaming-123');
  assert.strictEqual(gamingOv.settings.firstComment, 'Sub for more gaming!');

  assert.strictEqual(vlogOv.settings.title, 'Daily Vlog Episode 1');
  assert.strictEqual(vlogOv.settings.categoryId, '22');
  assert.strictEqual(vlogOv.settings.privacyStatus, 'unlisted');
  assert.strictEqual(vlogOv.settings.playlistId, 'playlist-vlog-456');
  assert.strictEqual(vlogOv.settings.firstComment, 'Welcome to my vlog!');

  console.log("✅ Test 2 Passed: YouTube channel preset settings (title, category, privacy, playlist, firstComment) are completely isolated.");
}

// Test 3: TikTok per-account privacy & interaction settings isolation
{
  const activeBrand = {
    id: 'brand-1',
    socialAccounts: [
      { id: 'tt-acc-1', platform: 'TIKTOK', displayName: 'TikTok Main' },
      { id: 'tt-acc-2', platform: 'TIKTOK', displayName: 'TikTok Secondary' },
    ]
  };

  let networkCustom = buildDefaultNetworkCustom();

  // Main TikTok: public, allowDuet = true
  networkCustom[PLATFORMS.TIKTOK] = setNetworkEntrySlot(
    networkCustom[PLATFORMS.TIKTOK],
    'tt-acc-1',
    { settings: { privacy: 'PUBLIC_TO_EVERYONE', allowDuet: true, allowStitch: true } }
  );

  // Secondary TikTok: private, allowDuet = false
  networkCustom[PLATFORMS.TIKTOK] = setNetworkEntrySlot(
    networkCustom[PLATFORMS.TIKTOK],
    'tt-acc-2',
    { settings: { privacy: 'SELF_ONLY', allowDuet: false, allowStitch: false } }
  );

  const overrides = buildNetworkOverrides({
    networkCustom,
    selectedPlatforms: [PLATFORMS.TIKTOK],
    selectedAccountIds: ['tt-acc-1', 'tt-acc-2'],
    activeBrand
  });

  assert.strictEqual(overrides.length, 2, 'Test 3 Failed: Expected 2 separate TikTok account overrides');

  const tt1 = overrides.find(o => o.socialAccountId === 'tt-acc-1');
  const tt2 = overrides.find(o => o.socialAccountId === 'tt-acc-2');

  assert.strictEqual(tt1.settings.privacy, 'PUBLIC_TO_EVERYONE');
  assert.strictEqual(tt1.settings.allowDuet, true);

  assert.strictEqual(tt2.settings.privacy, 'SELF_ONLY');
  assert.strictEqual(tt2.settings.allowDuet, false);

  console.log("✅ Test 3 Passed: TikTok per-account interaction settings isolated successfully.");
}

// Test 4: YouTube Title Initial Inheritance & Edit Isolation
{
  const activeBrand = {
    id: 'brand-1',
    socialAccounts: [
      { id: 'yt-ch-1', platform: 'YOUTUBE', displayName: 'YT 1' },
      { id: 'yt-ch-2', platform: 'YOUTUBE', displayName: 'YT 2' },
    ]
  };

  let networkCustom = buildDefaultNetworkCustom();
  let globalYoutubeTitle = "Initial Shared YT Title";

  // Step 1: User views YT 1 (no custom title set yet) -> effectiveTitle falls back to globalYoutubeTitle
  const yt1Entry = networkCustom[PLATFORMS.YOUTUBE];
  const yt1Settings = yt1Entry?.perAccount?.['yt-ch-1']?.settings || yt1Entry?.settings || {};
  let effectiveTitle1 = yt1Settings.title !== undefined ? yt1Settings.title : globalYoutubeTitle;
  assert.strictEqual(effectiveTitle1, "Initial Shared YT Title", 'YT 1 initially inherits shared title');

  // Step 2: User edits YT 2 title to "Custom Title for YT 2"
  // updateNetworkSetting writes to perAccount['yt-ch-2'].settings, flatSetter is NOT called
  networkCustom[PLATFORMS.YOUTUBE] = setNetworkEntrySlot(
    networkCustom[PLATFORMS.YOUTUBE],
    'yt-ch-2',
    { settings: { title: "Custom Title for YT 2" } }
  );

  // Step 3: Verify YT 1 still evaluates to "Initial Shared YT Title" (100% unaffected by YT 2's edit)
  const yt1SettingsAfter = networkCustom[PLATFORMS.YOUTUBE]?.perAccount?.['yt-ch-1']?.settings || networkCustom[PLATFORMS.YOUTUBE]?.settings || {};
  effectiveTitle1 = yt1SettingsAfter.title !== undefined ? yt1SettingsAfter.title : globalYoutubeTitle;
  assert.strictEqual(effectiveTitle1, "Initial Shared YT Title", 'YT 1 is 100% unaffected by YT 2 edit');

  // Step 4: User edits YT 1 title to "Custom Title for YT 1"
  networkCustom[PLATFORMS.YOUTUBE] = setNetworkEntrySlot(
    networkCustom[PLATFORMS.YOUTUBE],
    'yt-ch-1',
    { settings: { title: "Custom Title for YT 1" } }
  );

  // Step 5: Verify YT 2 still evaluates to "Custom Title for YT 2" (100% unaffected by YT 1's subsequent edit)
  const yt2SettingsAfter = networkCustom[PLATFORMS.YOUTUBE]?.perAccount?.['yt-ch-2']?.settings || {};
  assert.strictEqual(yt2SettingsAfter.title, "Custom Title for YT 2", 'YT 2 is 100% unaffected by YT 1 edit');

  console.log("✅ Test 4 Passed: YouTube Title initial inheritance & multi-channel edit isolation verified.");
}

console.log("🎉 All Preset Channel Isolation Tests Passed Successfully!");
