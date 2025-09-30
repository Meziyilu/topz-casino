import { prisma } from "@/lib/prisma";
import { HeadframeCode, InventoryItemType } from "@prisma/client";

export async function listMyInventory(userId: string) {
  const [items, headframes, badges, collectibles, user] = await Promise.all([
    prisma.userInventory.findMany({ where: { userId }, orderBy: { acquiredAt: "desc" } }),
    prisma.userHeadframe.findMany({ where: { userId } }),
    prisma.userBadge.findMany({ where: { userId }, include: { badge: true } }),
    prisma.userCollectible.findMany({ where: { userId }, include: { collectible: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { headframe: true } }),
  ]);
  return { items, headframes, badges, collectibles, user };
}

/** 頭框：延長或寫入有效期（這裡只提供背包端用，不涉禮物/商店） */
export async function grantHeadframeDuration(userId: string, code: HeadframeCode, durationDays?: number | null) {
  const now = new Date();
  const exist = await prisma.userHeadframe.findUnique({ where: { userId_code: { userId, code } }});
  let expiresAt: Date | null = null;

  if (durationDays == null) {
    expiresAt = null;
  } else {
    const base = exist?.expiresAt && exist.expiresAt > now ? exist.expiresAt : now;
    expiresAt = new Date(base.getTime() + durationDays * 24 * 60 * 60 * 1000);
  }

  await prisma.userHeadframe.upsert({
    where: { userId_code: { userId, code } },
    create: { userId, code, expiresAt },
    update: { expiresAt },
  });

  return expiresAt;
}

/** 頭框裝備（檢驗有效期） */
export async function equipHeadframe(userId: string, code: HeadframeCode) {
  const uf = await prisma.userHeadframe.findUnique({ where: { userId_code: { userId, code } }});
  const now = new Date();
  if (!uf || (uf.expiresAt && uf.expiresAt < now)) throw new Error("Headframe not owned or expired");
  await prisma.user.update({ where: { id: userId }, data: { headframe: code } });
}

/** 頭框卸下 */
export async function unequipHeadframe(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { headframe: "NONE" as any } });
}

/** 泛用：將 UserInventory 的 equipped 設定（給 OTHER/自定類使用） */
export async function setInventoryEquipped(userId: string, inventoryId: string, equipped: boolean) {
  const inv = await prisma.userInventory.findUnique({ where: { id: inventoryId } });
  if (!inv || inv.userId !== userId) throw new Error("Not your item");
  // 簡單版：同類型不互斥；若需要互斥可加類型維度做一次性取消
  return prisma.userInventory.update({ where: { id: inventoryId }, data: { equipped } });
}

/** 管理端直發：新增背包項（或適用時直接發 UserHeadframe） */
export async function adminGrantInventory(opts: {
  userId: string;
  type: InventoryItemType;
  refId?: string | null;
  quantity?: number;
  durationDays?: number | null; // 只有 HEADFRAME 會用
}) {
  const { userId, type, refId = null, quantity = 1, durationDays = null } = opts;

  if (type === "HEADFRAME") {
    if (!refId) throw new Error("Headframe refId required");
    await grantHeadframeDuration(userId, refId as HeadframeCode, durationDays);
  }

  // 背包憑證（統一留存以利 UI 呈現）
  return prisma.userInventory.upsert({
    where: { userId_type_refId: { userId, type, refId } },
    create: { userId, type, refId, quantity, equipped: false },
    update: { quantity: { increment: quantity } },
  });
}
