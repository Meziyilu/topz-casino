// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

function makeReferralCode(len = 8) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: len }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

async function main() {
  const adminPwd = await bcrypt.hash('Admin@123456', 10);

  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: adminPwd,
      displayName: 'Admin',          // ★ 必填，避免型別錯
      name: 'Topz Admin',
      isAdmin: true,
      balance: 0,
      bankBalance: 0,
      referralCode: makeReferralCode(),
      emailVerifiedAt: new Date(),   // 讓管理員免驗證就能登入
    },
  });

  // 你也可以順手種一個 demo 玩家
  const userPwd = await bcrypt.hash('P@ssw0rd!', 10);
  await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      password: userPwd,
      displayName: '玩家_001',
      name: 'Demo User',
      referralCode: makeReferralCode(),
      emailVerifiedAt: new Date(),
    },
  });

  console.log('✅ Seeding done');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
