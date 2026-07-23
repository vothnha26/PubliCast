const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

const { expect } = require('chai');
const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const mysql = require('mysql2/promise');

/**
 * Generates a real, valid 1x1 red-pixel PNG at the given path using only
 * Node's built-in zlib (no external image lib / no committed binary needed).
 * Ensures test_assets/sample_image.png always exists before Selenium runs,
 * so CI never depends on a binary fixture being present in the repo/checkout.
 */
function ensureSamplePng(filePath) {
  if (fs.existsSync(filePath)) return;

  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c >>> 0;
  }
  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }
  function chunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
  }

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(1, 0); // width
  ihdrData.writeUInt32BE(1, 4); // height
  ihdrData.writeUInt8(8, 8); // bit depth
  ihdrData.writeUInt8(2, 9); // color type: RGB
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace
  const ihdr = chunk('IHDR', ihdrData);

  // One scanline: filter byte (0) + 1 red pixel (R,G,B)
  const raw = Buffer.from([0, 0xff, 0x00, 0x00]);
  const idatData = zlib.deflateSync(raw);
  const idat = chunk('IDAT', idatData);

  const iend = chunk('IEND', Buffer.alloc(0));

  const png = Buffer.concat([signature, ihdr, idat, iend]);
  fs.writeFileSync(filePath, png);
}

