// services/leaderboard.service.ts
// 用途：提供讀榜查詢，封裝排序與資料整形
import { getLeaderboard, LeaderboardQuery } from "@/lib/snapshot";

export class LeaderboardService {
  async list(input: LeaderboardQuery) {
    return getLeaderboard({
      period: input.period,
      room: input.room,
      withBonus: input.withBonus,
      limit: input.limit,
    });
  }
}

export const leaderboardService = new LeaderboardService();
