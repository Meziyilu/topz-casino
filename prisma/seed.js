// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

function makeReferralCode(len = 8) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: len }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

async function createUserWithUniqueReferral(data) {
  for (let i = 0; i < 5; i++) {
    try {
      return await prisma.user.create({
        data: { ...data, referralCode: makeReferralCode() },
      });
    } catch (e) {
      // 若是 unique 衝突就重試，其他錯誤直接拋出
      if (!(e && e.code === 'P2002' && e.meta?.target?.includes('referralCode'))) throw e;
    }
  }
  throw new Error('Failed to generate unique referralCode after retries');
}

async function main() {
  const adminPwd = await bcrypt.hash('Admin@123456', 10);
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: adminPwd,
      displayName: 'Admin',
      name: 'Topz Admin',
      isAdmin: true,
      balance: 0,
      bankBalance: 0,
      emailVerifiedAt: new Date(),
      referralCode: makeReferralCode(),
    },
  });

  const userPwd = await bcrypt.hash('P@ssw0rd!', 10);
  // 用可重試的建立方式避免 referralCode 撞碼
  await prisma.user.findUnique({ where: { email: 'demo@example.com' } })
    .then(async (u) => {
      if (!u) {
        await createUserWithUniqueReferral({
          email: 'demo@example.com',
          password: userPwd,
          displayName: '玩家_001',
          name: 'Demo User',
          emailVerifiedAt: new Date(),
        });
      }
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
