const autoListService = require('../src/services/workspace/auto-list.service');

async function testUpdate() {
  try {
    const list = await autoListService.getAutoListDetails('1df309e5-31c5-4373-97b4-e868a3f92e12');
    console.log("Before update, loopEnabled is:", list.loopEnabled);
    
    // Update loopEnabled to true
    const updated = await autoListService.updateAutoList('1df309e5-31c5-4373-97b4-e868a3f92e12', {
      name: list.name,
      targetPlatforms: list.targetPlatforms,
      scheduleType: list.scheduleType,
      activeDays: list.activeDays,
      loopEnabled: true, // we want to set it to true
    });
    
    console.log("After update, loopEnabled is:", updated.loopEnabled);
  } catch (err) {
    console.error("ERROR running update:", err);
  }
}

testUpdate();
