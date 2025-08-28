// scripts/db-reset-all.js
//
// 清理並重建所有 Casino 相關資料表，方便開發測試
// ⚠️ 請勿在正式環境隨便執行，會清空資料

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("⚠️  正在清理所有資料…");

  // 刪除順序要注意 FK 依賴
  await prisma.bet.deleteMany();
  await prisma.round.deleteMany();
  await prisma.room.deleteMany();
  await prisma.ledger.deleteMany();
  await prisma.bankAccount.deleteMany();
  await prisma.user.deleteMany();

  console.log("✅ 清理完成，開始建立預設房間…");

  // 建立 3 個預設房間
  await prisma.room.createMany({
    data: [
      {
        id: crypto.randomUUID(),
        code: "R30",
        name: "30秒房",
        durationSeconds: 30,
      },
      {
        id: crypto.randomUUID(),
        code: "R60",
        name: "60秒房",
        durationSeconds: 60,
      },
      {
        id: crypto.randomUUID(),
        code: "R90",
        name: "90秒房",
        durationSeconds: 90,
      },
    ],
    skipDuplicates: true,
  });

  console.log("✅ 房間建立完成");

  // 建立一個預設管理員帳號（方便測試）
  const admin = await prisma.user.create({
    data: {
      email: "admin@topzcasino.local",
      password: "admin", // 開發用，之後要改 bcrypt hash
      name: "Admin",
      isAdmin: true,
    },
  });

  console.log("✅ 管理員已建立：", admin.email);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
