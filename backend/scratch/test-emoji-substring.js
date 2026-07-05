const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const caption = "02:00 ngày 3/7/2026\n🇪🇸 Tây Ban Nha 🆚 Áo 🇦🇹\n🔥 Tây Ban Nha     bước vào vòng 32 đội với quyết tâm khẳng định vị thế của một ứng viên vô địch. Tuy nhiên, Áo đã cho thấy họ là tập thể giàu kỷ luật và luôn sẵn sàng gây khó khăn cho mọi đối thủ. Liệu La Roja sẽ thể hiện đẳng cấp, hay Áo sẽ tạo nên bất ngờ để giành vé đi tiếp? 👀⚽\n#WorldCup2026 #Spain #Austria #LaRoja #FIFAWorldCup";
  
  for (let i = 40; i <= 60; i++) {
    const sub = caption.substring(0, i);
    console.log(`Length ${i}: last char code: ${sub.charCodeAt(i-1).toString(16)}, string: ${JSON.stringify(sub)}`);
  }

  try {
    const user = await prisma.user.findFirst();
    const brand = await prisma.brand.findFirst();
    
    if (!user || !brand) {
      console.log("No user or brand found in database. Seed the database first.");
      return;
    }

    // Thử tạo một post với badTitle
    const post = await prisma.post.create({
      data: {
        brandId: brand.id,
        createdByUserId: user.id,
        title: badTitle,
        type: "VIDEO",
        status: "DRAFT",
        targetPlatforms: "YOUTUBE"
      }
    });
    console.log("Post created successfully:", post.id);
  } catch (err) {
    console.error("Prisma error:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
