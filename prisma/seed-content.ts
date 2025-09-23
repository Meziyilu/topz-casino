import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.marqueeMessage.createMany({
    data: [
      { text: "🎉 新手禮包開放領取！", priority: 10, enabled: true },
      { text: "🔥 百家樂 R60 房間將於 21:00 開新局", priority: 9, enabled: true },
      { text: "💎 連續簽到 7 天可抽稀有徽章", priority: 8, enabled: true },
    ],
    skipDuplicates: true,
  });

  await prisma.announcement.createMany({
    data: [
      {
        title: "⚡ 最新公告",
        body: "本週末加碼回饋，所有遊戲 2% 返點！",
        enabled: true,
        priority: 99, // 最高，當成彈窗/最新
      },
      {
        title: "🎁 新手禮包",
        body: "完成註冊與驗證即可領取 500 金幣與頭框試用。",
        enabled: true,
        priority: 80,
      },
      {
        title: "系統維護通知",
        body: "今晚 02:00–03:00 維護，暫停下注服務。",
        enabled: true,
        priority: 60,
      },
    ],
    skipDuplicates: true,
  });
}

main()
  .then(async () => {
    console.log("Seed content done.");
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
