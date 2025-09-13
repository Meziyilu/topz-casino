// prisma/seed.cjs
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

function makeReferralCode(len = 8) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: len }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

async function upsertUser({ email, passwordPlain, displayName, name, isAdmin = false, balance = 0, bankBalance = 0 }) {
  const password = await bcrypt.hash(passwordPlain, 10);
  return prisma.user.upsert({
    where: { email },
    update: {}, // 如要每次覆寫密碼，可改成：update: { password }
    create: {
      email,
      password,
      displayName,
      name,
      isAdmin,
      balance,
      bankBalance,
      referralCode: makeReferralCode(),
    },
  });
}

async function upsertGameConfig(gameCode, items) {
  for (const it of items) {
    await prisma.gameConfig.upsert({
      where: { gameCode_key: { gameCode, key: it.key } },
      update: {},
      create: { gameCode, key: it.key, ...it },
    });
  }
}

async function main() {
  // 1) Admin + Demo
  await upsertUser({
    email: 'admin@example.com',
    passwordPlain: 'Admin@123456',
    displayName: 'Admin',
    name: 'Topz Admin',
    isAdmin: true,
    balance: 0,
    bankBalance: 0,
  });

  await upsertUser({
    email: 'demo@example.com',
    passwordPlain: 'P@ssw0rd!',
    displayName: '玩家_001',
    name: 'Demo User',
    isAdmin: false,
  });

  // 2) LOTTO 預設
  await upsertGameConfig('LOTTO', [
    { key: 'drawIntervalSec',   valueInt: 30 },
    { key: 'lockBeforeDrawSec', valueInt: 5 },
    { key: 'picksCount',        valueInt: 6 },
    { key: 'pickMax',           valueInt: 49 },
    { key: 'betTiers',          json: [10, 50, 100, 200, 500] },
    { key: 'midnightReset',     valueBool: true },
    { key: 'tailParityMult',    valueInt: 2 },
    { key: 'tailSizeMult',      valueInt: 2 },
  ]);

  // 3) GLOBAL 可選
  await upsertGameConfig('GLOBAL', [
    { key: 'siteName', valueString: 'TopzCasino' },
  ]);

  console.log('✅ Seeding done');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
