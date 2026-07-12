const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    console.log('--- Kiểm tra kết nối CSDL qua Prisma ---');
    const products = await prisma.product.findMany({
      include: {
        plans: true
      }
    });
    console.log(`Số lượng Product hiện có trong DB: ${products.length}`);
    console.log('Danh sách Products:');
    products.forEach(p => {
      console.log(`- ID: ${p.id} | Name: ${p.name} | Category: ${p.category} | Plans: ${p.plans.map(pl => pl.name).join(', ')}`);
    });

    // Check xem các bảng platforms và modules đã tồn tại chưa
    const tables = await prisma.$queryRawUnsafe(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'publicast'
    `);
    console.log('\n--- Tất cả các bảng hiện có trong MySQL ---');
    console.log(tables.map(t => t.TABLE_NAME).join(', '));
  } catch (error) {
    console.error('Lỗi khi kiểm tra CSDL:', error);
  } finally {
    await prisma.$disconnect();
  }
}

check();
