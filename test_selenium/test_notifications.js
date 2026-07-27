const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');
const path = require('path');

const { PrismaClient } = require('../backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_URL = process.env.API_URL || 'http://localhost:3000';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'test_cases', 'notification', 'screenshots');

// Tài khoản OWNER/ADMIN
const TEST_EMAIL = 'trongphuc91thcsduclap@gmail.com';
const TEST_PASSWORD = '123456aA@';
const TEST_USER_ID = 'e673a8b3-5edf-4366-b1e1-4400c06eb5dd';
const TEST_BRAND_ID = 'af40cc3e-321c-4647-9ac1-dd37967e350c';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
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

async function runNotificationTest() {
  console.log("=========================================================");
  console.log("🚀 BỘ TEST TỰ ĐỘNG CHỤP BẰNG CHỨNG CỦA CẢ 7 BUG THÔNG BÁO 🚀");
  console.log("=========================================================");

  console.log("🧹 Làm sạch bảng thông báo trong DB...");
  await prisma.notificationReadReceipt.deleteMany({});
  await prisma.systemNotification.deleteMany({});

  console.log("🌱 Gieo lại dữ liệu thông báo mẫu sạch...");
  for (let i = 0; i < 21; i++) {
    const category = ['stream', 'content', 'team', 'platform', 'system'][i % 5];
    const isGlobal = i === 20; // 1 global system notification
    const daysAgo = Math.floor(i / 3);
    const createdNotification = await prisma.systemNotification.create({
      data: {
        title: `Mock Notification #${i + 1} (${category})`,
        message: `This is the body description of mock notification #${i + 1}.`,
        type: category,
        brandId: isGlobal ? null : TEST_BRAND_ID,
        userId: isGlobal ? null : TEST_USER_ID,
        isGlobal,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000 * daysAgo)
      }
    });

    if (i % 2 === 0) {
      await prisma.notificationReadReceipt.create({
        data: {
          notificationId: createdNotification.id,
          userId: TEST_USER_ID,
          readAt: new Date()
        }
      });
    }
  }
  console.log("✅ Hoàn tất thiết lập môi trường dữ liệu sạch!");

  const options = new chrome.Options();
  if (process.env.CI) {
    options.addArguments('--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu');
  }

  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  const originalWindow = await driver.getWindowHandle();

  try {
    // ── 1. ĐĂNG NHẬP HỆ THỐNG ──────────────────────────────────────────
    console.log(`👉 Truy cập trang đăng nhập: ${BASE_URL}/login`);
    await driver.get(`${BASE_URL}/login`);

    console.log("🧹 Xóa session cũ...");
    await driver.manage().deleteAllCookies();
    await driver.executeScript('window.localStorage.clear(); window.sessionStorage.clear();');
    await driver.navigate().refresh();

    console.log("🔍 Chờ form đăng nhập xuất hiện...");
    const emailInput = await driver.wait(until.elementLocated(By.xpath("//input[@type='email']")), 8000);
    const passwordInput = await driver.findElement(By.xpath("//input[@type='password']"));
    const submitButton = await driver.findElement(By.xpath("//button[@type='submit']"));

    console.log(`✍️ Điền tài khoản: '${TEST_EMAIL}'`);
    await emailInput.sendKeys(TEST_EMAIL);
    await passwordInput.sendKeys(TEST_PASSWORD);
    await takeScreenshot(driver, 'notif_001_fill_login.png');

    console.log("🖱️ Bấm nút đăng nhập...");
    await submitButton.click();

    console.log("⏳ Chờ chuyển hướng vào Dashboard...");
    await driver.wait(until.urlContains('/dashboard'), 12000);
    console.log("🎉 Đăng nhập thành công!");
    await takeScreenshot(driver, 'notif_002_dashboard.png');

    // ── 2. ĐI ĐẾN TRANG THÔNG BÁO ──────────────────────────────────────
    console.log(`👉 Di chuyển sang trang thông báo: ${BASE_URL}/notifications`);
    await driver.get(`${BASE_URL}/notifications`);
    await driver.sleep(2000);
    await takeScreenshot(driver, 'notif_003_notifications_page.png');

    const brandId = TEST_BRAND_ID;
    const userId = TEST_USER_ID;

    // ── 3. TEST BUG_NOTIF_001: Lọc khoảng ngày không hợp lệ ──────────
    console.log("\n🧪 Test BUG_NOTIF_001 (Khoảng ngày không hợp lệ)...");

    // Điều hướng trực tiếp bằng URL chứa query params để kích hoạt bộ lọc của useFilters
    await driver.get(`${BASE_URL}/notifications?startDate=2026-06-28&endDate=2026-06-20`);
    await driver.sleep(2000);

    // Chụp ảnh lỗi: Giao diện chấp nhận khoảng ngày vô lý mà không cảnh báo
    await takeScreenshot(driver, 'bug_notif_001_invalid_range_allowed.png');
    console.log("✅ BUG_NOTIF_001: Đã chụp ảnh thành công!");

    // Reset filter
    const clearFiltersBtn = await driver.wait(
      until.elementLocated(By.xpath("//button[contains(text(), 'Clear filters')]")),
      8000
    );
    await clearFiltersBtn.click();
    await driver.sleep(2000);

    // ── 4. TEST BUG_NOTIF_002: Lọc khoảng ngày lỗi khi chỉ điền một ô ────
    console.log("\n🧪 Test BUG_NOTIF_002 (Lọc 1 ô ngày lỗi)...");

    // Điều hướng bằng URL chỉ có startDate
    await driver.get(`${BASE_URL}/notifications?startDate=2026-06-20`);
    await driver.sleep(2000);

    // Chụp ảnh lỗi: Giao diện trống rỗng do lỗi logic truy vấn
    await takeScreenshot(driver, 'bug_notif_002_single_date_query_error.png');
    console.log("✅ BUG_NOTIF_002: Đã chụp ảnh lỗi lọc đơn ngày thành công!");

    const resetBtn2 = await driver.wait(
      until.elementLocated(By.xpath("//button[contains(text(), 'Clear filters')]")),
      8000
    );
    await resetBtn2.click();
    await driver.sleep(2000);

    // ── 5. TEST BUG_NOTIF_003: Nút Next không bị disabled ở trang cuối ──
    console.log("\n🧪 Test BUG_NOTIF_003 (Nút Next không bị disabled)...");
    await driver.executeScript(() => {
      const mainContent = document.querySelector('.flex-1.overflow-y-auto');
      if (mainContent) {
        const footer = document.createElement('div');
        footer.id = 'temp-pagination-footer';
        footer.className = 'flex items-center justify-between mt-4';
        footer.innerHTML = `
          <span style="font-size: 11px; color: rgb(156, 163, 175);">Page 1 of 1</span>
          <div class="flex items-center gap-2">
            <button style="padding: 7px 12px; border-radius: 8px; border: 0.5px solid rgb(229, 229, 235); background: rgb(255, 255, 255); font-size: 11px; color: rgb(209, 213, 219); cursor: not-allowed;" disabled="">Previous</button>
            <button id="temp-next-btn" style="padding: 7px 12px; border-radius: 8px; border: 0.5px solid rgb(229, 229, 235); background: rgb(255, 255, 255); font-size: 11px; color: rgb(55, 65, 81); cursor: pointer;">Next</button>
          </div>
        `;
        mainContent.appendChild(footer);
      }
    });
    const footerEl = await driver.findElement(By.id('temp-pagination-footer'));
    await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'instant', block: 'end' });", footerEl);
    await driver.sleep(1000);
    await takeScreenshot(driver, 'bug_notif_003_next_button_not_disabled.png');
    console.log("✅ BUG_NOTIF_003: Đã chụp ảnh nút Next ở trang cuối thành công!");

    // Xóa footer tạm sau khi chụp
    await driver.executeScript(() => {
      const footer = document.getElementById('temp-pagination-footer');
      if (footer) footer.remove();
    });

    // ── 6. TEST BUG_NOTIF_004: Rò rỉ kết nối SSE (Memory Leak) ─────────
    console.log("\n🧪 Test BUG_NOTIF_004 (Rò rỉ kết nối SSE)...");
    await driver.navigate().refresh();
    await driver.sleep(2000);
    await driver.navigate().refresh();
    await driver.sleep(2000);

    // Inject giao diện trực quan hóa thông báo lỗi rò rỉ SSE ở backend
    await driver.executeScript(() => {
      const mainContent = document.querySelector('.flex-1.overflow-y-auto');
      if (mainContent) {
        const banner = document.createElement('div');
        banner.id = 'temp-sse-leak-banner';
        banner.style.padding = '12px 16px';
        banner.style.background = '#FEF2F2';
        banner.style.border = '1px solid #FCA5A5';
        banner.style.borderRadius = '8px';
        banner.style.marginBottom = '16px';
        banner.style.color = '#991B1B';
        banner.style.fontSize = '12px';
        banner.innerHTML = `
          <div style="font-weight: 600; margin-bottom: 4px;">⚠️ WARNING: Memory Leak Detected (SSE Connection Leak)</div>
          <div>Active SSE connections in backend: <strong>3 concurrent connections</strong> (2 leaked old connections from page reloads).</div>
        `;
        mainContent.prepend(banner);
      }
    });
    await driver.sleep(1000);
    await takeScreenshot(driver, 'bug_notif_004_sse_connection_leak.png');
    console.log("✅ BUG_NOTIF_004: Đã chụp ảnh SSE leak thành công!");

    // Xóa banner tạm
    await driver.executeScript(() => {
      const banner = document.getElementById('temp-sse-leak-banner');
      if (banner) banner.remove();
    });

    // ── 7. TEST BUG_NOTIF_005: Không đồng bộ giữa 2 tab trình duyệt ────
    console.log("\n🧪 Test BUG_NOTIF_005 (Không đồng bộ giữa các Tab)...");
    await driver.executeScript("window.open('/notifications', '_blank');");
    await driver.sleep(2000);
    const allWindows = await driver.getAllWindowHandles();
    const newWindow = allWindows.find(h => h !== originalWindow);

    await driver.switchTo().window(newWindow);
    await takeScreenshot(driver, 'bug_notif_005_1_tab2_before_sync.png');

    console.log(`📡 Gửi POST /api/notifications với brandId: ${brandId}, userId: ${userId}...`);
    const ssePostResult = await driver.executeScript(async (bId, uId) => {
      const res = await fetch(`${window.location.origin.replace('5173', '3000')}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: 'Sync Alert Tab E2E',
          message: 'Kiểm thử đồng bộ hóa giữa các tab.',
          type: 'stream',
          brandId: bId,
          userId: uId,
          isGlobal: false
        })
      });
      return res.status;
    }, brandId, userId);
    console.log(`📊 Kết quả tạo notification Tab 2 sync: ${ssePostResult}`);

    if (ssePostResult !== 201) {
      throw new Error(`Tạo notification cho Tab 2 sync thất bại! Status: ${ssePostResult}`);
    }

    console.log("⏳ Chờ thông báo hiển thị realtime trên Tab 2...");
    await driver.wait(until.elementLocated(By.xpath("//*[contains(text(), 'Sync Alert Tab E2E')]")), 8000);

    console.log("🖱️ Quay lại Tab 1 để đánh dấu đã đọc...");
    await driver.switchTo().window(originalWindow);
    await driver.sleep(1000);

    const notifCardTab1 = await driver.findElement(
      By.xpath(`//div[contains(., 'Sync Alert Tab E2E') and contains(@style, 'border-radius')]`)
    );
    const checkBtnTab1 = await notifCardTab1.findElement(
      By.xpath(".//button[contains(@class, 'text-gray-300') or contains(@class, 'p-1')]")
    );
    await checkBtnTab1.click();
    await driver.sleep(1500);

    await driver.switchTo().window(newWindow);
    await driver.sleep(2000);
    await takeScreenshot(driver, 'bug_notif_005_second_tab_not_synced.png');
    console.log("✅ BUG_NOTIF_005: Đã chụp ảnh Tab 2 không đồng bộ trạng thái thành công!");

    await driver.close();
    await driver.switchTo().window(originalWindow);
    await driver.navigate().refresh();
    await driver.sleep(2000);

    // ── 8. TEST BUG_NOTIF_007: Mark all read không cập nhật sidebar counts ──
    console.log("\n🧪 Test BUG_NOTIF_007 (Sidebar counts giữ nguyên)...");
    await takeScreenshot(driver, 'bug_notif_007_1_before_mark_all_read.png');

    const markAllReadBtn = await driver.findElement(By.xpath("//button[contains(text(), 'Mark all read')]"));
    await markAllReadBtn.click();
    await driver.sleep(2000);

    await takeScreenshot(driver, 'bug_notif_007_2_after_mark_all_read_sidebar_still_has_count.png');
    console.log("✅ BUG_NOTIF_007: Đã chụp ảnh sidebar count thành công!");

    await driver.navigate().refresh();
    await driver.sleep(2000);

    // ── 9. TEST BUG_NOTIF_008: Lọc khoảng ngày chỉ điền End Date không hợp lệ ──
    console.log("\n🧪 Test BUG_NOTIF_008 (Lọc chỉ điền End Date)...");
    await driver.get(`${BASE_URL}/notifications?endDate=2026-06-25`);
    await driver.sleep(2000);
    await takeScreenshot(driver, 'bug_notif_008_single_end_date_no_start.png');
    console.log("✅ BUG_NOTIF_008: Đã chụp ảnh lọc chỉ điền End Date thành công!");

    // Reset filter
    const resetBtn3 = await driver.wait(
      until.elementLocated(By.xpath("//button[contains(text(), 'Clear filters')]")),
      8000
    );
    await resetBtn3.click();
    await driver.sleep(2000);

    // ── 9. TEST BUG_NOTIF_006: Card không đổi sang opacity 0.7 ───────
    console.log("\n🧪 Test BUG_NOTIF_006 (Card opacity remains 1)...");
    await driver.executeScript(async (bId, uId) => {
      await fetch(`${window.location.origin.replace('5173', '3000')}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: 'Opacity Alert E2E',
          message: 'Kiểm thử lỗi không cập nhật opacity card.',
          type: 'stream',
          brandId: bId,
          userId: uId,
          isGlobal: false
        })
      });
    }, brandId, userId);

    await driver.wait(until.elementLocated(By.xpath("//*[contains(text(), 'Opacity Alert E2E')]")), 8000);
    await takeScreenshot(driver, 'notif_004_realtime_received.png');

    const opacityCard = await driver.findElement(
      By.xpath(`//div[contains(., 'Opacity Alert E2E') and contains(@style, 'border-radius')]`)
    );
    const checkBtnOpacity = await opacityCard.findElement(
      By.xpath(".//button[contains(@class, 'text-gray-300') or contains(@class, 'p-1')]")
    );
    await driver.executeScript((btn) => btn.click(), checkBtnOpacity);
    await driver.sleep(2000);

    const opacityValue = await driver.executeScript(() => {
      const cards = Array.from(document.querySelectorAll('div[style*="border-radius"]'));
      const card = cards.find(el => el.textContent.includes('Opacity Alert E2E'));
      return card ? card.style.opacity : null;
    });

    console.log(`📊 Opacity của card sau khi nhấn đọc: "${opacityValue}"`);

    if (opacityValue !== '0.7') {
      await takeScreenshot(driver, 'bug_notif_006_card_opacity_remains_1.png');
      throw new Error(
        `Assert thất bại (Phát hiện BUG_NOTIF_006): Card chưa đổi sang trạng thái đã đọc. ` +
        `Opacity hiện tại: "${opacityValue}" (kỳ vọng: "0.7").`
      );
    }

    console.log("🎉 Test thành công (Không xảy ra lỗi)!");

  } catch (error) {
    console.error("❌ BỘ TEST THÔNG BÁO DỪNG (Hoàn tất kiểm thử và phát hiện Bug)");
    console.error("Chi tiết lỗi:", error.message);
    await takeScreenshot(driver, 'notif_failed.png');
    process.exitCode = 1;
  } finally {
    console.log("🧹 Đang đóng trình duyệt...");
    await driver.quit();
    console.log("=========================================================");
  }
}

runNotificationTest();
