const prisma = require('../../config/prisma');
const { USER_ROLES, AUTH_PROVIDERS, USER_STATUS } = require('../../utils/constants');

class UserRepository {
  async findByEmail(email) {
    return await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { accounts: true, customRole: true }
    });
  }

  async findById(id) {
    return await prisma.user.findUnique({
      where: { id },
      include: { accounts: true, customRole: true }
    });
  }

  async createUser(userData, accountData) {
    return await prisma.user.create({
      data: {
        email: userData.email.toLowerCase(),
        name: userData.name || userData.fullName,
        avatarUrl: userData.avatarUrl,
        role: USER_ROLES.OWNER,
        passwordHash: accountData.passwordHash,
        isActive: userData.isActive !== undefined ? userData.isActive : false,
        isEmailVerified: false,
        accounts: {
          create: accountData
        }
      },
      include: { customRole: true, accounts: true }
    });
  }

  async updateStatus(email, status, verifiedAt) {
    // Map old status to new isEmailVerified and isActive
    const isEmailVerified = status === USER_STATUS.ACTIVE;
    const isActive = status === USER_STATUS.ACTIVE;
    
    return await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: { 
        isEmailVerified,
        isActive,
        updatedAt: new Date()
      },
      include: { customRole: true, accounts: true }
    });
  }

  async updateLocalPassword(email, passwordHash) {
    const normalizedEmail = email.toLowerCase();
    
    return await prisma.user.update({
      where: { email: normalizedEmail },
      data: {
        passwordHash,
        accounts: {
          updateMany: {
            where: { provider: AUTH_PROVIDERS.LOCAL },
            data: { passwordHash }
          }
        }
      },
      include: { customRole: true, accounts: true }
    });
  }

  /**
   * Get user with password hash for login
   */
  async findByEmailWithPassword(email) {
    return await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { 
        accounts: true,
        customRole: true
      }
    });
  }

  async findByProviderId(provider, providerId) {
    return await prisma.user.findFirst({
      where: {
        accounts: {
          some: {
            provider,
            providerId
          }
        }
      },
      include: { accounts: true, customRole: true }
    });
  }

  async updateProfile(userId, updateData) {
    return await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: { customRole: true, accounts: true }
    });
  }

  async upsertSocialUser(userData, accountData, currentUserId = null) {
    const { email, name, avatarUrl } = userData;
    const { provider, providerId } = accountData;

    let existingUser = null;

    if (currentUserId) {
      existingUser = await prisma.user.findUnique({
        where: { id: currentUserId },
        include: { accounts: true }
      });
    }

    if (!existingUser) {
      // Try to find user by email first to link accounts
      existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: { accounts: true }
      });
    }

    if (existingUser) {
      // Check if this provider account already exists on the user
      const existingAccount = existingUser.accounts.find(acc => acc.provider === provider);
      
      if (!existingAccount) {
        // First check if this specific Google account is linked to another user
        const otherAccount = await prisma.userAccount.findFirst({
          where: { provider, providerId }
        });

        if (otherAccount) {
          // Relink this account to the current user
          await prisma.userAccount.update({
            where: { id: otherAccount.id },
            data: { userId: existingUser.id, lastLoginAt: new Date() }
          });
        } else {
          // Link new social account to existing user
          await prisma.userAccount.create({
            data: {
              userId: existingUser.id,
              provider,
              providerId,
              lastLoginAt: new Date()
            }
          });
        }
      } else {
        // Update existing account's providerId and lastLoginAt
        await prisma.userAccount.update({
          where: { id: existingAccount.id },
          data: { providerId, lastLoginAt: new Date() }
        });

        // Clean up other users who might have been linked to this google account
        await prisma.userAccount.deleteMany({
          where: {
            provider,
            providerId,
            userId: { not: existingUser.id }
          }
        });
      }

      // Update profile info if missing
      const user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: existingUser.name || name,
          avatarUrl: existingUser.avatarUrl || avatarUrl,
          isActive: true,
          isEmailVerified: true,
          lastLoginAt: new Date()
        },
        include: { accounts: true, customRole: true }
      });

      return { user, isNew: false };
    }

    // Create new user if not exists
    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: name,
        avatarUrl: avatarUrl,
        passwordHash: 'SOCIAL_AUTH_NO_PASSWORD',
        role: USER_ROLES.OWNER,
        isActive: true,
        isEmailVerified: true,
        lastLoginAt: new Date(),
        accounts: {
          create: {
            provider,
            providerId,
            lastLoginAt: new Date()
          }
        }
      },
      include: { accounts: true, customRole: true }
    });

    return { user: newUser, isNew: true };
  }

  async createShellUser(email) {
    const normalizedEmail = email.toLowerCase();
    return await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: normalizedEmail.split('@')[0],
        passwordHash: '',
        role: 'USER',
        isActive: false,
        isEmailVerified: false
      },
      include: { accounts: true, customRole: true }
    });
  }
}

module.exports = new UserRepository();
