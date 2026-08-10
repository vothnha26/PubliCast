const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../../src/app');

// Mock Auth Middleware
jest.mock('../../src/middlewares/auth.middleware', () => {
  const verifyAuth = (req, res, next) => {
    req.user = { id: 'test-user-id', email: 'user@publicast.com', name: 'Test User' };
    next();
  };
  return { verifyAuth, verifyAuthFromQuery: verifyAuth };
});

// Mock Permission Middleware
jest.mock('../../src/middlewares/permission.middleware', () => {
  const middleware = jest.fn(() => (req, res, next) => next());
  middleware.requireBrandMember = (req, res, next) => next();
  return middleware;
});

// Mock Prisma
jest.mock('../../src/config/prisma', () => {
  const mockReport = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    update: jest.fn()
  };

  const mockBrand = {
    findUnique: jest.fn()
  };

  const mockSocialAccount = {
    findMany: jest.fn()
  };

  const mockPost = {
    count: jest.fn(),
    findMany: jest.fn(),
    groupBy: jest.fn().mockResolvedValue([])
  };

  const mockAnalytics = {
    findMany: jest.fn().mockResolvedValue([])
  };

  const mockPostMetricDaily = {
    findMany: jest.fn().mockResolvedValue([])
  };

  return {
    report: mockReport,
    brand: mockBrand,
    socialAccount: mockSocialAccount,
    post: mockPost,
    analytics: mockAnalytics,
    postMetricDaily: mockPostMetricDaily
  };
});

const prisma = require('../../src/config/prisma');
const reportStrategyFactory = require('../../src/services/reports/strategies/report-strategy.factory');
const PdfReportStrategy = require('../../src/services/reports/strategies/pdf-report.strategy');
const CsvReportStrategy = require('../../src/services/reports/strategies/csv-report.strategy');

