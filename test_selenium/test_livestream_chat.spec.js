require('dotenv').config();
const { Builder, By, Key, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

async function runLivestreamChatE2ETest() {
  console.log("=========================================================");
  console.log("🚀 CHẠY AUTOMATED E2E TEST LIVESTREAM CHAT (SELENIUM)...");
  console.log("=========================================================");

  let options = new chrome.Options();
  options.addArguments('--window-size=1280,1024');
  if (process.env.HEADLESS === 'true' || process.env.CI) {
    options.addArguments('--headless=new');
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--disable-gpu');
  }

  let driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  await driver.manage().window().setSize({ width: 1280, height: 1024 });

  try {
    // 1. Đăng nhập
    const loginUrl = 'http://localhost:5173/login';
    console.log(`👉 Bước 1: Đăng nhập tại: ${loginUrl}`);
    await driver.get(loginUrl);

    let emailInput = await driver.wait(until.elementLocated(By.xpath("//input[@type='email']")), 5000);
    let passwordInput = await driver.findElement(By.xpath("//input[@type='password']"));
    let submitButton = await driver.findElement(By.xpath("//button[@type='submit']"));

    const testEmail = process.env.TEST_ACCOUNT_EMAIL || 'test@example.com';
    const testPassword = process.env.TEST_ACCOUNT_PASSWORD || 'dummy_password';

    await emailInput.sendKeys(testEmail);
    await passwordInput.sendKeys(testPassword);
    await submitButton.click();

    console.log("⏳ Chờ đăng nhập thành công và chuyển hướng đến Dashboard...");
    await driver.wait(until.urlContains('/dashboard'), 5000);
    console.log("✅ Đăng nhập thành công!");
    
    // Đảm bảo token được ghi ổn định vào localStorage trước khi load trang mới
    await driver.sleep(1500);

    // 2. Đi đến trang Livestream Chat
    const chatUrl = 'http://localhost:5173/manage/livestream-chat';
    console.log(`👉 Bước 2: Truy cập trang Livestream Chat: ${chatUrl}`);
    await driver.get(chatUrl);

    console.log("🔍 Kiểm tra tiêu đề trang và chọn Livestream...");
    let titleEl = await driver.wait(until.elementLocated(By.xpath("//h1[contains(., 'Livestream Chat Hub')]")), 6000);
    console.log("✅ Trang Livestream Chat Hub đã hiển thị!");

    // 3. Kiểm tra sự tồn tại của select và button copy (sử dụng wait để chờ fetch xong dữ liệu)
    console.log("⏳ Chờ các thành phần điều khiển (Select & Copy OBS button) xuất hiện...");
    let selectEl = await driver.wait(until.elementLocated(By.xpath("//select")), 6000);
    let copyButton = await driver.wait(until.elementLocated(By.xpath("//button[contains(., 'OBS')]")), 6000);

    const isSelectDisplayed = await selectEl.isDisplayed();
    const isCopyButtonDisplayed = await copyButton.isDisplayed();

    if (isSelectDisplayed && isCopyButtonDisplayed) {
      console.log("🎉 KẾT QUẢ: Selenium E2E Test đã thành công rực rỡ! Giao diện livestream chat tải mượt mà!");
    } else {
      throw new Error("Một số thành phần giao diện chưa được hiển thị đầy đủ.");
    }

  } catch (error) {
    console.error("❌ KẾT QUẢ: Kiểm thử E2E thất bại!");
    console.error("Chi tiết lỗi:", error);
    
    // In logs trình duyệt nếu có lỗi
    try {
      let logs = await driver.manage().logs().get('browser');
      console.log("=== BROWSER LOGS ON ERROR ===");
      logs.forEach(log => console.log(`[${log.level.name}] ${log.message}`));
      console.log("=============================");
    } catch (e) {
      console.warn("Không thể lấy logs trình duyệt:", e.message);
    }
  } finally {
    console.log("🧹 Đang đóng trình duyệt...");
    await driver.quit();
    console.log("=========================================================");
  }
}

runLivestreamChatE2ETest();
