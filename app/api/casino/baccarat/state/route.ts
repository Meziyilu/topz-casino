// 使用 TransactionClient
async function createNextRoundTx(
  tx: Prisma.TransactionClient,
  roomId: string,
  dayStartUtc: Date
) {
  const latest = await tx.round.findFirst({
    where: { roomId, day: dayStartUtc },
    orderBy: [{ roundSeq: "desc" }],
    select: { roundSeq: true },
  });
  const nextSeq = (latest?.roundSeq ?? 0) + 1;
  const now = new Date();

  return tx.round.create({
    data: {
      roomId,
      day: dayStartUtc,
      roundSeq: nextSeq,
      phase: asAny("BETTING"),
      createdAt: now,
      startedAt: now,
    },
    // ⬇︎ 這裡擴充 select，讓回傳型別跟後面使用一致
    select: {
      id: true,
      createdAt: true,
      roundSeq: true,
      phase: true,
      startedAt: true,
      outcome: true,
      playerTotal: true,
      bankerTotal: true,
    },
  });
}
