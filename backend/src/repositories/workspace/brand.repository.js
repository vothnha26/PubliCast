const prisma = require('../../config/prisma');
const { BILLING_CYCLES, SUBSCRIPTION_STATUS, SYSTEM_PLANS, DEFAULT_CONFIG } = require('../../utils/constants');

class BrandRepository {
  _getBestSubscription(brandsWithSub) {
    if (!brandsWithSub || brandsWithSub.length === 0) return null;
    
    let bestSub = brandsWithSub[0].subscription;
    let maxPrice = bestSub?.plan?.priceAmount ? Number(bestSub.plan.priceAmount) : 0;

    for (const b of brandsWithSub) {
      const sub = b.subscription;
      const price = sub?.plan?.priceAmount ? Number(sub.plan.priceAmount) : 0;
      if (price > maxPrice) {
        maxPrice = price;
        bestSub = sub;
      }
    }
    return bestSub;
  }

  async findManyByUserId(userId) {
    const brands = await prisma.brand.findMany({
      where: {
        deletedAt: null,
        OR: [
          { ownerId: userId },
          { teamMembers: { some: { userId: userId } } }
        ]
      },
      include: {
        socialAccounts: {
          include: {
            youtubeChannel: true,
            instagramAccount: true,
            facebookPage: true,
            tikTokAccount: true,
            linkedInAccount: true,
            discordAccount: true
          }
        },
        teamMembers: {
          where: { userId: userId },
          include: {
            customRole: {
              include: {
                permissions: true
              }
            }
          }
        },
        subscription: {
          include: {
            plan: {
              include: {
                products: true,
                planLimit: true
              }
            }
          }
        }
      }
    });

    // Gather all owners of the brands the user is associated with
    const ownerIds = [...new Set(brands.map(b => b.ownerId))];
    const proSubscriptionsByOwner = {};

    for (const ownerId of ownerIds) {
      const activeBrandsWithSub = await prisma.brand.findMany({
        where: {
          ownerId,
          deletedAt: null,
          subscription: {
            status: 'ACTIVE'
          }
        },
        include: {
          subscription: {
            include: {
              plan: {
                include: {
                  products: true,
                  planLimit: true
                }
              }
            }
          }
        }
      });

      const bestSub = this._getBestSubscription(activeBrandsWithSub);
      if (bestSub) {
        proSubscriptionsByOwner[ownerId] = bestSub;
      }
    }

    return brands.map(brand => {
      let role = 'USER';
      let permissions = [];
      const isOwner = brand.ownerId === userId;

      if (isOwner) {
        role = 'OWNER';
      } else if (brand.teamMembers && brand.teamMembers.length > 0) {
        const member = brand.teamMembers[0];
        role = member.role;
        if (member.customRole && member.customRole.permissions) {
          permissions = member.customRole.permissions.map(p => ({
            key: p.permissionKey,
            isAllowed: p.isAllowed
          }));
        }
      }

      const brandCopy = { ...brand };
      delete brandCopy.teamMembers;

      const effectiveSubscription = proSubscriptionsByOwner[brand.ownerId] || brand.subscription;

      return {
        ...brandCopy,
        userRole: role,
        userPermissions: permissions,
        isOwner,
        currentPlan: effectiveSubscription ? {
          name: effectiveSubscription.plan.name,
          billingCycle: effectiveSubscription.plan.billingCycle,
          status: effectiveSubscription.status,
          limits: effectiveSubscription.plan.planLimit,
          allowedProducts: effectiveSubscription.plan.products.map(p => p.id)
        } : {
          name: 'FREE',
          billingCycle: 'MONTHLY',
          status: 'ACTIVE',
          limits: null,
          allowedProducts: ['youtube_analytics', 'facebook_management']
        }
      };
    });
  }

  async findById(id) {
    return await prisma.brand.findFirst({
      where: { id, deletedAt: null },
      include: {
        socialAccounts: true
      }
    });
  }

  async countActiveBrandsByOwnerId(ownerId) {
    return await prisma.brand.count({
      where: {
        ownerId,
        deletedAt: null
      }
    });
  }

  async userCanAccessBrand(userId, brandId) {
    const count = await prisma.brand.count({
      where: {
        id: brandId,
        OR: [
          { ownerId: userId },
          { teamMembers: { some: { userId } } }
        ]
      }
    });

    return count > 0;
  }

  async create(data) {
    // Find a free plan to assign as default
    const freePlan = await prisma.plan.findFirst({
      where: { name: SYSTEM_PLANS.FREE, billingCycle: BILLING_CYCLES.MONTHLY }
    });

    if (!freePlan) {
      throw new Error('Default FREE plan not found in database. Please run seed script.');
    }

    return await prisma.brand.create({
      data: {
        name: data.name,
        timezone: data.timezone || DEFAULT_CONFIG.TIMEZONE,
        defaultLanguage: data.defaultLanguage || DEFAULT_CONFIG.LANGUAGE,
        owner: {
          connect: { id: data.ownerId }
        },
        subscription: {
          create: {
            planId: freePlan.id,
            status: SUBSCRIPTION_STATUS.ACTIVE,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
          }
        }
      }
    });
  }

  async update(id, data) {
    return await prisma.brand.update({
      where: { id },
      data: {
        name: data.name,
        timezone: data.timezone,
        defaultLanguage: data.defaultLanguage,
        logoUrl: data.logoUrl,
        updatedAt: new Date()
      }
    });
  }

  async delete(id) {
    return await prisma.brand.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        updatedAt: new Date()
      }
    });
  }

  async findBrandWithSubscription(id) {
    const brand = await prisma.brand.findFirst({
      where: { id, deletedAt: null },
      include: {
        subscription: {
          include: {
            plan: {
              include: {
                planLimit: true,
                products: true
              }
            }
          }
        }
      }
    });

    if (!brand) return null;

    // Find if the owner of this brand has any other brand with an active subscription
    const activeBrandsWithSub = await prisma.brand.findMany({
      where: {
        ownerId: brand.ownerId,
        deletedAt: null,
        subscription: {
          status: 'ACTIVE'
        }
      },
      include: {
        subscription: {
          include: {
            plan: {
              include: {
                planLimit: true,
                products: true
              }
            }
          }
        }
      }
    });

    const bestSub = this._getBestSubscription(activeBrandsWithSub);
    if (bestSub) {
      brand.subscription = bestSub;
    }

    return brand;
  }

  async findOwnedBrandsWithSubscription(ownerId) {
    return await prisma.brand.findMany({
      where: { ownerId, deletedAt: null },
      include: {
        subscription: {
          include: {
            plan: {
              include: {
                planLimit: true
              }
            }
          }
        }
      }
    });
  }
}

module.exports = new BrandRepository();
