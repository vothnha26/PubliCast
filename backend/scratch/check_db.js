const prisma = require('../src/config/prisma');

async function check() {
  try {
    const list = await prisma.autoList.findFirst();
    console.log("SUCCESS! Found autoList record:", list);
  } catch (err) {
    console.error("ERROR checking database autoList table:", err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
