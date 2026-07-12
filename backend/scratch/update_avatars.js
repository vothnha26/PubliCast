const prisma = require('../src/config/prisma');
const { PLATFORMS } = require('../src/utils/constants');

const AVATARS = {
  [PLATFORMS.FACEBOOK]: 'https://images.unsplash.com/photo-1614680376593-902f74fa0d41?w=150&auto=format&fit=crop&q=60',
  [PLATFORMS.YOUTUBE]: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=150&auto=format&fit=crop&q=60',
  [PLATFORMS.TIKTOK]: 'https://images.unsplash.com/photo-1598550476439-6847785fce6e?w=150&auto=format&fit=crop&q=60'
};

async function main() {
  console.log('Starting migration to update empty/null profile pictures...');

  const accounts = await prisma.socialAccount.findMany();
  let updatedCount = 0;

  for (const account of accounts) {
    if (!account.profilePictureUrl || account.profilePictureUrl === '') {
      const defaultAvatar = AVATARS[account.platform];
      if (defaultAvatar) {
        await prisma.socialAccount.update({
          where: { id: account.id },
          data: { profilePictureUrl: defaultAvatar }
        });
        console.log(`Updated avatar for account: ${account.displayName} (${account.platform}) -> ${defaultAvatar}`);
        updatedCount++;
      }
    }
  }

  console.log(`Migration finished. Updated ${updatedCount} accounts.`);
}

main()
  .catch(e => console.error('Migration failed:', e))
  .finally(() => prisma.$disconnect());
