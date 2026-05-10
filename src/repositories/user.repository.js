const prisma = require('../config/prisma');

class UserRepository {
  async findByEmail(email) {
    return await prisma.user.findUnique({
      where: { email },
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
}

module.exports = new UserRepository();
