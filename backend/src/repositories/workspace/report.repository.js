const prisma = require('../../config/prisma');

class ReportRepository {
  async findManyByBrand(brandId) {
    return prisma.report.findMany({
      where: { brandId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findById(id) {
    return prisma.report.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  }

  async create(data) {
    return prisma.report.create({
      data,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  }

  async update(id, data) {
    return prisma.report.update({
      where: { id },
      data,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  }

  async delete(id) {
    return prisma.report.delete({
      where: { id }
    });
  }

  /** Atomically bumps the real download counter — closes #74's `downloads: 0` hardcode. */
  async incrementDownloads(id) {
    return prisma.report.update({
      where: { id },
      data: { downloads: { increment: 1 } }
    });
  }

  // ─── Report schedule config (#75 — replaces uploads/reports/config_<brandId>.json) ───

  async findScheduleConfigByBrand(brandId) {
    return prisma.reportScheduleConfig.findUnique({ where: { brandId } });
  }

  /**
   * Upsert is a single atomic DB write — no read-modify-write race and no
   * partial-write risk, unlike the old fs.writeFileSync (a crash mid-write
   * left an unparseable JSON file silently skipped by the next scan).
   */
  async upsertScheduleConfig(brandId, data) {
    return prisma.reportScheduleConfig.upsert({
      where: { brandId },
      create: { brandId, ...data },
      update: data
    });
  }

  /** All brands with email delivery enabled — the scheduler scans this set daily. */
  async findAllEnabledScheduleConfigs() {
    return prisma.reportScheduleConfig.findMany({
      where: { receiveEmail: true },
      include: { brand: { select: { id: true, name: true } } }
    });
  }
}

const reportRepository = new ReportRepository();
module.exports = reportRepository;
