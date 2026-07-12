const PdfReportStrategy = require('../../src/services/reports/strategies/pdf-report.strategy');
const CsvReportStrategy = require('../../src/services/reports/strategies/csv-report.strategy');
const ExcelJS = require('exceljs');
const axios = require('axios');

jest.mock('axios');

describe('Report Strategies Unit Tests', () => {
  let mockBrand;
  let mockData;

  beforeEach(() => {
    jest.clearAllMocks();

    mockBrand = {
      name: 'Thương Hiệu Việt',
      logoUrl: 'https://example.com/logo.png'
    };

    mockData = {
      overview: {
        reach: 15000,
        impressions: 25000,
        engagements: 1200,
        engagementRate: 4.8
      },
      channels: [
        {
          platform: 'Facebook',
          displayName: 'Page FB',
          followers: 8500,
          postsCount: 12,
          engagementRate: 5.2,
          analyticsData: {
            growth: [
              { name: '01/07', followers: 8400, views: 200, reactions: 10, comments: 5, shares: 2 },
              { name: '02/07', followers: 8500, views: 300, reactions: 15, comments: 8, shares: 4 }
            ],
            balance: [
              { name: '01/07', acquired: 10, lost: 2 },
              { name: '02/07', acquired: 15, lost: 3 }
            ]
          }
        }
      ],
      topPosts: [
        {
          platform: 'Facebook',
          title: 'Bài viết viral 1',
          likes: 120,
          comments: 45,
          shares: 12,
          engagementRate: 15.5
        }
      ]
    };
  });

  describe('PdfReportStrategy', () => {
    it('should generate a PDF buffer with correct metadata and ASCII content', async () => {
      const pdfStrategy = new PdfReportStrategy();
      const result = await pdfStrategy.generate('Báo cáo tuần', mockBrand, mockData, {
        isWhiteLabel: false,
        brandColorHex: '#FF5733'
      });

      expect(result.contentType).toBe('application/pdf');
      expect(result.extension).toBe('pdf');
      expect(result.buffer).toBeInstanceOf(Buffer);

      const pdfString = result.buffer.toString('utf-8');
      expect(pdfString).toContain('%%PDF-1.4');
      
      // The Vietnamese tones should be stripped to plain ASCII
      // "Thương Hiệu Việt" -> "Thuong Hieu Viet"
      expect(pdfString).toContain('Thuong Hieu Viet');
      expect(pdfString).toContain('Total Reach: 15,000');
      expect(pdfString).toContain('Total Impressions: 25,000');
      expect(pdfString).toContain('Theme Color: #FF5733');
      expect(pdfString).toContain('Powered by PubliCast');
    });

    it('should handle white-label option and custom logo in PDF', async () => {
      const pdfStrategy = new PdfReportStrategy();
      const result = await pdfStrategy.generate('Báo cáo', mockBrand, mockData, {
        isWhiteLabel: true,
        brandLogoUrl: 'https://logo.com/custom.png'
      });

      const pdfString = result.buffer.toString('utf-8');
      expect(pdfString).toContain('White-label \\(Logo: https://logo.com/custom.png\\)');
      expect(pdfString).not.toContain('Powered by PubliCast');
    });
  });

  describe('CsvReportStrategy', () => {
    it('should generate a valid Excel workbook with default sheets and cell formulas', async () => {
      const csvStrategy = new CsvReportStrategy();
      const result = await csvStrategy.generate('Báo cáo Excel', mockBrand, mockData, {
        includedSections: ['Overview', 'Channels', 'TopPosts'],
        brandColorHex: '#3B82F6'
      });

      expect(result.contentType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(result.extension).toBe('xlsx');
      expect(result.buffer).toBeInstanceOf(Buffer);

      // Parse generated XLSX using ExcelJS to verify sheets and cells
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(result.buffer);

      // Verify Sheets
      const sheetNames = workbook.worksheets.map(s => s.name);
      expect(sheetNames).toContain('Tổng Quan Hiệu Suất');
      expect(sheetNames).toContain('Chi Tiết Từng Kênh');
      expect(sheetNames).toContain('Bài Viết Nổi Bật');

      // Verify Overview Sheet Content
      const overviewSheet = workbook.getWorksheet('Tổng Quan Hiệu Suất');
      expect(overviewSheet.getCell('A1').value).toContain('BÁO CÁO PHÂN TÍCH: BÁO CÁO EXCEL');
      
      // Verify reach and impressions value written correctly
      const reachRow = overviewSheet.getRow(10); // row containing reach data
      expect(reachRow.getCell(2).value).toBe(15000);
      
      const engagementRateRow = overviewSheet.getRow(13);
      expect(engagementRateRow.getCell(2).value).toBe('4.80%');
    });

    it('should fetch and embed QuickChart images into dynamic widget sheets', async () => {
      // Mock Axios post to return a dummy image buffer
      const dummyImgBuffer = Buffer.from('fake-png-data');
      axios.post.mockResolvedValue({
        data: dummyImgBuffer
      });

      const csvStrategy = new CsvReportStrategy();
      const result = await csvStrategy.generate('Báo cáo chi tiết widget', mockBrand, mockData, {
        includedSections: ['Overview'],
        brandColorHex: '#FF5733',
        selectedWidgets: {
          ttGrowth: true,
          ttBalance: true
        }
      });

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(result.buffer);

      // The channel in mockData is Facebook, let's update it to TikTok to trigger ttGrowth and ttBalance
      mockData.channels[0].platform = 'TikTok';

      const tiktokResult = await csvStrategy.generate('Báo cáo TikTok detail', mockBrand, mockData, {
        includedSections: ['Overview'],
        brandColorHex: '#FF5733',
        selectedWidgets: {
          ttGrowth: true,
          ttBalance: true
        }
      });

      const tiktokWorkbook = new ExcelJS.Workbook();
      await tiktokWorkbook.xlsx.load(tiktokResult.buffer);

      const sheetNames = tiktokWorkbook.worksheets.map(s => s.name);
      expect(sheetNames).toContain('Hiệu suất Page FB'); // name based on displayName 'Page FB'
      
      const ttSheet = tiktokWorkbook.getWorksheet('Hiệu suất Page FB');
      
      // Verify tables are created in the sheet
      expect(ttSheet.getCell('A3').value).toBe('1. DỮ LIỆU TĂNG TRƯỞNG & LƯỢT XEM THEO NGÀY');
      
      // Verify QuickChart API was called
      expect(axios.post).toHaveBeenCalled();
    });

    it('should fall back gracefully if QuickChart API fails', async () => {
      axios.post.mockRejectedValue(new Error('Network Error'));

      mockData.channels[0].platform = 'TikTok';

      const csvStrategy = new CsvReportStrategy();
      
      // Should run successfully without throwing even if quickchart fails
      const result = await csvStrategy.generate('Báo cáo TikTok fallback', mockBrand, mockData, {
        includedSections: ['Overview'],
        selectedWidgets: {
          ttGrowth: true
        }
      });

      expect(result.buffer).toBeInstanceOf(Buffer);
    });
  });
});
