const { Builder, By, until, logging } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const { createClient } = require('redis');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const authenticator = require('../backend/node_modules/otplib');

const REDIS_URL = 'redis://127.0.0.1:6379';
const MYSQL_URL = 'mysql://root:root_password@localhost:3307/publicast';
const BASE_URL = 'http://localhost:5174';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'test_cases', 'auth', 'screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function takeScreenshot(driver, fileName) {
  try {
    const image = await driver.takeScreenshot();
    const filePath = path.join(SCREENSHOT_DIR, fileName);
    fs.writeFileSync(filePath, image, 'base64');
    console.log(`📸 Saved screenshot: ${fileName}`);
  } catch (err) {
    console.error(`❌ Cannot take screenshot ${fileName}:`, err.message);
  }
}

async function printBrowserConsoleLogs(driver) {
  try {
    const logs = await driver.manage().logs().get(logging.Type.BROWSER);
    console.log("--- [Browser Console Logs] ---");
    for (const entry of logs) {
      console.log(`[${entry.level.name}] ${entry.message}`);
    }
    console.log("------------------------------");
  } catch (err) {
    console.error("⚠️ Cannot fetch browser console logs:", err.message);
  }
}

async function resetBrowserSession(driver) {
  try {
    // Navigate to backend port to clear backend HTTPOnly cookies
    await driver.get('http://localhost:3000');
    await driver.manage().deleteAllCookies();
    
    // Navigate back to frontend to clear storage & cookies
    await driver.get(BASE_URL);
    await driver.manage().deleteAllCookies();
    await driver.executeScript('window.localStorage.clear(); window.sessionStorage.clear();');
    console.log("🧹 Browser session cleared (both frontend & backend cookies).");
  } catch (err) {
    console.error("⚠️ Cannot reset browser session:", err.message);
  }
}

const testEmail = `selenium_2fa_${Date.now()}@gmail.com`;
const testPassword = 'Password123!';
const testName = 'Selenium 2FA E2E Tester';
let backupCodes = [];

