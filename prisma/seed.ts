// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // 預設管理員帳號
  const password = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      password,
      isAdmin: true,
      name: "管理員",
    },
  });

  // 建立三個房間（R30 / R60 / R90）
  await prisma.room.upsert({
    where: { code: "R30" },
    update: {},
    create: { code: "R30", name: "30 秒房", durationSeconds: 30 },
  });
  await prisma.room.upsert({
    where: { code: "R60" },
    update: {},
    create: { code: "R60", name: "60 秒房", durationSeconds: 60 },
  });
  await prisma.room.upsert({
    where: { code: "R90" },
    update: {},
    create: { code: "R90", name: "90 秒房", durationSeconds: 90 },
  });

  console.log("✅ Seeding 完成！");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
