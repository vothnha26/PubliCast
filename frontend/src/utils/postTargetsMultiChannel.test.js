import assert from "assert";
import { PLATFORMS } from "../constants/platforms.js";

function simulateUpsertPostTargets(targetPlatforms, selectedAccountIds, socialAccounts) {
  const targets = [];
  for (const platform of targetPlatforms) {
    const normalizedPlatform = platform.trim().toUpperCase();
    let accountIds = [];

    if (selectedAccountIds && typeof selectedAccountIds === 'object' && !Array.isArray(selectedAccountIds)) {
      accountIds = selectedAccountIds[normalizedPlatform]
        || selectedAccountIds[normalizedPlatform.toLowerCase()]
        || [];
    } else if (Array.isArray(selectedAccountIds)) {
      const matched = socialAccounts.filter(a => selectedAccountIds.includes(a.id) && a.platform === normalizedPlatform);
      accountIds = matched.map(a => a.id);
    }

    if (!Array.isArray(accountIds)) accountIds = [];
    accountIds = accountIds.filter(Boolean);

    if (accountIds.length === 0) {
      const fallback = socialAccounts.find(a => a.platform === normalizedPlatform && a.isConnected);
      if (fallback) accountIds = [fallback.id];
    }

    accountIds.forEach(id => {
      targets.push({ platform: normalizedPlatform, socialAccountId: id });
    });
  }
  return targets;
}

console.log("🧪 Testing Multi-Channel PostTarget Resolution...");

const socialAccounts = [
  { id: "yt-1", platform: "YOUTUBE", isConnected: true },
  { id: "yt-2", platform: "YOUTUBE", isConnected: true },
  { id: "fb-1", platform: "FACEBOOK", isConnected: true }
];

// Test 1: Object payload with uppercase keys
const res1 = simulateUpsertPostTargets(["YOUTUBE"], { YOUTUBE: ["yt-1", "yt-2"] }, socialAccounts);
assert.strictEqual(res1.length, 2);
assert.strictEqual(res1[0].socialAccountId, "yt-1");
assert.strictEqual(res1[1].socialAccountId, "yt-2");
console.log("✅ Test 1 Passed: Object with uppercase keys resolves all selected channels.");

// Test 2: Object payload with lowercase keys
const res2 = simulateUpsertPostTargets(["YOUTUBE"], { youtube: ["yt-1", "yt-2"] }, socialAccounts);
assert.strictEqual(res2.length, 2);
assert.strictEqual(res2[0].socialAccountId, "yt-1");
assert.strictEqual(res2[1].socialAccountId, "yt-2");
console.log("✅ Test 2 Passed: Object with lowercase keys resolves all selected channels.");

// Test 3: Array payload of IDs
const res3 = simulateUpsertPostTargets(["YOUTUBE"], ["yt-1", "yt-2"], socialAccounts);
assert.strictEqual(res3.length, 2);
assert.strictEqual(res3[0].socialAccountId, "yt-1");
assert.strictEqual(res3[1].socialAccountId, "yt-2");
console.log("✅ Test 3 Passed: Array payload resolves all selected channels without falling back to 1 channel.");

console.log("🎉 All Multi-Channel PostTarget Tests Passed!");
