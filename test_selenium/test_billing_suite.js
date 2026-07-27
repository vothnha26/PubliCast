const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');
const path = require('path');
const { reportBugToJira } = require('./jira_helper');

const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'test_cases', 'pricing', 'screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function handleTestFailure(driver, testCaseName, error, context = {}) {
  const fileName = `${testCaseName.toLowerCase()}_failed_${Date.now()}.png`;
  const filePath = path.join(SCREENSHOT_DIR, fileName);
  try {
    const image = await driver.takeScreenshot();
    fs.writeFileSync(filePath, image, 'base64');
    console.log(`📸 Đã lưu ảnh chụp màn hình lỗi: ${fileName}`);
  } catch (err) {
    console.error(`❌ Không thể chụp ảnh màn hình lỗi:`, err.message);
  }

  // Lấy URL hiện tại của trình duyệt tại thời điểm bị lỗi
  let currentUrl = context.testUrl || 'http://localhost:5173';
  try { currentUrl = await driver.getCurrentUrl(); } catch (_) { }

  await reportBugToJira(
    testCaseName,
    {
      description: context.description || `Kịch bản kiểm thử tự động "${testCaseName}" thất bại trong quá trình chạy Selenium.`,
      stepsToReproduce: context.stepsToReproduce || [
        'Chạy lệnh: node test_billing_suite.js',
        `Selenium tự động thực hiện luồng: ${testCaseName}`,
        'Xem ảnh đính kèm để biết màn hình tại thời điểm lỗi.'
      ],
      expectedResult: context.expectedResult || 'Luồng kiểm thử hoàn thành thành công, không có lỗi.',
      actualResult: context.actualResult || `Lỗi xảy ra: ${error.message}`,
      testUrl: currentUrl,
      browser: 'Google Chrome (Selenium WebDriver - Headless)',
      priority: context.priority || 'High',
      errorStack: error.stack,
    },
    fs.existsSync(filePath) ? filePath : null
  );
}


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

