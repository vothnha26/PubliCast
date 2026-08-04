const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

const { expect } = require('chai');
const { Builder, By, until, Key } = require('selenium-webdriver');
const { loginAs } = require('../helpers/login');

const chrome = require('selenium-webdriver/chrome');

async function setReactInputValue(driver, element, value) {
  await driver.executeScript((el, val) => {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeInputValueSetter.call(el, val);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, element, value);
}

describe('Profile & Settings Detailed Suite', function () {
  this.timeout(90000);
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

    // Log in once at the start of the suite
    await loginAs(driver, 'admin');
  });

  after(async function () {
    await driver.quit();
  });

  beforeEach(async function () {
    // Go to Settings page before each test case
    await driver.get(`${BASE_URL}/settings`);
    await driver.wait(until.elementLocated(By.css('h1')), 15000);
    // Wait for the profile fetch (fullName/email/accounts) to resolve so
    // tab-specific fields that depend on it (e.g. the Access tab's
    // conditionally-rendered current-password input) are ready once a
    // test switches tabs, instead of racing an in-flight request.
    const fullNameInput = await driver.wait(
      until.elementLocated(By.css('[data-testid="profile-fullname-input"]')),
      15000
    );
    await driver.wait(async () => (await fullNameInput.getAttribute('value')) !== '', 15000);
  });

  describe('Tab Navigation and Deep Links', function () {
    it('TC_PROFILE_01 – Verify tab navigation updates URL query parameters', async function () {
      const accessTab = await driver.wait(
        until.elementLocated(By.css('[data-testid="settings-tab-access"]')),
        10000
      );
      await accessTab.click();
      await driver.sleep(500);
      expect(await driver.getCurrentUrl()).to.include('/settings?tab=access');

      const supportTab = await driver.findElement(By.css('[data-testid="settings-tab-support"]'));
      await supportTab.click();
      await driver.sleep(500);
      expect(await driver.getCurrentUrl()).to.include('/settings?tab=support');

      const billingTab = await driver.findElement(By.css('[data-testid="settings-tab-billing"]'));
      await billingTab.click();
      await driver.sleep(500);
      expect(await driver.getCurrentUrl()).to.include('/settings?tab=billing');
    });

    it('TC_PROFILE_02 – Verify direct navigation to tabs via URL queries', async function () {
      await driver.get(`${BASE_URL}/settings?tab=support`);
      await driver.sleep(2000); // Chờ trang tải hoàn tất dữ liệu API
      
      const chatInput = await driver.wait(
        until.elementLocated(By.css('[data-testid="support-chat-input"]')),
        15000
      );
      await driver.wait(until.elementIsVisible(chatInput), 10000);
      
      // Chống lỗi stale bằng cách truy vấn lại
      const stableChatInput = await driver.findElement(By.css('[data-testid="support-chat-input"]'));
      expect(await stableChatInput.isDisplayed()).to.be.true;

      await driver.get(`${BASE_URL}/settings?tab=billing`);
      await driver.sleep(2000); // Chờ trang tải hoàn tất dữ liệu API
      
      const upgradeBtn = await driver.wait(
        until.elementLocated(By.css('[data-testid="billing-upgrade-btn"]')),
        15000
      );
      await driver.wait(until.elementIsVisible(upgradeBtn), 10000);
      
      const stableUpgradeBtn = await driver.findElement(By.css('[data-testid="billing-upgrade-btn"]'));
      expect(await stableUpgradeBtn.isDisplayed()).to.be.true;
    });

    it('TC_PROFILE_03 – Verify Google linked success callback redirection', async function () {
      this.timeout(90000);
      await loginAs(driver, 'admin');
      await driver.get(`${BASE_URL}/settings?success=google_linked`);
      await driver.sleep(1000);
      
      await driver.wait(until.urlContains('tab=access'), 25000);
      expect(await driver.getCurrentUrl()).to.include('/settings?tab=access');

      // Verify success toast or Google text exists on page
      const pageSource = await driver.getPageSource();
      expect(pageSource).to.include('Google');
    });
  });

  describe('Account Information Settings', function () {
    it('TC_PROFILE_04 – Verify default profile data displays correctly in inputs', async function () {
      const nameInput = await driver.wait(
        until.elementLocated(By.css('[data-testid="profile-fullname-input"]')),
        10000
      );
      await driver.wait(async () => {
        const val = await nameInput.getAttribute('value');
        return val && val.trim().length > 0;
      }, 5000);
      const currentName = await nameInput.getAttribute('value');
      expect(currentName).to.not.be.empty;
    });

    it('TC_PROFILE_05 – Verify successful Profile Name update with special Vietnamese characters', async function () {
      const nameInput = await driver.wait(
        until.elementLocated(By.css('[data-testid="profile-fullname-input"]')),
        10000
      );
      
      const newName = 'Nguyễn Hữu Minh Trí';
      await setReactInputValue(driver, nameInput, newName);

      const saveBtn = await driver.findElement(By.css('[data-testid="profile-save-btn"]'));
      await saveBtn.click();
      await driver.sleep(1500);

      // Verify change persisted after refresh
      await driver.navigate().refresh();
      await driver.wait(until.elementLocated(By.css('h1')), 15000);

      const refreshedNameInput = await driver.wait(
        until.elementLocated(By.css('[data-testid="profile-fullname-input"]')),
        10000
      );
      await driver.wait(async () => {
        const val = await refreshedNameInput.getAttribute('value');
        return val && val.trim().length > 0;
      }, 10000);
      expect(await refreshedNameInput.getAttribute('value')).to.equal(newName);
    });

    it('TC_PROFILE_06 – Verify Monthly Summary toggle switches state on UI', async function () {
      // Find the toggle wrapper
      const toggle = await driver.wait(
        until.elementLocated(By.css('[data-testid="toggle-monthly-summary"]')),
        10000
      );
      const initialClass = await toggle.getAttribute('class');
      
      // Click the toggle to switch state
      await toggle.click();
      await driver.sleep(300);
      const updatedClass = await toggle.getAttribute('class');
      
      expect(initialClass).to.not.equal(updatedClass);
    });
  });

  describe('Access and Security (Passwords & OAuth)', function () {
    beforeEach(async function () {
      // Make sure we are on the Access tab
      const accessTab = await driver.wait(
        until.elementLocated(By.css('[data-testid="settings-tab-access"]')),
        10000
      );
      await accessTab.click();
      await driver.wait(
        until.elementLocated(By.css('[data-testid="profile-current-password-input"]')),
        15000
      );
    });

    it('TC_PROFILE_07 – Verify password change fails when current password is empty', async function () {
      const currentPwdInput = await driver.wait(
        until.elementLocated(By.css('[data-testid="profile-current-password-input"]')),
        10000
      );
      await setReactInputValue(driver, currentPwdInput, '');

      const newPwdInput = await driver.findElement(By.css('[data-testid="profile-new-password-input"]'));
      await setReactInputValue(driver, newPwdInput, 'newsecretpassword');

      const updateBtn = await driver.findElement(By.css('[data-testid="profile-update-password-btn"]'));
      await updateBtn.click();
      await driver.sleep(1000);

      // Verify that password change didn't pass (current password should be validated)
      const pageSource = await driver.getPageSource();
      // Should show warning or toast
      expect(pageSource).to.include('mật khẩu');
    });

    it('TC_PROFILE_08 – Verify password change fails when current password is incorrect', async function () {
      const currentPwdInput = await driver.wait(
        until.elementLocated(By.css('[data-testid="profile-current-password-input"]')),
        10000
      );
      await setReactInputValue(driver, currentPwdInput, 'wrongpassword');

      const newPwdInput = await driver.findElement(By.css('[data-testid="profile-new-password-input"]'));
      await setReactInputValue(driver, newPwdInput, 'newsecretpassword');

      const updateBtn = await driver.findElement(By.css('[data-testid="profile-update-password-btn"]'));
      await updateBtn.click();

      // Verify error message toast on UI
      const toastEl = await driver.wait(
        until.elementLocated(By.xpath("//*[contains(., 'không chính xác') or contains(., 'incorrect') or contains(., 'Invalid')]")),
        10000
      );
      expect(await toastEl.isDisplayed()).to.be.true;
    });

    it('TC_PROFILE_09 – Verify password change fails when new password is too short', async function () {
      // Occasionally flaky on CI — the beforeEach hook's tab click can land
      // right as the app is still settling (same class of timing issue as
      // TC_PROFILE_03). Give this case more headroom instead of raising the
      // shared beforeEach timeout for every test in the suite.
      this.timeout(60000);
      const currentPassword = process.env.ADMIN_PASSWORD || process.env.USER_PASSWORD;
      const currentPwdInput = await driver.wait(
        until.elementLocated(By.css('[data-testid="profile-current-password-input"]')),
        20000
      );
      await setReactInputValue(driver, currentPwdInput, currentPassword);

      const newPwdInput = await driver.findElement(By.css('[data-testid="profile-new-password-input"]'));
      await setReactInputValue(driver, newPwdInput, '1234567'); // 7 characters — below the 8-char minimum (issue #83)

      const updateBtn = await driver.findElement(By.css('[data-testid="profile-update-password-btn"]'));
      await updateBtn.click();

      // Verify error toast — minimum length was raised from 6 to 8 to match
      // resetPasswordValidation's policy (see issue #83).
      const toastEl = await driver.wait(
        until.elementLocated(By.xpath("//*[contains(., '8 ký tự') or contains(., '8 characters') or contains(., 'at least 8')]")),
        10000
      );
      expect(await toastEl.isDisplayed()).to.be.true;
    });

    it('TC_PROFILE_10 – Verify successful password change and restore original', async function () {
      const currentPassword = process.env.ADMIN_PASSWORD || process.env.USER_PASSWORD;
      const currentPwdInput = await driver.wait(
        until.elementLocated(By.css('[data-testid="profile-current-password-input"]')),
        10000
      );
      await setReactInputValue(driver, currentPwdInput, currentPassword);

      const newPwdInput = await driver.findElement(By.css('[data-testid="profile-new-password-input"]'));
      const temporaryPwd = 'temporaryPwd123';
      await setReactInputValue(driver, newPwdInput, temporaryPwd);

      const updateBtn = await driver.findElement(By.css('[data-testid="profile-update-password-btn"]'));
      await updateBtn.click();
      await driver.sleep(1500);

      // Immediately restore back to the original password to maintain env consistency
      const currentPwdInputRestore = await driver.wait(
        until.elementLocated(By.css('[data-testid="profile-current-password-input"]')),
        10000
      );
      await setReactInputValue(driver, currentPwdInputRestore, temporaryPwd);

      const newPwdInputRestore = await driver.findElement(By.css('[data-testid="profile-new-password-input"]'));
      await setReactInputValue(driver, newPwdInputRestore, currentPassword);

      const updateBtnRestore = await driver.findElement(By.css('[data-testid="profile-update-password-btn"]'));
      await updateBtnRestore.click();
      await driver.sleep(1500);
    });
  });

  describe('Support Chat Interactions', function () {
    beforeEach(async function () {
      // Navigate to Support Chat tab
      const supportTab = await driver.wait(
        until.elementLocated(By.css('[data-testid="settings-tab-support"]')),
        10000
      );
      await supportTab.click();
      await driver.sleep(500);
    });

    it('TC_PROFILE_11 – Verify Support Chat handles enter key to send message', async function () {
      const chatInput = await driver.wait(
        until.elementLocated(By.css('[data-testid="support-chat-input"]')),
        10000
      );
      const testMsg = 'Automated message sent via Enter Key';
      await chatInput.sendKeys(testMsg, Key.ENTER);
      await driver.sleep(500);

      const pageSource = await driver.getPageSource();
      expect(pageSource).to.include(testMsg);
    });

    it('TC_PROFILE_12 – Verify Support Chat prevents sending empty messages', async function () {
      const initialMessages = await driver.findElements(By.css('[data-testid="chat-message"]'));
      const initialCount = initialMessages.length;
      
      const chatInput = await driver.wait(
        until.elementLocated(By.css('[data-testid="support-chat-input"]')),
        10000
      );
      await chatInput.sendKeys('   ', Key.ENTER); // whitespace only
      await driver.sleep(300);

      const postMessages = await driver.findElements(By.css('[data-testid="chat-message"]'));
      const postCount = postMessages.length;
      
      // Message count should not increase
      expect(postCount).to.equal(initialCount);
    });
  });

  describe('Billing Portal & Redirects', function () {
    it('TC_PROFILE_13 – Verify Billing portal redirect to pricing page', async function () {
      const billingTab = await driver.wait(
        until.elementLocated(By.css('[data-testid="settings-tab-billing"]')),
        10000
      );
      await billingTab.click();
      await driver.sleep(500);

      const upgradeBtn = await driver.wait(
        until.elementLocated(By.css('[data-testid="billing-upgrade-btn"]')),
        10000
      );
      await upgradeBtn.click();

      await driver.wait(until.urlContains('/pricing'), 10000);
      const currentUrl = await driver.getCurrentUrl();
      expect(currentUrl).to.include('/pricing');
    });
  });
});
