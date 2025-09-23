import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 跑馬燈 (首頁上方滾動訊息)
  await prisma.marqueeMessage.createMany({
    data: [
      { text: "🎉 新手禮包開放領取！", priority: 100, enabled: true },
      { text: "🔥 百家樂 R60 房間將於 21:00 開新局", priority: 90, enabled: true },
      { text: "💎 連續簽到 7 天可抽稀有徽章", priority: 80, enabled: true },
    ],
    skipDuplicates: true,
  });

  // 公告欄 (大廳左側卡片列表)
  await prisma.announcement.createMany({
    data: [
      {
        title: "系統維護通知",
        body: "今晚 02:00–03:00 進行例行維護，期間將暫停所有下注服務。",
        enabled: true,
      },
      {
        title: "新手活動",
        body: "完成註冊並驗證，即可免費領取新手禮包！",
        enabled: true,
      },
      {
        title: "VIP 每日獎勵",
        body: "升級 VIP 後，每日可領取專屬金幣獎勵。",
        enabled: true,
      },
    ],
    skipDuplicates: true,
  });

  // 彈窗公告 (進入大廳時自動跳出)
  await prisma.popupAnnouncement.createMany({
    data: [
      {
        title: "⚡ 最新公告",
        body: "歡迎來到 TOPZ CASINO！現在參加百家樂可享加碼獎勵！",
        enabled: true,
      },
      {
        title: "🎁 限時活動",
        body: "簽到滿 7 天即可參加抽獎，最高可得稀有頭框！",
        enabled: true,
      },
    ],
    skipDuplicates: true,
  });

  console.log("✅ 已建立範例 跑馬燈 / 公告欄 / 彈窗 資料");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
