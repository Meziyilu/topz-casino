export type DiceTriple = [number, number, number];
export type Phase = "BETTING" | "LOCKED" | "SETTLED";

export type RoomState = {
  room: "R30" | "R60" | "R90";
  roundId: string | null;
  day: string;
  daySeq: number;
  phase: Phase;
  startsAt: string;
  locksAt: string;
  settledAt: string | null;
  dice?: DiceTriple;
  sum?: number;
  isTriple?: boolean;
  exposure: Record<string, number>;
};
