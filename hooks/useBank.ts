// hooks/useBank.ts
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type BankMe = {
  wallet: number;
  bank: number;
  dailyOut: number;
};

export type BankItem = {
  id: string;
  createdAt: string;
  type: "DEPOSIT" | "WITHDRAW" | "TRANSFER" | string;
  target: "BANK" | "WALLET" | string;
  amount: number; // 一律正值；前端依 type 判斷收支
};

export function useBank() {
  const [me, setMe] = useState<BankMe | null>(null);
  const [items, setItems] = useState<BankItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/bank/me", { credentials: "include" });
      if (r.status === 401) {
        window.location.href = "/login?next=/bank";
        return;
      }
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "FETCH_ME_FAILED");
      setMe({ wallet: d.wallet, bank: d.bank, dailyOut: d.dailyOut });
    } catch (e: any) {
      setError(e?.message || "NETWORK_ERROR");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(
    async (cursor?: string | null) => {
      setLoading(true);
      setError(null);
      try {
        const url = new URL("/api/bank/history", window.location.origin);
        if (cursor) url.searchParams.set("cursor", cursor);
        const r = await fetch(url.toString(), { credentials: "include" });
        if (r.status === 401) {
          window.location.href = "/login?next=/bank";
          return;
        }
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error || "FETCH_HISTORY_FAILED");
        if (cursor) {
          setItems((prev) => [...prev, ...d.items]);
        } else {
          setItems(d.items);
        }
        setNextCursor(d.nextCursor ?? null);
      } catch (e: any) {
        setError(e?.message || "NETWORK_ERROR");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    refresh();
    loadHistory(null);
  }, [refresh, loadHistory]);

  const deposit = useCallback(
    async (amount: number) => {
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("BAD_AMOUNT");
      setActing(true);
      setError(null);
      try {
        const r = await fetch("/api/bank/deposit", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ amount }),
        });
        if (r.status === 401) {
          window.location.href = "/login?next=/bank";
          return;
        }
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error || "DEPOSIT_FAILED");
        await refresh();
        await loadHistory(null);
        return d;
      } catch (e: any) {
        setError(e?.message || "NETWORK_ERROR");
        throw e;
      } finally {
        setActing(false);
      }
    },
    [refresh, loadHistory]
  );

  const withdraw = useCallback(
    async (amount: number) => {
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("BAD_AMOUNT");
      setActing(true);
      setError(null);
      try {
        const r = await fetch("/api/bank/withdraw", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ amount }),
        });
        if (r.status === 401) {
          window.location.href = "/login?next=/bank";
          return;
        }
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error || "WITHDRAW_FAILED");
        await refresh();
        await loadHistory(null);
        return d;
      } catch (e: any) {
        setError(e?.message || "NETWORK_ERROR");
        throw e;
      } finally {
        setActing(false);
      }
    },
    [refresh, loadHistory]
  );

  const transfer = useCallback(
    async (toUserId: string, amount: number) => {
      if (!toUserId) throw new Error("NO_TARGET");
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("BAD_AMOUNT");
      setActing(true);
      setError(null);
      try {
        const r = await fetch("/api/bank/transfer", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ toUserId, amount }),
        });
        if (r.status === 401) {
          window.location.href = "/login?next=/bank";
          return;
        }
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error || "TRANSFER_FAILED");
        await refresh();
        await loadHistory(null);
        return d;
      } catch (e: any) {
        setError(e?.message || "NETWORK_ERROR");
        throw e;
      } finally {
        setActing(false);
      }
    },
    [refresh, loadHistory]
  );

  const hasMore = useMemo(() => Boolean(nextCursor), [nextCursor]);

  return {
    me,
    items,
    hasMore,
    nextCursor,
    loading,
    acting,
    error,
    refresh,
    loadMore: () => (nextCursor ? loadHistory(nextCursor) : Promise.resolve()),
    deposit,
    withdraw,
    transfer,
  };
}
