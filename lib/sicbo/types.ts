export type DiceTriple = [number, number, number];
export type Phase = "BETTING" | "LOCKED" | "SETTLED";
export type RoomKey = "R30" | "R60" | "R90";

export type RoomState = {
  room: RoomKey;
  roundId: string | null;
  day: string;          // YYYY-MM-DD
  daySeq: number;       // # of round in the day
  phase: Phase;
  startsAt: string;     // ISO
  locksAt: string;      // ISO
  settledAt: string | null;
  dice?: DiceTriple;
  sum?: number;
  isTriple?: boolean;
  exposure: Record<string, number>;
};

export type SicboConfigDTO = {
  drawIntervalSec: number;
  lockBeforeRollSec: number;
  limits: {
    minBet: number;
    maxBet: number;
    perTypeMax: number;
    perRoundMax: number;
  };
  payoutTable: any;
};
