import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] || "topz0705@gmail.com";

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`❌ 找不到使用者: ${email}`);
    process.exit(1);
  }

  if (user.isAdmin) {
    console.log(`ℹ️ 已經是管理員: ${email}`);
    return;
  }

  await prisma.user.update({
    where: { email },
    data: { isAdmin: true },
  });

  console.log(`✅ 已升級為管理員: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