describe('Reports API and Strategy Patterns Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Strategy Pattern & Factory Tests', () => {
    it('should return PdfReportStrategy for format PDF', () => {
      const strategy = reportStrategyFactory.getStrategy('PDF');
      expect(strategy).toBeInstanceOf(PdfReportStrategy);
    });

    it('should return CsvReportStrategy for format Excel', () => {
      const strategy = reportStrategyFactory.getStrategy('Excel');
      expect(strategy).toBeInstanceOf(CsvReportStrategy);
    });

    it('should return CsvReportStrategy for format CSV', () => {
      const strategy = reportStrategyFactory.getStrategy('CSV');
      expect(strategy).toBeInstanceOf(CsvReportStrategy);
    });

    it('should fallback to PdfReportStrategy for unknown formats', () => {
      const strategy = reportStrategyFactory.getStrategy('UNKNOWN');
      expect(strategy).toBeInstanceOf(PdfReportStrategy);
    });
  });

  describe('GET /api/reports', () => {
    it('should return all reports of a brand', async () => {
      const mockReports = [
        {
          id: 'report-1',
          brandId: 'brand-123',
          createdByUserId: 'test-user-id',
          title: 'Báo cáo hàng tuần',
          format: 'PDF',
          fileUrl: '/uploads/reports/report_brand-123_1.pdf',
          includedPlatforms: JSON.stringify(['Facebook', 'YouTube']),
          includedSections: JSON.stringify(['Overview']),
          isWhiteLabel: true,
          generatedAt: new Date(),
          createdAt: new Date(),
          creator: { name: 'Test User' }
        }
      ];

      prisma.report.findMany.mockResolvedValue(mockReports);

      const res = await request(app)
        .get('/api/reports?brandId=brand-123')
        .expect(200);

      expect(res.body.reports).toBeDefined();
      expect(res.body.reports.length).toBe(1);
      expect(res.body.reports[0].title).toBe('Báo cáo hàng tuần');
      expect(prisma.report.findMany).toHaveBeenCalledWith({
        where: { brandId: 'brand-123' },
        include: {
          creator: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    });

    it('should return 400 if brandId is missing', async () => {
      const res = await request(app)
        .get('/api/reports')
        .expect(400);

      expect(res.body.message).toContain('brandId là bắt buộc');
    });
  });

  describe('POST /api/reports', () => {
    it('should generate report and save record to DB', async () => {
      const mockBrand = { id: 'brand-123', name: 'Cool Brand', logoUrl: 'logo.png' };
      prisma.brand.findUnique.mockResolvedValue(mockBrand);
      prisma.socialAccount.findMany.mockResolvedValue([]);
      prisma.post.count.mockResolvedValue(0);
      prisma.post.findMany.mockResolvedValue([]);

      const mockCreatedReport = {
        id: 'report-new',
        brandId: 'brand-123',
        createdByUserId: 'test-user-id',
        title: 'Báo cáo tự động Q2',
        format: 'PDF',
        fileUrl: '/uploads/reports/mock_file.pdf',
        includedPlatforms: JSON.stringify(['Facebook']),
        includedSections: JSON.stringify(['Overview']),
        isWhiteLabel: true,
        generatedAt: new Date(),
        createdAt: new Date(),
        creator: { name: 'Test User' }
      };
      prisma.report.create.mockResolvedValue(mockCreatedReport);

      const res = await request(app)
        .post('/api/reports?brandId=brand-123')
        .send({
          title: 'Báo cáo tự động Q2',
          format: 'PDF',
          dateRange: '7 ngày qua',
          platforms: ['Facebook'],
          isWhiteLabel: true,
          brandLogoUrl: 'logo.png',
          brandColorHex: '#3B82F6'
        })
        .expect(201);

      expect(res.body.report).toBeDefined();
      expect(res.body.report.title).toBe('Báo cáo tự động Q2');
      expect(prisma.report.create).toHaveBeenCalled();
    });

    it('should return 400 if payload parameters are missing', async () => {
      const res = await request(app)
        .post('/api/reports?brandId=brand-123')
        .send({
          title: '', // Missing title
          format: 'PDF'
        })
        .expect(400);

      expect(res.body.message).toContain('Dữ liệu yêu cầu không hợp lệ');
    });
  });

  describe('DELETE /api/reports/:id', () => {
    it('should delete report record and remove physical file', async () => {
      // Mock report record in DB
      const mockReport = {
        id: 'report-to-delete',
        brandId: 'brand-123',
        fileUrl: '/uploads/reports/temp_test_report.pdf'
      };
      prisma.report.findUnique.mockResolvedValue(mockReport);
      prisma.report.delete.mockResolvedValue(mockReport);

      // Create a dummy file in the directory to verify unlinking
      const reportsDir = path.join(__dirname, '../../uploads/reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      const dummyFilePath = path.join(reportsDir, 'temp_test_report.pdf');
      fs.writeFileSync(dummyFilePath, 'dummy content');

      expect(fs.existsSync(dummyFilePath)).toBe(true);

      const res = await request(app)
        .delete('/api/reports/report-to-delete?brandId=brand-123')
        .expect(200);

      expect(res.body.message).toContain('xóa thành công');
      expect(prisma.report.delete).toHaveBeenCalledWith({ where: { id: 'report-to-delete' } });
      // Verify physical file was deleted
      expect(fs.existsSync(dummyFilePath)).toBe(false);
    });

    it('should return 400 if brandId is missing', async () => {
      const res = await request(app)
        .delete('/api/reports/report-id')
        .expect(400);

      expect(res.body.message).toContain('brandId là bắt buộc');
    });
  });

  describe('GET /api/reports/:id/download', () => {
    it('should stream the file when the report belongs to the requesting brand', async () => {
      const mockReport = {
        id: 'report-dl-1',
        brandId: 'brand-123',
        format: 'PDF',
        title: 'My Report',
        fileUrl: '/uploads/reports/dl_test_report.pdf'
      };
      prisma.report.findUnique.mockResolvedValue(mockReport);

      const reportsDir = path.join(__dirname, '../../uploads/reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      const filePath = path.join(reportsDir, 'dl_test_report.pdf');
      fs.writeFileSync(filePath, '%PDF-1.4 dummy content');

      const res = await request(app)
        .get('/api/reports/report-dl-1/download?brandId=brand-123')
        .expect(200);

      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.body.toString()).toContain('dummy content');

      fs.unlinkSync(filePath);
    });

    it('should return 403 when the report belongs to a different brand', async () => {
      prisma.report.findUnique.mockResolvedValue({
        id: 'report-dl-2',
        brandId: 'brand-owner',
        format: 'PDF',
        title: 'Other Brand Report',
        fileUrl: '/uploads/reports/other_brand.pdf'
      });

      const res = await request(app)
        .get('/api/reports/report-dl-2/download?brandId=brand-attacker')
        .expect(403);

      expect(res.body.message).toContain('không có quyền');
    });

    it('should return 404 when the report does not exist', async () => {
      prisma.report.findUnique.mockResolvedValue(null);

      await request(app)
        .get('/api/reports/missing-report/download?brandId=brand-123')
        .expect(404);
    });

    it('should return 400 if brandId is missing', async () => {
      const res = await request(app)
        .get('/api/reports/report-dl-1/download')
        .expect(400);

      expect(res.body.message).toContain('brandId là bắt buộc');
    });
  });

  describe('GET /api/reports/preview-data', () => {
    it('should return aggregated preview analytics data', async () => {
      const mockBrand = { id: 'brand-123', name: 'Cool Brand', logoUrl: 'logo.png' };
      prisma.brand.findUnique.mockResolvedValue(mockBrand);
      prisma.socialAccount.findMany.mockResolvedValue([]);
      prisma.post.count.mockResolvedValue(0);
      prisma.post.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/reports/preview-data?brandId=brand-123&platforms=Facebook,YouTube')
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.overview).toBeDefined();
      expect(res.body.data.overview.reach).toBe(0); // Real data yields 0 when no channels connected
    });

    it('should return 400 if brandId is missing', async () => {
      const res = await request(app)
        .get('/api/reports/preview-data')
        .expect(400);

      expect(res.body.message).toContain('brandId là bắt buộc');
    });
  });
});
