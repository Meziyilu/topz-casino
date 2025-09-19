"use client";

import { useCallback, useMemo, useState } from "react";
import HeadframeCard, { HeadframeCode } from "./HeadframeCard";

type Props = {
  owned: HeadframeCode[];              // 玩家擁有的頭框
  equipped: HeadframeCode;             // 目前已裝備
  avatarUrl?: string;                  // 玩家頭像（可選）
  onApplied?: (code: HeadframeCode) => void; // 套用成功後的回呼（可選）
};

const ALL_CODES: HeadframeCode[] = ["NONE", "GOLD", "NEON", "CRYSTAL", "DRAGON"];

export default function HeadframeSelector({ owned, equipped, avatarUrl, onApplied }: Props) {
  const [selected, setSelected] = useState<HeadframeCode>(equipped);
  const [saving, setSaving] = useState(false);
  const [hint, setHint] = useState<string>("");

  const isLocked = useCallback(
    (code: HeadframeCode) => !owned.includes(code),
    [owned]
  );

  const canApply = useMemo(() => {
    return selected !== equipped && !isLocked(selected) && !saving;
  }, [selected, equipped, saving, isLocked]);

  const apply = useCallback(async () => {
    if (!canApply) return;
    setSaving(true);
    setHint("");

    try {
      // 直接更新個人資料的 headframe
      const res = await fetch("/api/profile/me", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ headframe: selected }),
      });

      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(d?.error || "套用失敗");
      }

      setHint("已套用 ✅");
      onApplied?.(selected);
    } catch (e: any) {
      setHint(e?.message || "套用失敗");
    } finally {
      setSaving(false);
      setTimeout(() => setHint(""), 1500);
    }
  }, [canApply, selected, onApplied]);

  return (
    <div className="flex flex-col gap-3">
      {/* 置中的固定網格：永遠固定卡片尺寸，每列 5 張（窄螢幕自動換行） */}
      <div className="mx-auto grid max-w-[680px] grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {ALL_CODES.map((code) => {
          const locked = isLocked(code);
          return (
            <HeadframeCard
              key={code}
              code={code}
              selected={selected === code}
              locked={locked}
              avatarUrl={avatarUrl}
              onClick={() => setSelected(code)}
            />
          );
        })}
      </div>

      {/* 操作列（固定寬度置中） */}
      <div className="mx-auto flex w-full max-w-[680px] items-center justify-between gap-2">
        <div className="text-sm text-slate-400">
          目前：<span className="font-semibold text-slate-200">{equipped}</span>
          <span className="mx-2">→</span>
          預覽：<span className="font-semibold text-cyan-300">{selected}</span>
          {isLocked(selected) && <span className="ml-2 text-amber-300">（尚未擁有）</span>}
        </div>

        <div className="flex items-center gap-2">
          {hint && (
            <span className="text-sm text-slate-300">{hint}</span>
          )}
          <button
            disabled={!canApply}
            onClick={apply}
            className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-bold text-slate-100 shadow-sm transition
                       enabled:hover:translate-y-[-1px] enabled:hover:bg-white/14 enabled:hover:shadow
                       disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "套用中…" : "套用"}
          </button>
        </div>
      </div>
    </div>
  );
}
