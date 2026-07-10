const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'publicast_test_266ou0@gmail.com' },
    include: {
      brands: {
        include: {
          socialAccounts: {
            include: {
              youtubeChannel: true,
              tikTokAccount: true,
              facebookPage: true,
              instagramAccount: true,
              linkedInAccount: true
            }
          }
        }
      }
    }
  });
  console.log(JSON.stringify(user, null, 2));
}

main().finally(() => prisma.$disconnect());
