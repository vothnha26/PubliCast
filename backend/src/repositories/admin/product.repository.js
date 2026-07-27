const prisma = require('../../config/prisma');

class ProductRepository {
  /**
   * Get dynamic platform, module and matrix data
   */
  async getMatrixData() {
    const platforms = await prisma.platform.findMany({
      orderBy: { createdAt: 'asc' }
    });

    const modules = await prisma.module.findMany({
      orderBy: { createdAt: 'asc' }
    });

    const products = await prisma.product.findMany({
      where: {
        platformId: { not: null },
        moduleId: { not: null }
      }
    });

    // Format to match the previous structure: { "M1-YT": { status: "Active", sku: "..." } }
    const matrix = {};
    products.forEach(p => {
      const key = `${p.moduleId}-${p.platformId}`;
      matrix[key] = {
        id: p.id,
        status: p.status,
        sku: p.sku || ''
      };
    });

    return {
      platforms,
      modules,
      matrix
    };
  }

  /**
   * Enable a module for a platform (creates or updates Product to ACTIVE)
   */
  async enableProductMatrix(platformId, moduleId, sku) {
    const platform = await prisma.platform.findUnique({ where: { id: platformId } });
    if (!platform) throw new Error(`Platform with ID ${platformId} not found`);

    const moduleRecord = await prisma.module.findUnique({ where: { id: moduleId } });
    if (!moduleRecord) throw new Error(`Module with ID ${moduleId} not found`);

    const productId = `${platformId.toLowerCase()}_${moduleId.toLowerCase()}`;
    const productName = `${platform.name} ${moduleRecord.name}`;

    // Try to find existing product for this matrix cell
    const existing = await prisma.product.findFirst({
      where: { platformId, moduleId }
    });

    if (existing) {
      return await prisma.product.update({
        where: { id: existing.id },
        data: {
          status: 'ACTIVE',
          sku: sku || existing.sku
        }
      });
    }

    // Check if ID is already taken by some other product (edge case)
    const idConflict = await prisma.product.findUnique({ where: { id: productId } });
    const finalProductId = idConflict ? `${productId}_${Date.now()}` : productId;

    return await prisma.product.create({
      data: {
        id: finalProductId,
        name: productName,
        category: 'Platforms',
        platformId,
        moduleId,
        sku: sku || `SKU-${platformId}-${moduleId}`,
        status: 'ACTIVE'
      }
    });
  }

  /**
   * Disable a module for a platform (sets Product status to INACTIVE)
   */
  async disableProductMatrix(platformId, moduleId) {
    const existing = await prisma.product.findFirst({
      where: { platformId, moduleId }
    });

    if (!existing) {
      throw new Error(`No product found for platform ${platformId} and module ${moduleId}`);
    }

    return await prisma.product.update({
      where: { id: existing.id },
      data: {
        status: 'INACTIVE'
      }
    });
  }

  /**
   * Create new platform
   */
  async createPlatform(data) {
    return await prisma.platform.create({
      data: {
        id: data.id,
        name: data.name,
        color: data.color || '#000000',
        image: data.image || null
      }
    });
  }

  /**
   * Delete a platform (Cascade deletes products linked to it due to DB relation config)
   */
  async deletePlatform(id) {
    return await prisma.platform.delete({
      where: { id }
    });
  }

  /**
   * Create new module
   */
  async createModule(data) {
    return await prisma.module.create({
      data: {
        id: data.id,
        name: data.name,
        description: data.description || null
      }
    });
  }

  /**
   * Delete a module
   */
  async deleteModule(id) {
    return await prisma.module.delete({
      where: { id }
    });
  }
}

module.exports = new ProductRepository();
