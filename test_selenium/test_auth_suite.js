const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const { createClient } = require('redis');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Cấu hình kết nối
const REDIS_URL = 'redis://127.0.0.1:6379';
const MYSQL_URL = 'mysql://root:root_password@localhost:3307/publicast';
const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'test_cases', 'auth', 'screenshots');

// Đảm bảo thư mục screenshots tồn tại
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const { reportBugToJira } = require('./jira_helper');

// Hàm hỗ trợ chụp màn hình và báo lỗi Jira
async function handleTestFailure(driver, testCaseName, error) {
  try {
    const currentUrl = await driver.getCurrentUrl();
    console.error(`❌ Lỗi tại URL: ${currentUrl}`);
    const pageSource = await driver.getPageSource();
    console.error(`Page source snippet: ${pageSource.slice(0, 1000)}`);
  } catch (e) {
    console.error("Could not retrieve URL or page source:", e.message);
  }

  const fileName = `${testCaseName.toLowerCase()}_failed_${Date.now()}.png`;
  const filePath = path.join(SCREENSHOT_DIR, fileName);
  try {
    const image = await driver.takeScreenshot();
    fs.writeFileSync(filePath, image, 'base64');
    console.log(`📸 Đã lưu ảnh chụp màn hình lỗi: ${fileName}`);
  } catch (err) {
    console.error(`❌ Không thể chụp ảnh màn hình lỗi:`, err.message);
  }

  const description = `Kịch bản kiểm thử tự động ${testCaseName} thất bại.\n\nChi tiết lỗi: ${error.message}\n\nStack Trace:\n${error.stack}`;
  await reportBugToJira(testCaseName, description, fs.existsSync(filePath) ? filePath : null);
}

// Hàm hỗ trợ chụp màn hình đơn giản cho các bước trung gian
async function takeScreenshot(driver, fileName) {
  try {
    const image = await driver.takeScreenshot();
    const filePath = path.join(SCREENSHOT_DIR, fileName);
    fs.writeFileSync(filePath, image, 'base64');
    console.log(`📸 Đã lưu ảnh chụp màn hình: ${fileName}`);
  } catch (err) {
    console.error(`❌ Không thể chụp ảnh màn hình ${fileName}:`, err.message);
  }
}

// Hàm hỗ trợ reset session trình duyệt để tránh bị tự động redirect
async function resetBrowserSession(driver) {
  try {
    await driver.get(BASE_URL);
    await driver.manage().deleteAllCookies();
    await driver.executeScript('window.localStorage.clear(); window.sessionStorage.clear();');
    console.log("🧹 Đã làm sạch session trình duyệt (Cookies, LocalStorage, SessionStorage).");
  } catch (err) {
    console.error("⚠️ Không thể reset session trình duyệt:", err.message);
  }
}

/**
 * Navigates to /signup and waits for the page to actually finish loading
 * before returning — AUTH_003 was seen timing out on By.id('email') after
 * 15s even though AUTH_002 (identical navigate-then-find-#email sequence,
 * run immediately prior) passed fine. driver.get() only waits for the
 * initial HTML document load event, not for Vite/React to finish mounting
 * — under CI load (a fresh navigate right after resetBrowserSession's own
 * driver.get(BASE_URL)) that gap can occasionally outlast the wait. Poll
 * document.readyState first so the elementLocated wait isn't racing page
 * bootstrap on a slow run.
 */
async function navigateToSignup(driver) {
  await driver.get(`${BASE_URL}/signup`);
  await driver.wait(async () => {
    const state = await driver.executeScript('return document.readyState;');
    return state === 'complete';
  }, 15000).catch(() => {});
}

// Biến lưu trữ email test giữa các kịch bản
let testEmail = '';
const timestamp = Date.now();
testEmail = `auth_test_user_${timestamp}@gmail.com`;
const testPassword = 'Password123!';
const testName = 'Selenium Auth Tester';

