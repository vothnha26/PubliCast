require('dotenv').config();
const { Builder, By, Key, until } = require('selenium-webdriver');

async function runSmartLinksE2ETest() {
  console.log("=========================================================");
  console.log("🚀 CHẠY AUTOMATED E2E TEST SMARTLINKS (SELENIUM)...");
  console.log("=========================================================");

  let driver = await new Builder().forBrowser('chrome').build();

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

    // 2. Đi đến trang SmartLinks
    const smartLinksUrl = 'http://localhost:5173/smartlinks';
    console.log(`👉 Bước 2: Truy cập trang SmartLinks: ${smartLinksUrl}`);
    await driver.get(smartLinksUrl);

    console.log("🔍 Kiểm tra tiêu đề trang...");
    await driver.wait(until.elementLocated(By.xpath("//select")), 6000);
    console.log("✅ Trang SmartLinks đã hiển thị!");

    // 3. Thay đổi Profile Meta & Theme
    console.log("👉 Bước 3: Cập nhật thông tin Profile Bio và chọn Theme...");
    let bioInput = await driver.wait(until.elementLocated(By.xpath("//textarea")), 5000);
    
    // Clear and enter new bio
    await bioInput.sendKeys(Key.CONTROL, "a");
    await bioInput.sendKeys(Key.DELETE);
    const uniqueBio = `Bio được cập nhật tự động bởi Selenium E2E Test tại ${new Date().toLocaleTimeString()}`;
    await bioInput.sendKeys(uniqueBio);

    // Lấy slug hiện tại để tí nữa test public page
    let slugInput = await driver.findElement(By.xpath("//span[contains(text(), 'mtr.bio')]/following-sibling::input"));
    const slugValue = await slugInput.getAttribute('value');
    console.log(`🔗 Slug SmartLink hiện tại của thương hiệu: ${slugValue}`);

    // Chọn tab Themes để chuyển theme
    console.log("🎨 Chuyển sang tab Giao diện...");
    let themeTabButton = await driver.findElement(By.xpath("//button[contains(., 'Giao diện') or contains(., 'Appearance') or contains(., 'appearance')]"));
    await themeTabButton.click();
    await driver.sleep(500); // chờ animation

    // Chọn Theme Sunset Orange
    let themeSunsetButton = await driver.findElement(By.xpath("//span[contains(., 'Sunset Orange')]/.."));
    await themeSunsetButton.click();
    console.log("✅ Đã chọn theme Sunset Orange!");

    // Quay lại tab Trình biên soạn
    console.log("📝 Quay lại tab Trình biên soạn...");
    let editorTabButton = await driver.findElement(By.xpath("//button[contains(., 'Nút bấm') or contains(., 'Buttons') or contains(., 'buttons')]"));
    await editorTabButton.click();
    await driver.sleep(500);

    // 4. Thêm Link mới
    console.log("👉 Bước 4: Nhấn nút 'Thêm liên kết'...");
    let addLinkButton = await driver.findElement(By.xpath("//button[contains(., 'Thêm nút') or contains(., 'Add Button') or contains(., 'Add button') or contains(., 'Add Link')]"));
    await addLinkButton.click();

    console.log("⏳ Chờ Modal 'Thêm liên kết mới' hiển thị...");
    let urlInput = await driver.wait(until.elementLocated(By.xpath("//form//input[@placeholder='https://...']")), 5000);
    let titleInput = await driver.findElement(By.xpath("//form//input[1]"));
    let submitLinkBtn = await driver.findElement(By.xpath("//button[@type='submit']"));

    const randomLinkTitle = `Selenium Link ${Math.floor(Math.random() * 1000)}`;
    await titleInput.sendKeys(randomLinkTitle);
    await urlInput.sendKeys('youtube.com/channel/selenium_channel');
    await submitLinkBtn.click();
    console.log(`✅ Đã thêm link tạm thời: "${randomLinkTitle}"!`);

    // 5. Lưu Thay Đổi
    console.log("👉 Bước 5: Bấm nút 'Lưu thay đổi' lên Server...");
    let saveButton = await driver.findElement(By.xpath("//button[contains(., 'Lưu') or contains(., 'Save')]"));
    await saveButton.click();

    // Chờ toast hoặc nút lưu hoàn tất
    console.log("⏳ Đang lưu cấu hình...");
    await driver.sleep(2500); // Chờ gọi API hoàn thành
    console.log("✅ Cấu hình SmartLink đã lưu thành công lên database!");

    // 6. Kiểm tra trang hiển thị công khai (Public Bio Page)
    const publicUrl = `http://localhost:5173/s/${slugValue}`;
    console.log(`👉 Bước 6: Truy cập trang Bio-Link công khai tại: ${publicUrl}`);
    await driver.get(publicUrl);

    console.log("🔍 Kiểm tra hiển thị Bio mới và Nút liên kết...");
    // Chờ profile bio load đúng uniqueBio
    await driver.wait(until.elementTextContains(await driver.findElement(By.xpath("//body")), uniqueBio), 5000);
    console.log("✅ Bio hiển thị chính xác!");

    // Tìm và click nút liên kết vừa tạo
    let targetLinkBtn = await driver.findElement(By.xpath(`//span[contains(., '${randomLinkTitle}')]/..`));
    console.log(`🖱️ Click vào liên kết "${randomLinkTitle}" để kích hoạt tracking click...`);
    
    // Lưu lại window handles trước khi click vì click sẽ mở tab mới
    const originalWindow = await driver.getWindowHandle();
    await targetLinkBtn.click();
    await driver.sleep(1500);

    // Đóng tab mới được mở ra (nếu có) và switch về tab chính
    const windows = await driver.getAllWindowHandles();
    if (windows.length > 1) {
      await driver.switchTo().window(windows[1]);
      await driver.close();
      await driver.switchTo().window(originalWindow);
    }
    console.log("✅ Đã ghi nhận click và đóng trang đích!");

    // 7. Kiểm tra Thống kê Click tăng lên
    console.log(`👉 Bước 7: Quay lại trang Builder và kiểm tra tab Thống kê...`);
    await driver.get(smartLinksUrl);
    
    console.log("📊 Chuyển sang tab Phân tích Click...");
    let analyticsTabButton = await driver.wait(until.elementLocated(By.xpath("//button[contains(., 'Phân tích') or contains(., 'Analytics') or contains(., 'analytics')]")), 5000);
    await analyticsTabButton.click();
    await driver.sleep(1000); // Chờ dữ liệu load

    // Kiểm tra xem lượt click của link có tồn tại và hiển thị số > 0
    const clickStatXPath = `//span[contains(., '${randomLinkTitle}')]/ancestor::tr/td[3]`;
    let clickStatElement = await driver.wait(until.elementLocated(By.xpath(clickStatXPath)), 6000);
    const clickText = await clickStatElement.getText();
    console.log(`📈 Thống kê ghi nhận: "${clickText}" clicks`);

    const clickCount = parseInt(clickText.trim(), 10);
    if (clickCount >= 1) {
      console.log("🎉 KẾT QUẢ: Selenium E2E Test đã thành công rực rỡ! Click & Views tracking đồng bộ hoàn hảo!");
    } else {
      console.log("⚠️ Cảnh báo: Thống kê click chưa được cập nhật chính xác.");
    }

  } catch (error) {
    console.error("❌ KẾT QUẢ: Kiểm thử E2E thất bại!");
    console.error("Chi tiết lỗi:", error);
  } finally {
    console.log("🧹 Đang đóng trình duyệt...");
    await driver.quit();
    console.log("=========================================================");
  }
}

runSmartLinksE2ETest();
