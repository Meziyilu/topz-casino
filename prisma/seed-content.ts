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
