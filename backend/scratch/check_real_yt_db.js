const prisma = require('../src/config/prisma');

async function main() {
  const account = await prisma.socialAccount.findUnique({
    where: { id: '28468a70-3165-4848-80a2-2ef289fd9a45' },
    include: { youtubeChannel: true }
  });
  console.log('Real YouTube Account details:', JSON.stringify(account, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
