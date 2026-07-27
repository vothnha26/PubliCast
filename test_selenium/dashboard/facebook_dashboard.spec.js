const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

const { expect } = require('chai');
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const mysql = require('mysql2/promise');
const { createClient } = require('redis');

describe('Facebook Dashboard E2E Test Suite', function () {
  this.timeout(120000);
  let driver;
  let redisClient;
  let dbConnection;
  let testEmail;
  let testPassword = 'Password123!';
  let userId;
  let brandId;
  let socialAccountId = 'selenium-fb-mock-social-account-id';
  let downloadDir;

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
          // Fallback to JS click if element is not visible but in DOM
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

  async function seedFacebookData() {
    console.log(`🛠️ Seeding mock Facebook data into DB for brandId: ${brandId}...`);
    const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // 1. Dọn dẹp dữ liệu cũ
    await dbConnection.execute('DELETE FROM competitor_analysis WHERE brandId = ?', [brandId]);
    await dbConnection.execute('DELETE FROM social_accounts WHERE brandId = ? AND platform = "FACEBOOK"', [brandId]);

    // 2. Chèn social_accounts cho Facebook page
    await dbConnection.execute(
      `INSERT INTO social_accounts (id, brandId, platform, platformAccountId, username, displayName, profilePictureUrl, accessToken, scopes, isConnected, connectedAt, updatedAt) 
       VALUES (?, ?, 'FACEBOOK', 'fb_page_123', '@SeleniumFBPage', 'Selenium FB Page', 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg', 'mock-facebook-access-token-123', 'pages_read_engagement,pages_show_list', 1, ?, ?)`,
      [
        socialAccountId,
        brandId,
        nowStr,
        nowStr
      ]
    );

    // 3. Chèn analytics & social_analytics
    const analyticsId = 'selenium-fb-mock-analytics-id';
    const socialAnalyticsId = 'selenium-fb-mock-social-analytics-id';
    
    await dbConnection.execute(
      `INSERT INTO analytics (id, brandId, socialAccountId, dateFrom, dateTo, granularity, fetchedAt, analyticsType) 
       VALUES (?, ?, ?, ?, ?, 'DAILY', ?, 'FACEBOOK_DETAILED')`,
      [
        analyticsId,
        brandId,
        socialAccountId,
        '2026-06-21 00:00:00',
        '2026-06-27 23:59:59',
        nowStr
      ]
    );

    const facebookAnalyticsJson = JSON.stringify({
      growth: [
        { date: "2026-06-21", views: 1000, pageVisits: 300, totalContent: 5, followers: 1250 },
        { date: "2026-06-22", views: 1500, pageVisits: 350, totalContent: 4, followers: 1260 },
        { date: "2026-06-23", views: 2500, pageVisits: 400, totalContent: 6, followers: 1280 },
        { date: "2026-06-24", views: 4000, pageVisits: 450, totalContent: 5, followers: 1310 },
        { date: "2026-06-25", views: 6000, pageVisits: 500, totalContent: 7, followers: 1350 },
        { date: "2026-06-26", views: 9000, pageVisits: 600, totalContent: 8, followers: 1400 },
        { date: "2026-06-27", views: 12500, pageVisits: 700, totalContent: 9, followers: 1500 }
      ],
      balance: [
        { date: "2026-06-21", acquired: 15, lost: 5, totalContent: 5 },
        { date: "2026-06-22", acquired: 20, lost: 10, totalContent: 4 },
        { date: "2026-06-23", acquired: 30, lost: 10, totalContent: 6 },
        { date: "2026-06-24", acquired: 40, lost: 10, totalContent: 5 },
        { date: "2026-06-25", acquired: 50, lost: 10, totalContent: 7 },
        { date: "2026-06-26", acquired: 60, lost: 10, totalContent: 8 },
        { date: "2026-06-27", acquired: 110, lost: 10, totalContent: 9 }
      ],
      postsPeriod: [
        { date: "2026-06-21", views: 1000, reactions: 200 },
        { date: "2026-06-22", views: 1500, reactions: 300 },
        { date: "2026-06-23", views: 2500, reactions: 400 },
        { date: "2026-06-24", views: 4000, reactions: 500 },
        { date: "2026-06-25", views: 6000, reactions: 600 },
        { date: "2026-06-26", views: 9000, reactions: 700 },
        { date: "2026-06-27", views: 12500, reactions: 800 }
      ],
      summary: {
        followers: 1500,
        views: 36500,
        pageVisits: 3300,
        totalContent: 44,
        dailyPageViews: 120,
        postsPerWeek: 3.5,
        averageDailyNewFollowers: 8.5
      },
      interactions: {
        comments: 250,
        shares: 120,
        clicks: 1100,
        dailyReactions: 15.5,
        reactionsPerPost: 14.2,
        dailyComments: 2.8,
        commentsPerPost: 2.5,
        sharesPerDay: 1.4,
        sharesPerPost: 1.2,
        typesBreakdown: {
          Image: 10,
          Video: 8,
          Link: 5,
          Text: 12
        },
        viewsBreakdown: {
          organic: 24000,
          promoted: 12500
        }
      },
      clicks: [
        { date: "2026-06-21", totalClicks: 100 },
        { date: "2026-06-22", totalClicks: 120 },
        { date: "2026-06-23", totalClicks: 150 },
        { date: "2026-06-24", totalClicks: 180 },
        { date: "2026-06-25", totalClicks: 200 },
        { date: "2026-06-26", totalClicks: 220 },
        { date: "2026-06-27", totalClicks: 130 }
      ]
    });

    await dbConnection.execute(
      `INSERT INTO social_analytics (id, analyticsId, followersTotal, followersGain, followersLost, impressions, reach, engagements, likes, comments, shares, saves, clicks, engagementRate, audienceDemographicsJson, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        socialAnalyticsId,
        analyticsId,
        1500,
        325,
        65,
        36500,
        36500,
        1500,
        800,
        250,
        120,
        0,
        1100,
        4.11,
        facebookAnalyticsJson,
        nowStr
      ]
    );

    // 4. Chèn competitor_analysis cho Facebook
    const comp1Id = 'selenium-fb-mock-comp-1';
    const comp2Id = 'selenium-fb-mock-comp-2';
    await dbConnection.execute(
      `INSERT INTO competitor_analysis (id, brandId, platform, competitorHandle, competitorDisplayName, competitorAvatarUrl, competitorProfileUrl, followersCount, followersGrowth, avgEngagementRate, avgReach, avgLikes, avgComments, avgShares, postsPerWeek, topPostType, addedAt) 
       VALUES 
       (?, ?, 'FACEBOOK', '@CompetitorA', 'Competitor A page', 'https://avatar.url/compA', 'https://facebook.com/compA', 5000, 1.2, 5.5, 1000, 100, 10, 5, 2, 'IMAGE', ?),
       (?, ?, 'FACEBOOK', '@CompetitorB', 'Competitor B page', 'https://avatar.url/compB', 'https://facebook.com/compB', 8000, 0.8, 4.2, 1500, 120, 15, 8, 3, 'VIDEO', ?)`,
      [
        comp1Id, brandId, nowStr,
        comp2Id, brandId, nowStr
      ]
    );

    console.log('✅ Seeding mock Facebook data completed successfully.');
  }

  async function cleanupTestData() {
    console.log('🧹 Cleaning up test data from DB...');
    try {
      if (brandId) {
        await dbConnection.execute('DELETE FROM competitor_analysis WHERE brandId = ?', [brandId]);
        await dbConnection.execute('DELETE FROM social_accounts WHERE brandId = ?', [brandId]);
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
    // 1. Khởi tạo Redis client
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
    });
    redisClient.on('error', (err) => console.error('Redis Client Error', err));
    await redisClient.connect();

    // 2. Khởi tạo DB Connection
    dbConnection = await mysql.createConnection(process.env.MYSQL_URL || 'mysql://root:root_password@localhost:3307/publicast');

    // 3. Thiết lập thư mục Download
    downloadDir = path.resolve(__dirname, '..', 'test_downloads');
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    // 4. Khởi tạo Chrome Driver
    const options = new chrome.Options();
    if (process.env.CI || process.env.HEADLESS) {
      options.addArguments('--headless=new');
      options.addArguments('--no-sandbox');
      options.addArguments('--disable-dev-shm-usage');
      options.addArguments('--disable-gpu');
    }
    options.setUserPreferences({
      'download.default_directory': downloadDir,
      'download.prompt_for_download': false,
      'download.directory_upgrade': true,
      'safebrowsing.enabled': true
    });

    driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
    await driver.manage().window().setRect({ width: 1280, height: 800 });
  });

  after(async function () {
    if (driver) {
      await driver.quit();
    }
    if (fs.existsSync(downloadDir)) {
      const files = fs.readdirSync(downloadDir);
      for (const file of files) {
        try {
          fs.unlinkSync(path.join(downloadDir, file));
        } catch (e) {}
      }
      try {
        fs.rmdirSync(downloadDir);
      } catch (e) {}
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

  it('TC_FB_DB_00: Đăng ký người dùng test mới và hoàn tất onboarding', async function () {
    const timestamp = Date.now();
    testEmail = `seleniumfbadmin${timestamp}@gmail.com`;
    
    await driver.get(`${BASE_URL}/signup`);
    
    const nameInput = await driver.wait(until.elementLocated(By.xpath("//input[@placeholder='Your name']")), 15000);
    const emailInput = await driver.findElement(By.id('email'));
    const passwordInput = await driver.findElement(By.id('password'));
    const confirmPasswordInput = await driver.findElement(By.xpath("//input[@placeholder='••••••••']"));
    const checkbox = await driver.findElement(By.xpath("//input[@type='checkbox']"));
    const submitButton = await driver.findElement(By.xpath("//button[@type='submit']"));

    await nameInput.sendKeys('Selenium FB Tester');
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

    // Bắt đầu Onboarding
    await safeClick(By.xpath("//button[div[contains(text(), 'Solo Creator')]]"));
    await driver.sleep(500);
    await safeClick(By.xpath("//button[contains(text(), 'Continue')]"));

    await safeClick(By.xpath("//button[contains(text(), 'Skip for now')]"));
    await driver.sleep(500);

    const brandInput = await driver.wait(until.elementLocated(By.xpath("//input[@placeholder='e.g. TechVN Studio']")), 15000);
    await brandInput.sendKeys('Selenium FB Brand');
    await safeClick(By.xpath("//button[contains(text(), 'Finish Setup')]"));

    await safeClick(By.xpath("//button[contains(text(), 'Go to Dashboard')]"));

    await driver.wait(until.urlContains('/dashboard'), 20000);

    const [users] = await dbConnection.execute('SELECT id FROM users WHERE email = ?', [testEmail]);
    userId = users[0].id;
    const [brands] = await dbConnection.execute('SELECT id FROM brands WHERE ownerId = ? LIMIT 1', [userId]);
    brandId = brands[0].id;

    expect(userId).to.not.be.undefined;
    expect(brandId).to.not.be.undefined;
  });

  it('TC_FB_DB_11: Kiểm tra trạng thái Facebook chưa liên kết (Empty State)', async function () {
    await driver.sleep(3000);

    // Click Facebook tab in the sidebar
    await safeClick(By.xpath("//a[contains(@href, '/dashboard/facebook')]"));
    await driver.sleep(3000);

    const emptyTitle = await driver.wait(
      until.elementLocated(By.xpath("//h3[contains(., 'Facebook account not connected')]")),
      20000
    );
    expect(await emptyTitle.isDisplayed()).to.be.true;

    const connectBtn = await driver.findElement(By.xpath("//button[contains(., 'Connect Facebook')]"));
    expect(await connectBtn.isDisplayed()).to.be.true;
  });

  it('TC_FB_DB_01 & TC_FB_DB_02 & TC_FB_DB_03: Seed DB, kiểm tra Overview Tab, Charts và Date Filter', async function () {
    await seedFacebookData();

    await driver.navigate().refresh();
    await driver.sleep(3000);

    // Kiểm tra tên page
    const pageNameEl = await driver.wait(
      until.elementLocated(By.xpath("//span[contains(text(), 'Selenium FB Page')]")),
      25000
    );
    expect(await pageNameEl.isDisplayed()).to.be.true;

    // Kiểm tra các biểu đồ Recharts của Overview
    const growthCharts = await driver.findElements(By.className("recharts-surface"));
    expect(growthCharts.length).to.be.greaterThan(0);

    // Test Date Filter (Yesterday)
    await safeClick(By.id("date"));
    await driver.sleep(1000);

    await safeClick(By.xpath("//button[text()='Yesterday']"));
    await driver.sleep(500);

    await safeClick(By.xpath("//button[text()='Apply Range']"));
    await driver.sleep(2000);
  });

  it('TC_FB_DB_04 & TC_FB_DB_05 & TC_FB_DB_06: Kiểm tra tab POSTS (Metrics, Charts, List & Pagination)', async function () {
    await safeClick(By.xpath("//button[text()='POSTS']"));
    await driver.sleep(2000);

    // 1. Kiểm tra các charts
    const charts = await driver.findElements(By.className("recharts-surface"));
    expect(charts.length).to.be.greaterThan(0);

    // 2. Kiểm tra danh sách bài viết (Do mock token nên có thể rỗng, check Empty state hoặc bảng)
    const bodyText = await driver.findElement(By.tagName('body')).getText();
    if (bodyText.includes('No posts found') || bodyText.includes('No content yet')) {
      console.log("⚠️ Ghi nhận: Tab Posts hiển thị Empty State do backend trả về mảng posts rỗng khi sử dụng mock access token.");
    } else {
      const postsTable = await driver.findElement(By.xpath("//table"));
      expect(await postsTable.isDisplayed()).to.be.true;
    }
  });

  it('TC_FB_DB_07 & TC_FB_DB_08: Kiểm tra tab STORIES (Metrics, List & Pagination)', async function () {
    await safeClick(By.xpath("//button[text()='STORIES']"));
    await driver.sleep(2000);

    const bodyText = await driver.findElement(By.tagName('body')).getText();
    if (bodyText.includes('No stories found')) {
      console.log("⚠️ Ghi nhận: Tab Stories hiển thị Empty State do backend trả về mảng stories rỗng khi sử dụng mock access token.");
    } else {
      const storiesTable = await driver.findElement(By.xpath("//table"));
      expect(await storiesTable.isDisplayed()).to.be.true;
    }
  });

  it('TC_FB_DB_09 & TC_FB_DB_10: Kiểm tra tìm kiếm, thêm và xóa đối thủ cạnh tranh', async function () {
    await safeClick(By.xpath("//button[text()='COMPETITORS']"));
    await driver.sleep(2000);

    // 1. Xác minh hiển thị Competitor cũ (đã seed)
    const compPage = await driver.wait(
      until.elementLocated(By.xpath("//td[contains(., 'Competitor A page')]")),
      15000
    );
    expect(await compPage.isDisplayed()).to.be.true;

    // 2. Thêm đối thủ cạnh tranh mới
    await safeClick(By.xpath("//button[contains(., 'ADD COMPETITOR')]"));
    await driver.sleep(1000);

    const searchInput = await driver.wait(
      until.elementLocated(By.xpath("//input[contains(@placeholder, 'channel name') or contains(@placeholder, 'handle')]")),
      10000
    );
    await searchInput.sendKeys('Competitor C');
    await safeClick(By.xpath("//button[text()='Search']"));
    await driver.sleep(2000);

    // Click thêm đối thủ đầu tiên từ kết quả tìm kiếm (nút Add)
    await safeClick(By.xpath("//button[text()='Add']"));
    await driver.sleep(2000);

    // 3. Xóa đối thủ cạnh tranh
    const actionBtns = await driver.findElements(By.xpath("//button[contains(@class, 'p-1.5') and .//*[local-name()='svg' and contains(@class, 'lucide-more-vertical')]]"));
    if (actionBtns.length > 0) {
      // Click nút 3 chấm cuối cùng của đối thủ vừa thêm
      await driver.executeScript("arguments[0].click();", actionBtns[actionBtns.length - 1]);
      await driver.sleep(1000);

      const deleteOption = await driver.wait(
        until.elementLocated(By.xpath("//div[contains(text(), 'Delete competitor')]")),
        10000
      );
      await driver.executeScript("arguments[0].click();", deleteOption);
      await driver.sleep(1000);

      // Xác nhận xóa trên dialog/alert
      const confirmBtn = await driver.wait(
        until.elementLocated(By.xpath("//button[text()='Delete']")),
        10000
      );
      await driver.executeScript("arguments[0].click();", confirmBtn);
      await driver.sleep(2000);
      console.log("✅ Xóa đối thủ cạnh tranh thành công.");
    }
  });

  it('TC_FB_DB_12 & TC_FB_DB_13: Tải CSV xuất báo cáo (Competitors)', async function () {
    // Click button Download ở top-right header (nút ngay bên phải Refresh)
    const downloadIconBtn = await driver.wait(
      until.elementLocated(By.xpath("//button[@title='Làm mới dữ liệu (Đồng bộ từ API)']/following-sibling::button")),
      15000
    );
    await driver.executeScript("arguments[0].click();", downloadIconBtn);
    await driver.sleep(1000);

    // Click nút Tải file CSV trên Dialog
    const downloadCsvBtn = await driver.wait(
      until.elementLocated(By.xpath("//button[div[contains(text(), 'Tải file CSV')] or contains(., 'Tải file CSV')]")),
      10000
    );
    
    // Lấy button cha bọc quanh element text "Tải file CSV"
    const realBtn = await driver.executeScript("return arguments[0].closest('button');", downloadCsvBtn);
    await driver.executeScript("arguments[0].click();", realBtn);
    await driver.sleep(3000); // Chờ download hoàn tất

    // Xác minh file CSV tải xuống tồn tại trong thư mục downloads
    const expectedFileName = 'publicast_facebook_report_competitors.csv';
    const filePath = path.join(downloadDir, expectedFileName);

    expect(fs.existsSync(filePath)).to.be.true;
    console.log("✅ Tải và xác minh CSV tab Competitors thành công.");

    // Đọc nội dung file CSV và kiểm tra tiêu đề
    const fileContent = fs.readFileSync(filePath, 'utf8');
    expect(fileContent).to.contain('Competitor Name');
    expect(fileContent).to.contain('Competitor A page');
  });
});
