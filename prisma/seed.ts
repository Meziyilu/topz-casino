// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// 取得台北當天 00:00（以 UTC 儲存）
function taipeiDayStart(date = new Date()) {
  const utc = date.getTime();
  const tpe = utc + 8 * 3600_000;
  const tpeStart = Math.floor(tpe / 86_400_000) * 86_400_000;
  return new Date(tpeStart - 8 * 3600_000);
}

async function main() {
  console.log("⏳ Seeding…");

  // === 1) 預設管理員 ===
  const adminPwd = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      password: adminPwd,
      isAdmin: true,
      name: "管理員",
      balance: 0,
      bankBalance: 0,
    },
  });

  // === 2) 測試玩家（方便你測簽到與下注） ===
  const playerPwd = await bcrypt.hash("123456", 10);
  const player = await prisma.user.upsert({
    where: { email: "player1@example.com" },
    update: {},
    create: {
      email: "player1@example.com",
      password: playerPwd,
      isAdmin: false,
      name: "測試玩家",
      balance: 10000,   // 給點錢方便測試
      bankBalance: 5000,
    },
  });

  // === 3) 房間（三個固定房） ===
  await prisma.room.upsert({
    where: { code: "R30" },
    update: {},
    create: { code: "R30", name: "30 秒房", durationSeconds: 30 },
  });
  await prisma.room.upsert({
    where: { code: "R60" },
    update: {},
    create: { code: "R60", name: "60 秒房", durationSeconds: 60 },
  });
  await prisma.room.upsert({
    where: { code: "R90" },
    update: {},
    create: { code: "R90", name: "90 秒房", durationSeconds: 90 },
  });

  // === 4) 公告（若已存在就略過） ===
  await prisma.announcement.createMany({
    data: [
      {
        title: "🎉 歡迎進入 TOPZ Casino",
        content: "娛樂城 v1.1.1 上線，百家樂 / 銀行 / 簽到系統 已全面開放！",
        enabled: true,
      },
      {
        title: "📢 注意事項",
        content: "每日登入記得簽到，可獲得額外金幣獎勵。",
        enabled: true,
      },
    ],
    skipDuplicates: true,
  });

  // === 5) 跑馬燈訊息（若已存在就略過） ===
  await prisma.marqueeMessage.createMany({
    data: [
      { text: "🔥 每日簽到送金幣！", priority: 1, enabled: true },
      { text: "💡 小提醒：右上角可切換深/淺色主題", priority: 0, enabled: true },
    ],
    skipDuplicates: true,
  });

  // === 6) （選配）幫測試玩家先插入「昨天」簽到一筆，方便你看到連續簽到效果 ===
  const today = taipeiDayStart(new Date());
  const yesterday = new Date(today.getTime() - 86_400_000);
  await prisma.dailyCheckin.upsert({
    where: { userId_day: { userId: player.id, day: yesterday } },
    update: {},
    create: {
      userId: player.id,
      day: yesterday,
      reward: 100,
      streak: 1,
    },
  });

  console.log("✅ Seeding 完成！");
}

main()
  .catch((e) => {
    console.error("❌ Seeding 錯誤：", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
