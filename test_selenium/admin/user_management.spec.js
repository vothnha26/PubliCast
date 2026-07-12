const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

const { expect } = require('chai');
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const mysql = require('mysql2/promise');

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

describe('Admin User Management Selenium UI Tests', function () {
  this.timeout(120000); // 2 minutes
  let driver;
  let dbConnection;
  let testUserId = generateUUID();
  const testUserEmail = 'selenium-test-user@publicast.com';
  const testUserName = 'Selenium Test User';

  before(async function () {
    dbConnection = await mysql.createConnection(process.env.MYSQL_URL || 'mysql://root:root_password@localhost:3307/publicast');

    // Dọn dẹp dữ liệu cũ nếu có
    try {
      await dbConnection.execute("DELETE FROM users WHERE email = ?", [testUserEmail]);
      console.log('🧹 Cleaned up old Selenium test users');
    } catch (err) {
      console.warn('⚠️ Pre-test cleanup warning:', err.message);
    }

    // Insert một test user trực tiếp vào DB để thao tác
    try {
      // passwordHash cho 'nhacc123@' hoặc gì đó tùy ý
      const passwordHash = '$2b$10$w8.5k0FvC1z7tOa9z2nHeuY5/u.x3T2sS7Y4aN2qUqy1G7Nn.3p8y';
      await dbConnection.execute(
        `INSERT INTO users (id, email, passwordHash, name, role, isActive, isEmailVerified, createdAt, updatedAt) 
         VALUES (?, ?, ?, ?, 'USER', 1, 1, NOW(), NOW())`,
        [testUserId, testUserEmail, passwordHash, testUserName]
      );
      console.log(`👤 Inserted Selenium E2E test user. ID: ${testUserId}`);
    } catch (err) {
      console.error('❌ Failed to insert Selenium test user:', err.message);
      throw err;
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
    // Dọn dẹp test user
    try {
      await dbConnection.execute("DELETE FROM users WHERE email = ?", [testUserEmail]);
      console.log('🧹 Cleaned up Selenium E2E test user');
    } catch (err) {
      console.error('❌ DB Cleanup failed:', err.message);
    }
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
        console.log(`📸 Screenshot saved: ${screenshotPath}`);
      } catch (err) {
        console.error("❌ Failed to take screenshot:", err.message);
      }
    }
  });

  async function safeClick(selector, timeout = 15000) {
    try {
      const element = await driver.wait(until.elementLocated(selector), timeout);
      await driver.wait(until.elementIsVisible(element), 5000);
      await element.click();
    } catch (err) {
      const element = await driver.findElement(selector);
      await driver.executeScript("arguments[0].click();", element);
    }
  }

  it('Should login as admin and perform User Management CRUD', async function () {
    // 1. Đăng nhập
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@publicast.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'nhacc123@';

    console.log(`🔐 Logging in as admin: ${adminEmail}`);
    await driver.get(`${BASE_URL}/login`);

    const emailInput = await driver.wait(until.elementLocated(By.id('email')), 15000);
    await emailInput.sendKeys(adminEmail);

    const passwordInput = await driver.findElement(By.id('password'));
    await passwordInput.sendKeys(adminPassword);

    await safeClick(By.css("button[type='submit']"));

    // Chờ redirect thành công
    await driver.wait(until.urlContains('/admin'), 20000);
    console.log('✅ Logged in successfully');

    // 2. Đi tới trang User Management
    await driver.get(`${BASE_URL}/admin/users`);
    
    // Đợi ô search xuất hiện
    await driver.wait(until.elementLocated(By.id('input-search-users')), 15000);
    console.log('✅ Navigated to Admin User Management page');

    // 3. Thực hiện tìm kiếm user test vừa tạo
    const searchInput = await driver.findElement(By.id('input-search-users'));
    await searchInput.sendKeys(testUserName);
    await driver.sleep(2000); // Đợi debounce search hoạt động và tải lại API

    // Kiểm tra trang chứa test user name
    let pageSource = await driver.getPageSource();
    expect(pageSource).to.include(testUserName);
    expect(pageSource).to.include(testUserEmail);
    console.log('✅ Found test user in search results');

    // 4. Ban User (Vô hiệu hóa)
    const statusBtnId = `btn-status-${testUserId}`;
    console.log(`🚫 Banning user with button ID: ${statusBtnId}`);
    
    await safeClick(By.id(statusBtnId));
    await driver.sleep(1000);

    // Chấp nhận alert confirm của browser
    let alert = await driver.switchTo().alert();
    await alert.accept();
    await driver.sleep(2000); // Chờ UI reload

    // Xác nhận trạng thái hiển thị của User trên UI đổi thành Banned
    const banBtnElement = await driver.wait(until.elementLocated(By.id(statusBtnId)), 5000);
    const banText = await banBtnElement.getText();
    expect(banText.toUpperCase()).to.include('UNBAN'); // Nút đổi thành Unban
    console.log('✅ User banned successfully (UI state verified)');

    // Kiểm tra trong CSDL
    let [rows] = await dbConnection.execute("SELECT isActive FROM users WHERE id = ? LIMIT 1", [testUserId]);
    expect(rows[0].isActive).to.equal(0);
    console.log('✅ User banned successfully (DB verified)');

    // 5. Unban User (Kích hoạt lại)
    console.log(`❇️ Unbanning user with button ID: ${statusBtnId}`);
    await safeClick(By.id(statusBtnId));
    await driver.sleep(1000);

    alert = await driver.switchTo().alert();
    await alert.accept();
    await driver.sleep(2000);

    const unbanBtnElement = await driver.wait(until.elementLocated(By.id(statusBtnId)), 5000);
    const unbanText = await unbanBtnElement.getText();
    expect(unbanText.toUpperCase()).to.include('BAN'); // Nút quay lại Ban
    console.log('✅ User unbanned successfully (UI state verified)');

    [rows] = await dbConnection.execute("SELECT isActive FROM users WHERE id = ? LIMIT 1", [testUserId]);
    expect(rows[0].isActive).to.equal(1);
    console.log('✅ User unbanned successfully (DB verified)');

    // 6. Đổi vai trò (Change Role) thành STAFF
    const roleSelectId = `select-role-${testUserId}`;
    console.log(`🔄 Changing role with select ID: ${roleSelectId}`);
    
    const roleSelectElement = await driver.wait(until.elementLocated(By.id(roleSelectId)), 5000);
    await driver.executeScript(
      "arguments[0].value = 'STAFF'; arguments[0].dispatchEvent(new Event('change', { bubbles: true }));", 
      roleSelectElement
    );
    await driver.sleep(3000); // Chờ gọi API và hoàn thành

    // Xác nhận DB đã đổi vai trò sang STAFF
    [rows] = await dbConnection.execute("SELECT role FROM users WHERE id = ? LIMIT 1", [testUserId]);
    expect(rows[0].role).to.equal('STAFF');
    console.log('✅ User role updated to STAFF successfully (DB verified)');
  });
});
