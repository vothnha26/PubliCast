const prisma = require('../src/config/prisma');

async function main() {
  console.log('🧹 Clearing all inbox items and resetting unified inboxes...');
  const deletedItems = await prisma.inboxItem.deleteMany({});
  const deletedInboxes = await prisma.unifiedInbox.deleteMany({});
  console.log(`✅ Cleared ${deletedItems.count} inbox item(s) and ${deletedInboxes.count} unified inbox(es) successfully.`);
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error clearing inbox items:', err);
  process.exit(1);
});
