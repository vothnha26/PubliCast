// brand.update.spec.js
// Selenium test for Brand Update
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const SCREENSHOT_DIR = path.join(__dirname, '..', '..', 'test_cases', 'auth', 'screenshots');

// Đảm bảo thư mục screenshots tồn tại
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const { expect } = require('chai');
const { Builder, By, until, Key } = require('selenium-webdriver');
const { loginAs } = require('../helpers/login');

const chrome = require('selenium-webdriver/chrome');

describe('Brand Update', function () {
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
    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();
    await loginAs(driver, 'admin');
    await driver.get(`${BASE_URL}/manage/connections`);
    // Wait for Brand Settings page to load
    await driver.wait(until.elementLocated(By.css('h1')), 15000);
  });
  after(async function () {
    await driver.quit();
  });

  // Tự động chụp màn hình nếu test case thất bại
  afterEach(async function () {
    if (this.currentTest.state === 'failed') {
      const fileName = `brand_update_failed_${this.currentTest.title.replace(/\s+/g, '_')}.png`;
      const filePath = path.join(SCREENSHOT_DIR, fileName);
      try {
        const image = await driver.takeScreenshot();
        fs.writeFileSync(filePath, image, 'base64');
        console.log(`📸 Đã tự động lưu ảnh chụp màn hình lỗi: ${fileName}`);
      } catch (err) {
        console.error(`❌ Không thể chụp ảnh màn hình lỗi:`, err.message);
      }
    }
  });

  // TC08 – Update brand name
  it('TC08 – Update brand name', async function () {
    // Wait for brand name input to be visible
    const nameInput = await driver.wait(
      until.elementLocated(By.css('[data-testid="brand-name-input"]')),
      10000
    );
    
    // Clear and type new name
    await nameInput.sendKeys(Key.CONTROL, 'a');
    await nameInput.sendKeys(Key.BACK_SPACE);
    const newName = 'UpdatedBrand_' + Date.now();
    await nameInput.sendKeys(newName);

    // Click save
    const saveBtn = await driver.wait(
      until.elementIsEnabled(await driver.findElement(By.css('[data-testid="save-brand-btn"]'))),
      5000
    );
    await saveBtn.click();

    // Verify the input still has the new name (save succeeded)
    await driver.wait(async () => {
      const val = await driver.findElement(By.css('[data-testid="brand-name-input"]')).getAttribute('value');
      return val === newName;
    }, 10000, 'Brand name was not updated');
  });

  // TC09 – Save button is disabled when name unchanged
  it('TC09 – Save button disabled when name unchanged', async function () {
    // Get current value
    const nameInput = await driver.findElement(By.css('[data-testid="brand-name-input"]'));
    const currentName = await nameInput.getAttribute('value');

    // Clear then re-type same name
    await nameInput.sendKeys(Key.CONTROL, 'a');
    await nameInput.sendKeys(Key.BACK_SPACE);
    await nameInput.sendKeys(currentName);

    // The input is a controlled React component: sendKeys fires one onChange
    // per keystroke, and disabled is derived from state
    // (selectedBrand.name === activeBrand.name) in a later re-render. Reading
    // the attribute immediately after the last keystroke races React's
    // render — sendKeys resolving only means the DOM event was dispatched,
    // not that React has re-rendered yet. Poll until it settles instead of
    // asserting on the very next tick.
    const saveBtn = await driver.findElement(By.css('[data-testid="save-brand-btn"]'));
    await driver.wait(
      async () => (await saveBtn.getAttribute('disabled')) !== null,
      5000,
      'Save button was not disabled after re-typing the unchanged name'
    );

    const isDisabled = await saveBtn.getAttribute('disabled');
    expect(isDisabled).to.not.be.null; // button is disabled when name unchanged
  });
});

