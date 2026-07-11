const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

const { expect } = require('chai');
const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const mysql = require('mysql2/promise');
const { createClient } = require('redis');

describe('Team Management E2E Test Suite', function () {
  this.timeout(180000); // 3 minutes timeout for complete flow
  let driver;
  let redisClient;
  let dbConnection;
  
  let ownerEmail;
  let ownerPassword = 'Password123!';
  let ownerUserId;
  let ownerBrandId;

  let memberEmail = 'testmember@gmail.com';
  let memberPassword = 'Password123!';
  let memberUserId;

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

  async function upgradePlanToPro(brandId) {
    console.log(`⚡ Upgrading brand plan to PRO for brandId: ${brandId}...`);
    const [rows] = await dbConnection.execute(
      `SELECT pl.id FROM plan_limits pl
       JOIN plans p ON p.planLimitId = pl.id
       JOIN subscriptions s ON s.planId = p.id
       JOIN brands b ON b.subscriptionId = s.id
       WHERE b.id = ?`,
      [brandId]
    );

    if (rows && rows.length > 0) {
      const limitId = rows[0].id;
      await dbConnection.execute(
        `UPDATE plan_limits SET allowCustomRoles = 1, maxTeamSeats = 2 WHERE id = ?`,
        [limitId]
      );
      console.log(`✅ Upgrade plan limit to PRO successfully.`);
    } else {
      console.warn(`⚠️ Cannot find plan_limits for brand: ${brandId}`);
    }
  }

  async function setMaxSeats(brandId, seats) {
    const [rows] = await dbConnection.execute(
      `SELECT pl.id FROM plan_limits pl
       JOIN plans p ON p.planLimitId = pl.id
       JOIN subscriptions s ON s.planId = p.id
       JOIN brands b ON b.subscriptionId = s.id
       WHERE b.id = ?`,
      [brandId]
    );
    if (rows && rows.length > 0) {
      const limitId = rows[0].id;
      await dbConnection.execute(
        `UPDATE plan_limits SET maxTeamSeats = ? WHERE id = ?`,
        [seats, limitId]
      );
    }
  }

  async function cleanupTestData() {
    console.log('🧹 Cleaning up Team test data from DB...');
    try {
      if (ownerBrandId) {
        await dbConnection.execute('DELETE FROM custom_roles WHERE brandId = ?', [ownerBrandId]);
        await dbConnection.execute('DELETE FROM teams WHERE brandId = ?', [ownerBrandId]);
        await dbConnection.execute('DELETE FROM brands WHERE id = ?', [ownerBrandId]);
      }
      if (ownerUserId) {
        await dbConnection.execute('DELETE FROM users WHERE id = ?', [ownerUserId]);
      }
      if (memberUserId) {
        await dbConnection.execute('DELETE FROM users WHERE id = ?', [memberUserId]);
      }
      // Dọn dẹp thêm các email bulk test
      await dbConnection.execute('DELETE FROM users WHERE email IN ("bulk1@gmail.com", "bulk2@gmail.com")');
      console.log('✅ DB Cleanup completed.');
    } catch (err) {
      console.error('❌ DB Cleanup failed:', err.message);
    }
  }

  before(async function () {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
    });
    redisClient.on('error', (err) => console.error('Redis Client Error', err));
    await redisClient.connect();

    dbConnection = await mysql.createConnection(process.env.MYSQL_URL || 'mysql://root:root_password@localhost:3307/publicast');

    // Dọn dẹp thành viên test cũ nếu còn sót lại trong DB để tránh ảnh hưởng test mới
    try {
      const [rows] = await dbConnection.execute('SELECT id FROM users WHERE email = ?', [memberEmail]);
      if (rows.length > 0) {
        const oldMemberId = rows[0].id;
        await dbConnection.execute('DELETE FROM teams WHERE userId = ?', [oldMemberId]);
        await dbConnection.execute('DELETE FROM user_accounts WHERE userId = ?', [oldMemberId]);
        await dbConnection.execute('DELETE FROM users WHERE id = ?', [oldMemberId]);
        console.log('🧹 Cleaned up existing test member from DB');
      }
    } catch (err) {
      console.warn('⚠️ Pre-test cleanup warning:', err.message);
    }

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

  it('TC_TEAM_01: Đăng ký Owner mới và hoàn tất onboarding', async function () {
    const timestamp = Date.now();
    ownerEmail = `teamowner${timestamp}@gmail.com`;

    await driver.get(`${BASE_URL}/signup`);

    const nameInput = await driver.wait(until.elementLocated(By.xpath("//input[@placeholder='Your name']")), 15000);
    const emailInput = await driver.findElement(By.id('email'));
    const passwordInput = await driver.findElement(By.id('password'));
    const confirmPasswordInput = await driver.findElement(By.xpath("//input[@placeholder='••••••••']"));
    const checkbox = await driver.findElement(By.xpath("//input[@type='checkbox']"));
    const submitButton = await driver.findElement(By.xpath("//button[@type='submit']"));

    await nameInput.sendKeys('Team Owner Tester');
    await emailInput.sendKeys(ownerEmail);
    await passwordInput.sendKeys(ownerPassword);
    await confirmPasswordInput.sendKeys(ownerPassword);

    if (!(await checkbox.isSelected())) {
      await driver.executeScript("arguments[0].click();", checkbox);
    }
    await driver.sleep(500);
    await driver.executeScript("arguments[0].click();", submitButton);

    await driver.wait(until.urlContains('/verify-otp'), 30000);
    await driver.sleep(2000);

    const otp = await redisClient.get(`otp:${ownerEmail}`);
    expect(otp).to.not.be.null;

    const otpInput = await driver.wait(until.elementLocated(By.xpath("//input[@placeholder='000000']")), 20000);
    await otpInput.sendKeys(otp);
    await driver.findElement(By.xpath("//button[@type='submit']")).click();

    await driver.wait(until.urlContains('/start'), 20000);

    await safeClick(By.xpath("//button[div[contains(text(), 'Solo Creator')]]"));
    await driver.sleep(500);
    await safeClick(By.xpath("//button[contains(text(), 'Continue')]"));

    await safeClick(By.xpath("//button[contains(text(), 'Skip for now')]"));
    await driver.sleep(500);

    const brandInput = await driver.wait(until.elementLocated(By.xpath("//input[@placeholder='e.g. TechVN Studio']")), 15000);
    await brandInput.sendKeys('Selenium Team Brand');
    await safeClick(By.xpath("//button[contains(text(), 'Finish Setup')]"));

    await safeClick(By.xpath("//button[contains(text(), 'Go to Dashboard')]"));
    await driver.wait(until.urlContains('/dashboard'), 20000);

    const [users] = await dbConnection.execute('SELECT id FROM users WHERE email = ?', [ownerEmail]);
    ownerUserId = users[0].id;
    const [brands] = await dbConnection.execute('SELECT id FROM brands WHERE ownerId = ? LIMIT 1', [ownerUserId]);
    ownerBrandId = brands[0].id;

    expect(ownerUserId).to.not.be.undefined;
    expect(ownerBrandId).to.not.be.undefined;

    await upgradePlanToPro(ownerBrandId);
  });

  it('TC_TEAM_02: Kiểm tra Validation khi mời thành viên (Email rỗng & Sai format)', async function () {
    await driver.get(`${BASE_URL}/manage/team`);
    await driver.sleep(2000);

    // 1. Gửi lời mời với Email rỗng
    await safeClick(By.xpath("//button[contains(., 'Invite Member')]"));
    await driver.sleep(1000);

    const inviteSubmitBtn = await driver.findElement(By.xpath("//button[contains(text(), 'Gửi lời mời tham gia')]"));
    await inviteSubmitBtn.click();
    await driver.sleep(1000);

    const toastContainer = await driver.wait(until.elementLocated(By.xpath("//li[contains(., 'Vui lòng nhập địa chỉ email') or contains(., 'Email không được để trống') or contains(., 'nhập ít nhất một địa chỉ email') or contains(., 'Please enter at least one valid email')]")), 5000);
    expect(toastContainer).to.not.be.null;

    await driver.sleep(2000);

    // 2. Gửi lời mời với Email sai format
    const emailInput = await driver.findElement(By.xpath("//div[contains(@class, 'cursor-text')]//input"));
    await emailInput.sendKeys('invalid-email');
    await inviteSubmitBtn.click();
    await driver.sleep(1000);

    const toastFormatError = await driver.wait(until.elementLocated(By.xpath("//li[contains(., 'định dạng email') or contains(., 'Email không hợp lệ') or contains(., 'Định dạng email không hợp lệ')]")), 5000);
    expect(toastFormatError).to.not.be.null;

    const backdrop = await driver.findElement(By.xpath("//div[contains(@class, 'backdrop-blur-sm')]"));
    await driver.executeScript("arguments[0].click();", backdrop);
    await driver.sleep(1000);
  });

  it('TC_TEAM_03: Chặn mời trùng email hiện có (kể cả có khoảng trắng / chữ hoa)', async function () {
    // 1. Mời lần đầu cho duplicate-member@gmail.com
    await safeClick(By.xpath("//button[contains(., 'Invite Member')]"));
    await driver.sleep(1000);

    const emailInput = await driver.findElement(By.xpath("//div[contains(@class, 'cursor-text')]//input"));
    await emailInput.sendKeys('duplicate-member@gmail.com', Key.ENTER);

    let inviteSubmitBtn = await driver.findElement(By.xpath("//button[contains(text(), 'Gửi lời mời tham gia')]"));
    await inviteSubmitBtn.click();
    
    // Đợi modal đóng hẳn
    try {
      const modal = await driver.findElement(By.xpath("//div[contains(@class, 'backdrop-blur-sm')]"));
      await driver.wait(until.stalenessOf(modal), 10000);
    } catch (e) {}

    // Đợi loading spinner biến mất
    try {
      const spinner = await driver.findElement(By.className("animate-spin"));
      await driver.wait(until.stalenessOf(spinner), 10000);
    } catch (e) {}

    // 2. Trực tiếp nâng trạng thái của duplicate-member thành ACTIVE qua DB để làm xuất hiện lỗi trùng ACTIVE member
    const [duplicateUsers] = await dbConnection.execute('SELECT id FROM users WHERE email = ?', ['duplicate-member@gmail.com']);
    const duplicateUserId = duplicateUsers[0].id;
    await dbConnection.execute('UPDATE teams SET status = "ACTIVE" WHERE brandId = ? AND userId = ?', [ownerBrandId, duplicateUserId]);

    // 3. Mời lần thứ hai trùng lặp nhưng viết hoa và có khoảng trắng
    await safeClick(By.xpath("//button[contains(., 'Invite Member')]"));
    await driver.sleep(1000);

    // Chờ element input email hiển thị
    const emailInput2 = await driver.wait(until.elementLocated(By.xpath("//div[contains(@class, 'cursor-text')]//input")), 10000);
    await driver.wait(until.elementIsVisible(emailInput2), 5000);
    await emailInput2.sendKeys('   DUPLICATE-MEMBER@gmail.com   ', Key.ENTER);
    
    inviteSubmitBtn = await driver.findElement(By.xpath("//button[contains(text(), 'Gửi lời mời tham gia')]"));
    await inviteSubmitBtn.click();
    await driver.sleep(2000);

    // Kiểm tra Toast báo trùng lặp thành viên
    const toastDuplicate = await driver.wait(until.elementLocated(By.xpath("//li[contains(., 'đã là thành viên') or contains(., 'đã tồn tại')]")), 5000);
    expect(toastDuplicate).to.not.be.null;

    // Tắt modal bằng backdrop
    const backdrop = await driver.findElement(By.xpath("//div[contains(@class, 'backdrop-blur-sm')]"));
    await driver.executeScript("arguments[0].click();", backdrop);
    await driver.sleep(1000);
  });


  it('TC_TEAM_04: Kiểm tra giới hạn thành viên (Plan Seats Limit)', async function () {
    // Nhắc lại: duplicate-member@gmail.com đang là ACTIVE và chiếm 1 seat. 
    // Ta set maxTeamSeats = 1. Khi đó số seats đang dùng là 1/1, đã hết ghế trống!
    await setMaxSeats(ownerBrandId, 1);

    // 1. Cố tình mời thêm người thứ hai
    await safeClick(By.xpath("//button[contains(., 'Invite Member')]"));
    await driver.sleep(1000);

    const emailInput = await driver.findElement(By.xpath("//div[contains(@class, 'cursor-text')]//input"));
    await emailInput.sendKeys('another-member@gmail.com', Key.ENTER);

    const inviteSubmitBtn = await driver.findElement(By.xpath("//button[contains(text(), 'Gửi lời mời tham gia')]"));
    await inviteSubmitBtn.click();
    await driver.sleep(2000);

    // Phải hiển thị lỗi vượt quá giới hạn
    const toastLimit = await driver.wait(until.elementLocated(By.xpath("//li[contains(., 'giới hạn') or contains(., 'nâng cấp gói') or contains(., 'Seats')]")), 5000);
    expect(toastLimit).to.not.be.null;

    // Tắt modal bằng backdrop
    const backdrop = await driver.findElement(By.xpath("//div[contains(@class, 'backdrop-blur-sm')]"));
    await driver.executeScript("arguments[0].click();", backdrop);
    await driver.sleep(1000);

    // Nâng lên 10 seats để test các phần tiếp theo không bị block
    await setMaxSeats(ownerBrandId, 10);
  });

  it('TC_TEAM_05: Quản lý Custom Role (Tạo mới & validate tên vai trò)', async function () {
    await driver.get(`${BASE_URL}/manage/team`);
    await driver.sleep(2000);
    await safeClick(By.xpath("//button[contains(text(), 'Vai trò tùy chỉnh')]"));
    await driver.sleep(1500);

    await safeClick(By.xpath("//button[contains(., 'Add Custom Role') or contains(., 'Tạo Custom Role')]"));
    await driver.sleep(1000);

    const roleNameInput = await driver.findElement(By.xpath("//input[@placeholder='Ví dụ: Content Editor, Analytics Planner...']"));
    const roleDescInput = await driver.findElement(By.xpath("//input[@placeholder='Mô tả tóm tắt quyền hạn hoặc nhiệm vụ của vai trò này...']"));
    const saveRoleBtn = await driver.findElement(By.xpath("//button[contains(text(), 'Lưu cấu hình vai trò')]"));

    // 1. Validate tên rỗng
    await saveRoleBtn.click();
    await driver.sleep(1000);
    const toastEmptyRoleName = await driver.wait(until.elementLocated(By.xpath("//li[contains(., 'tên vai trò') or contains(., 'không được để trống')]")), 5000);
    expect(toastEmptyRoleName).to.not.be.null;
    await driver.sleep(2000);

    // 2. Validate tên giới hạn maxLength = 50
    const maxLength = await roleNameInput.getAttribute('maxLength');
    expect(maxLength).to.equal('50');

    // 3. Tạo vai trò hợp lệ "Restricted Analyst"
    await roleNameInput.sendKeys('Restricted Analyst');
    await roleDescInput.sendKeys('Chỉ có quyền tạo bài viết nháp, không có quyền quản lý Team.');

    console.log("🖱️ Bật quyền CREATE_POSTS (Tạo bài viết) cho custom role...");
    const createPostsPermissionBtn = await driver.findElement(By.xpath("//button[.//div[contains(text(), 'Tạo bài viết')]]"));
    await driver.executeScript("arguments[0].click();", createPostsPermissionBtn);
    await driver.sleep(500);

    await saveRoleBtn.click();
    await driver.sleep(2000);

    const roleCard = await driver.wait(until.elementLocated(By.xpath("//h3[contains(text(), 'Restricted Analyst')]")), 10000);
    expect(roleCard).to.not.be.null;
  });

  it('TC_TEAM_06: Mời thành viên mới với Custom Role', async function () {
    await safeClick(By.xpath("//button[contains(text(), 'Thành viên')]"));
    await driver.sleep(1000);

    await safeClick(By.xpath("//button[contains(., 'Invite Member')]"));
    await driver.sleep(1000);

    const emailInput = await driver.findElement(By.xpath("//div[contains(@class, 'cursor-text')]//input"));
    await emailInput.sendKeys(memberEmail, Key.ENTER);

    // Chọn Custom Role "Restricted Analyst" (Đợi React re-render và hiển thị nó trong modal)
    const customRoleOption = await driver.wait(until.elementLocated(By.xpath("//div[contains(text(), 'Restricted Analyst')]")), 15000);
    await driver.executeScript("arguments[0].click();", customRoleOption);
    await driver.sleep(500);

    const inviteSubmitBtn = await driver.findElement(By.xpath("//button[contains(text(), 'Gửi lời mời tham gia')]"));
    await inviteSubmitBtn.click();
    await driver.sleep(2000);

    const toastSuccess = await driver.wait(until.elementLocated(By.xpath("//li[contains(., 'thành công')]")), 15000);
    expect(toastSuccess).to.not.be.null;
    await driver.sleep(2000);

    const pendingMemberName = await driver.wait(until.elementLocated(By.xpath(`//tr[td[contains(., '${memberEmail}')]]`)), 10000);
    expect(pendingMemberName).to.not.be.null;
  });

  it('TC_TEAM_07: Quy trình chấp nhận lời mời và Kích hoạt tài khoản thành viên', async function () {
    // Bước 1: Lấy customRoleId của "Restricted Analyst" từ DB
    const [roleRows] = await dbConnection.execute(
      `SELECT id FROM custom_roles WHERE brandId = ? AND name = 'Restricted Analyst' LIMIT 1`,
      [ownerBrandId]
    );
    expect(roleRows.length).to.greaterThan(0, 'Không tìm thấy custom role "Restricted Analyst" trong DB');
    const customRoleId = roleRows[0].id;

    // Bước 2: Lấy invitation token THẬT từ API
    // Dùng credentials: 'include' để browser tự gửi HttpOnly cookie (giống apiService)
    // Không dùng localStorage.getItem('token') vì token được lưu trong HttpOnly cookie
    const apiUrl = process.env.API_URL || 'http://localhost:3000';

    const inviteRes = await driver.executeScript(`
      return fetch(arguments[0] + '/api/team/invite', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: arguments[1],
          role: arguments[2],
          brandId: arguments[3]
        })
      }).then(r => r.json());
    `, apiUrl, memberEmail, customRoleId, ownerBrandId);

    const token = inviteRes.token || (inviteRes.successes && inviteRes.successes[0]?.token);
    if (!token || typeof token !== 'string') {
      throw new Error('Không lấy được invitation token từ API. Response: ' + JSON.stringify(inviteRes));
    }

    // Đăng xuất tài khoản Owner
    await driver.get(`${BASE_URL}/dashboard`);
    await driver.sleep(1000);
    const avatarBtn = await driver.wait(until.elementLocated(By.xpath("//button[@title='Menu']")), 10000);
    await driver.executeScript("arguments[0].click();", avatarBtn);
    await driver.sleep(500);
    const logoutBtn = await driver.wait(until.elementLocated(By.xpath("//button[contains(., 'Logout') or contains(., 'Log out') or contains(., 'Đăng xuất')]")), 5000);
    await logoutBtn.click();
    await driver.sleep(2000);

    // 2. Truy cập url Accept Invitation
    await driver.get(`${BASE_URL}/invite?token=${token}`);
    await driver.sleep(2000);

    const acceptNameInput = await driver.wait(until.elementLocated(By.xpath("//input[@placeholder='Họ tên của bạn' or @placeholder='Your full name']")), 15000);
    const acceptPasswordInput = await driver.findElement(By.xpath("//input[@placeholder='Mật khẩu' or @placeholder='Create password']"));
    const acceptSubmitBtn = await driver.findElement(By.xpath("//button[@type='submit' or contains(., 'Tạo tài khoản & Chấp nhận')]"));

    await acceptNameInput.sendKeys('Selenium Member Tester');
    await acceptPasswordInput.sendKeys(memberPassword);
    await acceptSubmitBtn.click();
    await driver.sleep(1000);

    // Click "Đi tới Dashboard" button in "accepted" screen
    const gotoDashboardBtn = await driver.wait(until.elementLocated(By.xpath("//button[contains(., 'Đi tới Dashboard') or contains(., 'Dashboard')]")), 15000);
    await gotoDashboardBtn.click();

    await driver.wait(until.urlContains('/dashboard'), 20000);
    await driver.sleep(3000);

    const [memberUsers] = await dbConnection.execute('SELECT id FROM users WHERE email = ?', [memberEmail]);
    memberUserId = memberUsers[0].id;
  });

  it('TC_TEAM_08: Kiểm chứng phân quyền Custom Role hạn chế trên UI & Backend API', async function () {
    const sidebarSource = await driver.getPageSource();
    expect(sidebarSource.includes('href="/manage/team"') || sidebarSource.includes('/manage/team')).to.be.false;

    const apiUrl = process.env.API_URL || 'http://localhost:3000';
    
    const apiRes = await driver.executeScript(`
      const apiUrl = arguments[1];
      return fetch(apiUrl + '/api/team/invite', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'hackmember@gmail.com',
          role: 'Member',
          brandId: arguments[0]
        })
      }).then(r => ({ status: r.status }));
    `, ownerBrandId, apiUrl);

    expect(apiRes.status).to.equal(403);

    // ── Kiểm tra phạm vi quyền hạn của Custom Role ──
    console.log("📡 Kiểm chứng quyền CREATE_POSTS (được phép)...");
    const createPostRes = await driver.executeScript(`
      const apiUrl = arguments[1];
      return fetch(apiUrl + '/api/posts', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'E2E Custom Role Test Post',
          caption: 'Hello from Restricted Analyst with CREATE_POSTS permission',
          brandId: arguments[0],
          targetPlatforms: ['FACEBOOK']
        })
      }).then(r => ({ status: r.status }));
    `, ownerBrandId, apiUrl);
    expect(createPostRes.status).to.equal(201);

    console.log("📡 Kiểm chứng quyền APPROVE_POSTS (bị cấm)...");
    const approveRes = await driver.executeScript(`
      const apiUrl = arguments[1];
      return fetch(apiUrl + '/api/posts/bulk-approve', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          postIds: ['dummy-id-123'],
          brandId: arguments[0]
        })
      }).then(r => ({ status: r.status }));
    `, ownerBrandId, apiUrl);
    expect(approveRes.status).to.equal(403);

    console.log("📡 Kiểm chứng quyền DELETE_POSTS (bị cấm)...");
    const deleteRes = await driver.executeScript(`
      const apiUrl = arguments[1];
      return fetch(apiUrl + '/api/posts/bulk', {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          postIds: ['dummy-id-123'],
          brandId: arguments[0]
        })
      }).then(r => ({ status: r.status }));
    `, ownerBrandId, apiUrl);
    expect(deleteRes.status).to.equal(403);
  });

  it('TC_TEAM_08_C: Kiểm chứng phân quyền xem Báo cáo & Biểu đồ thống kê (VIEW_ANALYTICS)', async function () {
    const apiUrl = process.env.API_URL || 'http://localhost:3000';

    console.log("📡 Kiểm chứng quyền VIEW_ANALYTICS trên Report API (bị cấm)...");
    const reportRes = await driver.executeScript(`
      const apiUrl = arguments[1];
      return fetch(apiUrl + '/api/reports?brandId=' + arguments[0], {
        method: 'GET',
        credentials: 'include'
      }).then(r => ({ status: r.status }));
    `, ownerBrandId, apiUrl);
    expect(reportRes.status).to.equal(403);

    // ── Giao diện UI: Truy cập báo cáo (VIEW_ANALYTICS bị cấm) ──
    console.log("🖥️  Kiểm chứng giao diện Báo cáo (VIEW_ANALYTICS bị cấm)...");
    await driver.get(`${BASE_URL}/manage/reports`);
    await driver.sleep(2000);

    // Xác nhận có toast cảnh báo "Không thể tải danh sách báo cáo."
    const toastError = await driver.wait(
      until.elementLocated(By.xpath("//li[contains(., 'Không thể tải danh sách báo cáo')]")),
      10000
    );
    expect(toastError).to.exist;

    // Bấm nút "Load Data"
    const loadDataBtn = await driver.wait(
      until.elementLocated(By.xpath("//button[contains(., 'Load Data')]")),
      5000
    );
    await driver.executeScript("arguments[0].click();", loadDataBtn);
    await driver.sleep(1000);

    // Xác nhận có toast cảnh báo thất bại do 403 "Không thể tải dữ liệu"
    const toastLoadError = await driver.wait(
      until.elementLocated(By.xpath("//li[contains(., 'Không thể tải dữ liệu')]")),
      10000
    );
    expect(toastLoadError).to.exist;

    // Xác nhận phần lịch sử PDF trống
    const emptyMsg = await driver.wait(
      until.elementLocated(By.xpath("//p[contains(text(), 'Chưa có bản ghi báo cáo nào được tạo')]")),
      5000
    );
    expect(emptyMsg).to.exist;

    console.log("📡 Kiểm chứng quyền VIEW_ANALYTICS trên Dashboard Metrics API (bị cấm)...");
    const metricsRes = await driver.executeScript(`
      const apiUrl = arguments[1];
      return fetch(apiUrl + '/api/social/metrics?brandId=' + arguments[0] + '&platform=YOUTUBE', {
        method: 'GET',
        credentials: 'include'
      }).then(r => ({ status: r.status }));
    `, ownerBrandId, apiUrl);
    
    // Dự kiến sẽ fail ở đây do backend trả về 200 thay vì 403 (bug phân quyền)
    expect(metricsRes.status).to.equal(403);
  });

  it('TC_TEAM_08_D: Kiểm chứng Custom Role chỉ có quyền Quản lý thành viên (MANAGE_TEAM)', async function () {
    const [roleRows] = await dbConnection.execute(
      "SELECT id FROM custom_roles WHERE name = 'Restricted Analyst' AND brandId = ? LIMIT 1",
      [ownerBrandId]
    );
    const roleId = roleRows[0].id;

    // Cập nhật database: Chỉ có quyền MANAGE_TEAM và INVITE_MEMBERS
    await dbConnection.execute("DELETE FROM custom_role_permissions WHERE roleId = ?", [roleId]);
    const crypto = require('crypto');
    await dbConnection.execute(
      "INSERT INTO custom_role_permissions (id, roleId, permissionKey, isAllowed) VALUES (?, ?, 'MANAGE_TEAM', 1)",
      [crypto.randomUUID(), roleId]
    );
    await dbConnection.execute(
      "INSERT INTO custom_role_permissions (id, roleId, permissionKey, isAllowed) VALUES (?, ?, 'INVITE_MEMBERS', 1)",
      [crypto.randomUUID(), roleId]
    );

    const apiUrl = process.env.API_URL || 'http://localhost:3000';

    console.log("📡 Kiểm chứng quyền INVITE_MEMBERS (được phép)...");
    const inviteRes = await driver.executeScript(`
      const apiUrl = arguments[1];
      return fetch(apiUrl + '/api/team/invite', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'hackmember-test-08-d@gmail.com',
          role: 'Member',
          brandId: arguments[0]
        })
      }).then(r => ({ status: r.status }));
    `, ownerBrandId, apiUrl);
    expect(inviteRes.status).to.be.oneOf([200, 201]);

    console.log("📡 Kiểm chứng quyền CREATE_POSTS (bị cấm)...");
    const createPostRes = await driver.executeScript(`
      const apiUrl = arguments[1];
      return fetch(apiUrl + '/api/posts', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Post from Team Manager',
          brandId: arguments[0]
        })
      }).then(r => ({ status: r.status }));
    `, ownerBrandId, apiUrl);
    expect(createPostRes.status).to.equal(403);

    // ── Giao diện UI: Tạo bài viết (CREATE_POSTS bị cấm) ──
    console.log("🖥️  Kiểm chứng giao diện Tạo bài viết (CREATE_POSTS bị cấm)...");
    await driver.get(`${BASE_URL}/planner`);
    await driver.sleep(2500); // Đợi tải lại thông tin brand/profile để cập nhật phân quyền mới

    // Kiểm tra nút Create Post bị disabled bởi AccessGuard
    const createPostBtn = await driver.wait(
      until.elementLocated(By.css('[data-testid="planner-create-post-btn"]')),
      15000
    );
    const isCreatePostDisabled = await createPostBtn.getAttribute("disabled");
    expect(isCreatePostDisabled).to.equal("true");

    // Loại bỏ attribute disabled và kích hoạt onClick thông qua React fiber props hoặc click thủ công
    await driver.executeScript(`
      const btn = arguments[0];
      const key = Object.keys(btn).find(k => k.startsWith('__reactProps') || k.startsWith('__reactEventHandlers'));
      if (key && btn[key] && typeof btn[key].onClick === 'function') {
        btn[key].onClick({ preventDefault: () => {}, stopPropagation: () => {} });
      } else {
        btn.removeAttribute('disabled');
        btn.click();
      }
    `, createPostBtn);
    await driver.sleep(1000);

    // Xác nhận có toast cảnh báo "Bạn cần có quyền tạo bài viết để sử dụng tính năng này."
    const toastCreateWarning = await driver.wait(
      until.elementLocated(By.xpath("//li[contains(., 'Bạn cần có quyền tạo bài viết')]")),
      10000
    );
    expect(toastCreateWarning).to.exist;
  });

  it('TC_TEAM_08_E: Kiểm chứng Custom Role chỉ có quyền Xem báo cáo (VIEW_ANALYTICS)', async function () {
    const [roleRows] = await dbConnection.execute(
      "SELECT id FROM custom_roles WHERE name = 'Restricted Analyst' AND brandId = ? LIMIT 1",
      [ownerBrandId]
    );
    const roleId = roleRows[0].id;

    // Cập nhật database: Chỉ có quyền VIEW_ANALYTICS
    await dbConnection.execute("DELETE FROM custom_role_permissions WHERE roleId = ?", [roleId]);
    const crypto = require('crypto');
    await dbConnection.execute(
      "INSERT INTO custom_role_permissions (id, roleId, permissionKey, isAllowed) VALUES (?, ?, 'VIEW_ANALYTICS', 1)",
      [crypto.randomUUID(), roleId]
    );

    const apiUrl = process.env.API_URL || 'http://localhost:3000';

    console.log("📡 Kiểm chứng quyền VIEW_ANALYTICS trên Report API (được phép)...");
    const reportRes = await driver.executeScript(`
      const apiUrl = arguments[1];
      return fetch(apiUrl + '/api/reports?brandId=' + arguments[0], {
        method: 'GET',
        credentials: 'include'
      }).then(r => ({ status: r.status }));
    `, ownerBrandId, apiUrl);
    expect(reportRes.status).to.equal(200);

    console.log("📡 Kiểm chứng quyền INVITE_MEMBERS (bị cấm)...");
    const inviteRes = await driver.executeScript(`
      const apiUrl = arguments[1];
      return fetch(apiUrl + '/api/team/invite', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'hackmember-test-08-e@gmail.com',
          role: 'Member',
          brandId: arguments[0]
        })
      }).then(r => ({ status: r.status }));
    `, ownerBrandId, apiUrl);
    expect(inviteRes.status).to.equal(403);

    // ── Giao diện UI: Xem báo cáo (VIEW_ANALYTICS được phép) ──
    console.log("🖥️  Kiểm chứng giao diện Báo cáo (VIEW_ANALYTICS được phép)...");
    await driver.get(`${BASE_URL}/manage/reports`);
    await driver.sleep(2500); // Đợi tải lại thông tin brand/profile

    // Bấm nút "Load Data"
    const loadDataBtn = await driver.wait(
      until.elementLocated(By.xpath("//button[contains(., 'Load Data')]")),
      10000
    );
    await driver.executeScript("arguments[0].click();", loadDataBtn);
    await driver.sleep(1000);

    // Xác nhận nạp dữ liệu thành công "Dữ liệu đã được tải thành công!"
    const toastSuccess = await driver.wait(
      until.elementLocated(By.xpath("//li[contains(., 'Dữ liệu đã được tải thành công')]")),
      10000
    );
    expect(toastSuccess).to.exist;
  });

  it('TC_TEAM_08_F: Kiểm chứng Custom Role chỉ có quyền Quản lý vai trò (MANAGE_ROLES)', async function () {
    const [roleRows] = await dbConnection.execute(
      "SELECT id FROM custom_roles WHERE name = 'Restricted Analyst' AND brandId = ? LIMIT 1",
      [ownerBrandId]
    );
    const roleId = roleRows[0].id;

    // Cập nhật database: Chỉ có quyền MANAGE_ROLES
    await dbConnection.execute("DELETE FROM custom_role_permissions WHERE roleId = ?", [roleId]);
    const crypto = require('crypto');
    await dbConnection.execute(
      "INSERT INTO custom_role_permissions (id, roleId, permissionKey, isAllowed) VALUES (?, ?, 'MANAGE_ROLES', 1)",
      [crypto.randomUUID(), roleId]
    );

    const apiUrl = process.env.API_URL || 'http://localhost:3000';

    console.log("📡 Kiểm chứng quyền MANAGE_ROLES (được phép)...");
    const createRoleRes = await driver.executeScript(`
      const apiUrl = arguments[1];
      return fetch(apiUrl + '/api/brands/' + arguments[0] + '/roles', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Temporary Role',
          description: 'A role created during E2E test',
          colorHex: '#3B82F6',
          permissions: []
        })
      }).then(r => ({ status: r.status }));
    `, ownerBrandId, apiUrl);
    expect(createRoleRes.status).to.be.oneOf([200, 201]);

    // Dọn dẹp vai trò tạm thời vừa tạo để không rác DB
    const [tempRoleRows] = await dbConnection.execute(
      "SELECT id FROM custom_roles WHERE name = 'Temporary Role' AND brandId = ? LIMIT 1",
      [ownerBrandId]
    );
    if (tempRoleRows.length > 0) {
      await dbConnection.execute("DELETE FROM custom_role_permissions WHERE roleId = ?", [tempRoleRows[0].id]);
      await dbConnection.execute("DELETE FROM custom_roles WHERE id = ?", [tempRoleRows[0].id]);
    }

    console.log("📡 Kiểm chứng quyền INVITE_MEMBERS (bị cấm)...");
    const inviteRes = await driver.executeScript(`
      const apiUrl = arguments[1];
      return fetch(apiUrl + '/api/team/invite', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'hackmember-test-08-f@gmail.com',
          role: 'Member',
          brandId: arguments[0]
        })
      }).then(r => ({ status: r.status }));
    `, ownerBrandId, apiUrl);
    expect(inviteRes.status).to.equal(403);
  });

  it('TC_TEAM_08_G: Kiểm chứng Custom Role chỉ có quyền Phê duyệt bài viết (APPROVE_POSTS) và Xóa bài viết (DELETE_POSTS)', async function () {
    const [roleRows] = await dbConnection.execute(
      "SELECT id FROM custom_roles WHERE name = 'Restricted Analyst' AND brandId = ? LIMIT 1",
      [ownerBrandId]
    );
    const roleId = roleRows[0].id;

    // Cập nhật database: Chỉ có quyền APPROVE_POSTS và DELETE_POSTS
    await dbConnection.execute("DELETE FROM custom_role_permissions WHERE roleId = ?", [roleId]);
    const crypto = require('crypto');
    await dbConnection.execute(
      "INSERT INTO custom_role_permissions (id, roleId, permissionKey, isAllowed) VALUES (?, ?, 'APPROVE_POSTS', 1)",
      [crypto.randomUUID(), roleId]
    );
    await dbConnection.execute(
      "INSERT INTO custom_role_permissions (id, roleId, permissionKey, isAllowed) VALUES (?, ?, 'DELETE_POSTS', 1)",
      [crypto.randomUUID(), roleId]
    );

    const apiUrl = process.env.API_URL || 'http://localhost:3000';

    console.log("📡 Kiểm chứng quyền APPROVE_POSTS (được phép)...");
    const approveRes = await driver.executeScript(`
      const apiUrl = arguments[1];
      return fetch(apiUrl + '/api/posts/bulk-approve', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          postIds: ['dummy-id-123'],
          brandId: arguments[0]
        })
      }).then(r => ({ status: r.status }));
    `, ownerBrandId, apiUrl);
    expect(approveRes.status).to.be.oneOf([200, 404]);

    console.log("📡 Kiểm chứng quyền DELETE_POSTS (được phép)...");
    const deleteRes = await driver.executeScript(`
      const apiUrl = arguments[1];
      return fetch(apiUrl + '/api/posts/bulk', {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          postIds: ['dummy-id-123'],
          brandId: arguments[0]
        })
      }).then(r => ({ status: r.status }));
    `, ownerBrandId, apiUrl);
    expect(deleteRes.status).to.be.oneOf([200, 404]);

    console.log("📡 Kiểm chứng quyền CREATE_POSTS (bị cấm)...");
    const createRes = await driver.executeScript(`
      const apiUrl = arguments[1];
      return fetch(apiUrl + '/api/posts', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Unauthorized Post Creation',
          brandId: arguments[0]
        })
      }).then(r => ({ status: r.status }));
    `, ownerBrandId, apiUrl);
    expect(createRes.status).to.equal(403);
  });

  it('TC_TEAM_08_H: Kiểm chứng Custom Role chỉ có quyền Tạo bài viết (CREATE_POSTS) và Đăng bài viết (PUBLISH_POSTS)', async function () {
    const [roleRows] = await dbConnection.execute(
      "SELECT id FROM custom_roles WHERE name = 'Restricted Analyst' AND brandId = ? LIMIT 1",
      [ownerBrandId]
    );
    const roleId = roleRows[0].id;

    // Cập nhật database: Chỉ có quyền CREATE_POSTS và PUBLISH_POSTS
    await dbConnection.execute("DELETE FROM custom_role_permissions WHERE roleId = ?", [roleId]);
    const crypto = require('crypto');
    await dbConnection.execute(
      "INSERT INTO custom_role_permissions (id, roleId, permissionKey, isAllowed) VALUES (?, ?, 'CREATE_POSTS', 1)",
      [crypto.randomUUID(), roleId]
    );
    await dbConnection.execute(
      "INSERT INTO custom_role_permissions (id, roleId, permissionKey, isAllowed) VALUES (?, ?, 'PUBLISH_POSTS', 1)",
      [crypto.randomUUID(), roleId]
    );

    const apiUrl = process.env.API_URL || 'http://localhost:3000';

    console.log("📡 Kiểm chứng quyền CREATE_POSTS (được phép)...");
    const createRes = await driver.executeScript(`
      const apiUrl = arguments[1];
      return fetch(apiUrl + '/api/posts', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Post by Editor Only',
          brandId: arguments[0]
        })
      }).then(r => ({ status: r.status }));
    `, ownerBrandId, apiUrl);
    expect(createRes.status).to.be.oneOf([200, 201]);

    console.log("📡 Kiểm chứng quyền APPROVE_POSTS (bị cấm)...");
    const approveRes = await driver.executeScript(`
      const apiUrl = arguments[1];
      return fetch(apiUrl + '/api/posts/bulk-approve', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          postIds: ['dummy-id-123'],
          brandId: arguments[0]
        })
      }).then(r => ({ status: r.status }));
    `, ownerBrandId, apiUrl);
    expect(approveRes.status).to.equal(403);

    console.log("📡 Kiểm chứng quyền DELETE_POSTS (bị cấm)...");
    const deleteRes = await driver.executeScript(`
      const apiUrl = arguments[1];
      return fetch(apiUrl + '/api/posts/bulk', {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          postIds: ['dummy-id-123'],
          brandId: arguments[0]
        })
      }).then(r => ({ status: r.status }));
    `, ownerBrandId, apiUrl);
    expect(deleteRes.status).to.equal(403);
  });

  it('TC_TEAM_09: Chặn xóa vai trò đang hoạt động & Dọn dẹp dứt điểm', async function () {
    await driver.get(`${BASE_URL}/dashboard`);
    await driver.sleep(1000);
    const avatarBtn = await driver.wait(until.elementLocated(By.xpath("//button[@title='Menu']")), 10000);
    await driver.executeScript("arguments[0].click();", avatarBtn);
    await driver.sleep(500);
    const logoutBtn = await driver.wait(until.elementLocated(By.xpath("//button[contains(., 'Logout') or contains(., 'Log out') or contains(., 'Đăng xuất')]")), 5000);
    await logoutBtn.click();
    await driver.sleep(2000);

    await driver.get(`${BASE_URL}/login`);
    const emailInput = await driver.wait(until.elementLocated(By.id('email')), 10000);
    const passwordInput = await driver.findElement(By.id('password'));
    await emailInput.sendKeys(ownerEmail);
    await passwordInput.sendKeys(ownerPassword);
    await passwordInput.sendKeys(Key.ENTER);
    await driver.wait(until.urlContains('/dashboard'), 15000);
    await driver.executeScript(`localStorage.setItem('activeBrandId', '${ownerBrandId}');`);
    await driver.get(`${BASE_URL}/dashboard`);
    await driver.sleep(2000);

    await driver.get(`${BASE_URL}/manage/team`);
    await driver.sleep(2000);

    await safeClick(By.xpath("//button[contains(text(), 'Vai trò tùy chỉnh')]"));
    await driver.sleep(1000);

    const deleteRoleIcon = await driver.wait(until.elementLocated(By.xpath("//h3[contains(text(), 'Restricted Analyst')]/ancestor::div[contains(@class, 'group')]//button[@title='Xóa vai trò']")), 10000);
    await driver.executeScript("arguments[0].click();", deleteRoleIcon);
    await driver.sleep(1000);

    const confirmDeleteBtn = await driver.wait(until.elementLocated(By.xpath("//button[contains(text(), 'Xóa')]")), 5000);
    await confirmDeleteBtn.click();
    await driver.sleep(1500);

    const toastDeleteError = await driver.wait(until.elementLocated(By.xpath("//li[contains(., 'Không thể xóa vai trò') or contains(., 'đang có thành viên')]")), 5000);
    expect(toastDeleteError).to.not.be.null;
    await driver.sleep(2000);

    await safeClick(By.xpath("//button[contains(text(), 'Thành viên')]"));
    await driver.sleep(1000);

    const memberRow = await driver.wait(until.elementLocated(By.xpath(`//tr[td[contains(., '${memberEmail}')]]`)), 10000);
    const memberActionBtn = await memberRow.findElement(By.xpath(".//button[contains(@class, 'p-2')]"));
    await driver.executeScript("arguments[0].click();", memberActionBtn);
    await driver.sleep(1000);

    const analystRoleOption = await driver.wait(until.elementLocated(By.xpath("//button[span[contains(text(), 'Analyst')]]")), 5000);
    await analystRoleOption.click();
    await driver.sleep(2000);

    const toastUpdateSuccess = await driver.wait(until.elementLocated(By.xpath("//li[contains(., 'Cập nhật vai trò thành công')]")), 5000);
    expect(toastUpdateSuccess).to.not.be.null;
    await driver.sleep(2000);

    await safeClick(By.xpath("//button[contains(text(), 'Vai trò tùy chỉnh')]"));
    await driver.sleep(1000);

    const deleteRoleIcon2 = await driver.wait(until.elementLocated(By.xpath("//h3[contains(text(), 'Restricted Analyst')]/ancestor::div[contains(@class, 'group')]//button[@title='Xóa vai trò']")), 10000);
    await driver.executeScript("arguments[0].click();", deleteRoleIcon2);
    await driver.sleep(1000);

    const confirmDeleteBtn2 = await driver.wait(until.elementLocated(By.xpath("//button[contains(text(), 'Xóa')]")), 5000);
    await confirmDeleteBtn2.click();
    await driver.sleep(2000);

    const toastDeleteSuccess = await driver.wait(until.elementLocated(By.xpath("//li[contains(., 'Xóa vai trò') or contains(., 'thành công')]")), 5000);
    expect(toastDeleteSuccess).to.not.be.null;

    const pageSource = await driver.getPageSource();
    expect(pageSource.includes('Restricted Analyst')).to.be.false;
  });

  it('TC_TEAM_10: Mời hàng loạt thành viên (Bulk Team Invitation)', async function () {
    await driver.get(`${BASE_URL}/manage/team`);
    await driver.sleep(2000);

    await safeClick(By.xpath("//button[contains(., 'Invite Member')]"));
    await driver.sleep(1000);

    const emailInput = await driver.findElement(By.xpath("//div[contains(@class, 'cursor-text')]//input"));
    await emailInput.sendKeys('bulk1@gmail.com, bulk2@gmail.com', Key.ENTER);

    // Chọn vai trò Admin
    const adminRoleOption = await driver.wait(until.elementLocated(By.xpath("//div[contains(text(), 'Admin')]")), 5000);
    await driver.executeScript("arguments[0].click();", adminRoleOption);
    await driver.sleep(500);

    const inviteSubmitBtn = await driver.findElement(By.xpath("//button[contains(text(), 'Gửi lời mời tham gia')]"));
    await inviteSubmitBtn.click();
    await driver.sleep(2000);

    // Chờ thông báo thành công
    const toastSuccess = await driver.wait(until.elementLocated(By.xpath("//li[contains(., 'thành công')]")), 15000);
    expect(toastSuccess).to.not.be.null;
    await driver.sleep(2000);

    // Kiểm tra xem cả 2 user đã được tạo và hiển thị trong danh sách thành viên chờ duyệt
    const pendingMember1 = await driver.wait(until.elementLocated(By.xpath("//tr[td[contains(., 'bulk1@gmail.com')]]")), 10000);
    const pendingMember2 = await driver.wait(until.elementLocated(By.xpath("//tr[td[contains(., 'bulk2@gmail.com')]]")), 10000);
    expect(pendingMember1).to.not.be.null;
    expect(pendingMember2).to.not.be.null;
  });
});
