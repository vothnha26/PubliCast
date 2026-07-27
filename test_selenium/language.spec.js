const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

const { expect } = require('chai');
const { Builder, By, until } = require('selenium-webdriver');
const { loginAs } = require('./helpers/login');
const chrome = require('selenium-webdriver/chrome');

describe('Multi-Language Localization i18n Verification Suite', function () {
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
    options.addArguments('--window-size=1280,800');

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    console.log('🔑 Đang đăng nhập hệ thống...');
    await loginAs(driver, 'admin');
    
    // Đợi vào trang Dashboard hoặc trang chính
    await driver.wait(async () => {
      const currentUrl = await driver.getCurrentUrl();
      return currentUrl.includes('/dashboard') || currentUrl.includes('/start') || currentUrl.includes('/manage/connections');
    }, 15000);
    console.log('✅ Đã đăng nhập thành công.');
  });

  after(async function () {
    if (driver) {
      await driver.quit();
    }
  });

  it('TC01 - Thiết lập ngôn ngữ sang English trên trang Settings', async function () {
    console.log('🔗 Di chuyển đến trang cài đặt tài khoản...');
    await driver.get(`${BASE_URL}/settings?tab=account`);
    await driver.sleep(2000);

    // Chờ button English xuất hiện
    console.log('🖱️ Đang click chọn ngôn ngữ English...');
    const englishBtn = await driver.wait(
      until.elementLocated(By.xpath("//button[contains(., 'English')]")),
      15000
    );
    await englishBtn.click();
    await driver.sleep(1500); // Chờ i18n apply thay đổi

    // 1. Xác minh thẻ <html> có lang="en"
    const htmlEl = await driver.findElement(By.tagName('html'));
    const htmlLang = await htmlEl.getAttribute('lang');
    console.log(`Verify html lang attribute: "${htmlLang}"`);
    expect(htmlLang).to.equal('en');

    // 2. Xác minh localStorage đã lưu language = 'en'
    const savedLang = await driver.executeScript(
      "return localStorage.getItem('publicast-language')"
    );
    expect(savedLang).to.equal('en');
  });

  it('TC02 - Xác minh giao diện trang Notifications hiển thị bằng tiếng Anh', async function () {
    console.log('🔗 Di chuyển đến trang Notifications...');
    await driver.get(`${BASE_URL}/notifications`);
    await driver.sleep(2000);

    // Xác minh tiêu đề "Notifications" hiển thị
    const titleEl = await driver.wait(
      until.elementLocated(By.xpath("//h1[contains(text(), 'Notifications')]")),
      15000
    );
    expect(titleEl).to.exist;

    // Xác minh nút "Unread" hiển thị bằng tiếng Anh
    const unreadBtn = await driver.findElement(By.xpath("//button[contains(., 'Unread')]"));
    expect(unreadBtn).to.exist;

    // Xác minh nút "Mark all as read" hiển thị bằng tiếng Anh
    const markAllReadBtn = await driver.findElement(By.xpath("//button[contains(., 'Mark all as read')]"));
    expect(markAllReadBtn).to.exist;
  });

  it('TC03 - Xác minh giao diện trang Media Library hiển thị bằng tiếng Anh', async function () {
    console.log('🔗 Di chuyển đến trang Media Library...');
    await driver.get(`${BASE_URL}/media-library`);
    await driver.sleep(2000);

    // Xác minh nút "Upload Files" hiển thị bằng tiếng Anh
    const uploadFilesBtn = await driver.wait(
      until.elementLocated(By.xpath("//button[contains(., 'Upload Files')]")),
      15000
    );
    expect(uploadFilesBtn).to.exist;

    // Xác minh nút "New Folder" hiển thị bằng tiếng Anh
    const newFolderBtn = await driver.findElement(By.xpath("//button[contains(., 'New Folder')]"));
    expect(newFolderBtn).to.exist;

    // Xác minh placeholder tìm kiếm bằng tiếng Anh "Search media..."
    const searchInput = await driver.findElement(By.xpath("//input[@placeholder='Search media...']"));
    expect(searchInput).to.exist;
  });

  it('TC07 - Xác minh giao diện trang Planner hiển thị bằng tiếng Anh', async function () {
    console.log('🔗 Di chuyển đến trang Planner (Tiếng Anh)...');
    await driver.get(`${BASE_URL}/planner`);
    await driver.sleep(2000);

    // Xác minh các tab hiển thị tiếng Anh
    const calendarTab = await driver.wait(
      until.elementLocated(By.xpath("//a[contains(., 'Calendar')]")),
      15000
    );
    expect(calendarTab).to.exist;

    const listTab = await driver.findElement(By.xpath("//a[contains(., 'List')]"));
    expect(listTab).to.exist;

    const libraryTab = await driver.findElement(By.xpath("//a[contains(., 'Posts library')]"));
    expect(libraryTab).to.exist;

    const autolistsTab = await driver.findElement(By.xpath("//a[contains(., 'Autolists')]"));
    expect(autolistsTab).to.exist;

    const historyTab = await driver.findElement(By.xpath("//a[contains(., 'Deleted posts')]"));
    expect(historyTab).to.exist;

    // Xác minh UpgradeBanner hiển thị bằng tiếng Anh
    const upgradeTitle = await driver.findElement(By.xpath("//h3[contains(text(), 'Do you need a higher plan?')]"));
    expect(upgradeTitle).to.exist;

    const upgradeBtn = await driver.findElement(By.xpath("//button[contains(., 'Upgrade your plan')]"));
    expect(upgradeBtn).to.exist;
  });

  it('TC04 - Thiết lập ngôn ngữ sang Tiếng Việt trên trang Settings', async function () {
    console.log('🔗 Di chuyển đến trang cài đặt tài khoản để đổi sang Tiếng Việt...');
    await driver.get(`${BASE_URL}/settings?tab=account`);
    await driver.sleep(2000);

    // Chờ button Tiếng Việt xuất hiện
    console.log('🖱️ Đang click chọn ngôn ngữ Tiếng Việt...');
    const viBtn = await driver.wait(
      until.elementLocated(By.xpath("//button[contains(., 'Tiếng Việt')]")),
      15000
    );
    await viBtn.click();
    await driver.sleep(1500); // Chờ i18n apply thay đổi

    // 1. Xác minh thẻ <html> có lang="vi"
    const htmlEl = await driver.findElement(By.tagName('html'));
    const htmlLang = await htmlEl.getAttribute('lang');
    console.log(`Verify html lang attribute: "${htmlLang}"`);
    expect(htmlLang).to.equal('vi');

    // 2. Xác minh localStorage đã lưu language = 'vi'
    const savedLang = await driver.executeScript(
      "return localStorage.getItem('publicast-language')"
    );
    expect(savedLang).to.equal('vi');
  });

  it('TC05 - Xác minh giao diện trang Notifications hiển thị bằng tiếng Việt', async function () {
    console.log('🔗 Di chuyển đến trang Notifications...');
    await driver.get(`${BASE_URL}/notifications`);
    await driver.sleep(2000);

    // Xác minh tiêu đề "Thông báo" hiển thị
    const titleEl = await driver.wait(
      until.elementLocated(By.xpath("//h1[contains(text(), 'Thông báo')]")),
      15000
    );
    expect(titleEl).to.exist;

    // Xác minh nút "Chưa đọc" hiển thị bằng tiếng Việt
    const unreadBtn = await driver.findElement(By.xpath("//button[contains(., 'Chưa đọc')]"));
    expect(unreadBtn).to.exist;

    // Xác minh nút "Đánh dấu đã đọc tất cả" hiển thị bằng tiếng Việt
    const markAllReadBtn = await driver.findElement(By.xpath("//button[contains(., 'Đánh dấu đã đọc tất cả')]"));
    expect(markAllReadBtn).to.exist;
  });

  it('TC06 - Xác minh giao diện trang Media Library hiển thị bằng tiếng Việt', async function () {
    console.log('🔗 Di chuyển đến trang Media Library...');
    await driver.get(`${BASE_URL}/media-library`);
    await driver.sleep(2000);

    // Xác minh nút "Tải lên tệp" hiển thị bằng tiếng Việt
    const uploadFilesBtn = await driver.wait(
      until.elementLocated(By.xpath("//button[contains(., 'Tải lên tệp')]")),
      15000
    );
    expect(uploadFilesBtn).to.exist;

    // Xác minh nút "Thư mục mới" hiển thị bằng tiếng Việt
    const newFolderBtn = await driver.findElement(By.xpath("//button[contains(., 'Thư mục mới')]"));
    expect(newFolderBtn).to.exist;

    // Xác minh placeholder tìm kiếm bằng tiếng Việt "Tìm kiếm media..."
    const searchInput = await driver.findElement(By.xpath("//input[@placeholder='Tìm kiếm media...']"));
    expect(searchInput).to.exist;
  });

  it('TC08 - Xác minh giao diện trang Planner hiển thị bằng tiếng Việt', async function () {
    console.log('🔗 Di chuyển đến trang Planner (Tiếng Việt)...');
    await driver.get(`${BASE_URL}/planner`);
    await driver.sleep(2000);

    // Xác minh các tab hiển thị tiếng Việt
    const calendarTab = await driver.wait(
      until.elementLocated(By.xpath("//a[contains(., 'Lịch')]")),
      15000
    );
    expect(calendarTab).to.exist;

    const listTab = await driver.findElement(By.xpath("//a[contains(., 'Danh sách')]"));
    expect(listTab).to.exist;

    const libraryTab = await driver.findElement(By.xpath("//a[contains(., 'Thư viện bài viết')]"));
    expect(libraryTab).to.exist;

    const autolistsTab = await driver.findElement(By.xpath("//a[contains(., 'Hàng đợi tự động')]"));
    expect(autolistsTab).to.exist;

    const historyTab = await driver.findElement(By.xpath("//a[contains(., 'Bài viết đã xóa')]"));
    expect(historyTab).to.exist;

    // Xác minh UpgradeBanner hiển thị bằng tiếng Việt
    const upgradeTitle = await driver.findElement(By.xpath("//h3[contains(text(), 'Bạn cần gói cao hơn?')]"));
    expect(upgradeTitle).to.exist;

    const upgradeBtn = await driver.findElement(By.xpath("//button[contains(., 'Nâng cấp gói cước')]"));
    expect(upgradeBtn).to.exist;
  });
});
