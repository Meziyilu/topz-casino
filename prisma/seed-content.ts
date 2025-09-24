// prisma/seed-content.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 預設公告（包含彈窗要顯示的）
  await prisma.announcement.createMany({
    data: [
      {
        title: "⚡ 系統公告",
        body: "今晚 02:00-03:00 維護，期間暫停下注服務。",
        enabled: true,
      },
      {
        title: "🎁 新手禮包",
        body: "完成註冊即可領取新手禮包！",
        enabled: true,
      },
      {
        title: "🎉 歡迎來到 TOPZCASINO",
        body: "這是預設的彈窗公告，進入大廳時會自動顯示！",
        enabled: true,
      },
    ],
    skipDuplicates: true, // 避免重複執行報錯
  });

  // 預設跑馬燈
  await prisma.marqueeMessage.createMany({
    data: [
      {
        text: "🎉 歡迎來到 TOPZ CASINO",
        priority: 10,
        enabled: true,
      },
      {
        text: "🔥 百家樂 R60 房間將於 21:00 開新局",
        priority: 5,
        enabled: true,
      },
      {
        text: "💎 連續簽到 7 天可抽稀有徽章",
        priority: 3,
        enabled: true,
      },
    ],
    skipDuplicates: true,
  });
}

main()
  .then(() => console.log("✅ Seed completed"))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
