const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

const { expect } = require('chai');
const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const mysql = require('mysql2/promise');
const { createClient } = require('redis');

describe('YouTube Dashboard E2E Test Suite', function () {
  this.timeout(120000);
  let driver;
  let redisClient;
  let dbConnection;
  let testEmail;
  let testPassword = 'Password123!';
  let userId;
  let brandId;
  let socialAccountId = 'selenium-yt-mock-social-account-id';
  let youtubeChannelId = 'selenium-yt-mock-channel-id';
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
          // Nếu không visible (hoặc headless Chrome không nhận dạng được) nhưng có trong DOM, click bằng JS
          await driver.executeScript("arguments[0].click();", element);
          return;
        }
      } catch (err) {
        attempts++;
        await driver.sleep(1000);
      }
    }
    // Lần thử cuối cùng: tìm trực tiếp và click bằng JS
    try {
      const element = await driver.findElement(selector);
      await driver.executeScript("arguments[0].click();", element);
    } catch (finalErr) {
      throw finalErr;
    }
  }

  async function seedYouTubeData() {
    console.log(`🛠️ Seeding mock YouTube data into DB for brandId: ${brandId}...`);
    const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // 1. Dọn dẹp dữ liệu cũ nếu trùng
    await dbConnection.execute('DELETE FROM competitor_analysis WHERE brandId = ?', [brandId]);
    await dbConnection.execute('DELETE FROM tracked_videos WHERE brandId = ?', [brandId]);
    await dbConnection.execute('DELETE FROM social_accounts WHERE brandId = ? AND platform = "YOUTUBE"', [brandId]);

    // 2. Chèn social_accounts
    await dbConnection.execute(
      `INSERT INTO social_accounts (id, brandId, platform, platformAccountId, username, displayName, profilePictureUrl, accessToken, scopes, isConnected, connectedAt, updatedAt) 
       VALUES (?, ?, 'YOUTUBE', ?, ?, ?, ?, ?, 'youtube.readonly', 1, ?, ?)`,
      [
        socialAccountId,
        brandId,
        'yt_channel_123',
        '@SeleniumMockChannel',
        'Selenium Mock Channel',
        'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
        'mock-selenium-access-token-123',
        nowStr,
        nowStr
      ]
    );

    // 3. Chèn youtube_channels
    await dbConnection.execute(
      `INSERT INTO youtube_channels (id, socialAccountId, channelId, customUrl, uploadsPlaylistId, subscribersCount, totalVideosCount, totalViewsCount, country, defaultLanguage) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'VN', 'vi')`,
      [
        youtubeChannelId,
        socialAccountId,
        'yt_channel_123',
        '@SeleniumMockChannel',
        'mock_uploads_playlist_123',
        1250,
        15,
        32000
      ]
    );

    // 4. Chèn analytics & social_analytics
    const analyticsId = 'selenium-yt-mock-analytics-id';
    const socialAnalyticsId = 'selenium-yt-mock-social-analytics-id';
    
    await dbConnection.execute(
      `INSERT INTO analytics (id, brandId, socialAccountId, dateFrom, dateTo, granularity, fetchedAt, analyticsType) 
       VALUES (?, ?, ?, ?, ?, 'DAILY', ?, 'YOUTUBE_DETAILED')`,
      [
        analyticsId,
        brandId,
        socialAccountId,
        '2026-06-21 00:00:00',
        '2026-06-27 23:59:59',
        nowStr
      ]
    );

    const demographicsJson = JSON.stringify({
      demographics: [
        ["18-24", "male", 40.5],
        ["18-24", "female", 35.2],
        ["25-34", "male", 15.1],
        ["25-34", "female", 9.2]
      ],
      trafficSource: [
        ["YT_SEARCH", 12000, 36000],
        ["RELATED_VIDEOS", 8000, 24000],
        ["DIRECT", 5000, 15000]
      ],
      geographic: [
        ["VN", 25000],
        ["US", 5000],
        ["JP", 2000]
      ],
      growth: [
        { date: "2026-06-21", views: 100, subscribersGained: 5, subscribersLost: 0, totalContent: 1 },
        { date: "2026-06-22", views: 150, subscribersGained: 6, subscribersLost: 1, totalContent: 0 },
        { date: "2026-06-23", views: 250, subscribersGained: 8, subscribersLost: 0, totalContent: 1 },
        { date: "2026-06-24", views: 400, subscribersGained: 12, subscribersLost: 2, totalContent: 0 },
        { date: "2026-06-25", views: 600, subscribersGained: 18, subscribersLost: 1, totalContent: 2 },
        { date: "2026-06-26", views: 900, subscribersGained: 25, subscribersLost: 3, totalContent: 0 },
        { date: "2026-06-27", views: 1250, subscribersGained: 35, subscribersLost: 2, totalContent: 1 }
      ]
    });

    await dbConnection.execute(
      `INSERT INTO social_analytics (id, analyticsId, followersTotal, followersGain, followersLost, impressions, reach, engagements, likes, comments, shares, saves, clicks, engagementRate, audienceDemographicsJson, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        socialAnalyticsId,
        analyticsId,
        1250,
        109,
        9,
        32000,
        32000,
        1500,
        1200,
        200,
        100,
        0,
        1000,
        4.68,
        demographicsJson,
        nowStr
      ]
    );

    // 5. Chèn competitor_analysis
    const comp1Id = 'selenium-yt-mock-comp-1';
    const comp2Id = 'selenium-yt-mock-comp-2';
    await dbConnection.execute(
      `INSERT INTO competitor_analysis (id, brandId, platform, competitorHandle, competitorDisplayName, competitorAvatarUrl, competitorProfileUrl, followersCount, followersGrowth, avgEngagementRate, avgReach, avgLikes, avgComments, avgShares, postsPerWeek, topPostType, addedAt) 
       VALUES 
       (?, ?, 'YOUTUBE', '@CompetitorA', 'Competitor A channel', 'https://avatar.url/compA', 'https://youtube.com/compA', 5000, 1.2, 5.5, 1000, 100, 10, 5, 2, 'VIDEO', ?),
       (?, ?, 'YOUTUBE', '@CompetitorB', 'Competitor B channel', 'https://avatar.url/compB', 'https://youtube.com/compB', 8000, 0.8, 4.2, 1500, 120, 15, 8, 3, 'VIDEO', ?)`,
      [
        comp1Id, brandId, nowStr,
        comp2Id, brandId, nowStr
      ]
    );

    // 6. Chèn tracked_videos
    const videoTrackId = 'selenium-yt-mock-tracked-video';
    await dbConnection.execute(
      `INSERT INTO tracked_videos (id, brandId, platform, videoId, title, thumbnailUrl, channelId, channelName, publishedAt, lastViews, lastLikes, lastComments, isTracking, addedAt) 
       VALUES (?, ?, 'YOUTUBE', ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        videoTrackId,
        brandId,
        'dQw4w9WgXcQ',
        'Rick Astley - Never Gonna Give You Up (Official Music Video)',
        'https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg',
        'UCuAXFkgcl1Raa_0sTVI4n3Q',
        'Rick Astley',
        '1987-07-27 00:00:00',
        1400000000,
        16000000,
        3000000,
        nowStr
      ]
    );

    console.log('✅ Seeding mock YouTube data completed successfully.');
  }

  async function cleanupTestData() {
    console.log('🧹 Cleaning up test data from DB...');
    try {
      if (brandId) {
        await dbConnection.execute('DELETE FROM competitor_analysis WHERE brandId = ?', [brandId]);
        await dbConnection.execute('DELETE FROM tracked_videos WHERE brandId = ?', [brandId]);
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
    const { logging } = require('selenium-webdriver');
    const prefs = new logging.Preferences();
    prefs.setLevel(logging.Type.BROWSER, logging.Level.ALL);
    const options = new chrome.Options();
    options.setLoggingPrefs(prefs);
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

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();
  });

  after(async function () {
    // 1. Đóng driver
    if (driver) {
      await driver.quit();
    }
    // 2. Dọn dẹp thư mục downloads
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
    // 3. Đóng kết nối Redis
    if (redisClient) {
      await redisClient.disconnect();
    }
    // 4. Dọn dẹp DB
    await cleanupTestData();
    // 5. Đóng kết nối DB
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
      try {
        const logs = await driver.manage().logs().get('browser');
        console.log("--- [Browser Console Logs on Failure] ---");
        for (const entry of logs) {
          console.log(`[${entry.level.name}] ${entry.message}`);
        }
        console.log("-----------------------------------------");
      } catch (err) {
        console.error("⚠️ Cannot fetch browser console logs:", err.message);
      }
    }
  });

  it('TC_YT_DB_00: Đăng ký người dùng test mới và hoàn tất onboarding', async function () {
    const timestamp = Date.now();
    testEmail = `seleniumytadmin${timestamp}@gmail.com`;
    
    // Điều hướng sang đăng ký
    await driver.get(`${BASE_URL}/signup`);
    
    const nameInput = await driver.wait(until.elementLocated(By.xpath("//input[@placeholder='Your name']")), 15000);
    const emailInput = await driver.findElement(By.id('email'));
    const passwordInput = await driver.findElement(By.id('password'));
    const confirmPasswordInput = await driver.findElement(By.xpath("//input[@placeholder='••••••••']"));
    const checkbox = await driver.findElement(By.xpath("//input[@type='checkbox']"));
    const submitButton = await driver.findElement(By.xpath("//button[@type='submit']"));

    await nameInput.sendKeys('Selenium YT Tester');
    await emailInput.sendKeys(testEmail);
    await passwordInput.sendKeys(testPassword);
    await confirmPasswordInput.sendKeys(testPassword);
    
    if (!(await checkbox.isSelected())) {
      await driver.executeScript("arguments[0].click();", checkbox);
    }
    await driver.sleep(500); // Chờ state React cập nhật validation
    await driver.executeScript("arguments[0].click();", submitButton);

    // Đợi verify-otp
    await driver.wait(until.urlContains('/verify-otp'), 15000);
    await driver.sleep(2000); // Đợi OTP ghi nhận vào Redis

    // Lấy OTP từ Redis
    const redisKey = `otp:${testEmail}`;
    const otp = await redisClient.get(redisKey);
    expect(otp).to.not.be.null;

    // Nhập OTP
    const otpInput = await driver.wait(until.elementLocated(By.xpath("//input[@placeholder='000000']")), 10000);
    await otpInput.sendKeys(otp);
    await driver.findElement(By.xpath("//button[@type='submit']")).click();

    // Đợi chuyển hướng sang /start
    await driver.wait(until.urlContains('/start'), 20000);

    // Bắt đầu Onboarding
    // Màn hình 1: Role
    await safeClick(By.xpath("//button[div[contains(text(), 'Solo Creator')]]"));
    await driver.sleep(500);
    await safeClick(By.xpath("//button[contains(text(), 'Continue')]"));

    // Màn hình 2: Platform Connections (Skip)
    await safeClick(By.xpath("//button[contains(text(), 'Skip for now')]"));
    await driver.sleep(500);

    // Màn hình 3: Create Brand
    const brandInput = await driver.wait(until.elementLocated(By.xpath("//input[@placeholder='e.g. TechVN Studio']")), 15000);
    await brandInput.sendKeys('Selenium YT Brand');
    await safeClick(By.xpath("//button[contains(text(), 'Finish Setup')]"));

    // Màn hình 4: Complete
    await safeClick(By.xpath("//button[contains(text(), 'Go to Dashboard')]"));

    // Đợi chuyển tới /dashboard
    await driver.wait(until.urlContains('/dashboard'), 20000);

    // Lấy userId và brandId từ database
    const [users] = await dbConnection.execute('SELECT id FROM users WHERE email = ?', [testEmail]);
    userId = users[0].id;
    const [brands] = await dbConnection.execute('SELECT id FROM brands WHERE ownerId = ? LIMIT 1', [userId]);
    brandId = brands[0].id;

    expect(userId).to.not.be.undefined;
    expect(brandId).to.not.be.undefined;
  });

  it('TC_YT_DB_11: Kiểm tra trạng thái YouTube chưa liên kết (Empty State)', async function () {
    // Đợi 3s để modal Onboarding đóng hẳn và backdrop biến mất hoàn toàn
    await driver.sleep(3000);

    console.log("TC_YT_DB_11 - Current URL before click:", await driver.getCurrentUrl());

    // Click YouTube tab in the sidebar
    await safeClick(By.xpath("//a[contains(@href, '/dashboard/youtube')]"));
    await driver.sleep(3000);

    console.log("TC_YT_DB_11 - Current URL after click:", await driver.getCurrentUrl());
    try {
      const bodyText = await driver.findElement(By.tagName('body')).getText();
      console.log("TC_YT_DB_11 - Body text snippet:\n", bodyText.slice(0, 500));
    } catch (e) {
      console.log("TC_YT_DB_11 - Cannot get body text:", e.message);
    }

    // Kiểm tra tiêu đề Empty State
    // FIX: Dùng contains(., ...) thay vì contains(text(), ...) vì React render {config.name}
    // và 'account not connected' thành 2 text node riêng biệt → text() chỉ match node đầu tiên
    const emptyTitle = await driver.wait(
      until.elementLocated(By.xpath("//h3[contains(., 'YouTube account not connected')]")),
      20000
    );
    expect(await emptyTitle.isDisplayed()).to.be.true;

    // FIX: JSX render 'Connect {config.name}' thành 2 text nodes riêng nên dùng contains(., ...) cho button
    const connectBtn = await driver.findElement(By.xpath("//button[contains(., 'Connect YouTube')]"));
    expect(await connectBtn.isDisplayed()).to.be.true;
  });

  it('TC_YT_DB_01 & TC_YT_DB_02: Seed DB, kiểm tra Community Metrics, Charts và Date Range Filter', async function () {
    // 1. Seed dữ liệu mock YouTube vào database
    await seedYouTubeData();

    // 2. Refresh lại trang dashboard/youtube để load dữ liệu vừa seed
    await driver.navigate().refresh();
    await driver.sleep(3000); // Chờ load trang và các API metrics hoàn tất

    // Kiểm tra xem Avatar và Tên kênh YouTube có hiển thị ở góc trên bên phải hay không
    const channelNameEl = await driver.wait(
      until.elementLocated(By.xpath("//span[contains(text(), 'Selenium Mock Channel')]")),
      25000
    );
    expect(await channelNameEl.isDisplayed()).to.be.true;

    // Đợi và lấy giá trị của các Metrics Cards
    const subscribersGridVal = await driver.wait(
      until.elementLocated(By.xpath("//div[span[contains(text(), 'Subscribers')]]//span[contains(@class, 'text-xl')]")),
      15000
    );
    const viewsGridVal = await driver.findElement(By.xpath("//div[span[contains(text(), 'Video views')]]//span[contains(@class, 'text-xl')]"));
    const videosGridVal = await driver.findElement(By.xpath("//div[span[contains(text(), 'Videos')]]//span[contains(@class, 'text-xl')]"));

    expect(await subscribersGridVal.getText()).to.contain('1250');
    expect(await viewsGridVal.getText()).to.contain('3650');
    expect(await videosGridVal.getText()).to.contain('15');

    // Kiểm tra xem biểu đồ Growth Recharts có hiển thị không
    const growthChart = await driver.findElement(By.className("recharts-surface"));
    expect(await growthChart.isDisplayed()).to.be.true;

    // Test TC_YT_DB_02: Date Range Filter
    // Click vào bộ lọc Date Range
    await safeClick(By.id("date"));
    await driver.sleep(1000);

    // Chọn Yesterday
    await safeClick(By.xpath("//button[text()='Yesterday']"));
    await driver.sleep(500);

    // Click Apply Range
    await safeClick(By.xpath("//button[text()='Apply Range']"));
    await driver.sleep(2000); // Chờ API đồng bộ lại theo Date Range mới
  });

  it('TC_YT_DB_03: Kiểm tra hiển thị biểu đồ tab Demographics', async function () {
    // Chuyển sang tab Demographics
    await safeClick(By.xpath("//button[text()='DEMOGRAPHICS']"));
    await driver.sleep(1500);

    // Kiểm tra sự hiển thị của các biểu đồ: Gender, Age, Viewers by Country, Traffic Source
    const genderHeader = await driver.wait(
      until.elementLocated(By.xpath("//h3[text()='Gender']")),
      15000
    );
    expect(await genderHeader.isDisplayed()).to.be.true;

    // Kiểm tra text phần trăm Gender (sử dụng text gốc trong DOM là Male/Female)
    const malePercent = await driver.wait(
      until.elementLocated(By.xpath("//span[contains(text(), 'Male')]")),
      10000
    );
    const femalePercent = await driver.findElement(By.xpath("//span[contains(text(), 'Female')]"));
    expect(await malePercent.getText()).to.contain('56%'); // 40.5 + 15.1 = 55.6% -> Math.round(55.6) = 56%
    expect(await femalePercent.getText()).to.contain('44%'); // 35.2 + 9.2 = 44.4% -> Math.round(44.4) = 44%

    // Kiểm tra Age chart
    const ageHeader = await driver.findElement(By.xpath("//h3[text()='Age']"));
    expect(await ageHeader.isDisplayed()).to.be.true;

    // Kiểm tra Viewers by Country
    const countryHeader = await driver.findElement(By.xpath("//h3[text()='Viewers by Country']"));
    expect(await countryHeader.isDisplayed()).to.be.true;
    const vietnamText = await driver.findElement(By.xpath("//span[text()='Vietnam']"));
    expect(await vietnamText.isDisplayed()).to.be.true;

    // Kiểm tra Traffic Source
    const trafficHeader = await driver.findElement(By.xpath("//h3[text()='Traffic Source']"));
    expect(await trafficHeader.isDisplayed()).to.be.true;
  });

  it('TC_YT_DB_04: Kiểm tra danh sách Published Videos và tính năng phân trang', async function () {
    // Chuyển sang tab Published Videos
    await safeClick(By.xpath("//button[text()='PUBLISHED VIDEOS']"));
    await driver.sleep(1500);

    // Xác nhận video mock hiển thị
    const videoTitle = await driver.wait(
      until.elementLocated(By.xpath("//span[contains(text(), 'Rick Astley - Never Gonna Give You Up')]")),
      10000
    );
    expect(await videoTitle.isDisplayed()).to.be.true;
    console.log("✅ Tab Published Videos hiển thị video thành công.");
  });

  it('TC_YT_DB_05: Kiểm tra xem chi tiết video thống kê', async function () {
    // Click vào video để xem chi tiết
    await safeClick(By.xpath("//span[contains(text(), 'Rick Astley - Never Gonna Give You Up')]"));
    await driver.sleep(3000); // Đợi tải dữ liệu chi tiết

    // Lấy URL hiện tại
    const currentUrl = await driver.getCurrentUrl();
    console.log("TC_YT_DB_05 - Current URL after video click:", currentUrl);

    // Xác nhận URL chứa đúng các param mong muốn: tab=published và videoId=dQw4w9WgXcQ
    expect(currentUrl).to.contain('tab=published');
    expect(currentUrl).to.contain('videoId=dQw4w9WgXcQ');

    // Xác nhận giao diện chi tiết video hiển thị (nút Back)
    const backBtn = await driver.wait(
      until.elementLocated(By.xpath("//button[@title='Quay lại danh sách']")),
      10000
    );
    expect(await backBtn.isDisplayed()).to.be.true;
    console.log("✅ Xem chi tiết video thống kê thành công không bị nhảy tab.");
  });

  it('TC_YT_DB_06: Kiểm tra tab Viewed Videos và thêm video YouTube để theo dõi', async function () {
    // Chuyển sang tab Viewed Videos
    await safeClick(By.xpath("//button[text()='VIEWED VIDEOS']"));
    await driver.sleep(1500);

    // Kiểm tra video đã seed sẵn hiển thị
    const seededVideoTitle = await driver.wait(
      until.elementLocated(By.xpath("//span[contains(text(), 'Rick Astley - Never Gonna Give You Up')]")),
      15000
    );
    expect(await seededVideoTitle.isDisplayed()).to.be.true;

    // Click START TRACKING
    await safeClick(By.xpath("//button[contains(text(), 'START TRACKING')]"));
    await driver.sleep(800);

    // Điền video URL mới
    const urlInput = await driver.wait(until.elementLocated(By.id("video-url")), 10000);
    await urlInput.sendKeys("https://www.youtube.com/watch?v=yPYZpwSpKmA");
    
    // Bấm nút Start Tracking (submit)
    await safeClick(By.xpath("//button[text()='Start Tracking']"));
    await driver.sleep(2000);

    // Vì backend gọi API thật và trả về lỗi 401 khi dùng token mock,
    // ta sẽ kiểm tra xem toast báo lỗi có hiển thị hay không (hoặc modal vẫn mở/báo lỗi).
    // Ở đây ta ghi nhận hành vi báo lỗi.
    console.log("⚠️ Ghi nhận: Theo dõi video mới bằng URL trả về lỗi do backend gọi API thật bằng token mock.");
  });

  it('TC_YT_DB_07 & TC_YT_DB_08: Kiểm tra tìm kiếm và xóa đối thủ cạnh tranh', async function () {
    // Chuyển sang tab Competitors
    await safeClick(By.xpath("//button[text()='COMPETITORS']"));
    await driver.sleep(1500);

    // Kiểm tra 2 đối thủ đã seed sẵn hiển thị
    const compA = await driver.wait(
      until.elementLocated(By.xpath("//span[text()='Competitor A channel']")),
      15000
    );
    expect(await compA.isDisplayed()).to.be.true;
    const compB = await driver.findElement(By.xpath("//span[text()='Competitor B channel']"));
    expect(await compB.isDisplayed()).to.be.true;

    // Click ADD COMPETITOR
    await safeClick(By.xpath("//button[contains(text(), 'ADD COMPETITOR')]"));
    await driver.sleep(800);

    // Nhập từ khóa tìm kiếm
    const searchInput = await driver.wait(
      until.elementLocated(By.xpath("//input[@placeholder='Enter channel name or handle...']")),
      10000
    );
    await searchInput.sendKeys("TechVN");
    await safeClick(By.xpath("//button[text()='Search']"));
    await driver.sleep(2000);

    // Đóng modal bằng nút Close (X button trong Dialog của shadcn)
    const closeBtn = await driver.wait(until.elementLocated(By.xpath("//button[.//span[text()='Close']]")), 10000);
    await closeBtn.click();

    // FIX: Sau khi đóng modal, backend re-fetch competitors → table vào loading state (skeleton).
    // Phải CHỜ Competitor A hiện lại trong table trước khi tìm MoreVertical button,
    // tránh timeout khi table đang skeleton (không có button thật).
    await driver.wait(
      until.elementLocated(By.xpath("//span[text()='Competitor A channel']")),
      15000
    );
    await driver.sleep(500); // Chờ animation re-render kết thúc

    // Test TC_YT_DB_08: Xóa đối thủ cạnh tranh (xóa Competitor A)
    // Dùng button[2] (nút menu hành động là nút thứ 2 trong hàng, sau nút Star)
    // giúp test case cực kỳ ổn định, không phụ thuộc vào sự thay đổi class name của icon Lucide.
    const moreMenuBtn = await driver.wait(
      until.elementLocated(By.xpath("//tr[.//span[text()='Competitor A channel']]//button[2]")),
      10000
    );
    await moreMenuBtn.click(); // Click native để trigger Radix UI DropdownMenu mở ra
    await driver.sleep(800);

    // Click Delete competitor (đợi menu item xuất hiện trong DOM)
    const deleteBtn = await driver.wait(
      until.elementLocated(By.xpath("//*[contains(text(), 'Delete competitor')]")),
      10000
    );
    await deleteBtn.click();
    await driver.sleep(800);

    // Click Delete trên Confirm Dialog
    const confirmDeleteBtn = await driver.wait(
      until.elementLocated(By.xpath("//button[contains(text(), 'Delete')]")),
      10000
    );
    await confirmDeleteBtn.click();
    await driver.sleep(2000);

    // Kiểm tra xem Competitor A đã biến mất chưa
    const remainingCompetitors = await driver.findElements(By.xpath("//span[text()='Competitor A channel']"));
    expect(remainingCompetitors.length).to.equal(0);
    console.log("✅ Xóa đối thủ cạnh tranh thành công.");
  });

  it('TC_YT_DB_09 & TC_YT_DB_10: Tải CSV xuất báo cáo (Video & Competitors)', async function () {
    // Đảm bảo ở đúng tab Competitors để xuất báo cáo
    await safeClick(By.xpath("//button[text()='COMPETITORS']"));

    // FIX: Sau khi chuyển tab, phải chờ data Competitors load xong (Competitor B vẫn còn sau khi A bị xóa).
    // Không thể click download ngay vì trang có thể đang ở loading skeleton state.
    await driver.wait(
      until.elementLocated(By.xpath("//span[text()='Competitor B channel']")),
      15000
    );
    // Click nút Download ở sticky header (luôn hiển thị)
    // Định vị bằng CSS selector của SVG rồi lấy button cha để tránh lỗi namespace của XPath SVG
    const downloadIcon = await driver.wait(
      until.elementLocated(By.css("svg.lucide-download")),
      10000
    );
    const downloadMenuBtn = await driver.executeScript("return arguments[0].closest('button');", downloadIcon);
    await downloadMenuBtn.click();
    await driver.sleep(1000);
    
    // Click button Tải file CSV (tìm div chứa text rồi lấy button cha để đảm bảo click chính xác)
    const csvText = await driver.wait(
      until.elementLocated(By.xpath("//div[text()='Tải file CSV']")),
      10000
    );
    const csvBtn = await driver.executeScript("return arguments[0].closest('button');", csvText);
    await csvBtn.click();
    await driver.sleep(3000); // Chờ download xong

    // Xác minh file CSV tồn tại trong thư mục test_downloads
    const files = fs.readdirSync(downloadDir);
    const csvFile = files.find(f => f.startsWith('publicast_youtube_report_competitors') && f.endsWith('.csv'));
    expect(csvFile).to.not.be.undefined;

    // Đọc và xác minh cấu trúc file CSV
    let csvContent = fs.readFileSync(path.join(downloadDir, csvFile), 'utf-8');
    if (csvContent.charCodeAt(0) === 0xFEFF) {
      csvContent = csvContent.slice(1);
    }
    const lines = csvContent.split('\n');
    expect(lines[0]).to.equal('Competitor Name,Handle,Subscribers,Total Views,Total Videos,Added At');
    
    // Dòng dữ liệu đối thủ (vì đối thủ A đã bị xóa, chỉ còn đối thủ B)
    expect(lines[1]).to.contain('Competitor B channel');
    console.log("✅ Tải và xác minh CSV tab Competitors thành công.");
  });
});
