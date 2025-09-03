// ==============================
// file: lib/snapshot.ts
// ==============================
import prisma from "./prisma";
import { StatPeriod } from "@prisma/client";


export type SnapshotIncrement = {
userId: string;
room?: string | null; // e.g., "R30" | "R60" | null for lobby/global
betsCount?: number; // 次數
wagered?: number; // 下注總額
payout?: number; // 派彩總額
profit?: number; // 淨利(可為負)
};


function periodKey(p: StatPeriod): StatPeriod { return p; }


async function upsertOne(p: StatPeriod, inc: SnapshotIncrement) {
const { userId, room = null, betsCount = 0, wagered = 0, payout = 0, profit = 0 } = inc;
return prisma.userStatSnapshot.upsert({
where: { userId_period_room: { userId, period: periodKey(p), room } },
create: {
userId,
period: periodKey(p),
room,
betsCount,
wagered,
payout,
profit,
},
update: {
betsCount: { increment: betsCount },
wagered: { increment: wagered },
payout: { increment: payout },
profit: { increment: profit },
},
});
}


export async function bumpSnapshots(inc: SnapshotIncrement) {
// Update ALL_TIME + rolling periods you track (DAILY/WEEKLY/MONTHLY)
await Promise.all([
upsertOne("ALL_TIME", inc),
upsertOne("DAILY", inc),
upsertOne("WEEKLY", inc),
]);
}

