const internalSmartLinkStrategy = require('../../src/services/workspace/smart-link/shortener-strategies/internal-smart-link.strategy');
const prisma = require('../../src/config/prisma');

describe('InternalSmartLinkStrategy DB Integration Test', () => {
  let testBrand;

  beforeAll(async () => {
    // Tìm hoặc tạo 1 brand test
    testBrand = await prisma.brand.findFirst();
  });

  test('should generate short link and save LinkItem to DB', async () => {
    if (!testBrand) return;

    const testUrl = `https://thegioididong.com/test-${Date.now()}`;
    const shortUrl = await internalSmartLinkStrategy.shorten(testUrl, testBrand.id);

    expect(shortUrl).toContain('/r/');

    // Kiểm tra xem LinkItem đã được lưu thực sự trong DB chưa
    const linkItem = await prisma.linkItem.findFirst({
      where: { url: testUrl }
    });

    expect(linkItem).not.toBeNull();
    expect(linkItem.url).toBe(testUrl);

    // Clean up
    if (linkItem) {
      await prisma.linkItem.delete({ where: { id: linkItem.id } });
    }
  });
});
