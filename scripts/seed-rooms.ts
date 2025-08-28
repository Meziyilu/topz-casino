// scripts/seed-rooms.ts
import prisma from "@/lib/prisma";

async function main() {
  await prisma.room.createMany({
    data: [
      { code: "R30", name: "30秒房", durationSeconds: 30 },
      { code: "R60", name: "60秒房", durationSeconds: 60 },
      { code: "R90", name: "90秒房", durationSeconds: 90 },
    ],
    skipDuplicates: true,
  });
  console.log("rooms ok");
}
main().finally(() => prisma.$disconnect());
