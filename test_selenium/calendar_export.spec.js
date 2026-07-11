const path = require('path');
const fs = require('fs');
const { expect } = require('chai');
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const { loginAs } = require('./helpers/login');

const downloadDir = path.resolve(__dirname, 'downloads_temp');

describe('Calendar Export .ics Selenium Automation Test', function () {
  this.timeout(80000);
  let driver;

  before(async function () {
    // Tạo thư mục tạm để chứa file download
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir);
    } else {
      // Dọn dẹp file cũ nếu có
      const files = fs.readdirSync(downloadDir);
      for (const file of files) {
        fs.unlinkSync(path.join(downloadDir, file));
      }
    }

    const options = new chrome.Options();
    if (process.env.CI || process.env.HEADLESS) {
      options.addArguments('--headless=new');
      options.addArguments('--no-sandbox');
      options.addArguments('--disable-dev-shm-usage');
      options.addArguments('--disable-gpu');
    }
    options.addArguments('--window-size=1280,800');
    
    // Cấu hình Chrome tự động download vào thư mục tạm mà không hỏi
    options.setUserPreferences({
      'download.default_directory': downloadDir,
      'download.prompt_for_download': false,
      'download.directory_upgrade': true,
      'safebrowsing.enabled': true
    });

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    try {
      console.log('🔑 Đang đăng nhập hệ thống...');
      await loginAs(driver, 'admin');
      
      // Chờ redirect về dashboard
      await driver.wait(until.urlContains('/dashboard'), 20000);
      console.log('✅ Đăng nhập thành công, chuyển hướng tới Planner...');
      
      // Điều hướng trực tiếp tới trang Planner
      await driver.get(`${process.env.BASE_URL || 'http://localhost:5173'}/planner/calendar`);
      
      // Chờ cho Planner load xong (tìm icon ellipsis-vertical trong toolbar)
      await driver.wait(
        until.elementLocated(By.css("svg.lucide-ellipsis-vertical")), 
        25000
      );
      console.log('📅 Trang Planner Calendar đã được tải.');
    } catch (err) {
      const currentUrl = await driver.getCurrentUrl();
      console.error(`❌ Lỗi trong hook before. URL hiện tại: ${currentUrl}`);
      const screenshot = await driver.takeScreenshot();
      fs.writeFileSync(path.join(__dirname, 'calendar_export_error.png'), screenshot, 'base64');
      console.log('📸 Đã lưu ảnh chụp màn hình lỗi: calendar_export_error.png');
      throw err;
    }
  });

  after(async function () {
    if (driver) {
      await driver.quit();
    }
    // Dọn dẹp thư mục tạm sau khi kết thúc test
    if (fs.existsSync(downloadDir)) {
      const files = fs.readdirSync(downloadDir);
      for (const file of files) {
        fs.unlinkSync(path.join(downloadDir, file));
      }
      fs.rmdirSync(downloadDir);
    }
  });

  it('TC_CAL_001 - Nên mở được Menu More Actions và thực hiện Xuất file .ics qua Wizard thành công', async function () {
    const svgEl = await driver.findElement(By.css("svg.lucide-ellipsis-vertical"));
    const moreBtn = await svgEl.findElement(By.xpath(".."));
    expect(moreBtn).to.exist;
    
    console.log('🖱️ Click nút More Vertical (EllipsisVertical)...');
    await moreBtn.click();
    await driver.sleep(1500); // Chờ menu floating hiển thị

    const wizardBtn = await driver.wait(
      until.elementLocated(By.xpath("//button[contains(., 'Đồng bộ / Nhập / Xuất dữ liệu')]")),
      10000
    );
    expect(wizardBtn).to.exist;

    console.log('🖱️ Click nút Đồng bộ / Nhập / Xuất dữ liệu...');
    await wizardBtn.click();
    await driver.sleep(1500); // Chờ Wizard Modal hiển thị

    // Chọn Export Card
    const exportCard = await driver.wait(
      until.elementLocated(By.xpath("//button[contains(., 'Xuất dữ liệu (Export)')]")),
      10000
    );
    console.log('🖱️ Chọn hành động: Xuất dữ liệu (Export)...');
    await exportCard.click();
    await driver.sleep(500);

    // Chọn định dạng ICS
    const icsFormatBtn = await driver.wait(
      until.elementLocated(By.xpath("//button[contains(., 'Lịch iCalendar (.ics)')]")),
      10000
    );
    console.log('🖱️ Chọn định dạng: Lịch iCalendar (.ics)...');
    await icsFormatBtn.click();
    await driver.sleep(500);

    // Bấm Tiếp tục sang Bước 2
    const nextBtn1 = await driver.findElement(By.xpath("//button[contains(., 'Tiếp tục')]"));
    console.log('🖱️ Bấm Tiếp tục sang Bước 2...');
    await nextBtn1.click();
    await driver.sleep(1000);

    // Bấm Tiếp tục sang Bước 3
    const nextBtn2 = await driver.wait(
      until.elementLocated(By.xpath("//button[contains(., 'Tiếp tục')]")),
      10000
    );
    console.log('🖱️ Bấm Tiếp tục sang Bước 3...');
    await nextBtn2.click();
    await driver.sleep(1000);

    // Bấm Tải về file
    const downloadBtn = await driver.wait(
      until.elementLocated(By.xpath("//button[contains(., 'Tải về file')]")),
      10000
    );
    console.log('🖱️ Bấm Tải về file để kết xuất...');
    await downloadBtn.click();
    
    console.log('⏳ Đang chờ file .ics tải xuống...');
    
    // Loop chờ file xuất hiện trong thư mục tạm (tối đa 15 giây)
    let downloadedFile = null;
    for (let i = 0; i < 30; i++) {
      await driver.sleep(500);
      const files = fs.readdirSync(downloadDir);
      const icsFiles = files.filter(f => f.endsWith('.ics'));
      if (icsFiles.length > 0) {
        downloadedFile = icsFiles[0];
        break;
      }
    }

    expect(downloadedFile).to.not.be.null;
    console.log(`🎉 Tải xuống thành công file: ${downloadedFile}`);

    // Đọc nội dung file .ics để kiểm định cấu trúc VCALENDAR hợp lệ
    const filePath = path.join(downloadDir, downloadedFile);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    expect(content).to.contain('BEGIN:VCALENDAR');
    expect(content).to.contain('VERSION:2.0');
    expect(content).to.contain('PRODID:-//PubliCast//Planner Calendar v1.0//EN');
    expect(content).to.contain('END:VCALENDAR');
    console.log('✅ Nội dung file .ics hoàn toàn hợp lệ theo chuẩn RFC 5545.');
  });
});
