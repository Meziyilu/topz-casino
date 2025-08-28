// scripts/db-reset-all.js
// 用 TRUNCATE CASCADE 清空資料，再建立三房與各自的首局 + 管理員（bcrypt 雜湊）

const { PrismaClient } = require("@prisma/client");
const { randomUUID } = require("crypto");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function truncateAll() {
  // 依照你現有的資料表名稱調整。以下是你專案常見的表：
  // "Ledger", "Bet", "Round", "Room", "User"
  // 若有額外表（例如 BankAccount），可以加進去。
  const tables = ['"Ledger"', '"Bet"', '"Round"', '"Room"']; // User 先留著，最後處理
  const sql = `TRUNCATE TABLE ${tables.join(", ")} RESTART IDENTITY CASCADE;`;
  await prisma.$executeRawUnsafe(sql);

  // 最後再清 user（避免外鍵）
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "User" RESTART IDENTITY CASCADE;`);
}

async function createRoomsAndFirstRounds() {
  // 建房
  await prisma.room.createMany({
    data: [
      { code: "R30", name: "30秒房", durationSeconds: 30 },
      { code: "R60", name: "60秒房", durationSeconds: 60 },
      { code: "R90", name: "90秒房", durationSeconds: 90 },
    ],
    skipDuplicates: true,
  });
  const now = new Date();
  const rooms = await prisma.room.findMany({ where: { code: { in: ["R30", "R60", "R90"] } } });

  // 各房開第 1 局（下注中）
  for (const r of rooms) {
    await prisma.round.create({
      data: {
        id: randomUUID(),
        roomId: r.id,
        day: now,
        roundSeq: 1,
        phase: "BETTING",
        createdAt: now,
        startedAt: now,
      },
    });
  }
}

async function createAdmin() {
  const email = "admin@topzcasino.local";
  const plain = "Admin123!"; // 測試用
  const hash = await bcrypt.hash(plain, 10);

  await prisma.user.create({
    data: {
      id: randomUUID(),
      email,
      password: hash,
      name: "Admin",
      isAdmin: true,
      balance: 0,
      bankBalance: 0,
      createdAt: new Date(),
    },
  });

  console.log(`✅ 管理員建立完成：${email} / 密碼：${plain}`);
}

async function main() {
  console.log("⚠️  正在 TRUNCATE 所有資料…");
  await truncateAll();
  console.log("✅ 清空完成");

  console.log("🚀 建立三房與首局…");
  await createRoomsAndFirstRounds();
  console.log("✅ 房間與首局完成");

  console.log("👑 建立管理員…");
  await createAdmin();

  console.log("🎉 完成！");
}

main()
  .catch((e) => {
    console.error("❌ 重置失敗：", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
