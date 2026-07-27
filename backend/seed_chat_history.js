const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedSupportData() {
  console.log('🌱 Starting to seed test Support Chat data...');
  try {
    // 1. Get first active brand and user
    const brand = await prisma.brand.findFirst({
      include: { owner: true }
    });

    if (!brand) {
      console.log('❌ No brand found in database. Please register/create a brand first.');
      return;
    }

    const user = brand.owner;
    console.log(`Using Brand: "${brand.name}" (${brand.id}) and Owner: "${user.name}" (${user.id})`);

    // 2. Create 2 Closed Support Tickets with conversation messages
    const ticket1 = await prisma.supportTicket.create({
      data: {
        brandId: brand.id,
        userId: user.id,
        subject: 'Lỗi đồng bộ thống kê YouTube',
        priority: 'HIGH',
        status: 'RESOLVED',
        messages: {
          createMany: {
            data: [
              {
                senderId: user.id,
                messageType: 'TEXT',
                content: 'Xin chào, số liệu view của kênh YouTube của tôi hiển thị bằng 0 dù trên YouTube Studio thực tế là hơn 10K views. Nhờ kiểm tra giúp.',
                createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
              },
              {
                senderId: user.id,
                messageType: 'TEXT',
                content: 'Chào bạn, hiện tại YouTube API đang cập nhật độ trễ (delay) từ 24-48 giờ đối với dữ liệu phân tích chi tiết. Bạn vui lòng đợi thêm 1 ngày để hệ thống cập nhật đồng bộ nhé.',
                createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000)
              },
              {
                senderId: user.id,
                messageType: 'TEXT',
                content: 'À dạ tôi thấy số liệu đã hiển thị đủ rồi. Cảm ơn admin nhé, tôi sẽ đóng ticket.',
                createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
              }
            ]
          }
        }
      }
    });

    const ticket2 = await prisma.supportTicket.create({
      data: {
        brandId: brand.id,
        userId: user.id,
        subject: 'Hỏi về gói dịch vụ PRO',
        priority: 'LOW',
        status: 'RESOLVED',
        messages: {
          createMany: {
            data: [
              {
                senderId: user.id,
                messageType: 'TEXT',
                content: 'Gói PRO của tôi có giới hạn tối đa bao nhiêu tài khoản kết nối thế ạ?',
                createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
              },
              {
                senderId: user.id,
                messageType: 'TEXT',
                content: 'Chào bạn, gói PRO hiện tại cho phép bạn quản lý tối đa 10 tài khoản mạng xã hội trên mỗi thương hiệu nhé.',
                createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000)
              }
            ]
          }
        }
      }
    });

    console.log(`✅ Seeding success! Created 2 closed tickets: \n- ID: ${ticket1.id} ("${ticket1.subject}")\n- ID: ${ticket2.id} ("${ticket2.subject}")`);
  } catch (err) {
    console.error('❌ Seeding support data failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

seedSupportData();