async function runAuthSuite() {
  console.log("=========================================================");
  console.log("🚀 KHỞI ĐỘNG BỘ KIỂM THỬ TỰ ĐỘNG THÀNH VIÊN (AUTH SUITE) 🚀");
  console.log("=========================================================");

  // Khởi tạo Redis và MySQL clients
  const redisClient = createClient({ url: REDIS_URL });
  redisClient.on('error', (err) => console.error('Redis Client Error', err));
  
  let dbConnection;
  let driver;

  try {
    // 1. Kết nối cơ sở hạ tầng
    console.log("🔌 Đang kết nối tới Redis...");
    await redisClient.connect();
    console.log("✅ Kết nối Redis thành công.");

    console.log("🔌 Đang kết nối tới MySQL Database...");
    dbConnection = await mysql.createConnection(MYSQL_URL);
    console.log("✅ Kết nối MySQL thành công.");

    // 2. Khởi tạo Selenium Webdriver
    console.log("🌐 Đang khởi tạo Trình duyệt Chrome...");
    const options = new chrome.Options();
    if (process.env.CI) {
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

    // =========================================================================
    // KỊCH BẢN 1: AUTH_001 - Đăng ký thành công + Xác thực OTP + Lưu DB
    // =========================================================================
    console.log("\n---------------------------------------------------------");
    console.log("📝 TEST CASE AUTH_001: Đăng ký thành công & Xác thực OTP");
    console.log("---------------------------------------------------------");
    try {
      await resetBrowserSession(driver);
      await navigateToSignup(driver);
      console.log("👉 Đã truy cập trang Đăng ký.");

      // Đợi input email có mặt bằng ID trước
      let emailInput = await driver.wait(until.elementLocated(By.id('email')), 15000);
      let nameInput = await driver.findElement(By.xpath("//input[@placeholder='Your name']"));
      let passwordInput = await driver.findElement(By.id('password'));
      let confirmPasswordInput = await driver.findElement(By.xpath("//input[@placeholder='••••••••']"));
      let checkbox = await driver.findElement(By.xpath("//input[@type='checkbox']"));
      let submitButton = await driver.findElement(By.xpath("//button[@type='submit']"));

      console.log(`✍️ Nhập Tên: '${testName}'`);
      await nameInput.sendKeys(testName);
      console.log(`✍️ Nhập Email: '${testEmail}'`);
      await emailInput.sendKeys(testEmail);
      console.log(`✍️ Nhập Mật khẩu: '${testPassword}'`);
      await passwordInput.sendKeys(testPassword);
      console.log(`✍️ Nhập Xác nhận mật khẩu: '${testPassword}'`);
      await confirmPasswordInput.sendKeys(testPassword);
      
      console.log("🖱️ Tick chọn đồng ý điều khoản...");
      await checkbox.click();
      
      await takeScreenshot(driver, 'auth_001_1_fill_form.png');
      
      console.log("🖱️ Click nút Tạo tài khoản...");
      await submitButton.click();

      // Chờ chuyển hướng sang OTP
      console.log("⏳ Chờ chuyển hướng sang trang Verify OTP...");
      await driver.wait(until.urlContains('/verify-otp'), 10000);
      console.log("🎉 Đã chuyển sang trang OTP.");
      await takeScreenshot(driver, 'auth_001_2_otp_page.png');

      // Chờ OTP lưu vào Redis
      console.log("⏳ Đang chờ 2 giây để mã OTP được ghi vào Redis...");
      await driver.sleep(2000);

      const redisKey = `otp:${testEmail}`;
      console.log(`🔍 Truy vấn OTP từ Redis key: ${redisKey}`);
      const otpCode = await redisClient.get(redisKey);
      
      if (!otpCode) {
        throw new Error("Không tìm thấy mã OTP trong Redis!");
      }
      console.log(`🔑 Tìm thấy mã OTP: ${otpCode}`);

      // Điền OTP
      let otpInput = await driver.wait(until.elementLocated(By.xpath("//input[@placeholder='000000']")), 10000);
      await otpInput.sendKeys(otpCode);
      
      let verifyButton = await driver.findElement(By.xpath("//button[@type='submit']"));
      console.log("🖱️ Click nút Verify Code...");
      await verifyButton.click();

      // Sau verify OTP, app điều hướng thẳng vào Dashboard — Onboarding giờ
      // hiển thị dưới dạng modal trên Dashboard (xem OnboardingModal.jsx),
      // không còn route /start riêng.
      console.log("⏳ Chờ chuyển hướng sang trang Dashboard...");
      await driver.wait(until.urlContains('/dashboard'), 15000);
      console.log("🎉 Đăng ký & Xác thực OTP hoàn tất!");
      await takeScreenshot(driver, 'auth_001_3_onboarding_start.png');

      // ĐÂY LÀ PHẦN KIỂM TRA LƯU TRỮ DƯỚI BACKEND (MYSQL)
      console.log("🔍 [KIỂM TRA BACKEND] Đang truy vấn MySQL để verify dữ liệu...");
      const [rows] = await dbConnection.execute(
        'SELECT email, name, isEmailVerified, isActive, role FROM users WHERE email = ?',
        [testEmail]
      );

      if (rows.length === 0) {
        throw new Error(`DB_VERIFY_FAIL: Không tìm thấy User với email ${testEmail} trong Database!`);
      }

      const userInDb = rows[0];
      console.log("📊 Thông tin User tìm thấy trong DB:", userInDb);

      if (userInDb.isEmailVerified !== 1 && userInDb.isEmailVerified !== true) {
        throw new Error(`DB_VERIFY_FAIL: isEmailVerified phải là true (1) nhưng nhận được: ${userInDb.isEmailVerified}`);
      }
      if (userInDb.isActive !== 1 && userInDb.isActive !== true) {
        throw new Error(`DB_VERIFY_FAIL: isActive phải là true (1) nhưng nhận được: ${userInDb.isActive}`);
      }
      if (userInDb.name !== testName) {
        throw new Error(`DB_VERIFY_FAIL: Tên không khớp! Mong đợi '${testName}' nhưng trong DB là '${userInDb.name}'`);
      }

      console.log("✅ KẾT QUẢ: AUTH_001 ĐẠT (PASS) - DỮ LIỆU ĐÃ LƯU TRỮ CHÍNH XÁC DƯỚI BACKEND DB!");

    } catch (error) {
      console.error("❌ KẾT QUẢ: AUTH_001 THẤT BẠI (FAIL)!");
      console.error("Chi tiết lỗi:", error.message);
      await handleTestFailure(driver, 'AUTH_001', error);
    }

    // =========================================================================
    // KỊCH BẢN 2: AUTH_002 - Đăng ký thất bại do mật khẩu không khớp
    // =========================================================================
    console.log("\n---------------------------------------------------------");
    console.log("📝 TEST CASE AUTH_002: Đăng ký thất bại do Mật khẩu không khớp");
    console.log("---------------------------------------------------------");
    try {
      // Làm sạch session trước khi chạy test case
      await resetBrowserSession(driver);
      await navigateToSignup(driver);
      console.log("👉 Đã truy cập trang Đăng ký.");

      let emailInput = await driver.wait(until.elementLocated(By.id('email')), 15000);
      let nameInput = await driver.findElement(By.xpath("//input[@placeholder='Your name']"));
      let passwordInput = await driver.findElement(By.id('password'));
      let confirmPasswordInput = await driver.findElement(By.xpath("//input[@placeholder='••••••••']"));
      let checkbox = await driver.findElement(By.xpath("//input[@type='checkbox']"));
      let submitButton = await driver.findElement(By.xpath("//button[@type='submit']"));

      const mismatchEmail = `mismatch_${Date.now()}@gmail.com`;
      console.log("✍️ Nhập Tên, Email");
      await nameInput.sendKeys("Mismatch Tester");
      await emailInput.sendKeys(mismatchEmail);
      console.log("✍️ Nhập Mật khẩu: 'Password123!' và Xác nhận mật khẩu: 'Password999!'");
      await passwordInput.sendKeys('Password123!');
      await confirmPasswordInput.sendKeys('Password999!');
      
      console.log("🖱️ Tick chọn đồng ý điều khoản và click Tạo tài khoản...");
      await checkbox.click();
      await submitButton.click();

      // Chờ Toast báo lỗi xuất hiện
      console.log("⏳ Chờ Toast thông báo lỗi...");
      let toastElement = await driver.wait(
        until.elementLocated(By.xpath("//*[contains(text(), 'không khớp') or contains(text(), 'mismatch') or contains(text(), 'match')]")),
        10000
      );
      const errorText = await toastElement.getText();
      console.log(`📢 Thông báo lỗi thực tế trên UI: "${errorText}"`);

      await takeScreenshot(driver, 'auth_002_password_mismatch.png');

      // Kiểm tra DB xem có tài khoản nào bị tạo lén không
      const [rows] = await dbConnection.execute('SELECT * FROM users WHERE email = ?', [mismatchEmail]);
      if (rows.length > 0) {
        throw new Error("DB_VERIFY_FAIL: Tài khoản đã bị tạo trong DB mặc dù mật khẩu xác nhận không khớp!");
      }
      console.log("✅ KẾT QUẢ: AUTH_002 ĐẠT (PASS) - Form Validation chặn thành công và không ghi nhận DB.");

    } catch (error) {
      console.error("❌ KẾT QUẢ: AUTH_002 THẤT BẠI (FAIL)!");
      console.error("Chi tiết lỗi:", error.message);
      await handleTestFailure(driver, 'AUTH_002', error);
    }

    // =========================================================================
    // KỊCH BẢN 3: AUTH_003 - Đăng ký thất bại do email đã tồn tại
    // =========================================================================
    console.log("\n---------------------------------------------------------");
    console.log("📝 TEST CASE AUTH_003: Đăng ký thất bại do Email đã tồn tại");
    console.log("---------------------------------------------------------");
    try {
      // Làm sạch session trước khi chạy test case
      await resetBrowserSession(driver);
      await navigateToSignup(driver);
      console.log("👉 Đã truy cập trang Đăng ký.");

      let emailInput = await driver.wait(until.elementLocated(By.id('email')), 15000);
      let nameInput = await driver.findElement(By.xpath("//input[@placeholder='Your name']"));
      let passwordInput = await driver.findElement(By.id('password'));
      let confirmPasswordInput = await driver.findElement(By.xpath("//input[@placeholder='••••••••']"));
      let checkbox = await driver.findElement(By.xpath("//input[@type='checkbox']"));
      let submitButton = await driver.findElement(By.xpath("//button[@type='submit']"));

      console.log(`✍️ Nhập Email trùng lặp: '${testEmail}'`);
      await nameInput.sendKeys("Duplicate Tester");
      await emailInput.sendKeys(testEmail);
      await passwordInput.sendKeys('Password123!');
      await confirmPasswordInput.sendKeys('Password123!');
      await checkbox.click();
      await submitButton.click();

      // Chờ Toast lỗi báo email đã tồn tại
      console.log("⏳ Chờ Toast thông báo lỗi trùng email...");
      let toastElement = await driver.wait(
        until.elementLocated(By.xpath("//*[contains(text(), 'tồn tại') or contains(text(), 'already exists') or contains(text(), 'Email')]")),
        10000
      );
      const errorText = await toastElement.getText();
      console.log(`📢 Thông báo lỗi thực tế trên UI: "${errorText}"`);

      await takeScreenshot(driver, 'auth_003_email_exists.png');

      // Đếm số user có email này trong DB (phải luôn = 1, không được tăng lên 2)
      const [rows] = await dbConnection.execute('SELECT COUNT(*) as count FROM users WHERE email = ?', [testEmail]);
      console.log(`📊 Số lượng bản ghi trong DB với email ${testEmail}: ${rows[0].count}`);
      if (rows[0].count > 1) {
        throw new Error("DB_VERIFY_FAIL: Có nhiều hơn 1 bản ghi cho cùng một email trùng lặp!");
      }
      console.log("✅ KẾT QUẢ: AUTH_003 ĐẠT (PASS) - Backend chặn trùng email thành công.");

    } catch (error) {
      console.error("❌ KẾT QUẢ: AUTH_003 THẤT BẠI (FAIL)!");
      console.error("Chi tiết lỗi:", error.message);
      await handleTestFailure(driver, 'AUTH_003', error);
    }

    // =========================================================================
    // KỊCH BẢN 4: AUTH_004 - Đăng nhập thành công
    // =========================================================================
    console.log("\n---------------------------------------------------------");
    console.log("📝 TEST CASE AUTH_004: Đăng nhập thành công với tài khoản active");
    console.log("---------------------------------------------------------");
    try {
      // Làm sạch session trước khi chạy test case
      await resetBrowserSession(driver);
      await driver.get(`${BASE_URL}/login`);
      console.log("👉 Đã truy cập trang Đăng nhập.");

      let emailInput = await driver.wait(until.elementLocated(By.id('email')), 15000);
      let passwordInput = await driver.findElement(By.id('password'));
      let submitButton = await driver.findElement(By.xpath("//button[@type='submit']"));

      console.log(`✍️ Nhập Email: '${testEmail}'`);
      await emailInput.sendKeys(testEmail);
      console.log(`✍️ Nhập Mật khẩu đúng: '${testPassword}'`);
      await passwordInput.sendKeys(testPassword);

      await takeScreenshot(driver, 'auth_004_1_fill_login.png');

      console.log("🖱️ Click nút Sign in...");
      await submitButton.click();

      // Chờ chuyển sang trang Dashboard
      console.log("⏳ Chờ hệ thống xác thực và chuyển hướng đến Dashboard...");
      await driver.wait(until.urlContains('/dashboard'), 15000);
      console.log("🎉 Đăng nhập thành công, đã vào Dashboard!");
      await takeScreenshot(driver, 'auth_004_2_dashboard.png');

      console.log("✅ KẾT QUẢ: AUTH_004 ĐẠT (PASS).");

    } catch (error) {
      console.error("❌ KẾT QUẢ: AUTH_004 THẤT BẠI (FAIL)!");
      console.error("Chi tiết lỗi:", error.message);
      await handleTestFailure(driver, 'AUTH_004', error);
    }

    // =========================================================================
    // KỊCH BẢN 5: AUTH_005 - Đăng nhập thất bại do sai mật khẩu
    // =========================================================================
    console.log("\n---------------------------------------------------------");
    console.log("📝 TEST CASE AUTH_005: Đăng nhập thất bại do sai mật khẩu");
    console.log("---------------------------------------------------------");
    try {
      // Làm sạch session đầy đủ trước khi chạy test case
      console.log("🖱️ Đang thực hiện đăng xuất để test đăng nhập lại...");
      await resetBrowserSession(driver);
      await driver.get(`${BASE_URL}/login`);
      console.log("👉 Đã truy cập trang Đăng nhập (đã xóa cookies).");

      let emailInput = await driver.wait(until.elementLocated(By.id('email')), 15000);
      let passwordInput = await driver.findElement(By.id('password'));
      let submitButton = await driver.findElement(By.xpath("//button[@type='submit']"));

      console.log(`✍️ Nhập Email: '${testEmail}'`);
      await emailInput.sendKeys(testEmail);
      console.log("✍️ Nhập Mật khẩu sai: 'WrongPass123!'");
      await passwordInput.sendKeys('WrongPass123!');
      await submitButton.click();

      // Chờ toast lỗi
      console.log("⏳ Chờ thông báo lỗi mật khẩu không hợp lệ...");
      let toastElement = await driver.wait(
        until.elementLocated(By.xpath("//*[contains(text(), 'mật khẩu') or contains(text(), 'Invalid') or contains(text(), 'sai')]")),
        10000
      );
      const errorText = await toastElement.getText();
      console.log(`📢 Thông báo lỗi thực tế trên UI: "${errorText}"`);

      await takeScreenshot(driver, 'auth_005_wrong_password.png');
      console.log("✅ KẾT QUẢ: AUTH_005 ĐẠT (PASS) - Chặn đăng nhập sai pass thành công.");

    } catch (error) {
      console.error("❌ KẾT QUẢ: AUTH_005 THẤT BẠI (FAIL)!");
      console.error("Chi tiết lỗi:", error.message);
      await handleTestFailure(driver, 'AUTH_005', error);
    }

    // =========================================================================
    // KỊCH BẢN 6: AUTH_006 - Đăng nhập thất bại do tài khoản chưa verify OTP
    // =========================================================================
    console.log("\n---------------------------------------------------------");
    console.log("📝 TEST CASE AUTH_006: Đăng nhập thất bại do tài khoản chưa kích hoạt");
    console.log("---------------------------------------------------------");
    try {
      // Làm sạch session trước khi chạy test case
      await resetBrowserSession(driver);
      await navigateToSignup(driver);
      console.log("👉 Đã truy cập trang Đăng ký.");

      let emailInput = await driver.wait(until.elementLocated(By.id('email')), 15000);
      let nameInput = await driver.findElement(By.xpath("//input[@placeholder='Your name']"));
      let passwordInput = await driver.findElement(By.id('password'));
      let confirmPasswordInput = await driver.findElement(By.xpath("//input[@placeholder='••••••••']"));
      let checkbox = await driver.findElement(By.xpath("//input[@type='checkbox']"));
      let submitButton = await driver.findElement(By.xpath("//button[@type='submit']"));

      const unverifiedEmail = `unverified_${Date.now()}@gmail.com`;
      console.log(`✍️ Nhập Email mới: '${unverifiedEmail}'`);
      await nameInput.sendKeys("Unverified Tester");
      await emailInput.sendKeys(unverifiedEmail);
      await passwordInput.sendKeys('Password123!');
      await confirmPasswordInput.sendKeys('Password123!');
      await checkbox.click();
      await submitButton.click();

      // Chờ chuyển hướng sang trang Verify OTP nhưng KHÔNG NHẬP MÃ
      console.log("⏳ Chờ chuyển hướng sang trang OTP...");
      await driver.wait(until.urlContains('/verify-otp'), 10000);
      console.log("⚠️ Bỏ qua bước xác minh OTP, quay lại trang đăng nhập.");
      await takeScreenshot(driver, 'auth_006_1_verify_otp_left.png');

      // Đi tới trang đăng nhập trực tiếp
      await driver.get(`${BASE_URL}/login`);
      
      let loginEmailInput = await driver.wait(until.elementLocated(By.id('email')), 15000);
      let loginPasswordInput = await driver.findElement(By.id('password'));
      let loginSubmitButton = await driver.findElement(By.xpath("//button[@type='submit']"));

      console.log(`✍️ Thử đăng nhập bằng email chưa kích hoạt: '${unverifiedEmail}'`);
      await loginEmailInput.sendKeys(unverifiedEmail);
      await loginPasswordInput.sendKeys('Password123!');
      await loginSubmitButton.click();

      // Chờ xem có báo lỗi "Account not activated" và tự động điều hướng về lại /verify-otp không
      console.log("⏳ Chờ phản hồi và chuyển hướng...");
      await driver.wait(until.urlContains('/verify-otp'), 10000);
      console.log("🎉 Đã tự động điều hướng người dùng quay lại trang OTP!");
      
      // Chờ toast thông báo kích hoạt xuất hiện
      let toastElement = await driver.wait(
        until.elementLocated(By.xpath("//*[contains(text(), 'kích hoạt') or contains(text(), 'activated') or contains(text(), 'OTP') or contains(text(), 'xác thực')]")),
        10000
      );
      const errorText = await toastElement.getText();
      console.log(`📢 Thông báo thực tế trên UI: "${errorText}"`);

      await takeScreenshot(driver, 'auth_006_2_redirected_to_otp.png');

      // Kiểm tra DB xem trạng thái isEmailVerified của user này phải là false (0)
      const [rows] = await dbConnection.execute(
        'SELECT isEmailVerified, isActive FROM users WHERE email = ?',
        [unverifiedEmail]
      );
      const userInDb = rows[0];
      console.log("📊 Thông tin User tìm thấy trong DB:", userInDb);

      if (userInDb.isEmailVerified === 1 || userInDb.isEmailVerified === true) {
        throw new Error("DB_VERIFY_FAIL: Tài khoản chưa verify OTP nhưng DB đã đánh dấu isEmailVerified = true!");
      }
      console.log("✅ KẾT QUẢ: AUTH_006 ĐẠT (PASS) - Chặn đăng nhập tài khoản chưa verify và điều hướng về trang OTP thành công.");

    } catch (error) {
      console.error("❌ KẾT QUẢ: AUTH_006 THẤT BẠI (FAIL)!");
      console.error("Chi tiết lỗi:", error.message);
      await handleTestFailure(driver, 'AUTH_006', error);
    }

  } catch (error) {
    console.error("❌ LỖI HỆ THỐNG TRONG QUÁ TRÌNH CHẠY BỘ TEST:", error.message);
  } finally {
    // Dọn dẹp kết nối
    console.log("\n🧹 Bắt đầu dọn dẹp hạ tầng...");
    
    if (redisClient) {
      console.log("🔌 Đóng kết nối Redis...");
      await redisClient.disconnect();
    }
    
    if (dbConnection) {
      console.log("🔌 Đóng kết nối MySQL...");
      await dbConnection.end();
    }

    if (driver) {
      console.log("🧹 Đang đóng trình duyệt...");
      await driver.quit();
    }
    
    console.log("=========================================================");
    console.log("🏁 BỘ KIỂM THỬ TỰ ĐỘNG THÀNH VIÊN ĐÃ HOÀN TẤT CHẠY 🏁");
    console.log("=========================================================");
  }
}

runAuthSuite();
