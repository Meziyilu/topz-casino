// scripts/seed-headframes.ts
import {
  PrismaClient,
  ShopItemKind,
  ShopCurrency,
  HeadframeCode,
} from "@prisma/client";

const prisma = new PrismaClient();

/**
 * 可在這裡增減你要上架的頭框
 * imageUrl 可用 GIF/WEBM/PNG（前台我們有做 video/img 自動判別）
 */
const FRAMES: Array<{
  code: string;                    // 商品代碼（唯一）
  title: string;                   // 商店顯示名稱
  headframe: HeadframeCode;        // 對應 enum
  imageUrl: string;                // 預覽/展示圖或動畫
  description?: string;
}> = [
  {
    code: "HF_NEON",
    title: "霓虹旋律",
    headframe: "NEON" as HeadframeCode,
    imageUrl:
      process.env.HF_NEON_URL || "/assets/shop/frames/neon.gif",
    description: "華麗霓虹效果，超高存在感。",
  },
  {
    code: "HF_CRYSTAL",
    title: "水晶流光",
    headframe: "CRYSTAL" as HeadframeCode,
    imageUrl:
      process.env.HF_CRYSTAL_URL || "/assets/shop/frames/crystal.gif",
    description: "晶瑩剔透的環形流光特效。",
  },
  {
    code: "HF_DRAGON",
    title: "龍焰環",
    headframe: "DRAGON" as HeadframeCode,
    imageUrl:
      process.env.HF_DRAGON_URL || "/assets/shop/frames/dragon.gif",
    description: "龍紋火焰盤繞，霸氣登場。",
  },
];

/** 兩種期間 / 定價（DIAMOND） */
const SKUS = [
  { price: 999, durationDays: 7 },
  { price: 1999, durationDays: 15 },
];

async function upsertHeadframeItem(x: (typeof FRAMES)[number]) {
  // 1) upsert item
  const item = await prisma.shopItem.upsert({
    where: { code: x.code },
    update: {
      title: x.title,
      description: x.description,
      imageUrl: x.imageUrl,
      visible: true,
      kind: ShopItemKind.HEADFRAME,
      currency: ShopCurrency.DIAMOND,
    },
    create: {
      code: x.code,
      kind: ShopItemKind.HEADFRAME,
      currency: ShopCurrency.DIAMOND,
      title: x.title,
      description: x.description,
      imageUrl: x.imageUrl,
      basePrice: SKUS[0].price, // 顯示用途；實際價格看 SKU
      vipDiscountable: true,
      visible: true,
    },
  });

  // 2) 為該頭框建立/更新兩個 SKU
  for (const s of SKUS) {
    // 以 itemId + headframe + durationDays 當自然鍵
    const exist = await prisma.shopSku.findFirst({
      where: {
        itemId: item.id,
        currencyOverride: ShopCurrency.DIAMOND,
        priceOverride: s.price,
        // 只要 payloadJson.headframe 相同即可認定同款
        // Prisma JSON filter：path+equals
        payloadJson: { path: ["headframe"], equals: x.headframe },
      },
    });

    const payload = {
      kind: "HEADFRAME",
      headframe: x.headframe,
      durationDays: s.durationDays,
    };

    if (!exist) {
      await prisma.shopSku.create({
        data: {
          itemId: item.id,
          priceOverride: s.price,
          currencyOverride: ShopCurrency.DIAMOND,
          vipDiscountableOverride: true,
          payloadJson: payload,
        },
      });
    } else {
      await prisma.shopSku.update({
        where: { id: exist.id },
        data: {
          priceOverride: s.price,
          currencyOverride: ShopCurrency.DIAMOND,
          vipDiscountableOverride: true,
          payloadJson: payload,
        },
      });
    }
  }

  return item;
}

async function main() {
  for (const f of FRAMES) {
    const item = await upsertHeadframeItem(f);
    console.log(
      `✅ ${item.title} (${item.code}) 已同步，圖片=${item.imageUrl}`
    );
  }
  console.log(
    `✨ 已建立/更新 SKU：${SKUS.map((s) => `${s.price}/${s.durationDays}天`).join(", ")}（DIAMOND）`
  );
}

main()
  .catch((e) => {
    console.error("❌ 種頭框失敗：", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
