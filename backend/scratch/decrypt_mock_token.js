const prisma = require('../src/config/prisma');
const socialAccountRepository = require('../src/repositories/social/social-account.repository');

async function main() {
  const account = await socialAccountRepository.findById('bd6c1201-c3c7-4db0-8e2a-d075d35719d7');
  console.log('Decrypted mock account token:', account.accessToken);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
