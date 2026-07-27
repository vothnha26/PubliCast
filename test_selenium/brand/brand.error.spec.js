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
  });
  after(async function () {
    await driver.quit();
  });

  // TC14 – Empty brand name shows HTML5 validation (submit button disabled)
  it('TC14 – Submit disabled when brand name is empty', async function () {
    const addBtn = await driver.wait(
      until.elementLocated(By.css('[data-testid="add-brand-btn"]')),
      10000
    );
    await addBtn.click();

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
    const addBtn = await driver.wait(
      until.elementLocated(By.css('[data-testid="add-brand-btn"]')),
      10000
    );
    await addBtn.click();

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
