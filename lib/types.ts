export type DiceTriple = [number, number, number];
export type ExposureMap = Record<string, number>; // e.g. BIG, TOTAL_9, FACE_3, DBL_4, TRIPLE_ANY, TRIPLE_666, COMBO_2_5
export type Phase = "BETTING" | "LOCKED" | "SETTLED";

export type RoomState = {
  room: "R30"|"R60"|"R90";
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
  exposure: ExposureMap;
};
