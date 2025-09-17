import prisma from "../src/lib/prisma"; // 路徑依你的專案調整

async function main() {
  // 頭框素材 URL
  const neonUrl = "/assets/shop/frames/neon.gif";
  const crystalUrl = "/assets/shop/frames/crystal.gif";

  // 建立（或略過）NEON 7天 / 15天
  const neon7 = await prisma.shopItem.upsert({
    where: { code: "HF_NEON_7D" },
    update: {},
    create: {
      code: "HF_NEON_7D",
      kind: "HEADFRAME",
      currency: "DIAMOND",
      title: "華麗霓虹頭框（7天）",
      description: "華麗的動畫特效頭框（限時 7 天）",
      imageUrl: neonUrl,
      basePrice: 999,
      vipDiscountable: true,
      visible: true,
      skus: { create: [{ payloadJson: { headframe: "NEON", durationDays: 7 } }] },
    },
  });

  const neon15 = await prisma.shopItem.upsert({
    where: { code: "HF_NEON_15D" },
    update: {},
    create: {
      code: "HF_NEON_15D",
      kind: "HEADFRAME",
      currency: "DIAMOND",
      title: "華麗霓虹頭框（15天）",
      description: "華麗的動畫特效頭框（限時 15 天）",
      imageUrl: neonUrl,
      basePrice: 1999,
      vipDiscountable: true,
      visible: true,
      skus: { create: [{ payloadJson: { headframe: "NEON", durationDays: 15 } }] },
    },
  });

  // 再來一個 CRYSTAL 7天 作為展示
  await prisma.shopItem.upsert({
    where: { code: "HF_CRYSTAL_7D" },
    update: {},
    create: {
      code: "HF_CRYSTAL_7D",
      kind: "HEADFRAME",
      currency: "DIAMOND",
      title: "水晶頭框（7天）",
      description: "通透水晶動畫頭框（限時 7 天）",
      imageUrl: crystalUrl,
      basePrice: 999,
      vipDiscountable: true,
      visible: true,
      skus: { create: [{ payloadJson: { headframe: "CRYSTAL", durationDays: 7 } }] },
    },
  });

  console.log("Seeded items:", neon7.code, neon15.code, "HF_CRYSTAL_7D");
}

main().catch((e)=>{ console.error(e); process.exit(1); }).finally(async ()=>{ await prisma.$disconnect(); });
