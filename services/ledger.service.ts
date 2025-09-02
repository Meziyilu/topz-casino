// services/ledger.service.ts
// 用途：如果你希望在 Service 層統一呼叫（避免直接 import lib/ledger.ts）
import { writeLedgerAndAffectBalance, WriteLedgerInput } from "@/lib/ledger";

export class LedgerService {
  async write(input: WriteLedgerInput) {
    await writeLedgerAndAffectBalance(input);
  }
}

export const ledgerService = new LedgerService();