async function run2FASuite() {
  console.log("=========================================================");
  console.log("🚀 STARTING E2E 2FA AUTHENTICATION AUTOMATED TEST 🚀");
  console.log("=========================================================");

  const redisClient = createClient({ url: REDIS_URL });
  redisClient.on('error', (err) => console.error('Redis Client Error', err));
  
  let dbConnection;
  let driver;

  try {
    console.log("🔌 Connecting to Redis...");
    await redisClient.connect();
    console.log("✅ Redis connected.");

    console.log("🔌 Connecting to MySQL Database...");
    dbConnection = await mysql.createConnection(MYSQL_URL);
    console.log("✅ MySQL connected.");

    console.log("🌐 Launching Chrome Browser...");
    const options = new chrome.Options();
    
    // Đảm bảo capture logs của browser console
    const prefs = new logging.Preferences();
    prefs.setLevel(logging.Type.BROWSER, logging.Level.ALL);
    options.setLoggingPrefs(prefs);

    if (process.env.CI || true) {
      options.addArguments('--headless=new');
      options.addArguments('--no-sandbox');
      options.addArguments('--disable-dev-shm-usage');
      options.addArguments('--disable-gpu');
    }
    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();
    await driver.manage().window().maximize();

    // 1. Sign up new account
    console.log("\n--- [Step 1: Sign Up & Verify Email OTP] ---");
    await resetBrowserSession(driver);
    await driver.get(`${BASE_URL}/signup`);

    let emailInput = await driver.wait(until.elementLocated(By.id('email')), 15000);
    let nameInput = await driver.findElement(By.xpath("//input[@placeholder='Your name']"));
    let passwordInput = await driver.findElement(By.id('password'));
    let confirmPasswordInput = await driver.findElement(By.xpath("//input[@placeholder='••••••••']"));
    let checkbox = await driver.findElement(By.xpath("//input[@type='checkbox']"));
    let submitButton = await driver.findElement(By.xpath("//button[@type='submit']"));

    await nameInput.sendKeys(testName);
    await emailInput.sendKeys(testEmail);
    await passwordInput.sendKeys(testPassword);
    await confirmPasswordInput.sendKeys(testPassword);
    
    await driver.executeScript("arguments[0].click();", checkbox);
    await takeScreenshot(driver, 'e2e_2fa_01_signup_form.png');
    await driver.executeScript("arguments[0].click();", submitButton);

    console.log("⏳ Waiting for OTP verification page redirect...");
    await driver.wait(until.urlContains('/verify-otp'), 10000);
    await driver.sleep(2000); // Wait for Redis write

    const otpCode = await redisClient.get(`otp:${testEmail}`);
    if (!otpCode) throw new Error("OTP code not found in Redis!");
    console.log(`🔑 Retrieved registration OTP code: ${otpCode}`);

    let otpInput = await driver.wait(until.elementLocated(By.xpath("//input[@placeholder='000000']")), 10000);
    await otpInput.sendKeys(otpCode);
    let verifyButton = await driver.findElement(By.xpath("//button[@type='submit']"));
    await driver.executeScript("arguments[0].click();", verifyButton);

    await driver.wait(until.urlContains('/start'), 15000);
    console.log("✅ Registration & Email verification success.");
    await takeScreenshot(driver, 'e2e_2fa_02_onboarding.png');

    // 2. Go to Settings -> Tab Access (Security)
    console.log("\n--- [Step 2: Navigate to Settings & Enable 2FA] ---");
    await driver.get(`${BASE_URL}/settings?tab=access`);
    console.log("👉 Navigated to Settings (Security tab).");

    let updatePasswordBtn = await driver.wait(
      until.elementLocated(By.css('[data-testid="profile-update-password-btn"]')),
      15000
    );
    console.log("✅ Security Settings page loaded successfully.");

    // Tìm toggle button 2FA
    let toggleBtn = await driver.findElement(
      By.xpath("//span[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'factor') or contains(text(), 'yếu tố') or contains(text(), '2 lớp')]/ancestor::div[1]/following-sibling::button")
    );
    
    // In debug info
    console.log("🔍 [Debug Element Info]");
    console.log("   TagName:", await toggleBtn.getTagName());
    console.log("   Class:", await toggleBtn.getAttribute("class"));
    console.log("   HTML:", await toggleBtn.getAttribute("outerHTML"));

    await driver.executeScript("arguments[0].scrollIntoView({ block: 'center' });", toggleBtn);
    await driver.sleep(1500);
    await takeScreenshot(driver, 'e2e_2fa_03_settings_access_tab.png');
    
    // Kích hoạt click
    console.log("👉 Clicking 2FA Toggle Button via JavaScript...");
    await driver.executeScript("arguments[0].click();", toggleBtn);
    await driver.sleep(2000); // Đợi modal mở ra và API setup hoàn thành

    // Print browser logs sau khi click để kiểm tra lỗi JS nếu có
    await printBrowserConsoleLogs(driver);

    console.log("⏳ Waiting for 2FA Setup Modal...");
    let setupOtpInput = await driver.wait(
      until.elementLocated(By.xpath("//form//input[@placeholder='000000']")),
      10000
    );
    await takeScreenshot(driver, 'e2e_2fa_04_setup_modal_opened.png');

    // Get User ID and 2FA secret from DB
    console.log("🔍 Fetching 2FA secret key from MySQL Database...");
    const [userRows] = await dbConnection.execute('SELECT id, twoFactorSecret FROM users WHERE email = ?', [testEmail]);
    if (userRows.length === 0) throw new Error("User not found in Database!");
    const userId = userRows[0].id;
    const secretKey = userRows[0].twoFactorSecret;
    if (!secretKey) throw new Error("2FA Secret key was not generated in database!");
    console.log(`🔑 Found 2FA Secret Key in DB: ${secretKey}`);

    // Generate valid OTP code using otplib
    const validOTP = await authenticator.generate({ secret: secretKey });
    console.log(`🔑 Generated TOTP for Secret: ${validOTP}`);

    // Input OTP code to enable 2FA
    await setupOtpInput.sendKeys(validOTP);
    await driver.sleep(500);
    let activateBtn = await driver.findElement(By.xpath("//button[contains(text(), 'Kích hoạt') or contains(translate(text(), 'KÍCH HOẠT', 'kích hoạt'), 'kích hoạt') or contains(text(), 'Enable') or contains(text(), 'enable')]"));
    await takeScreenshot(driver, 'e2e_2fa_05_setup_otp_filled.png');
    await driver.executeScript("arguments[0].click();", activateBtn);

    // Wait for Backup codes modal
    console.log("⏳ Waiting for Backup codes modal to show...");
    await driver.wait(
      until.elementLocated(By.xpath("//*[contains(@class, 'select-all')]")),
      10000
    );
    await takeScreenshot(driver, 'e2e_2fa_06_backup_codes_modal.png');

    // Extract backup codes from modal
    let codeElements = await driver.findElements(By.xpath("//*[contains(@class, 'select-all')]"));
    for (let elem of codeElements) {
      const codeText = await elem.getText();
      if (codeText.trim() && codeText.trim().length === 8) {
        backupCodes.push(codeText.trim());
      }
    }
    console.log("📊 Extracted Backup Codes:", backupCodes);

    // Close backup modal
    let confirmSaveBtn = await driver.findElement(By.xpath("//button[contains(text(), 'Tôi đã lưu lại') or contains(text(), 'save') or contains(translate(text(), 'TÔI ĐÃ LƯU', 'tôi đã lưu'), 'tôi đã lưu')]"));
    await driver.executeScript("arguments[0].click();", confirmSaveBtn);
    await driver.sleep(1000);

    // 3. Logout & Test 2FA Enforcement on Login
    console.log("\n--- [Step 3: Test 2FA Enforcement on Login] ---");
    await resetBrowserSession(driver);
    await driver.get(`${BASE_URL}/login`);

    let loginEmailInput = await driver.wait(until.elementLocated(By.id('email')), 10000);
    let loginPasswordInput = await driver.findElement(By.id('password'));
    let loginSubmitBtn = await driver.findElement(By.xpath("//button[@type='submit']"));

    await loginEmailInput.sendKeys(testEmail);
    await loginPasswordInput.sendKeys(testPassword);
    await takeScreenshot(driver, 'e2e_2fa_07_login_form.png');
    await driver.executeScript("arguments[0].click();", loginSubmitBtn);

    console.log("⏳ Waiting for 2FA Verification input to appear...");
    let loginOtp2FAInput = await driver.wait(until.elementLocated(By.xpath("//input[@placeholder='000000']")), 10000);
    console.log("✅ 2FA Code prompt found.");
    await takeScreenshot(driver, 'e2e_2fa_08_login_2fa_prompt.png');

    // Test negative scenario: Wrong OTP code
    console.log("👉 Testing incorrect OTP code scenario...");
    await loginOtp2FAInput.sendKeys('000000');
    await driver.sleep(500);
    let verify2FALoginBtn = await driver.findElement(By.xpath("//button[contains(text(), 'Xác nhận') or contains(text(), 'Confirm') or contains(translate(text(), 'XÁC NHẬN', 'xác nhận'), 'xác nhận')]"));
    await driver.executeScript("arguments[0].click();", verify2FALoginBtn);

    console.log("⏳ Waiting for invalid OTP toast error...");
    let errorToast = await driver.wait(
      until.elementLocated(By.xpath("//*[contains(translate(., 'KHÔNG', 'không'), 'không') or contains(., 'Invalid') or contains(translate(., 'HỢP LỆ', 'hợp lệ'), 'hợp lệ') or contains(., 'sai') or contains(translate(., 'VUI LÒNG', 'vui lòng'), 'vui lòng')]")),
      10000
    );
    console.log(`📢 UI Error Toast: "${await errorToast.getText()}"`);
    await takeScreenshot(driver, 'e2e_2fa_09_login_invalid_otp.png');

    // Test positive scenario: Correct OTP code
    console.log("👉 Testing correct OTP code scenario...");
    await loginOtp2FAInput.clear();
    const freshOTP = await authenticator.generate({ secret: secretKey });
    console.log(`🔑 Generated new TOTP: ${freshOTP}`);
    await loginOtp2FAInput.sendKeys(freshOTP);
    await driver.sleep(500);
    await driver.executeScript("arguments[0].click();", verify2FALoginBtn);

    console.log("⏳ Waiting for Dashboard redirect...");
    await driver.wait(until.urlContains('/dashboard'), 15000);
    console.log("✅ Logged in successfully with 2FA OTP.");
    await takeScreenshot(driver, 'e2e_2fa_10_dashboard_after_2fa.png');

    // 4. Logout & Test Login with Backup Code
    console.log("\n--- [Step 4: Test Login with Backup Code] ---");
    await resetBrowserSession(driver);
    await driver.get(`${BASE_URL}/login`);

    loginEmailInput = await driver.wait(until.elementLocated(By.id('email')), 10000);
    loginPasswordInput = await driver.findElement(By.id('password'));
    loginSubmitBtn = await driver.findElement(By.xpath("//button[@type='submit']"));

    await loginEmailInput.sendKeys(testEmail);
    await loginPasswordInput.sendKeys(testPassword);
    await driver.executeScript("arguments[0].click();", loginSubmitBtn);

    loginOtp2FAInput = await driver.wait(until.elementLocated(By.xpath("//input[@placeholder='000000']")), 10000);
    verify2FALoginBtn = await driver.findElement(By.xpath("//button[contains(text(), 'Xác nhận') or contains(text(), 'Confirm') or contains(translate(text(), 'XÁC NHẬN', 'xác nhận'), 'xác nhận')]"));

    const backupCodeToUse = backupCodes[0] || 'da296ecc';
    console.log(`👉 Logging in using Backup Code: ${backupCodeToUse}`);
    await loginOtp2FAInput.sendKeys(backupCodeToUse);
    await driver.sleep(500);
    await takeScreenshot(driver, 'e2e_2fa_11_login_backup_code_filled.png');
    await driver.executeScript("arguments[0].click();", verify2FALoginBtn);

    await driver.wait(until.urlContains('/dashboard'), 15000);
    console.log("✅ Logged in successfully with Backup Code.");
    await takeScreenshot(driver, 'e2e_2fa_12_dashboard_after_backup_code.png');

    // 5. Logout & Test Re-using the consumed Backup Code
    console.log("\n--- [Step 5: Test Backup Code Consumption (Should Fail)] ---");
    await resetBrowserSession(driver);
    await driver.get(`${BASE_URL}/login`);

    loginEmailInput = await driver.wait(until.elementLocated(By.id('email')), 10000);
    loginPasswordInput = await driver.findElement(By.id('password'));
    loginSubmitBtn = await driver.findElement(By.xpath("//button[@type='submit']"));

    await loginEmailInput.sendKeys(testEmail);
    await loginPasswordInput.sendKeys(testPassword);
    await driver.executeScript("arguments[0].click();", loginSubmitBtn);

    loginOtp2FAInput = await driver.wait(until.elementLocated(By.xpath("//input[@placeholder='000000']")), 10000);
    verify2FALoginBtn = await driver.findElement(By.xpath("//button[contains(text(), 'Xác nhận') or contains(text(), 'Confirm') or contains(translate(text(), 'XÁC NHẬN', 'xác nhận'), 'xác nhận')]"));

    console.log(`👉 Testing reused Backup Code (Should fail): ${backupCodeToUse}`);
    await loginOtp2FAInput.sendKeys(backupCodeToUse);
    await driver.sleep(500);
    await driver.executeScript("arguments[0].click();", verify2FALoginBtn);

    console.log("⏳ Waiting for consumption toast error...");
    let errorToast2 = await driver.wait(
      until.elementLocated(By.xpath("//*[contains(translate(., 'KHÔNG', 'không'), 'không') or contains(., 'Invalid') or contains(translate(., 'HỢP LỆ', 'hợp lệ'), 'hợp lệ') or contains(., 'sai') or contains(translate(., 'VUI LÒNG', 'vui lòng'), 'vui lòng')]")),
      10000
    );
    console.log(`📢 UI Error Toast (Reused): "${await errorToast2.getText()}"`);
    await takeScreenshot(driver, 'e2e_2fa_13_login_reused_backup_code_failed.png');

    // Log in properly with TOTP to disable 2FA
    console.log("👉 Logging in with valid TOTP to clean up and test Disable 2FA...");
    await loginOtp2FAInput.clear();
    const cleanOTP = await authenticator.generate({ secret: secretKey });
    await loginOtp2FAInput.sendKeys(cleanOTP);
    await driver.sleep(500);
    await driver.executeScript("arguments[0].click();", verify2FALoginBtn);
    await driver.wait(until.urlContains('/dashboard'), 15000);

    // 6. Disable 2FA
    console.log("\n--- [Step 6: Disable 2FA] ---");
    await driver.get(`${BASE_URL}/settings?tab=access`);
    
    await driver.wait(until.elementLocated(By.css('[data-testid="profile-update-password-btn"]')), 15000);
    
    toggleBtn = await driver.findElement(
      By.xpath("//span[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'factor') or contains(text(), 'yếu tố') or contains(text(), '2 lớp')]/ancestor::div[1]/following-sibling::button")
    );
    await driver.executeScript("arguments[0].scrollIntoView({ block: 'center' });", toggleBtn);
    await driver.sleep(1500);
    await takeScreenshot(driver, 'e2e_2fa_14_settings_disable_toggle.png');
    await driver.executeScript("arguments[0].click();", toggleBtn);

    console.log("⏳ Waiting for Disable 2FA Modal...");
    let disableOtpInput = await driver.wait(
      until.elementLocated(By.xpath("//form//input[@placeholder='000000']")),
      10000
    );
    await takeScreenshot(driver, 'e2e_2fa_15_disable_modal_opened.png');

    const disableOTP = await authenticator.generate({ secret: secretKey });
    await disableOtpInput.sendKeys(disableOTP);
    await driver.sleep(500);
    let confirmDisableBtn = await driver.findElement(By.xpath("//button[contains(text(), 'Xác nhận tắt') or contains(text(), 'Confirm')]"));
    await takeScreenshot(driver, 'e2e_2fa_16_disable_otp_filled.png');
    await driver.executeScript("arguments[0].click();", confirmDisableBtn);

    // Wait for success toast
    console.log("⏳ Waiting for disable success toast...");
    let successToast = await driver.wait(
      until.elementLocated(By.xpath("//*[contains(translate(., 'THÀNH CÔNG', 'thành công'), 'thành công') or contains(., 'Success') or contains(., 'tắt')]")),
      10000
    );
    console.log(`📢 UI Success Toast: "${await successToast.getText()}"`);
    await driver.sleep(1500);
    await takeScreenshot(driver, 'e2e_2fa_17_disabled_success.png');

    // 7. Verify login without 2FA
    console.log("\n--- [Step 7: Verify Login without 2FA] ---");
    await resetBrowserSession(driver);
    await driver.get(`${BASE_URL}/login`);

    loginEmailInput = await driver.wait(until.elementLocated(By.id('email')), 10000);
    loginPasswordInput = await driver.findElement(By.id('password'));
    loginSubmitBtn = await driver.findElement(By.xpath("//button[@type='submit']"));

    await loginEmailInput.sendKeys(testEmail);
    await loginPasswordInput.sendKeys(testPassword);
    await driver.executeScript("arguments[0].click();", loginSubmitBtn);

    console.log("⏳ Waiting for direct Dashboard redirect...");
    await driver.wait(until.urlContains('/dashboard'), 15000);
    console.log("🎉 Direct login without 2FA success!");
    await takeScreenshot(driver, 'e2e_2fa_18_direct_login_dashboard.png');

    console.log("\n=========================================================");
    console.log("🏆 ALL E2E 2FA AUTOMATED TEST CASES PASSED SUCCESSFULLY! 🏆");
    console.log("=========================================================");

  } catch (error) {
    console.error("❌ E2E 2FA TEST CASE FAILED!");
    console.error("Error Detail:", error.message);
    if (driver) {
      await takeScreenshot(driver, 'e2e_2fa_failed_screenshot.png');
      await printBrowserConsoleLogs(driver);
    }
  } finally {
    console.log("\n🧹 Cleaning up test infrastructure...");
    if (redisClient) {
      await redisClient.disconnect();
    }
    if (dbConnection) {
      await dbConnection.end();
    }
    if (driver) {
      await driver.quit();
    }
    console.log("🏁 TEST SUITE COMPLETED 🏁");
  }
}

run2FASuite();
