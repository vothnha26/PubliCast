const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const { expect } = require('chai');
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const mysql = require('mysql2/promise');
const { createClient } = require('redis');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

describe('General Dashboard E2E Test Suite', function () {
  this.timeout(120000);
  let driver;
  let redisClient;
  let dbConnection;
  let testEmail;
  let testPassword = 'Password123!';
  let userId;
  let brandId;

  // Helper to click securely
  async function safeClick(selector, timeout = 15000) {
    let attempts = 0;
    while (attempts < 3) {
      try {
        const element = await driver.wait(until.elementLocated(selector), timeout);
        try {
          await driver.wait(until.elementIsVisible(element), 5000);
          await element.click();
          return;
        } catch (visErr) {
          await driver.executeScript("arguments[0].click();", element);
          return;
        }
      } catch (err) {
        attempts++;
        await driver.sleep(1000);
      }
    }
    try {
      const element = await driver.findElement(selector);
      await driver.executeScript("arguments[0].click();", element);
    } catch (finalErr) {
      throw finalErr;
    }
  }

  // Seed General Dashboard Data
  async function seedGeneralDashboardData() {
    console.log(`🛠️ Seeding mock General Dashboard data into DB for brandId: ${brandId}...`);
    const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const saFbId = `selenium-fb-account-${Date.now()}`;
    const saYtId = `selenium-yt-account-${Date.now()}`;

    // Clean up old brand social accounts & posts if any
    await dbConnection.execute('DELETE FROM posts WHERE brandId = ?', [brandId]);
    await dbConnection.execute('DELETE FROM social_accounts WHERE brandId = ?', [brandId]);
    await dbConnection.execute('DELETE FROM analytics WHERE brandId = ?', [brandId]);

    // 1. Insert social_accounts for Facebook & YouTube (isConnected = 1)
    await dbConnection.execute(
      `INSERT INTO social_accounts (id, brandId, platform, platformAccountId, username, displayName, profilePictureUrl, accessToken, scopes, isConnected, connectedAt, updatedAt) 
       VALUES (?, ?, 'FACEBOOK', 'fb_page_abc', '@SeleniumFBPage', 'Selenium FB Page', 'https://avatar.url/fb', 'mock-token', 'pages_read_engagement', 1, ?, ?)`,
      [saFbId, brandId, nowStr, nowStr]
    );

    await dbConnection.execute(
      `INSERT INTO social_accounts (id, brandId, platform, platformAccountId, username, displayName, profilePictureUrl, accessToken, scopes, isConnected, connectedAt, updatedAt) 
       VALUES (?, ?, 'YOUTUBE', 'yt_channel_abc', '@SeleniumYTChannel', 'Selenium YT Channel', 'https://avatar.url/yt', 'mock-token', 'youtube.readonly', 1, ?, ?)`,
      [saYtId, brandId, nowStr, nowStr]
    );

    // Insert YouTubeChannel details to satisfy sub-account requirements
    const ytDetailId = `yt-detail-${Date.now()}`;
    await dbConnection.execute(
      `INSERT INTO youtube_channels (id, socialAccountId, channelId, customUrl, subscribersCount, totalVideosCount, totalViewsCount) 
       VALUES (?, ?, 'channel_abc', '@SeleniumYTChannel', 12500, 120, 150000)`,
      [ytDetailId, saYtId]
    );

    // 2. Insert social analytics for stats display
    const analyticsId = `selenium-analytics-${Date.now()}`;
    const socialAnalyticsId = `selenium-soc-anal-${Date.now()}`;

    await dbConnection.execute(
      `INSERT INTO analytics (id, brandId, socialAccountId, dateFrom, dateTo, granularity, fetchedAt, analyticsType) 
       VALUES (?, ?, NULL, ?, ?, 'DAILY', ?, 'OVERVIEW')`,
      [analyticsId, brandId, '2026-06-21 00:00:00', '2026-06-27 23:59:59', nowStr]
    );

    await dbConnection.execute(
      `INSERT INTO social_analytics (id, analyticsId, followersTotal, followersGain, followersLost, impressions, reach, engagements, likes, comments, shares, saves, clicks, engagementRate, createdAt) 
       VALUES (?, ?, 12500, 450, 20, 25000, 25000, 1800, 1000, 500, 300, 0, 800, 7.2, ?)`,
      [socialAnalyticsId, analyticsId, nowStr]
    );

    // 3. Insert 3 mock posts into posts table
    // Draft Post
    await dbConnection.execute(
      `INSERT INTO posts (id, brandId, createdByUserId, title, caption, type, status, targetPlatforms, createdAt, updatedAt)
       VALUES ('post-draft-selenium', ?, ?, 'Selenium Draft Post Title', 'Draft caption content', 'TEXT', 'DRAFT', 'facebook', ?, ?)`,
      [brandId, userId, nowStr, nowStr]
    );
    // Scheduled Post
    await dbConnection.execute(
      `INSERT INTO posts (id, brandId, createdByUserId, title, caption, type, status, targetPlatforms, scheduledAt, createdAt, updatedAt)
       VALUES ('post-sched-selenium', ?, ?, 'Selenium Scheduled Post Title', 'Scheduled caption content', 'TEXT', 'SCHEDULED', 'youtube', ?, ?, ?)`,
      [brandId, userId, '2026-06-30 18:00:00', nowStr, nowStr]
    );
    // Published Post
    await dbConnection.execute(
      `INSERT INTO posts (id, brandId, createdByUserId, title, caption, type, status, targetPlatforms, publishedAt, createdAt, updatedAt)
       VALUES ('post-pub-selenium', ?, ?, 'Selenium Published Post Title', 'Published caption content', 'TEXT', 'PUBLISHED', 'facebook,youtube', ?, ?, ?)`,
      [brandId, userId, nowStr, nowStr, nowStr]
    );

    console.log('✅ Seeding mock General Dashboard data completed successfully.');
  }

  async function cleanupTestData() {
    console.log('🧹 Cleaning up test data from DB...');
    try {
      if (brandId) {
        await dbConnection.execute('DELETE FROM posts WHERE brandId = ?', [brandId]);
        await dbConnection.execute('DELETE FROM social_accounts WHERE brandId = ?', [brandId]);
        await dbConnection.execute('DELETE FROM analytics WHERE brandId = ?', [brandId]);
        await dbConnection.execute('DELETE FROM brands WHERE id = ?', [brandId]);
      }
      if (userId) {
        await dbConnection.execute('DELETE FROM users WHERE id = ?', [userId]);
      }
      console.log('✅ DB Cleanup completed.');
    } catch (err) {
      console.error('❌ DB Cleanup failed:', err.message);
    }
  }

  before(async function () {
    // 1. Initialize Redis Client
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
    });
    redisClient.on('error', (err) => console.error('Redis Client Error', err));
    await redisClient.connect();

    // 2. Initialize DB Connection
    dbConnection = await mysql.createConnection(process.env.MYSQL_URL || 'mysql://root:root_password@localhost:3307/publicast');

    // 3. Initialize Chrome Driver
    const options = new chrome.Options();
    if (process.env.CI || process.env.HEADLESS) {
      options.addArguments('--headless=new');
      options.addArguments('--no-sandbox');
      options.addArguments('--disable-dev-shm-usage');
      options.addArguments('--disable-gpu');
    }
    driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
    await driver.manage().window().setRect({ width: 1280, height: 800 });
  });

  after(async function () {
    if (driver) {
      await driver.quit();
    }
    if (redisClient) {
      await redisClient.disconnect();
    }
    await cleanupTestData();
    if (dbConnection) {
      await dbConnection.end();
    }
  });

  afterEach(async function () {
    if (this.currentTest.state === 'failed') {
      try {
        const image = await driver.takeScreenshot();
        const screenshotPath = path.join(__dirname, `error_${this.currentTest.title.replace(/[^a-zA-Z0-9]/g, '_')}.png`);
        fs.writeFileSync(screenshotPath, image, 'base64');
        console.log(`📸 Đã chụp màn hình khi lỗi: ${screenshotPath}`);
      } catch (err) {
        console.error("❌ Không thể chụp ảnh màn hình lỗi:", err.message);
      }
    }
  });

  it('TC_DASHBOARD_00: Đăng ký người dùng test mới, hoàn tất onboarding và seed dữ liệu', async function () {
    const timestamp = Date.now();
    testEmail = `seleniumdashboard${timestamp}@gmail.com`;
    
    await driver.get(`${BASE_URL}/signup`);
    
    const nameInput = await driver.wait(until.elementLocated(By.xpath("//input[@placeholder='Your name']")), 15000);
    const emailInput = await driver.findElement(By.id('email'));
    const passwordInput = await driver.findElement(By.id('password'));
    const confirmPasswordInput = await driver.findElement(By.xpath("//input[@placeholder='••••••••']"));
    const checkbox = await driver.findElement(By.xpath("//input[@type='checkbox']"));
    const submitButton = await driver.findElement(By.xpath("//button[@type='submit']"));

    await nameInput.sendKeys('Selenium Dashboard Tester');
    await emailInput.sendKeys(testEmail);
    await passwordInput.sendKeys(testPassword);
    await confirmPasswordInput.sendKeys(testPassword);
    
    if (!(await checkbox.isSelected())) {
      await driver.executeScript("arguments[0].click();", checkbox);
    }
    await driver.sleep(500);
    await driver.executeScript("arguments[0].click();", submitButton);

    await driver.wait(until.urlContains('/verify-otp'), 15000);
    await driver.sleep(2000);

    const redisKey = `otp:${testEmail}`;
    const otp = await redisClient.get(redisKey);
    expect(otp).to.not.be.null;

    const otpInput = await driver.wait(until.elementLocated(By.xpath("//input[@placeholder='000000']")), 10000);
    await otpInput.sendKeys(otp);
    await driver.findElement(By.xpath("//button[@type='submit']")).click();

    await driver.wait(until.urlContains('/start'), 20000);

    // Onboarding
    await safeClick(By.xpath("//button[div[contains(text(), 'Solo Creator')]]"));
    await driver.sleep(500);
    await safeClick(By.xpath("//button[contains(text(), 'Continue')]"));

    await safeClick(By.xpath("//button[contains(text(), 'Skip for now')]"));
    await driver.sleep(500);

    const brandInput = await driver.wait(until.elementLocated(By.xpath("//input[@placeholder='e.g. TechVN Studio']")), 15000);
    await brandInput.sendKeys('Selenium Dashboard Brand');
    await safeClick(By.xpath("//button[contains(text(), 'Finish Setup')]"));

    await safeClick(By.xpath("//button[contains(text(), 'Go to Dashboard')]"));

    await driver.wait(until.urlContains('/dashboard'), 20000);

    // Fetch IDs from DB to seed
    const [users] = await dbConnection.execute('SELECT id FROM users WHERE email = ?', [testEmail]);
    userId = users[0].id;
    const [brands] = await dbConnection.execute('SELECT id FROM brands WHERE ownerId = ? LIMIT 1', [userId]);
    brandId = brands[0].id;

    expect(userId).to.not.be.undefined;
    expect(brandId).to.not.be.undefined;

    // Seed mock data
    await seedGeneralDashboardData();

    // Reload the page to reflect seeded data
    await driver.navigate().refresh();
    await driver.sleep(3000);
  });

  it('TC_DASHBOARD_01: Xác minh điều hướng trang chủ chứa /dashboard', async function () {
    const currentUrl = await driver.getCurrentUrl();
    expect(currentUrl).to.contain('/dashboard');
  });

  it('TC_DASHBOARD_02: Xác minh các thẻ thống kê tổng quan (Stat Cards) hiển thị đúng số liệu đã seed', async function () {
    const followersVal = await driver.wait(
      until.elementLocated(By.xpath("//*[contains(text(), '12.500') or contains(text(), '12,500')]")),
      15000
    );
    const viewsLabel = await driver.findElement(By.xpath("//*[contains(text(), 'Tổng lượt xem')]"));
    const videosLabel = await driver.findElement(By.xpath("//*[contains(text(), 'Tổng video')]"));

    expect(await followersVal.isDisplayed()).to.be.true;
    expect(await viewsLabel.isDisplayed()).to.be.true;
    expect(await videosLabel.isDisplayed()).to.be.true;
    console.log("✅ Thống kê tổng quan hiển thị đúng số liệu đã seed!");
  });

  it('TC_DASHBOARD_03: Xác minh hàng chờ bài đăng gần đây chứa các bài viết đã seed', async function () {
    const draftPostEl = await driver.wait(
      until.elementLocated(By.xpath("//*[contains(text(), 'Selenium Draft Post Title')]")),
      15000
    );
    const schedPostEl = await driver.findElement(By.xpath("//*[contains(text(), 'Selenium Scheduled Post Title')]"));
    const pubPostEl = await driver.findElement(By.xpath("//*[contains(text(), 'Selenium Published Post Title')]"));

    expect(await draftPostEl.isDisplayed()).to.be.true;
    expect(await schedPostEl.isDisplayed()).to.be.true;
    expect(await pubPostEl.isDisplayed()).to.be.true;
    console.log("✅ Hàng chờ hiển thị chính xác các bài viết đã seed!");
  });

  it('TC_DASHBOARD_04: Xác minh các platform kết nối hiển thị trạng thái "Đã kết nối"', async function () {
    const fbConnection = await driver.wait(
      until.elementLocated(By.xpath("//div[span[text()='Facebook']]//span[text()='Đã kết nối']")),
      15000
    );
    const ytConnection = await driver.findElement(By.xpath("//div[span[text()='YouTube']]//span[text()='Đã kết nối']"));

    expect(await fbConnection.isDisplayed()).to.be.true;
    expect(await ytConnection.isDisplayed()).to.be.true;
    console.log("✅ Các platform seed hiển thị đúng trạng thái Đã kết nối!");
  });

  it('TC_DASHBOARD_05: Đảm bảo không còn menu hay icon Livestream ở Header', async function () {
    const liveLinks = await driver.findElements(By.xpath("//a[contains(@href, '/live')]"));
    const liveButtons = await driver.findElements(By.xpath("//button[contains(., 'Livestream')]"));
    
    expect(liveLinks.length).to.equal(0);
    expect(liveButtons.length).to.equal(0);
    console.log("✅ Không có liên kết Livestream ở Header!");
  });

  it('TC_DASHBOARD_06: Kiểm tra tính năng chuyển hướng redirect các route livestream', async function () {
    console.log("👉 Điều hướng trực tiếp tới URL livestream: /live");
    await driver.get(`${BASE_URL}/live`);

    await driver.wait(until.urlContains('/dashboard'), 15000);
    const currentUrl = await driver.getCurrentUrl();
    expect(currentUrl).to.not.contain('/live');
    expect(currentUrl).to.contain('/dashboard');
    console.log("✅ Redirect từ /live về /dashboard thành công!");
  });

  it('TC_DASHBOARD_07: Kiểm tra tính năng mở và đóng Post Creator từ Dashboard', async function () {
    const createPostBtn = await driver.wait(
      until.elementLocated(By.xpath("//button[contains(., 'Tạo bài đăng')]")),
      15000
    );
    await createPostBtn.click();

    const postCreatorTitle = await driver.wait(
      until.elementLocated(By.xpath("//h1[contains(text(), 'Create new post')]")),
      15000
    );
    expect(await postCreatorTitle.isDisplayed()).to.be.true;

    // Đóng Post Creator
    const closeBtn = await driver.wait(
      until.elementLocated(By.xpath("//button[contains(., 'Close')]")),
      15000
    );
    await driver.executeScript("arguments[0].click();", closeBtn);

    await driver.wait(until.stalenessOf(postCreatorTitle), 10000);
    console.log("✅ Mở và đóng Post Creator từ Dashboard thành công!");
  });

  it('TC_DASHBOARD_08: Kiểm tra liên kết nhanh đến phần Planner lịch đăng', async function () {
    const plannerBtn = await driver.wait(
      until.elementLocated(By.xpath("//button[contains(., 'Lịch đăng')]")),
      15000
    );
    await plannerBtn.click();

    await driver.wait(until.urlContains('/planner'), 15000);
    const currentUrl = await driver.getCurrentUrl();
    expect(currentUrl).to.contain('/planner');
    console.log("✅ Điều hướng sang Planner bằng nút Lịch đăng thành công!");

    // Quay lại Dashboard
    await driver.get(`${BASE_URL}/dashboard`);
    await driver.wait(until.urlContains('/dashboard'), 15000);
  });

  it('TC_DASHBOARD_09: Kiểm tra liên kết nhanh đến quản lý kết nối', async function () {
    const manageBtn = await driver.wait(
      until.elementLocated(By.xpath("//button[contains(., 'Quản lý')]")),
      15000
    );
    await manageBtn.click();

    await driver.wait(until.urlContains('/manage/connections'), 15000);
    const currentUrl = await driver.getCurrentUrl();
    expect(currentUrl).to.contain('/manage/connections');
    console.log("✅ Điều hướng sang Quản lý kết nối thành công!");

    // Quay lại Dashboard
    await driver.get(`${BASE_URL}/dashboard`);
    await driver.wait(until.urlContains('/dashboard'), 15000);
  });

  it('TC_DASHBOARD_10: Kiểm tra tràn chữ tên thương hiệu (Active Brand Text Overflow)', async function () {
    const longBrandName = 'SeleniumBrandWithNameThatIsExtremelyLongAndShouldBeTruncatedWithEllipsisOrWordBreak_123456789';
    console.log(`🛠️ Cập nhật tên thương hiệu siêu dài vào DB: ${longBrandName}`);
    await dbConnection.execute(
      'UPDATE brands SET name = ? WHERE id = ?',
      [longBrandName, brandId]
    );

    // Reload page to reflect brand name
    await driver.navigate().refresh();
    await driver.sleep(3000);

    // Lấy phần tử chứa tên thương hiệu
    const brandNameEl = await driver.wait(
      until.elementLocated(By.xpath("//div[div[contains(text(), 'Thương hiệu hiện tại')]]/div[2]")),
      15000
    );

    // Lấy scrollWidth và clientWidth của phần tử
    const scrollWidth = await driver.executeScript("return arguments[0].scrollWidth;", brandNameEl);
    const clientWidth = await driver.executeScript("return arguments[0].clientWidth;", brandNameEl);
    console.log(`📊 Đo lường tên thương hiệu: scrollWidth = ${scrollWidth}px, clientWidth = ${clientWidth}px`);

    // Trước khi sửa lỗi, scrollWidth sẽ lớn hơn clientWidth vì text bị tràn ra ngoài
    expect(scrollWidth).to.be.at.most(clientWidth, `Lỗi UI: Tên thương hiệu bị tràn chữ ra ngoài (scrollWidth = ${scrollWidth}px > clientWidth = ${clientWidth}px)!`);
    console.log("✅ Tên thương hiệu được hiển thị gọn gàng, không bị tràn chữ!");
  });
});
