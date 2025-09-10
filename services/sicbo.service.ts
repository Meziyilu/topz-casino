import { prisma } from "@/lib/prisma";
import { ensureRooms, getRoomConfig, getRoomState } from "@/lib/sicbo/room";

export type SicboRoomKey = "R30" | "R60" | "R90";

class SicboService {
  static async getState(room:SicboRoomKey, userId?:string){
    await ensureRooms();
    const s = getRoomState(room);
    const cfg = getRoomConfig(room);
    if (!s || !cfg) throw new Error("ROOM_NOT_READY");

    const history = await prisma.sicboRound.findMany({
      where:{ room },
      orderBy:{ startsAt:"desc" },
      take:50,
      select:{ daySeq:true, die1:true, die2:true, die3:true, sum:true, isTriple:true }
    });

    let my = null;
    if (userId && s.roundId) {
      const [me, bets] = await Promise.all([
        prisma.user.findUnique({ where:{ id:userId }, select:{ balance:true }}),
        prisma.sicboBet.findMany({ where:{ userId, roundId:s.roundId }, orderBy:{ placedAt:"desc" }, take:20 })
      ]);
      my = { balance: me?.balance ?? 0, lastBets:bets };
    }

    return {
      room, serverTime:new Date().toISOString(),
      current:s, config:cfg, exposure:s.exposure, history, my
    };
  }
}
export default SicboService;
