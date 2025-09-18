// prisma/seed.ts
import { PrismaClient, ShopItemKind, ShopCurrency, HeadframeCode } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 如果 public 真的有這些檔案就用它們；沒有就把 imageUrl 改成 null（前端會顯示 CSS 特效縮圖）
  const FRAMES = {
    NEON: "/assets/shop/frames/neon.gif",
    CRYSTAL: "/assets/shop/frames/crystal.gif",
    DRAGON: "/assets/shop/frames/dragon.gif",
  };

  type HeadframeSeed = {
    code: string;
    title: string;
    headframe: HeadframeCode;
    imageUrl: string | null;
    description?: string;
  };

  const headframes: HeadframeSeed[] = [
    { code: "HF_NEON",    title: "霓虹旋律", headframe: HeadframeCode.NEON,    imageUrl: FRAMES.NEON,    description: "華麗霓虹效果，超高存在感。" },
    { code: "HF_CRYSTAL", title: "水晶流光", headframe: HeadframeCode.CRYSTAL, imageUrl: FRAMES.CRYSTAL, description: "晶瑩剔透的環形流光特效。" },
    { code: "HF_DRAGON",  title: "龍焰環",   headframe: HeadframeCode.DRAGON,  imageUrl: FRAMES.DRAGON,  description: "龍紋火焰盤繞，霸氣登場。" },
  ];

  for (const hf of headframes) {
    // 商品 upsert
    const item = await prisma.shopItem.upsert({
      where: { code: hf.code },
      update: {
        title: hf.title,
        description: hf.description,
        imageUrl: hf.imageUrl,   // 若沒放圖，改成 null
        visible: true,
      },
      create: {
        kind: ShopItemKind.HEADFRAME,
        currency: ShopCurrency.DIAMOND,
        code: hf.code,
        title: hf.title,
        description: hf.description,
        imageUrl: hf.imageUrl,   // 若沒放圖，改成 null
        basePrice: 999,          // 顯示用底價（實際結帳看 SKU）
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
      // 查是否已存在（用 headframe + durationDays 當自然鍵）
      const exist = await prisma.shopSku.findFirst({
        where: {
          itemId: item.id,
          currencyOverride: ShopCurrency.DIAMOND,
          payloadJson: { path: ["headframe"], equals: hf.headframe },
          AND:        { payloadJson: { path: ["durationDays"], equals: s.durationDays } },
        },
      });

      const payload = {
        kind: "HEADFRAME",
        headframe: hf.headframe,
        durationDays: s.durationDays,
      };

      if (!exist) {
        await prisma.shopSku.create({
          data: {
            itemId: item.id,
            priceOverride: s.priceOverride,
            currencyOverride: ShopCurrency.DIAMOND,
            vipDiscountableOverride: true,
            payloadJson: payload as any,
          },
        });
      } else {
        await prisma.shopSku.update({
          where: { id: exist.id },
          data: {
            priceOverride: s.priceOverride,
            currencyOverride: ShopCurrency.DIAMOND,
            vipDiscountableOverride: true,
            payloadJson: payload as any,
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
