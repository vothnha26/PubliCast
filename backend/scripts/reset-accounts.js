const prisma = require('../src/config/prisma');
const redisClient = require('../src/config/redis');

async function main() {
  console.log('🧹 Clearing all social accounts, posts, and inbox items from database...');
  
  const deletedInboxItems = await prisma.inboxItem.deleteMany({});
  const deletedInboxes = await prisma.unifiedInbox.deleteMany({});
  const deletedTrackedVideos = await prisma.trackedVideo.deleteMany({});
  const deletedPosts = await prisma.post.deleteMany({});
  const deletedSocialAccounts = await prisma.socialAccount.deleteMany({});

  if (redisClient.isOpen) {
    await redisClient.flushAll().catch(() => {});
    console.log('⚡ Redis cache flushed.');
  }

  console.log(`✅ Cleared:
  - Social Accounts: ${deletedSocialAccounts.count}
  - Posts: ${deletedPosts.count}
  - Tracked Videos: ${deletedTrackedVideos.count}
  - Inbox Items: ${deletedInboxItems.count}
  - Unified Inboxes: ${deletedInboxes.count}`);

  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error resetting accounts & social data:', err);
  process.exit(1);
});
