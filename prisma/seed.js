const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
const prisma = new PrismaClient();

function makeReferralCode(len = 8) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: len }, () => alphabet[Math.floor(Math.random()*alphabet.length)]).join('');
}

async function main() {
  const adminPwd = await argon2.hash('Admin@123456');
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: adminPwd,
      displayName: 'Admin',
      name: 'Topz Admin',
      isAdmin: true,
      balance: 0, bankBalance: 0,
      referralCode: makeReferralCode(),
    },
  });

  const userPwd = await argon2.hash('P@ssw0rd!');
  await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      password: userPwd,
      displayName: '玩家_001',
      name: 'Demo User',
      referralCode: makeReferralCode(),
    },
  });

  console.log('✅ Seeding done');
}

main().catch(e => { console.error(e); process.exit(1); })
      .finally(async () => { await prisma.$disconnect(); });
