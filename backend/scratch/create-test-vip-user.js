const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'vip_test_user@gmail.com';
  const rawPassword = 'VipPassword123!';
  const passwordHash = bcrypt.hashSync(rawPassword, 10);

  console.log(`🧹 Đang kiểm tra và dọn dẹp dữ liệu cũ cho email: ${email}...`);

  // Xóa user cũ nếu tồn tại
  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: { brands: true }
  });

  if (existingUser) {
    // Xóa các brand và subscription liên quan
    for (const brand of existingUser.brands) {
      await prisma.brand.delete({ where: { id: brand.id } }).catch(() => {});
      await prisma.subscription.delete({ where: { id: brand.subscriptionId } }).catch(() => {});
    }
    await prisma.user.delete({ where: { id: existingUser.id } }).catch(() => {});
    console.log('✅ Đã xóa user cũ.');
  }

  console.log('🔎 Đang tìm Plan AGENCY...');
  const agencyPlan = await prisma.plan.findFirst({
    where: { name: 'AGENCY' }
  });

  if (!agencyPlan) {
    console.error('❌ Không tìm thấy gói AGENCY trong cơ sở dữ liệu. Vui lòng seed dữ liệu trước!');
    process.exit(1);
  }
  console.log(`✅ Tìm thấy Plan AGENCY (ID: ${agencyPlan.id}).`);

  console.log('👤 Đang tạo user mới...');
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: 'Vip Test User',
      role: 'OWNER',
      isActive: true,
      isEmailVerified: true,
      settings: {
        create: {
          language: 'vi',
          timezone: 'Asia/Ho_Chi_Minh'
        }
      },
      accounts: {
        create: [
          {
            provider: 'LOCAL',
            passwordHash
          }
        ]
      }
    }
  });
  console.log(`✅ Tạo thành công user với ID: ${user.id}`);

  console.log('💳 Đang tạo Subscription với gói AGENCY...');
  const subscription = await prisma.subscription.create({
    data: {
      planId: agencyPlan.id,
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // Hạn dùng 1 năm
    }
  });
  console.log(`✅ Tạo thành công Subscription (ID: ${subscription.id}).`);

  console.log('🏢 Đang tạo Brand mới trống tinh cho VIP user...');
  const brand = await prisma.brand.create({
    data: {
      name: 'VIP Testing Brand',
      timezone: 'Asia/Ho_Chi_Minh',
      defaultLanguage: 'vi',
      ownerId: user.id,
      subscriptionId: subscription.id,
      isActive: true
    }
  });
  console.log(`✅ Tạo thành công Brand (ID: ${brand.id}).`);

  // Cập nhật defaultBrandId cho user
  await prisma.user.update({
    where: { id: user.id },
    data: { defaultBrandId: brand.id }
  });
  console.log('⚙️ Đã thiết lập thương hiệu mặc định cho user.');

  console.log('\n=========================================================');
  console.log('🎉 TẠO TÀI KHOẢN TRỐNG CÓ GÓI VIP AGENCY THÀNH CÔNG 🎉');
  console.log('=========================================================');
  console.log(`📧 Email đăng nhập: ${email}`);
  console.log(`🔑 Mật khẩu:       ${rawPassword}`);
  console.log(`💎 Gói dịch vụ:     AGENCY (Gói cao nhất, hạn dùng 1 năm)`);
  console.log('=========================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi xảy ra khi tạo tài khoản VIP:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