async function runBillingTests() {
  console.log('🚀 Bắt đầu chạy test suite thanh toán (Billing & Payment)...');

  let options = new chrome.Options();
  // Bỏ comment dòng dưới để chạy ẩn (headless) nếu test trên CI/CD
  // options.addArguments('--headless=new');
  options.addArguments('--window-size=1280,800');

  let driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  try {
    // === BƯỚC 1: Đăng nhập ===
    console.log('--- TEST 1: Đăng nhập hệ thống ---');
    await driver.get(`${BASE_URL}/login`);
    await driver.wait(until.elementLocated(By.css('input[type="email"]')), 5000);

    await driver.findElement(By.css('input[type="email"]')).sendKeys('2005hhbao2005@gmail.com');
    await driver.findElement(By.css('input[type="password"]')).sendKeys('123456aA@');
    await driver.findElement(By.css('button[type="submit"]')).click();

    // Chờ vào dashboard
    await driver.wait(until.urlContains('/dashboard'), 10000);
    console.log('✅ Đăng nhập thành công!');

    // === BƯỚC 2: Kiểm tra trang Pricing ===
    console.log('--- TEST 2: Kiểm tra chức năng Pricing & Chu kỳ thanh toán ---');
    await driver.get(`${BASE_URL}/pricing`);

    // Chờ tiêu đề Pricing xuất hiện
    await driver.wait(until.elementLocated(By.xpath('//*[contains(text(), "Choose Your Plan")]')), 10000);
    console.log('✅ Đã tải trang Pricing');

    // Nhấn vào nút Toggle chuyển sang Annual
    // Lấy thẻ div làm công tắc toggle bằng cách tìm thẻ div nằm giữa 2 thẻ span (Monthly và Annual)
    const toggleButton = await driver.findElement(By.xpath('//span[contains(text(), "Monthly")]/following-sibling::div'));
    await toggleButton.click();

    await driver.sleep(1000); // Đợi đổi UI
    await takeScreenshot(driver, 'pricing_annual_selected.png');

    // Kiểm tra xem có text "Save 17%" (có thể tìm partial text)
    const saveBadge = await driver.findElements(By.xpath('//*[contains(text(), "Save 17%")]'));
    if (saveBadge.length === 0) {
      throw new Error('Không tìm thấy badge "Save 17%" khi chuyển sang Annual');
    }
    console.log('✅ Tính năng tính giá gói Annual hoạt động hiển thị đúng');

    // === BƯỚC 3: Mở Payment Modal ===
    console.log('--- TEST 3: Mở QR Thanh Toán ---');
    // Tìm nút "Upgrade to Pro"
    const upgradeProBtn = await driver.findElement(By.xpath('//button[contains(text(), "Upgrade to Agency")]'));

    // Cuộn tới nút đó nếu bị khuất
    await driver.executeScript("arguments[0].scrollIntoView(true);", upgradeProBtn);
    await driver.sleep(500); // Chờ scroll

    await upgradeProBtn.click();

    // Đợi Payment Modal xuất hiện
    await driver.wait(until.elementLocated(By.xpath('//*[contains(text(), "Quét mã để thanh toán")]')), 10000);
    console.log('✅ Modal QR Code đã hiển thị');

    await takeScreenshot(driver, 'payment_modal_opened.png');

    // Kiểm tra xem label chu kỳ (Hằng năm) có xuất hiện trong modal không vì đang chọn Annual
    const cycleLabel = await driver.findElements(By.xpath('//*[contains(text(), "Hằng năm")]'));
    if (cycleLabel.length === 0) {
      throw new Error('Modal thanh toán không hiển thị nhãn "Hằng năm" dù đã chọn thanh toán theo năm. UI đang bị sai!');
    }
    console.log('✅ Nhãn chu kỳ thanh toán hiển thị đúng trong form QR.');

    // === BƯỚC 4: Bắn Webhook giả lập (Chuyển khoản ảo) ===
    console.log('--- TEST 4: Bắn Webhook giả lập để xác nhận thanh toán ---');

    // Lấy mã giao dịch từ màn hình
    const txnCodeElement = await driver.findElement(By.css('.txn-code'));
    const txnCode = await txnCodeElement.getText();
    console.log(`📌 Mã giao dịch trích xuất được: ${txnCode}`);

    // Lấy số tiền từ màn hình (dọn dẹp dấu chấm và chữ VND)
    const amountElement = await driver.findElement(By.css('.amount-highlight'));
    const amountText = await amountElement.getText();
    const amountNumber = parseInt(amountText.replace(/[^\d]/g, ''), 10);
    console.log(`📌 Số tiền cần chuyển: ${amountNumber} VNĐ`);

    // Gửi request POST giả mạo ngân hàng (SePay) tới backend
    console.log('🔌 Đang gọi API webhook...');
    const fetch = (await import('node-fetch')).default || globalThis.fetch;
    const webhookRes = await fetch('http://localhost:8080/api/billing/webhooks/sepay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Token lấy từ .env của backend
        'Authorization': 'Apikey GOYL4N12AY97WBAUUJEZITY7QLCL49DZERCNSX8EMPB0VDVVQQUVAID66SFX5CN8'
      },
      body: JSON.stringify({
        id: Math.floor(Math.random() * 100000),
        gateway: 'MB Bank',
        transactionDate: new Date().toISOString(),
        accountNumber: '0386124388',
        content: txnCode,
        transferAmount: amountNumber,
        referenceCode: `FT${Date.now()}`,
        description: 'Auto Selenium Transfer'
      })
    });

    if (!webhookRes.ok) {
      throw new Error(`Bắn webhook thất bại: ${webhookRes.status} ${await webhookRes.text()}`);
    }
    console.log('✅ Bắn webhook thành công! Đang chờ Frontend tự động cập nhật...');

    // === BƯỚC 5: Kiểm tra màn hình Thành Công ===
    // Đợi màn hình popup đổi sang "Thanh toán thành công" (nút Bắt đầu trải nghiệm / SuccessIcon)
    await driver.wait(until.elementLocated(By.xpath('//*[contains(text(), "Thanh toán thành công")]')), 10000);
    console.log('✅ Giao diện đã tự động chuyển sang Màn hình Thành Công!');

    await takeScreenshot(driver, 'payment_success_screen.png');

    console.log('✅ Toàn bộ luồng test Pricing & Payment End-to-End thành công!');

  } catch (error) {
    console.error('❌ Có lỗi xảy ra trong quá trình kiểm thử:', error.message);
    await handleTestFailure(driver, 'PricingPayment_Flow', error);
  } finally {
    // Đóng trình duyệt sau khi test xong
    await driver.quit();
    console.log('🏁 Hoàn tất bộ test thanh toán.');
  }
}

runBillingTests();
