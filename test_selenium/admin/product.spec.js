const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

const { expect } = require('chai');
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const mysql = require('mysql2/promise');

describe('Product Matrix Admin Selenium UI Tests', function () {
  this.timeout(120000); // 2 minutes
  let driver;
  let dbConnection;

  before(async function () {
    dbConnection = await mysql.createConnection(process.env.MYSQL_URL || 'mysql://root:root_password@localhost:3307/publicast');

    // Dọn dẹp dữ liệu test cũ nếu có
    try {
      await dbConnection.execute("DELETE FROM products WHERE platformId = 'NEW' OR platformId = 'SLN'");
      await dbConnection.execute("DELETE FROM platforms WHERE id = 'NEW' OR id = 'SLN'");
      await dbConnection.execute("DELETE FROM modules WHERE id LIKE 'M_SELENIUM%'");
      console.log('🧹 Cleaned up old Selenium Product Matrix test data');
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
    // Dọn dẹp test data sau khi test
    try {
      await dbConnection.execute("DELETE FROM products WHERE platformId = 'NEW' OR platformId = 'SLN'");
      await dbConnection.execute("DELETE FROM platforms WHERE id = 'NEW' OR id = 'SLN'");
      await dbConnection.execute("DELETE FROM modules WHERE id LIKE 'M_SELENIUM%'");
      console.log('🧹 Cleaned up Selenium Product Matrix test data');
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

  it('Should login as admin and perform Product Matrix operations', async function () {
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

    // 2. Đi tới trang Product Matrix Admin
    await driver.get(`${BASE_URL}/admin/products`);
    await driver.wait(until.elementLocated(By.id('btn-add-platform')), 15000);
    console.log('✅ Navigated to Admin Product Matrix page');

    // 3. Thêm Platform mới
    await safeClick(By.id('btn-add-platform'));
    await driver.sleep(1000);

    const platformNameInput = await driver.wait(until.elementLocated(By.id('input-platform-name')), 5000);
    await platformNameInput.sendKeys('Selenium Platform');

    const platformIdInput = await driver.findElement(By.id('input-platform-id'));
    await platformIdInput.sendKeys('SLN');

    await safeClick(By.id('btn-submit-platform'));
    await driver.sleep(2000);
    console.log('✅ Submitted new Platform "SLN"');

    // Xác nhận Platform mới hiển thị trên giao diện
    const pageSourceAfterPlatform = await driver.getPageSource();
    expect(pageSourceAfterPlatform).to.include('Selenium Platform');

    // 4. Thêm Module mới
    await safeClick(By.id('btn-manage-modules'));
    await driver.sleep(1000);

    const moduleNameInput = await driver.wait(until.elementLocated(By.id('input-module-name')), 5000);
    await moduleNameInput.sendKeys('Selenium Module');

    const moduleDescInput = await driver.findElement(By.id('input-module-desc'));
    await moduleDescInput.sendKeys('Testing module description');

    // Submit và đợi modal đóng
    await safeClick(By.id('btn-submit-module'));
    await driver.sleep(2000);
    console.log('✅ Submitted new Module');

    const pageSourceAfterModule = await driver.getPageSource();
    expect(pageSourceAfterModule).to.include('Selenium Module');

    // Lấy ID của module Selenium vừa tạo từ DB
    const [rows] = await dbConnection.execute("SELECT id FROM modules WHERE name = 'Selenium Module' LIMIT 1");
    expect(rows.length).to.greaterThan(0);
    const createdModuleId = rows[0].id;
    console.log(`ℹ️ Created Module ID: ${createdModuleId}`);

    // 5. Kích hoạt Product Matrix (Enable) cho Module vừa tạo và Platform SLN
    const cellAddId = `cell-add-${createdModuleId}-SLN`;
    console.log(`🖱️ Clicking cell to enable matrix: ${cellAddId}`);
    
    // Đợi cell xuất hiện
    await safeClick(By.id(cellAddId));
    await driver.sleep(1000);

    // Xác nhận Add Product Modal hiện lên
    await driver.wait(until.elementLocated(By.id('modal-matrix-add')), 5000);

    // Bấm Enable Module
    await safeClick(By.id('btn-submit-matrix'));
    await driver.sleep(2000);
    console.log('✅ Enabled Product Matrix');

    // Xác nhận cell đã chuyển sang trạng thái Active (Trash icon có ID tương ứng tồn tại)
    const cellDeleteId = `cell-delete-${createdModuleId}-SLN`;
    const cellDeleteElement = await driver.wait(until.elementLocated(By.id(cellDeleteId)), 5000);
    expect(cellDeleteElement).to.exist;
    console.log('✅ Matrix cell is now Active');

    // 6. Disable Product Matrix (Click trash icon)
    console.log(`🗑️ Clicking trash to disable matrix: ${cellDeleteId}`);
    
    // Sử dụng safeClick để bypass hover requirement và che khuất
    await safeClick(By.id(cellDeleteId));
    await driver.sleep(1000);

    // Chấp nhận confirm alert của browser
    const alert = await driver.switchTo().alert();
    await alert.accept();
    await driver.sleep(2000);
    console.log('✅ Confirmed disable dialog');

    // Xác nhận cell đã quay về trạng thái Inactive (cell-add ID tồn tại trở lại)
    const cellAddElementAgain = await driver.wait(until.elementLocated(By.id(cellAddId)), 5000);
    expect(cellAddElementAgain).to.exist;
    console.log('✅ Matrix cell has returned to Inactive successfully');
  });
});
