const prisma = require('../config/prisma');

class UserRepository {
  async findByEmail(email) {
    return await prisma.user.findUnique({
      where: { email },
      include: { accounts: true }
    });
  }

  async findById(id) {
    return await prisma.user.findUnique({
      where: { id },
      include: { accounts: true }
    });
  }

  async createUser(userData, accountData) {
    return await prisma.user.create({
      data: {
        ...userData,
        accounts: {
          create: accountData
        }
      }
    });
  }

  async updateStatus(email, status, verifiedAt) {
    return await prisma.user.update({
      where: { email },
      data: { status, verifiedAt }
    });
  }

  async updateLocalPassword(email, passwordHash) {
    return await prisma.userAccount.updateMany({
      where: {
        provider: 'LOCAL',
        user: { email }
      },
      data: { passwordHash }
    });
  }

  /**
   * Get user with password hash for login
   */
  async findByEmailWithPassword(email) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { 
        accounts: true
      }
    });

    if (user && user.accounts && user.accounts.length > 0) {
      // Find LOCAL account for password
      const localAccount = user.accounts.find(acc => acc.provider === 'LOCAL');
      return {
        ...user,
        passwordHash: localAccount?.passwordHash || null
      };
    }

    return user;
  }
}

module.exports = new UserRepository();
