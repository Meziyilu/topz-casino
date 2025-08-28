// scripts/db-reset-all.js
// 全清空 Round / Bet，並為 R30/R60/R90 各開第 1 局
// 需要：環境變數 DATABASE_URL

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function ensureRoom(code, name, durationSeconds) {
  // Room.code 是 enum，這裡轉型一下
  return prisma.room.upsert({
    where: { code: code },
    update: { name, durationSeconds },
    create: {
      code: code, // enum 直接給
      name,
      durationSeconds,
    },
  });
}

async function main() {
  console.log("=> 確認三個房間存在（R30/R60/R90）…");
  await ensureRoom("R30", "30秒房", 30);
  await ensureRoom("R60", "60秒房", 60);
  await ensureRoom("R90", "90秒房", 90);

  console.log("=> 清空下注與回合（TRUNCATE Bet / Round）…");
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Bet" RESTART IDENTITY CASCADE;');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Round" RESTART IDENTITY CASCADE;');

  console.log("=> 為三個房間建立第 1 局（立即開始下注計時）…");

  const rooms = await prisma.room.findMany({
    where: { code: { in: ["R30", "R60", "R90"] } },
    select: { id: true, code: true, durationSeconds: true },
  });

  const now = new Date();
  for (const r of rooms) {
    await prisma.round.create({
      data: {
        roomId: r.id,
        roundSeq: 1,
        phase: "BETTING",
        createdAt: now,
        startedAt: now,
      },
    });
    console.log(`   ✔ 房間 ${r.code}: 開立 #0001，下注中`);
  }

  console.log("=> 完成！");
}

main()
  .catch((e) => {
    console.error("✖ 執行錯誤：", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
// scripts/db-reset-all.js
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("⚠️  Resetting database...");

  // 清空順序要注意外鍵依賴
  await prisma.ledger.deleteMany();
  await prisma.bet.deleteMany();
  await prisma.round.deleteMany();
  await prisma.room.deleteMany();

  console.log("✅ Cleared old data");

  // 建立三個房間
  const rooms = await prisma.room.createMany({
    data: [
      { code: "R30", name: "30秒房", durationSeconds: 30 },
      { code: "R60", name: "60秒房", durationSeconds: 60 },
      { code: "R90", name: "90秒房", durationSeconds: 90 },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Rooms created:", rooms);

  // 重新查詢房間 ID
  const roomList = await prisma.room.findMany();

  // 為每個房間建立第一局
  const now = new Date();
  for (const r of roomList) {
    await prisma.round.create({
      data: {
        roomId: r.id,
        day: now,
        roundSeq: 1,
        phase: "BETTING",
        startedAt: now,
        createdAt: now,
      },
    });
    console.log(`✅ Initialized first round for ${r.code}`);
  }

  console.log("🎉 Database reset complete!");
}

main()
  .catch((e) => {
    console.error("❌ Error resetting DB:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
