const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

const { expect } = require('chai');
const { Builder, By, until } = require('selenium-webdriver');
const { loginAs } = require('./helpers/login');
const chrome = require('selenium-webdriver/chrome');

describe('Global Theme System (Dark/Light/System Mode)', function () {
  this.timeout(60000);
  let driver;

  before(async function () {
    const options = new chrome.Options();
    if (process.env.CI || process.env.HEADLESS) {
      options.addArguments('--headless=new');
      options.addArguments('--no-sandbox');
      options.addArguments('--disable-dev-shm-usage');
      options.addArguments('--disable-gpu');
    }
    options.addArguments('--window-size=1280,800');

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    console.log('🔑 Đang đăng nhập hệ thống...');
    await loginAs(driver, 'admin');
    
    // Đợi vào trang Dashboard
    await driver.wait(until.urlContains('/dashboard'), 15000);
    console.log('✅ Đã đăng nhập và truy cập Dashboard.');
  });

  after(async function () {
    if (driver) {
      await driver.quit();
    }
  });

  it('TC01 - Theme Switcher nên được hiển thị trong Sidebar', async function () {
    // Đợi Sidebar load và Switcher xuất hiện bằng cách tìm button với title "Dark Mode"
    const darkBtn = await driver.wait(
      until.elementLocated(By.xpath("//button[@title='Dark Mode']")),
      10000
    );
    expect(darkBtn).to.exist;

    const lightBtn = await driver.findElement(By.xpath("//button[@title='Light Mode']"));
    expect(lightBtn).to.exist;

    const systemBtn = await driver.findElement(By.xpath("//button[@title='System Mode']"));
    expect(systemBtn).to.exist;
  });

  it('TC02 - Kích hoạt Dark Mode từ Switcher', async function () {
    const darkBtn = await driver.findElement(By.xpath("//button[@title='Dark Mode']"));
    
    // Click chọn Dark Mode
    await darkBtn.click();
    await driver.sleep(1000); // Chờ theme apply và localstorage ghi nhận

    // Kiểm tra class "dark" trên thẻ <html>
    const htmlEl = await driver.findElement(By.tagName('html'));
    const htmlClass = await htmlEl.getAttribute('class');
    console.log(`Current html class in Dark mode: "${htmlClass}"`);
    expect(htmlClass).to.contain('dark');

    // Kiểm tra giá trị trong localStorage
    const savedTheme = await driver.executeScript(
      "return localStorage.getItem('publicast-theme')"
    );
    expect(savedTheme).to.equal('dark');
  });

  it('TC03 - Kích hoạt Light Mode từ Switcher', async function () {
    const lightBtn = await driver.findElement(By.xpath("//button[@title='Light Mode']"));
    
    // Click chọn Light Mode
    await lightBtn.click();
    await driver.sleep(1000); // Chờ theme apply

    // Kiểm tra class "dark" đã bị xóa khỏi thẻ <html>
    const htmlEl = await driver.findElement(By.tagName('html'));
    const htmlClass = await htmlEl.getAttribute('class') || '';
    console.log(`Current html class in Light mode: "${htmlClass}"`);
    expect(htmlClass).to.not.contain('dark');

    // Kiểm tra giá trị trong localStorage
    const savedTheme = await driver.executeScript(
      "return localStorage.getItem('publicast-theme')"
    );
    expect(savedTheme).to.equal('light');
  });

  it('TC04 - Kích hoạt System Mode từ Switcher', async function () {
    const systemBtn = await driver.findElement(By.xpath("//button[@title='System Mode']"));
    
    // Click chọn System Mode
    await systemBtn.click();
    await driver.sleep(1000);

    // Kiểm tra giá trị trong localStorage
    const savedTheme = await driver.executeScript(
      "return localStorage.getItem('publicast-theme')"
    );
    expect(savedTheme).to.equal('system');
  });
});
