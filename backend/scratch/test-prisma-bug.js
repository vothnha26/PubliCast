const prisma = require('../src/config/prisma');

async function test() {
  try {
    console.log('Testing prisma.post.create...');
    // Thử tạo một post với metadata chứa chuỗi escape không hợp lệ
    const post = await prisma.post.create({
      data: {
        brandId: "21deeec1-51b3-4f7a-a3ed-c8714ed6d683", // Mượn một brandId hợp lệ từ DB
        createdByUserId: "b6b6293e-9266-44d4-8725-fd86d098fd7f", // Mượn một userId hợp lệ từ DB
        title: "Test Escape",
        type: "TEXT",
        status: "DRAFT",
        targetPlatforms: "FACEBOOK",
        caption: "Test \\x escape", // Chứa \x
        metadata: "{\"test\":\"\\\\u\"}" // Chứa \u không hợp lệ
      }
    });
    console.log('Success:', post.id);
  } catch (err) {
    console.error('Prisma Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