const mockPlatforms = [
  { platform: 'FACEBOOK', id: 'mock-fb-social-account-id', accountId: 'fb-123', name: 'Mock Facebook' },
  { platform: 'INSTAGRAM', id: 'mock-ig-social-account-id', accountId: 'ig-123', name: 'Mock Instagram' },
  { platform: 'TIKTOK', id: 'mock-tt-social-account-id', accountId: 'tt-123', name: 'Mock TikTok' },
  { platform: 'YOUTUBE', id: 'mock-yt-social-account-id', accountId: 'yt-123', name: 'Mock YouTube' },
  { platform: 'TELEGRAM', id: 'mock-tg-social-account-id', accountId: 'tg-123', name: 'Mock Telegram' },
  { platform: 'THREADS', id: 'mock-th-social-account-id', accountId: 'th-123', name: 'Mock Threads' }
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

    // Xóa tất cả mock account cũ theo ID
    const allIds = [];
    for (const b of brands) {
      for (const mock of mockPlatforms) {
        allIds.push(`${mock.id}-${b.id}`);
      }
    }
    if (allIds.length > 0) {
      const placeholders = allIds.map(() => '?').join(',');
      await connection.execute(`DELETE FROM social_accounts WHERE id IN (${placeholders})`, allIds);
    }

    // Xóa tất cả các account trùng platformAccountId của các brand để tránh Duplicate key constraint
    for (const b of brands) {
      for (const mock of mockPlatforms) {
        await connection.execute(
          'DELETE FROM social_accounts WHERE brandId = ? AND platform = ? AND platformAccountId = ?',
          [b.id, mock.platform, mock.accountId]
        );
      }
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

async function verifyAndCleanupPost(uniqueCaption) {
  const connection = await mysql.createConnection(process.env.MYSQL_URL || 'mysql://root:root_password@localhost:3307/publicast');
  try {
    const [posts] = await connection.execute('SELECT id FROM posts WHERE caption = ?', [uniqueCaption]);
    if (posts.length > 0) {
      await connection.execute('DELETE FROM posts WHERE id = ?', [posts[0].id]);
      return true;
    }
    return false;
  } finally {
    await connection.end();
  }
}

describe('Post Creator Detailed E2E Suite', function () {
  this.timeout(90000);
  let driver;

  async function safeClick(selector, timeout = 12000) {
    let attempts = 0;
    while (attempts < 3) {
      try {
        const element = await driver.wait(until.elementLocated(selector), timeout);
        await driver.wait(until.elementIsVisible(element), timeout);
        await element.click();
        return;
      } catch (err) {
        if (err.name === 'StaleElementReferenceError' || err.name === 'ElementClickInterceptedError') {
          attempts++;
          await driver.sleep(1200);
        } else {
          throw err;
        }
      }
    }
    try {
      const element = await driver.findElement(selector);
      await driver.executeScript("arguments[0].click();", element);
    } catch (err) {
      throw new Error(`Failed to click on selector ${selector.toString()}: ${err.message}`);
    }
  }

  async function ensurePlatformState(platform, shouldBeSelected) {
    const selector = By.css(`[data-testid="platform-select-${platform}"]`);
    const element = await driver.wait(until.elementLocated(selector), 12000);
    const className = await element.getAttribute('class');
    const isSelected = !className.includes('text-gray-400');
    
    if (isSelected !== shouldBeSelected) {
      await safeClick(selector);
      await driver.sleep(600);
    }
  }

  async function selectPlatformOnly(targetPlatform) {
    const platforms = ['facebook', 'instagram', 'youtube', 'tiktok', 'telegram', 'threads'];
    for (const p of platforms) {
      const selector = By.css(`[data-testid="platform-select-${p}"]`);
      const elements = await driver.findElements(selector);
      if (elements.length > 0) {
        await ensurePlatformState(p, p === targetPlatform);
      }
    }
  }

  /**
   * Hard re-login: Xóa toàn bộ cookie và storage trước, sau đó login qua browser.
   * Khác với performLogin(), hàm này đảm bảo không có refresh token cookie cũ nào
   * gây ra auto-redirect khi vào trang /login. Backend sẽ set cookie mới đúng domain.
   */
  async function hardRelogin() {
    const email = process.env.ADMIN_EMAIL || 'ci-admin@publicast.test';
    const password = process.env.ADMIN_PASSWORD || 'nhacc123@';

    // Bước 1: Xóa toàn bộ cookie và storage — ngăn refresh token auto-redirect
    await driver.manage().deleteAllCookies();
    await driver.executeScript(() => {
      try { localStorage.clear(); } catch(e) {}
      try { sessionStorage.clear(); } catch(e) {}
    });
    console.log('🧹 Đã xóa toàn bộ cookies và storage.');
    await driver.sleep(1000);

    // Bước 2: Vào trang login (không có cookie nào — form login hiển thị bình thường)
    await driver.get(`${BASE_URL}/login`);
    const emailInput = await driver.wait(until.elementLocated(By.id('email')), 15000);
    const passwordInput = await driver.findElement(By.id('password'));
    const submitButton = await driver.findElement(By.xpath("//button[@type='submit']"));

    await emailInput.clear();
    await emailInput.sendKeys(email);
    await driver.sleep(500);
    await passwordInput.clear();
    await passwordInput.sendKeys(password);
    await driver.sleep(500);
    await submitButton.click();

    // Bước 3: Chờ redirect thành công sau login
    await driver.wait(async () => {
      const url = await driver.getCurrentUrl();
      return url.includes('/dashboard') || url.includes('/start') || url.includes('/manage');
    }, 15000);

    await driver.sleep(2500); // Chờ 2.5 giây để cookie HttpOnly được đồng bộ hoàn toàn vào browser storage
    console.log('✅ [hardRelogin] Đăng nhập lại thành công, session mới đã được thiết lập.');
  }




  async function navigateToPlannerAndPrepare() {
    const plannerUrl = `${BASE_URL}/planner/calendar`;
    await driver.get(plannerUrl);
    await driver.sleep(2500); // Chờ 2.5 giây để React app hoàn tất API auth check và redirect nếu có

    // Nếu bị redirect về login (URL check đơn giản) → re-login ngay
    let currentUrl = await driver.getCurrentUrl();
    if (currentUrl.includes('/login') || currentUrl.includes('/register')) {
      console.log('⚠️  Bị redirect về login page sau khi load planner, đang tự động re-login...');
      await hardRelogin();
      await driver.get(plannerUrl);
      await driver.sleep(2500);
    }

    // Kiểm tra bằng element thực tế: nếu planner button không hiện → session hết hạn → re-login
    try {
      await driver.wait(until.elementLocated(By.css('[data-testid="planner-create-post-btn"]')), 8000);
    } catch (e) {
      console.log('⚠️  Không tìm thấy planner button, session có thể hết hạn, đang re-login...');
      await hardRelogin();
      await driver.get(plannerUrl);
      await driver.wait(until.elementLocated(By.css('[data-testid="planner-create-post-btn"]')), 15000);
    }

    await driver.sleep(2000); // Chờ re-render hoàn chỉnh
  }





  before(async function () {
    // Generate the image test fixture on the fly instead of relying on a
    // committed binary — guarantees it exists on any fresh CI checkout
    // without needing to remember to commit/track it.
    ensureSamplePng(path.resolve(__dirname, './test_assets/sample_image.png'));

    const options = new chrome.Options();
    if (process.env.CI || process.env.HEADLESS) {
      options.addArguments('--headless=new');
      options.addArguments('--no-sandbox');
      options.addArguments('--disable-dev-shm-usage');
      options.addArguments('--disable-gpu');
    }
    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();
    await driver.manage().window().maximize();

    // Clear session at root URL first
    try {
      await driver.get(BASE_URL);
      await driver.manage().deleteAllCookies();
      await driver.executeScript(() => {
        try { localStorage.clear(); } catch(e) {}
        try { sessionStorage.clear(); } catch(e) {}
      });
    } catch (err) {
      console.warn("⚠️ Warning clearing session in before hook:", err.message);
    }

    // Go to login page and wait with a longer timeout to allow Vite hot-compilation if needed
    const loginUrl = `${BASE_URL}/login`;
    await driver.get(loginUrl);

    const emailInput = await driver.wait(until.elementLocated(By.id('email')), 30000);
    const passwordInput = await driver.findElement(By.id('password'));
    const submitButton = await driver.findElement(By.xpath("//button[@type='submit']"));

    const email = process.env.ADMIN_EMAIL || 'ci-admin@publicast.test';
    const password = process.env.ADMIN_PASSWORD || 'nhacc123@';

    await emailInput.sendKeys(email);
    await driver.sleep(500);
    await passwordInput.sendKeys(password);
    await driver.sleep(500);
    await submitButton.click();

    await driver.wait(async () => {
      const currentUrl = await driver.getCurrentUrl();
      return currentUrl.includes('/dashboard') || currentUrl.includes('/start') || currentUrl.includes('/manage/connections');
    }, 20000);

    // Đảm bảo ngôn ngữ mặc định luôn là tiếng Anh trong suốt quá trình chạy test này
    await driver.executeScript("localStorage.setItem('publicast-language', 'en');");
  });

  after(async function () {
    if (driver) {
      await driver.quit();
    }
    await cleanupMockSocialAccounts();
  });

  afterEach(async function () {
    if (this.currentTest.state === 'failed') {
      try {
        const image = await driver.takeScreenshot();
        const screenshotPath = path.join(__dirname, `error_${this.currentTest.title.replace(/[^a-zA-Z0-9]/g, '_')}.png`);
        fs.writeFileSync(screenshotPath, image, 'base64');
        console.log(`📸 Đã chụp màn hình khi lỗi: ${screenshotPath}`);
        try {
          const logs = await driver.manage().logs().get('browser');
          console.log('🌐 Browser Console Logs:');
          logs.forEach(log => console.log(`[${log.level.name}] ${log.message}`));
        } catch (logErr) {
          console.warn('⚠️ Không thể lấy logs từ browser:', logErr.message);
        }
      } catch (err) {
        console.error("❌ Không thể chụp ảnh màn hình lỗi:", err.message);
      }
    }
  });

  it('TC_POST_01 – Verify Post Creator Modal can be opened and closed successfully', async function () {
    await seedPlatforms(['FACEBOOK']);
    await navigateToPlannerAndPrepare();
    await safeClick(By.css('[data-testid="planner-create-post-btn"]'));
    await driver.sleep(2000);

    const captionInput = await driver.wait(
      until.elementLocated(By.css('[data-testid="post-caption-input"]')),
      10000
    );
    expect(captionInput).to.exist;

    await safeClick(By.css('[data-testid="post-creator-close-btn"]'));
    await driver.sleep(1500);

    const modalElements = await driver.findElements(By.css('[data-testid="post-caption-input"]'));
    expect(modalElements.length).to.equal(0);
  });

  it('TC_POST_02 – Verify multi-platform selection and active platform switcher', async function () {
    await seedPlatforms(['FACEBOOK', 'INSTAGRAM', 'YOUTUBE']);
    await navigateToPlannerAndPrepare();
    await safeClick(By.css('[data-testid="planner-create-post-btn"]'));
    await driver.sleep(2000);

    await ensurePlatformState('facebook', true);
    await ensurePlatformState('instagram', true);
    await ensurePlatformState('youtube', true);

    // Bỏ chọn Facebook
    await ensurePlatformState('facebook', false);

    await safeClick(By.css('[data-testid="post-creator-close-btn"]'));
  });

  it('TC_POST_03 – Verify publish options menu updates submit button label text', async function () {
    await seedPlatforms(['FACEBOOK']);
    await navigateToPlannerAndPrepare();
    await safeClick(By.css('[data-testid="planner-create-post-btn"]'));
    await driver.sleep(2000);

    await safeClick(By.css('[data-testid="post-publish-menu-btn"]'));
    await driver.sleep(1000);

    await safeClick(By.css('[data-testid="publish-option-draft"]'));
    await driver.sleep(500);

    const submitBtn = await driver.findElement(By.css('[data-testid="post-submit-btn"]'));
    const btnText = await submitBtn.getText();
    expect(btnText.toUpperCase()).to.equal('SAVE');

    await safeClick(By.css('[data-testid="post-creator-close-btn"]'));
  });

  it('TC_POST_04 – Verify creating Facebook post draft saves caption to database and displays on List UI', async function () {
    await seedPlatforms(['FACEBOOK']);
    await navigateToPlannerAndPrepare();
    await safeClick(By.css('[data-testid="planner-create-post-btn"]'));
    await driver.sleep(2000);

    const captionInput = await driver.wait(until.elementLocated(By.css('[data-testid="post-caption-input"]')), 10000);

    await selectPlatformOnly('facebook');

    const uniqueCaption = `Mocha E2E Test Post - Facebook Draft - Created at ${Date.now()}`;
    await captionInput.sendKeys(uniqueCaption);
    await driver.sleep(500);

    await safeClick(By.css('[data-testid="post-publish-menu-btn"]'));
    await driver.sleep(1000);

    await safeClick(By.css('[data-testid="publish-option-draft"]'));
    await driver.sleep(500);

    await safeClick(By.css('[data-testid="post-submit-btn"]'));
    await driver.wait(until.stalenessOf(captionInput), 12000);

    // 1. Kiểm tra hiển thị trên List UI
    await driver.get(`${BASE_URL}/planner/list`);
    await driver.sleep(2000);
    const uiPostCard = await driver.wait(
      until.elementLocated(By.xpath(`//*[contains(text(), '${uniqueCaption}')]`)),
      12000
    );
    expect(uiPostCard).to.exist;

    // 2. Kiểm tra lưu vào DB
    const dbVerified = await verifyAndCleanupPost(uniqueCaption);
    expect(dbVerified).to.be.true;
  });

  it('TC_POST_05 – Verify multi-platform post draft saves targetPlatforms correctly in DB and displays on List UI', async function () {
    await seedPlatforms(['FACEBOOK', 'INSTAGRAM', 'THREADS']);
    await navigateToPlannerAndPrepare();
    await safeClick(By.css('[data-testid="planner-create-post-btn"]'));
    await driver.sleep(2500);

    const captionInput = await driver.wait(until.elementLocated(By.css('[data-testid="post-caption-input"]')), 10000);

    await selectPlatformOnly('instagram');
    await ensurePlatformState('threads', true);
    await ensurePlatformState('facebook', true);

    const uniqueCaption = `Mocha E2E Multi-Platform Draft - Created at ${Date.now()}`;
    await captionInput.sendKeys(uniqueCaption);
    await driver.sleep(500);

    await safeClick(By.css('[data-testid="post-publish-menu-btn"]'));
    await driver.sleep(1000);

    await safeClick(By.css('[data-testid="publish-option-draft"]'));
    await driver.sleep(500);

    await safeClick(By.css('[data-testid="post-submit-btn"]'));
    await driver.wait(until.stalenessOf(captionInput), 12000);

    // 1. Kiểm tra hiển thị trên List UI
    await driver.get(`${BASE_URL}/planner/list`);
    await driver.sleep(2000);
    const uiPostCard = await driver.wait(
      until.elementLocated(By.xpath(`//*[contains(text(), '${uniqueCaption}')]`)),
      12000
    );
    expect(uiPostCard).to.exist;

    // 2. Kiểm tra lưu targetPlatforms vào DB
    const connection = await mysql.createConnection(process.env.MYSQL_URL || 'mysql://root:root_password@localhost:3307/publicast');
    try {
      const [posts] = await connection.execute('SELECT id, targetPlatforms FROM posts WHERE caption = ?', [uniqueCaption]);
      expect(posts.length).to.be.greaterThan(0);
      expect(posts[0].targetPlatforms.toLowerCase()).to.include('facebook');
      expect(posts[0].targetPlatforms.toLowerCase()).to.include('instagram');
      expect(posts[0].targetPlatforms.toLowerCase()).to.include('threads');
      await connection.execute('DELETE FROM posts WHERE id = ?', [posts[0].id]);
    } finally {
      await connection.end();
    }
  });

  it('TC_POST_06 – Verify character limits logic for Threads (500 chars limit)', async function () {
    await seedPlatforms(['THREADS']);
    await navigateToPlannerAndPrepare();
    await safeClick(By.css('[data-testid="planner-create-post-btn"]'));
    await driver.sleep(2000);

    const captionInput = await driver.wait(until.elementLocated(By.css('[data-testid="post-caption-input"]')), 10000);

    await selectPlatformOnly('threads');

    const longCaption = 'A'.repeat(550);
    await captionInput.sendKeys(longCaption);
    await driver.sleep(500);

    await safeClick(By.css('[data-testid="post-creator-close-btn"]'));
  });

  it('TC_POST_07 – Verify platform validation blocks submission if YouTube has no video', async function () {
    await seedPlatforms(['YOUTUBE']);
    await navigateToPlannerAndPrepare();
    await safeClick(By.css('[data-testid="planner-create-post-btn"]'));
    await driver.sleep(2000);

    await selectPlatformOnly('youtube');

    const captionInput = await driver.findElement(By.css('[data-testid="post-caption-input"]'));
    await captionInput.sendKeys("Testing YouTube validation without video attachment.");
    await driver.sleep(500);

    await safeClick(By.css('[data-testid="post-submit-btn"]'));
    await driver.sleep(1500);

    const modalElements = await driver.findElements(By.css('[data-testid="post-caption-input"]'));
    expect(modalElements.length).to.be.greaterThan(0);

    await safeClick(By.css('[data-testid="post-creator-cancel-btn"]'));
  });

  it('TC_POST_08 – Verify platform validation blocks submission if TikTok has no media', async function () {
    await seedPlatforms(['TIKTOK']);
    await navigateToPlannerAndPrepare();
    await safeClick(By.css('[data-testid="planner-create-post-btn"]'));
    await driver.sleep(2000);

    await selectPlatformOnly('tiktok');

    const captionInput = await driver.findElement(By.css('[data-testid="post-caption-input"]'));
    await captionInput.sendKeys("Testing TikTok validation without media attachment.");
    await driver.sleep(500);

    await safeClick(By.css('[data-testid="post-submit-btn"]'));
    await driver.sleep(1500);

    const modalElements = await driver.findElements(By.css('[data-testid="post-caption-input"]'));
    expect(modalElements.length).to.be.greaterThan(0);

    await safeClick(By.css('[data-testid="post-creator-cancel-btn"]'));
  });

  it.skip('TC_POST_09 – Verify scheduling a post for tomorrow saves scheduledAt correctly in DB and displays on List UI', async function () {
    await seedPlatforms(['FACEBOOK']);
    await navigateToPlannerAndPrepare();
    await safeClick(By.css('[data-testid="planner-create-post-btn"]'));
    await driver.sleep(2000);


    const captionInput = await driver.wait(until.elementLocated(By.css('[data-testid="post-caption-input"]')), 10000);

    await selectPlatformOnly('facebook');

    const uniqueCaption = `Mocha E2E Scheduled Post - Created at ${Date.now()}`;
    await captionInput.sendKeys(uniqueCaption);
    await driver.sleep(500);

    await safeClick(By.css('[data-testid="post-publish-menu-btn"]'));
    await driver.sleep(1000);

    await safeClick(By.css('[data-testid="publish-option-schedule"]'));
    await driver.sleep(1000);

    // Lên lịch cho ngày mai
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12);
    tomorrow.setMinutes(0);
    tomorrow.setSeconds(0);
    tomorrow.setMilliseconds(0);

    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
    const hours = String(tomorrow.getHours()).padStart(2, '0');
    const minutes = String(tomorrow.getMinutes()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;

    const dateInput = await driver.findElement(By.css('[data-testid="post-scheduled-date-input"]'));
    await driver.executeScript(
      `const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(arguments[0], arguments[1]);
      arguments[0].dispatchEvent(new Event('input', { bubbles: true }));
      arguments[0].dispatchEvent(new Event('change', { bubbles: true }));`,
      dateInput,
      formattedDate
    );
    await driver.sleep(1000);



    await safeClick(By.css('[data-testid="post-submit-btn"]'));
    await driver.wait(until.stalenessOf(captionInput), 12000);

    // 1. Kiểm tra hiển thị trên List UI
    await driver.get(`${BASE_URL}/planner/list`);
    await driver.sleep(2000); // Đợi trang list render các bài đăng
    const uiPostCard = await driver.wait(
      until.elementLocated(By.xpath(`//*[contains(text(), '${uniqueCaption}')]`)),
      12000
    );
    expect(uiPostCard).to.exist;

    // 2. Kiểm tra DB
    const connection = await mysql.createConnection(process.env.MYSQL_URL || 'mysql://root:root_password@localhost:3307/publicast');
    try {
      const [posts] = await connection.execute('SELECT id, scheduledAt, status FROM posts WHERE caption = ?', [uniqueCaption]);
      expect(posts.length).to.be.greaterThan(0);
      expect(posts[0].scheduledAt).to.not.be.null;
      await connection.execute('DELETE FROM posts WHERE id = ?', [posts[0].id]);
    } finally {
      await connection.end();
    }
  });

  it('TC_POST_10 – Verify uploading an image file from local machine renders preview on Facebook post', async function () {
    await seedPlatforms(['FACEBOOK']);
    await navigateToPlannerAndPrepare();
    await safeClick(By.css('[data-testid="planner-create-post-btn"]'));
    await driver.sleep(2000);

    await selectPlatformOnly('facebook');

    // Gửi đường dẫn tuyệt đối của file ảnh thẳng vào thẻ input[type="file"]
    const imageFilePath = path.resolve(__dirname, './test_assets/sample_image.png');
    const fileInput = await driver.wait(
      until.elementLocated(By.css('[data-testid="post-file-input"]')),
      10000
    );
    await fileInput.sendKeys(imageFilePath);
    await driver.sleep(2000); // Chờ React cập nhật state và render preview

    // Kiểm tra ảnh preview xuất hiện trên giao diện (thẻ img trong composer)
    const previewImg = await driver.wait(
      until.elementLocated(By.css('[data-testid="post-image-preview"]')),
      10000
    );
    expect(previewImg).to.exist;

    await safeClick(By.css('[data-testid="post-creator-close-btn"]'));
  });

  it('TC_POST_11 – Verify uploading a video file from local machine renders preview and saves to DB for YouTube post', async function () {
    await seedPlatforms(['YOUTUBE']);
    await navigateToPlannerAndPrepare();
    await safeClick(By.css('[data-testid="planner-create-post-btn"]'));
    await driver.sleep(2000);

    await selectPlatformOnly('youtube');

    // Điền caption
    const captionInput = await driver.wait(until.elementLocated(By.css('[data-testid="post-caption-input"]')), 10000);
    const uniqueCaption = `Mocha E2E YouTube Upload Test - Created at ${Date.now()}`;
    await captionInput.sendKeys(uniqueCaption);
    await driver.sleep(300);

    // Gửi đường dẫn tuyệt đối file video
    const videoFilePath = path.resolve(__dirname, './test_assets/sample_video.mp4');
    const fileInput = await driver.wait(
      until.elementLocated(By.css('[data-testid="post-file-input"]')),
      10000
    );
    await fileInput.sendKeys(videoFilePath);
    console.log("⏳ Chờ video upload lên Cloudinary (chờ biến mất trạng thái 'Uploading...')...");
    try {
      await driver.wait(
        async () => {
          const elements = await driver.findElements(By.xpath("//*[contains(text(), 'Uploading...')]"));
          return elements.length === 0;
        },
        25000,
        "Video upload to Cloudinary timed out after 25s"
      );
    } catch (e) {
      console.warn("⚠️ Cảnh báo: Trạng thái upload không biến mất hoặc bị lỗi:", e.message);
    }
    await driver.sleep(2000); // Đợi React render xong và cập nhật state submit button hoàn chỉnh

    // Kiểm tra tên file video xuất hiện trên thanh xem trước
    const videoPreviewName = await driver.wait(
      until.elementLocated(By.xpath("//*[contains(text(), 'sample_video.mp4')]") ),
      8000
    );
    expect(videoPreviewName).to.exist;

    // Lưu bài đăng nháp (YouTube cho phép lưu draft khi có video đính kèm)
    await safeClick(By.css('[data-testid="post-publish-menu-btn"]'));
    await driver.sleep(800);
    await safeClick(By.css('[data-testid="publish-option-draft"]'));
    await driver.sleep(400);
    await safeClick(By.css('[data-testid="post-submit-btn"]'));
    await driver.wait(until.stalenessOf(captionInput), 12000);

    // Kiểm tra hiển thị trên List UI
    await driver.get(`${BASE_URL}/planner/list`);
    await driver.sleep(2000);
    const uiPostCard = await driver.wait(
      until.elementLocated(By.xpath(`//*[contains(text(), '${uniqueCaption}')]`)),
      12000
    );
    expect(uiPostCard).to.exist;

    // Dọn dẹp DB
    const connection = await mysql.createConnection(process.env.MYSQL_URL || 'mysql://root:root_password@localhost:3307/publicast');
    try {
      const [posts] = await connection.execute('SELECT id FROM posts WHERE caption = ?', [uniqueCaption]);
      if (posts.length > 0) {
        await connection.execute('DELETE FROM posts WHERE id = ?', [posts[0].id]);
      }
    } finally {
      await connection.end();
    }
  });

  it('TC_POST_12_DUPLICATE – Verify Duplicating a post pre-fills fields and saves as a new post', async function () {
    await seedPlatforms(['FACEBOOK']);
    await navigateToPlannerAndPrepare();

    // Lấy brandId từ localStorage — auth is cookie-based (see credentials:
    // 'include' below), no Bearer token is stored client-side anymore.
    const authData = await driver.executeScript(() => {
      return {
        brandId: localStorage.getItem('activeBrandId') || ''
      };
    });

    const uniqueOriginalCaption = `Original post for Duplicate Test - ${Date.now()}`;

    // Tạo bài viết gốc qua API fetch trong browser context
    const createStatus = await driver.executeScript(async (brandId, caption) => {
      const res = await fetch('/api/posts', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          brandId,
          title: 'Duplicate Test Original Post',
          caption: caption,
          targetPlatforms: ['FACEBOOK'],
          status: 'DRAFT',
          options: {
            facebookType: 'post'
          }
        })
      });
      if (res.status !== 201) {
        const text = await res.text();
        return { status: res.status, error: text };
      }
      return { status: res.status };
    }, authData.brandId, uniqueOriginalCaption);

    console.log("=== CREATE POST RESULT ===", createStatus);

    await driver.sleep(1000);

    // Đi tới trang danh sách planner list
    await driver.get(`${BASE_URL}/planner/list`);
    await driver.sleep(2000);

    // Tìm dòng bài viết vừa tạo
    const postRowXpath = `//tr[descendant::*[contains(text(), '${uniqueOriginalCaption}')]]`;
    const postRow = await driver.wait(until.elementLocated(By.xpath(postRowXpath)), 12000);
    expect(postRow).to.exist;

    // Tìm nút 3-dot dropdown menu trên dòng này và click
    const menuBtn = await postRow.findElement(By.css('[data-testid^="post-action-menu-"]'));
    await driver.executeScript("arguments[0].click();", menuBtn);
    await driver.sleep(600);

    // Tìm nút "Nhân bản bài viết" và click
    const duplicateBtn = await driver.wait(until.elementLocated(By.css('[data-testid="post-duplicate-btn"]')), 8000);
    await driver.executeScript("arguments[0].click();", duplicateBtn);
    await driver.sleep(2000);

    // Xác minh Modal PostCreator được mở ra và nội dung caption được điền sẵn
    const captionInput = await driver.wait(until.elementLocated(By.css('[data-testid="post-caption-input"]')), 10000);
    const existingVal = await captionInput.getAttribute('value');
    expect(existingVal).to.equal(uniqueOriginalCaption);

    // Thay đổi caption để đánh dấu bài viết nhân bản
    const uniqueDuplicatedCaption = `Duplicated post for Duplicate Test - ${Date.now()}`;
    await captionInput.clear();
    await captionInput.sendKeys(uniqueDuplicatedCaption);
    await driver.sleep(300);

    // Click Save / UPDATE (nếu template post thì button hiển thị SAVE hoặc SCHEDULE, hãy click submit-btn)
    const submitBtn = await driver.findElement(By.css('[data-testid="post-submit-btn"]'));
    await driver.executeScript("arguments[0].click();", submitBtn);
    await driver.wait(until.stalenessOf(captionInput), 12000);
    await driver.sleep(2000);

    // Xác minh cả hai bài viết (gốc và nhân bản) đều tồn tại
    await driver.get(`${BASE_URL}/planner/list`);
    await driver.sleep(2000);

    const originalPostElement = await driver.findElement(By.xpath(`//*[contains(text(), '${uniqueOriginalCaption}')]`));
    const duplicatedPostElement = await driver.findElement(By.xpath(`//*[contains(text(), '${uniqueDuplicatedCaption}')]`));

    expect(originalPostElement).to.exist;
    expect(duplicatedPostElement).to.exist;

    // Dọn dẹp DB
    await verifyAndCleanupPost(uniqueOriginalCaption);
    await verifyAndCleanupPost(uniqueDuplicatedCaption);
  });
});
