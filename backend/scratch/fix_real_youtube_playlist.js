const prisma = require('../src/config/prisma');

async function main() {
  const account = await prisma.socialAccount.findUnique({
    where: { id: '28468a70-3165-4848-80a2-2ef289fd9a45' },
    include: { youtubeChannel: true }
  });

  if (account && account.youtubeChannel) {
    const realUploadsId = account.youtubeChannel.channelId.replace(/^UC/, 'UU');
    await prisma.socialAccount.update({
      where: { id: account.id },
      data: {
        youtubeChannel: {
          update: {
            uploadsPlaylistId: realUploadsId
          }
        }
      }
    });
    console.log(`Updated youtubeChannel ${account.youtubeChannel.channelId} uploadsPlaylistId to ${realUploadsId}`);
  } else {
    console.log('Account or YouTube channel relation not found');
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
