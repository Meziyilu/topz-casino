"use client";

import { useMemo, useState, useTransition } from "react";
import { HeadframeCard, HeadframeCode } from "./HeadframeCard";

type Props = {
  owned: HeadframeCode[];
  equipped: HeadframeCode;
  avatarUrl?: string; // ← 新增：從外面傳進來
};

const ALL_CODES: HeadframeCode[] = ["NONE", "GOLD", "NEON", "CRYSTAL", "DRAGON"];

export default function HeadframeSelector({ owned, equipped, avatarUrl }: Props) {
  const [current, setCurrent] = useState<HeadframeCode>(equipped);
  const [preview, setPreview] = useState<HeadframeCode>(equipped);
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string>("");

  const displayList = useMemo(() => {
    const ownSet = new Set(owned);
    return ALL_CODES.slice().sort((a, b) => Number(ownSet.has(b)) - Number(ownSet.has(a)));
  }, [owned]);

  const apply = (code: HeadframeCode) => {
    if (!owned.includes(code) && code !== "NONE") {
      setMsg("你尚未擁有此頭框");
      return;
    }
    startTransition(async () => {
      setMsg("");
      try {
        const res = await fetch("/api/profile/me", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ headframe: code }),
        });
        if (!res.ok) {
          const err = await safeMsg(res);
          throw new Error(err || "裝備失敗");
        }
        setCurrent(code);
        setPreview(code);
        setMsg("已裝備新頭框");
      } catch (e: any) {
        setMsg(e?.message ?? "發生錯誤");
      }
    });
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-slate-100">頭框預覽</h3>
          <p className="text-sm text-slate-400">點擊下方卡片可預覽，按「套用」儲存。</p>
          {msg ? <p className="text-sm text-amber-300">{msg}</p> : null}
        </div>
        <div className="flex items-center gap-3">
          <button
            className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm text-slate-100 hover:bg-white/15 disabled:opacity-50"
            onClick={() => setPreview(current)}
            disabled={isPending || preview === current}
          >
            還原目前裝備
          </button>
          <button
            className="rounded-lg bg-cyan-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
            onClick={() => apply(preview)}
            disabled={isPending || preview === current}
          >
            {isPending ? "套用中…" : "套用"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {displayList.map((code) => {
          const locked = !owned.includes(code) && code !== "NONE";
          return (
            <HeadframeCard
              key={code}
              code={code}
              locked={locked}
              selected={preview === code}
              onClick={() => setPreview(code)}
              avatarUrl={avatarUrl} // ← 傳進卡片
            />
          );
        })}
      </div>
    </section>
  );
}

async function safeMsg(res: Response) {
  try {
    const data = await res.json();
    return data?.message || data?.error;
  } catch {
    return undefined;
  }
}
