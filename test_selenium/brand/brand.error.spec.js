// brand.error.spec.js
// Selenium test for Brand error scenarios
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

const { expect } = require('chai');
const { Builder, By, until } = require('selenium-webdriver');
const { loginAs } = require('../helpers/login');

const chrome = require('selenium-webdriver/chrome');

describe('Brand Error Handling', function () {
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

    // Clean up extra brands via API to ensure exactly 1 brand exists
    await driver.executeAsyncScript(async (done) => {
      try {
        const res = await fetch('/api/brands', { credentials: 'include' });
        const data = await res.json();
        const brands = data.data || [];
        if (Array.isArray(brands) && brands.length > 1) {
          for (let i = 1; i < brands.length; i++) {
            await fetch(`/api/brands/${brands[i].id}`, { method: 'DELETE', credentials: 'include' });
          }
        }
      } catch (e) {}
      done();
    });
    await driver.navigate().refresh();
    await driver.wait(until.elementLocated(By.css('h1')), 15000);
  });
  after(async function () {
    await driver.quit();
  });

  // Helper to click Add Brand button safely
  async function clickAddBrandBtn() {
    const cancelBtns = await driver.findElements(By.css('[data-testid="cancel-brand-btn"]'));
    for (const btn of cancelBtns) {
      try { await driver.executeScript("arguments[0].click();", btn); } catch (e) {}
    }
    const backdrops = await driver.findElements(By.css('.fixed.inset-0'));
    for (const bg of backdrops) {
      try { await driver.wait(until.stalenessOf(bg), 3000); } catch (e) {}
    }
    const addBtn = await driver.wait(
      until.elementLocated(By.css('[data-testid="add-brand-btn"]')),
      10000
    );
    await driver.wait(until.elementIsEnabled(addBtn), 10000);
    await driver.sleep(400);
    await driver.executeScript("arguments[0].click();", addBtn);
  }

  // TC14 – Empty brand name shows HTML5 validation (submit button disabled)
  it('TC14 – Submit disabled when brand name is empty', async function () {
    await clickAddBrandBtn();

    const nameInput = await driver.wait(
      until.elementLocated(By.css('[data-testid="create-brand-name"]')),
      10000
    );

    // Clear the input (empty)
    await nameInput.clear();

    // Submit button should be disabled when name is empty
    const submitBtn = await driver.findElement(By.css('[data-testid="submit-brand-btn"]'));
    const isDisabled = await submitBtn.getAttribute('disabled');
    expect(isDisabled).to.not.be.null;

    // Close modal
    const cancelBtn = await driver.findElement(By.css('[data-testid="cancel-brand-btn"]'));
    await cancelBtn.click();
    await driver.wait(until.stalenessOf(nameInput), 10000);
  });

  // TC15 – Modal cancel works correctly
  it('TC15 – Cancel brand creation modal works', async function () {
    await clickAddBrandBtn();

    const nameInput = await driver.wait(
      until.elementLocated(By.css('[data-testid="create-brand-name"]')),
      10000
    );
    await nameInput.sendKeys('ShouldNotBeCreated');

    const cancelBtn = await driver.findElement(By.css('[data-testid="cancel-brand-btn"]'));
    await cancelBtn.click();

    // Modal should be gone
    await driver.wait(until.stalenessOf(nameInput), 10000);
    const modals = await driver.findElements(By.css('[data-testid="create-brand-name"]'));
    expect(modals.length).to.equal(0);
  });
});
