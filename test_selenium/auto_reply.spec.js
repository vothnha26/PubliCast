const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

const { expect } = require('chai');
const { Builder, By, until } = require('selenium-webdriver');
const { loginAs } = require('./helpers/login');
const chrome = require('selenium-webdriver/chrome');
const mysql = require('mysql2/promise');

const mockPlatforms = [
  { platform: 'FACEBOOK', id: 'mock-fb-social-account-id', accountId: 'fb-123', name: 'Mock Facebook' }
];

async function seedPlatforms(platforms) {
  console.log(`\n🛠️ Khởi tạo Mock Social Accounts cho các nền tảng: ${platforms.join(', ')}...`);
  const connection = await mysql.createConnection(process.env.MYSQL_URL || 'mysql://root:root_password@localhost:3307/publicast');
  try {
    const email = process.env.ADMIN_EMAIL || 'ci-admin@publicast.test';
    const [users] = await connection.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (users.length === 0) throw new Error(`User not found: ${email}`);
    const userId = users[0].id;

    const [brands] = await connection.execute('SELECT id FROM brands WHERE ownerId = ? OR id IN (SELECT brandId FROM teams WHERE userId = ?)', [userId, userId]);
    if (brands.length === 0) throw new Error(`Brand not found for user: ${email}`);

    // Xóa tất cả mock account cũ của tất cả các brand
    const allIds = [];
    for (const b of brands) {
      for (const mock of mockPlatforms) {
        allIds.push(`${mock.id}-${b.id}`);
      }
    }
    const placeholders = allIds.map(() => '?').join(',');
    if (allIds.length > 0) {
      await connection.execute(`DELETE FROM social_accounts WHERE id IN (${placeholders})`, allIds);
    }

    const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Chèn mock accounts cho tất cả các brand của user này
    for (const b of brands) {
      for (const p of platforms) {
        const mock = mockPlatforms.find(m => m.platform === p);
        if (mock) {
          const uniqueMockId = `${mock.id}-${b.id}`;
          await connection.execute(
            `INSERT INTO social_accounts (id, brandId, platform, platformAccountId, username, displayName, accessToken, scopes, isConnected, connectedAt, updatedAt) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              uniqueMockId,
              b.id,
              mock.platform,
              mock.accountId,
              `mock_${mock.platform.toLowerCase()}_user`,
              mock.name,
              'mock_access_token',
              'mock_scopes',
              1,
              nowStr,
              nowStr
            ]
          );
        }
      }
    }
    console.log(`✅ Đã seed thành công cho ${brands.length} brands.`);
  } finally {
    await connection.end();
  }
}

async function cleanupMockSocialAccounts() {
  console.log("🧹 Dọn dẹp tất cả Mock Social Accounts...");
  const connection = await mysql.createConnection(process.env.MYSQL_URL || 'mysql://root:root_password@localhost:3307/publicast');
  try {
    const email = process.env.ADMIN_EMAIL || 'ci-admin@publicast.test';
    const [users] = await connection.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (users.length > 0) {
      const userId = users[0].id;
      const [brands] = await connection.execute('SELECT id FROM brands WHERE ownerId = ? OR id IN (SELECT brandId FROM teams WHERE userId = ?)', [userId, userId]);
      const allIds = [];
      for (const b of brands) {
        for (const mock of mockPlatforms) {
          allIds.push(`${mock.id}-${b.id}`);
        }
      }
      const placeholders = allIds.map(() => '?').join(',');
      if (allIds.length > 0) {
        await connection.execute(`DELETE FROM social_accounts WHERE id IN (${placeholders})`, allIds);
      }
    }
    console.log("✅ Dọn dẹp hoàn tất.");
  } catch (err) {
    console.error("❌ Cleanup social accounts error:", err.message);
  } finally {
    await connection.end();
  }
}

describe('Meta Comment Auto-Reply Settings UI Tests', function () {
  this.timeout(60000);
  let driver;

  before(async function () {
    await seedPlatforms(['FACEBOOK']);

    const options = new chrome.Options();
    if (process.env.CI || process.env.HEADLESS) {
      options.addArguments('--headless=new');
      options.addArguments('--no-sandbox');
      options.addArguments('--disable-dev-shm-usage');
      options.addArguments('--disable-gpu');
    }
    options.addArguments('--window-size=1280,800');
    // Disable Chrome features that block third-party cookies in headless or clean profiles
    options.addArguments('--disable-features=BlockThirdPartyCookies,PrivacySandboxSettings4,TrackingProtection3pcd');
    options.setUserPreferences({
      'profile.cookie_controls_mode': 0
    });

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    console.log('🔑 Đang đăng nhập hệ thống...');
    await loginAs(driver, 'admin');
    
    // Đợi vào trang Dashboard
    await driver.wait(until.urlContains('/dashboard'), 15000);
    await driver.sleep(2000); // Đợi 2 giây cho session ghi hoàn toàn xuống local storage

    const cookies = await driver.manage().getCookies();
    console.log('🍪 Cookies in driver after login:', cookies);

    console.log('✅ Đã đăng nhập. Đi tới trang Inbox bằng cách click menu Topbar...');
    const inboxMenuBtn = await driver.wait(
      until.elementLocated(By.xpath("//header//button[@title='Inbox' or .//svg[contains(@class, 'lucide-message-square')]]")),
      15005
    );
    await inboxMenuBtn.click();
    await driver.wait(until.urlContains('/manage/inbox'), 15000);
    await driver.sleep(3000); // Chờ trang Inbox load xong
  });

  after(async function () {
    if (driver) {
      await driver.quit();
    }
    await cleanupMockSocialAccounts();
  });

  it('TC01 - Nên hiển thị nút Auto-Reply Settings khi chọn Facebook', async function () {
    try {
      // Tìm button Facebook trong danh sách lọc platform và click
      const fbFilterBtn = await driver.wait(
        until.elementLocated(By.xpath("//button[.//svg[contains(@class, 'lucide-facebook')]]")),
        10000
      );
      await fbFilterBtn.click();
      await driver.sleep(1500);
    } catch (err) {
      const currentUrl = await driver.getCurrentUrl();
      console.log(`❌ TC01 Error: ${err.message}`);
      console.log(`📍 Current URL during failure: ${currentUrl}`);
      try {
        const logs = await driver.manage().logs().get('browser');
        console.log('🖥️ Chrome Console Logs:');
        logs.forEach(log => console.log(`   [${log.level.name}] ${log.message}`));
      } catch (logErr) {
        console.log(`⚠️ Không thể lấy console logs của browser: ${logErr.message}`);
      }
      const pageSource = await driver.getPageSource();
      console.log(`📄 Page Source (first 1000 chars): ${pageSource.slice(0, 1000)}`);
      throw err;
    }

    // Kiểm tra xem nút Auto-Reply Settings có xuất hiện không
    const settingsBtn = await driver.wait(
      until.elementLocated(By.xpath("//button[@title='Auto-Reply Settings' or .//svg[contains(@class, 'lucide-settings')]]")),
      10000
    );
    expect(settingsBtn).to.exist;
  });

  it('TC02 - Nhấp vào nút Settings để mở Modal cấu hình', async function () {
    const settingsBtn = await driver.findElement(By.xpath("//button[@title='Auto-Reply Settings' or .//svg[contains(@class, 'lucide-settings')]]"));
    await settingsBtn.click();
    await driver.sleep(1000);

    // Kiểm tra xem tiêu đề Modal có hiển thị đúng không
    const modalHeader = await driver.wait(
      until.elementLocated(By.xpath("//h3[contains(text(), 'Meta Comment Auto-Reply Settings')]")),
      10000
    );
    expect(modalHeader).to.exist;
  });

  it('TC03 - Cấu hình Auto-Reply Mode và lưu thành công', async function () {
    // 1. Kiểm tra Toggle Enable Auto-Reply
    const toggleBtn = await driver.findElement(By.xpath("//button[contains(@class, 'rounded-full') and .//div[contains(@class, 'bg-white')]]"));
    
    // Đảm bảo là toggle được click để bật
    const isActivedBefore = await toggleBtn.getAttribute('class');
    if (!isActivedBefore.includes('bg-black')) {
      await toggleBtn.click();
      await driver.sleep(500);
    }

    // 2. Chuyển sang Mode AI
    const aiModeBtn = await driver.wait(
      until.elementLocated(By.xpath("//button[contains(text(), 'AI Auto-Reply')]")),
      5000
    );
    await aiModeBtn.click();
    await driver.sleep(500);

    // 3. Điền prompt chỉ dẫn cho AI
    const textarea = await driver.findElement(By.xpath("//textarea[contains(@placeholder, 'Be a polite customer support agent')]"));
    await textarea.clear();
    await textarea.sendKeys('Hãy trả lời khách hàng một cách tự nhiên và lịch sự.');

    // 4. Nhấp nút Save Settings để lưu cấu hình
    const saveBtn = await driver.findElement(By.xpath("//button[contains(text(), 'Save Settings')]"));
    await saveBtn.click();
    await driver.sleep(1500);

    // 5. Kiểm tra Modal đã được đóng tự động
    const modalClosed = await driver.wait(
      async () => {
        const elements = await driver.findElements(By.xpath("//h3[contains(text(), 'Meta Comment Auto-Reply Settings')]"));
        return elements.length === 0;
      },
      5000
    );
    expect(modalClosed).to.be.true;
  });
});
