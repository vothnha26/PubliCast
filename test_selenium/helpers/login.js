const { Builder, By, until } = require('selenium-webdriver');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

async function loginAs(driver, role) {
  // Navigate to login page
  await driver.get(`${process.env.BASE_URL || 'http://localhost:5173'}/login`);
  const emailEnv = role.toUpperCase() + '_EMAIL';
  const passwordEnv = role.toUpperCase() + '_PASSWORD';
  const email = process.env[emailEnv] || '';
  const password = process.env[passwordEnv] || '';
  if (!email || !password) {
    throw new Error(`Missing credentials for role ${role}. Set ${emailEnv} and ${passwordEnv} in environment.`);
  }
  const { Key } = require('selenium-webdriver');
  
  // Navigate to login page
  await driver.get(`${process.env.BASE_URL || 'http://localhost:5173'}/login`);
  await driver.wait(until.elementLocated(By.id('email')), 15000);
  
  // Fill credentials
  await driver.findElement(By.id('email')).sendKeys(email);
  await driver.sleep(500);
  const passwordInput = await driver.findElement(By.id('password'));
  await passwordInput.sendKeys(password);
  await driver.sleep(500);
  await passwordInput.sendKeys(Key.ENTER);
  
  try {
    // Chờ xem có đăng nhập thành công không
    await driver.wait(async () => {
      const currentUrl = await driver.getCurrentUrl();
      return currentUrl.includes('/dashboard') || currentUrl.includes('/start') || currentUrl.includes('/manage/connections');
    }, 8000);
    console.log(`✅ [loginAs] Đăng nhập thành công bằng tài khoản seed: ${email}`);
  } catch (seedErr) {
    console.log(`⚠️ [loginAs] Không thể đăng nhập bằng tài khoản seed. Tiến hành đăng ký tài khoản test mới...`);
    
    // Đi tới trang đăng ký
    await driver.get(`${process.env.BASE_URL || 'http://localhost:5173'}/signup`);
    
    // Chờ tất cả các input element load đầy đủ trên DOM
    const nameInput = await driver.wait(until.elementLocated(By.xpath("//input[@placeholder='Your name']")), 15000);
    const emailInput = await driver.wait(until.elementLocated(By.id('email')), 15000);
    const passwordInput = await driver.wait(until.elementLocated(By.id('password')), 15000);
    const confirmPasswordInput = await driver.wait(until.elementLocated(By.xpath("//input[@placeholder='••••••••']")), 15000);
    
    const timestamp = Date.now();
    const newEmail = `brandtestadmin${timestamp}@gmail.com`;
    const newPassword = password; // sử dụng cùng mật khẩu nhacc123@
    
    await nameInput.sendKeys('Brand Admin Tester');
    await emailInput.sendKeys(newEmail);
    await passwordInput.sendKeys(newPassword);
    await confirmPasswordInput.sendKeys(newPassword);
    
    const checkbox = await driver.findElement(By.xpath("//input[@type='checkbox']"));
    if (!(await checkbox.isSelected())) {
      await checkbox.click();
    }
    
    await driver.findElement(By.xpath("//button[@type='submit']")).click();
    
    // Đợi chuyển hướng sang verify OTP
    await driver.wait(until.urlContains('/verify-otp'), 15000);
    await driver.sleep(2000); // chờ Redis cập nhật OTP
    
    // Lấy OTP từ Redis sử dụng thư viện redis chuẩn
    let otp = '123456';
    try {
      const { createClient } = require('redis');
      const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`;
      const redisClient = createClient({ url: redisUrl });
      redisClient.on('error', (err) => console.warn('Redis Client Error in login helper', err.message));
      await redisClient.connect();
      const redisKey = `otp:${newEmail}`;
      const cachedOtp = await redisClient.get(redisKey);
      await redisClient.disconnect();
      if (cachedOtp) {
        otp = cachedOtp;
        console.log(`🔑 [loginAs] Lấy thành công OTP từ Redis: ${otp}`);
      } else {
        console.warn(`⚠️ [loginAs] Không tìm thấy mã OTP cho key ${redisKey} trong Redis.`);
      }
    } catch (redisErr) {
      console.error(`❌ [loginAs] Lỗi kết nối Redis để lấy OTP:`, redisErr.message);
    }
    
    // Nhập OTP
    const otpInput = await driver.wait(until.elementLocated(By.xpath("//input[@placeholder='000000']")), 10000);
    await otpInput.sendKeys(otp);
    await driver.findElement(By.xpath("//button[@type='submit']")).click();
    
    // Đợi chuyển hướng sang /start thành công
    await driver.wait(until.urlContains('/start'), 20000);
    console.log(`🎉 [loginAs] Đăng ký và đăng nhập thành công tài khoản: ${newEmail}`);
  }
}

module.exports = { loginAs };
