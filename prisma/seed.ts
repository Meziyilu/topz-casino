// prisma/seed.ts
import { PrismaClient, ShopItemKind, ShopCurrency, HeadframeCode } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 你可放到 public/assets/...，或先用 CDN 圖
  const FRAMES = {
    NEON: "/assets/shop/frames/neon.gif",
    CRYSTAL: "/assets/shop/frames/crystal.gif",
    DRAGON: "/assets/shop/frames/dragon.gif",
  };

  type HeadframeSeed = {
    code: string;
    title: string;
    headframe: HeadframeCode;
    imageUrl: string;
    description?: string;
  };

  const headframes: HeadframeSeed[] = [
    { code: "HF_NEON", title: "霓虹旋律", headframe: "NEON" as HeadframeCode, imageUrl: FRAMES.NEON, description: "華麗霓虹效果，超高存在感。" },
    { code: "HF_CRYSTAL", title: "水晶流光", headframe: "CRYSTAL" as HeadframeCode, imageUrl: FRAMES.CRYSTAL, description: "晶瑩剔透的環形流光特效。" },
    { code: "HF_DRAGON", title: "龍焰環", headframe: "DRAGON" as HeadframeCode, imageUrl: FRAMES.DRAGON, description: "龍紋火焰盤繞，霸氣登場。" },
  ];

  for (const hf of headframes) {
    // upsert 商品
    const item = await prisma.shopItem.upsert({
      where: { code: hf.code },
      update: {
        title: hf.title,
        description: hf.description,
        imageUrl: hf.imageUrl,
        visible: true,
      },
      create: {
        kind: ShopItemKind.HEADFRAME,
        currency: ShopCurrency.DIAMOND, // 結帳幣別：鑽石
        code: hf.code,
        title: hf.title,
        description: hf.description,
        imageUrl: hf.imageUrl,
        basePrice: 999,           // 底價（僅顯示，實際看 SKU）
        vipDiscountable: true,
        visible: true,
      },
    });

    // 兩個 SKU：999 / 7天、1999 / 15天
    const skusWanted = [
      { priceOverride: 999,  durationDays: 7  },
      { priceOverride: 1999, durationDays: 15 },
    ];

    for (const s of skusWanted) {
      // 以「itemId + payloadJson.durationDays」當作自然鍵避免重複
      const exist = await prisma.shopSku.findFirst({
        where: {
          itemId: item.id,
          priceOverride: s.priceOverride,
          currencyOverride: ShopCurrency.DIAMOND,
          payloadJson: { path: ["headframe"], equals: hf.headframe },
        },
      });

      if (!exist) {
        await prisma.shopSku.create({
          data: {
            itemId: item.id,
            priceOverride: s.priceOverride,
            currencyOverride: ShopCurrency.DIAMOND,
            vipDiscountableOverride: true,
            payloadJson: {
              kind: "HEADFRAME",
              headframe: hf.headframe,
              durationDays: s.durationDays,
            },
          },
        });
      } else {
        await prisma.shopSku.update({
          where: { id: exist.id },
          data: {
            priceOverride: s.priceOverride,
            currencyOverride: ShopCurrency.DIAMOND,
            vipDiscountableOverride: true,
            payloadJson: {
              kind: "HEADFRAME",
              headframe: hf.headframe,
              durationDays: s.durationDays,
            },
          },
        });
      }
    }
  }

  console.log("✅ Seed 完成：NEON / CRYSTAL / DRAGON（999/7天、1999/15天）");
}

main()
  .catch((e) => {
    console.error("❌ Seed 失敗:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
