// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const rooms = [
    { code: "R30", name: "30秒房", durationSeconds: 30 },
    { code: "R60", name: "60秒房", durationSeconds: 60 },
    { code: "R90", name: "90秒房", durationSeconds: 90 },
  ] as const;

  for (const r of rooms) {
    await prisma.room.upsert({
      where: { code: r.code as any },
      update: { name: r.name, durationSeconds: r.durationSeconds },
      create: { code: r.code as any, name: r.name, durationSeconds: r.durationSeconds },
    });
  }
  console.log("✅ Rooms seeded.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
