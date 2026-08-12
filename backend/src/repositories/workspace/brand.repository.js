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

  _resolveRoleAndPermissions(brand, userId) {
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

    return { role, permissions, isOwner };
  }

  _buildCurrentPlan(effectiveSubscription) {
    return effectiveSubscription ? {
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
    };
  }

  // Lightweight listing for the brand switcher/picker UI — only the fields
  // that Topbar/ConnectionsOverlay/BrandTableOverlay/BrandSettings actually
  // read off list items (id, name, logoUrl, socialAccounts[].platform for
  // icon badges, currentPlan for the max-brands limit calc). Full per-brand
  // detail (tokens, nested platform tables, subscription tree) is fetched
  // separately via findFullBrandById once a brand becomes the active one.
  async findManySummaryByUserId(userId) {
    const brands = await prisma.brand.findMany({
      where: {
        deletedAt: null,
        OR: [
          { ownerId: userId },
          { teamMembers: { some: { userId: userId } } }
        ]
      },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        onboardingCompleted: true,
        ownerId: true,
        owner: { select: { email: true } },
        socialAccounts: {
          select: { platform: true }
        },
        teamMembers: {
          where: { userId: userId },
          select: {
            role: true,
            customRole: {
              include: { permissions: true }
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

    const activeSubsByOwner = new Map();
    for (const b of brands) {
      if (b.subscription?.status !== 'ACTIVE') continue;
      if (!activeSubsByOwner.has(b.ownerId)) activeSubsByOwner.set(b.ownerId, []);
      activeSubsByOwner.get(b.ownerId).push(b);
    }

    const proSubscriptionsByOwner = {};
    for (const [ownerId, ownedBrands] of activeSubsByOwner) {
      const bestSub = this._getBestSubscription(ownedBrands);
      if (bestSub) {
        proSubscriptionsByOwner[ownerId] = bestSub;
      }
    }

    return brands.map(brand => {
      const { role, permissions, isOwner } = this._resolveRoleAndPermissions(brand, userId);
      const effectiveSubscription = proSubscriptionsByOwner[brand.ownerId] || brand.subscription;

      return {
        id: brand.id,
        name: brand.name,
        logoUrl: brand.logoUrl,
        onboardingCompleted: brand.onboardingCompleted || brand.socialAccounts.length > 0,
        owner: brand.owner,
        socialAccounts: brand.socialAccounts,
        userRole: role,
        userPermissions: permissions,
        isOwner,
        currentPlan: this._buildCurrentPlan(effectiveSubscription)
      };
    });
  }

  // Full detail for a single brand — used once the active brand is known,
  // instead of the old approach of eager-loading this same detail (incl.
  // encrypted access/refresh tokens per social account) for every brand in
  // the switcher list on every app load.
  async findFullBrandById(brandId, userId) {
    const brand = await prisma.brand.findFirst({
      where: {
        id: brandId,
        deletedAt: null,
        OR: [
          { ownerId: userId },
          { teamMembers: { some: { userId: userId } } }
        ]
      },
      include: {
        socialAccounts: {
          select: {
            id: true,
            brandId: true,
            platform: true,
            platformAccountId: true,
            username: true,
            displayName: true,
            profilePictureUrl: true,
            tokenExpiresAt: true,
            scopes: true,
            isConnected: true,
            isDefault: true,
            connectedAt: true,
            lastSyncAt: true,
            lastPostsSyncAt: true,
            syncStatus: true,
            createdAt: true,
            updatedAt: true,
            youtubeChannel: true,
            instagramAccount: true,
            threadsAccount: true,
            facebookPage: true,
            tikTokAccount: true
          }
        },
        teamMembers: {
          where: { userId: userId },
          include: {
            customRole: {
              include: { permissions: true }
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

    if (!brand) return null;

    const activeBrandsWithSub = await prisma.brand.findMany({
      where: {
        ownerId: brand.ownerId,
        deletedAt: null,
        subscription: { status: 'ACTIVE' }
      },
      include: {
        subscription: {
          include: {
            plan: {
              include: { products: true, planLimit: true }
            }
          }
        }
      }
    });

    const bestSub = this._getBestSubscription(activeBrandsWithSub);
    const effectiveSubscription = bestSub || brand.subscription;

    const { role, permissions, isOwner } = this._resolveRoleAndPermissions(brand, userId);

    const brandCopy = { ...brand };
    delete brandCopy.teamMembers;

    const hasSocialAccounts = Array.isArray(brandCopy.socialAccounts) && brandCopy.socialAccounts.length > 0;
    if (hasSocialAccounts && !brandCopy.onboardingCompleted) {
      brandCopy.onboardingCompleted = true;
    }

    return {
      ...brandCopy,
      userRole: role,
      userPermissions: permissions,
      isOwner,
      currentPlan: this._buildCurrentPlan(effectiveSubscription)
    };
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
        ...(data.onboardingCompleted !== undefined && { onboardingCompleted: data.onboardingCompleted }),
        updatedAt: new Date()
      }
    });
  }

  async delete(id, client = prisma) {
    return await client.brand.update({
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
