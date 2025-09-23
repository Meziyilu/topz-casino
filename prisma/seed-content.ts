import { prisma } from "../src/lib/prisma";

async function main() {
  // 預設公告
  await prisma.announcement.createMany({
    data: [
      {
        title: "⚡ 最新公告",
        body: "本週末加碼回饋，所有遊戲 2% 返點！",
        enabled: true,
      },
      {
        title: "🎁 新手禮包",
        body: "完成註冊與驗證即可領取 500 金幣與頭框試用。",
        enabled: true,
      },
      {
        title: "🛠 系統維護通知",
        body: "今晚 02:00–03:00 維護，暫停下注服務。",
        enabled: true,
      },
    ],
    skipDuplicates: true,
  });

  // 預設跑馬燈
  await prisma.marqueeMessage.createMany({
    data: [
      { text: "🎉 歡迎來到 TOPZ CASINO", enabled: true },
      { text: "🔥 百家樂 R60 房間 21:00 開新局", enabled: true },
      { text: "💎 連續簽到 7 天可抽稀有徽章", enabled: true },
    ],
    skipDuplicates: true,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
