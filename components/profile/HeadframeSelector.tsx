"use client";

import { useMemo, useState, useTransition } from "react";
import { HeadframeCard, HeadframeCode } from "./HeadframeCard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner"; // 或換用你的提示元件
import { Loader2 } from "lucide-react";

type Props = {
  /** 玩家目前已擁有的頭框 */
  owned: HeadframeCode[];
  /** 目前裝備中的頭框 */
  equipped: HeadframeCode;
};

const ALL_CODES: HeadframeCode[] = ["NONE", "GOLD", "NEON", "CRYSTAL", "DRAGON"];

export default function HeadframeSelector({ owned, equipped }: Props) {
  const [current, setCurrent] = useState<HeadframeCode>(equipped);
  const [preview, setPreview] = useState<HeadframeCode>(equipped);
  const [isPending, startTransition] = useTransition();

  const displayList = useMemo(() => {
    // 依你需求排序：已擁有優先、再未擁有
    const ownSet = new Set(owned);
    return ALL_CODES.slice().sort((a, b) => Number(ownSet.has(b)) - Number(ownSet.has(a)));
  }, [owned]);

  const apply = (code: HeadframeCode) => {
    if (!owned.includes(code) && code !== "NONE") {
      toast.error("你尚未擁有此頭框");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/profile/me", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ headframe: code }),
        });
        if (!res.ok) {
          const msg = await safeMsg(res);
          throw new Error(msg || "裝備失敗");
        }
        setCurrent(code);
        setPreview(code);
        toast.success("已裝備新頭框");
      } catch (err: any) {
        toast.error(err.message ?? "發生錯誤");
      }
    });
  };

  return (
    <section className="space-y-4">
      {/* 頭像預覽（可嵌到你的玩家卡） */}
      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/3 p-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-slate-100">頭框預覽</h3>
          <p className="text-sm text-slate-400">點擊下方卡片可即時預覽，按「套用」儲存。</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => setPreview(current)}
            disabled={isPending || preview === current}
          >
            還原目前裝備
          </Button>
          <Button onClick={() => apply(preview)} disabled={isPending || preview === current}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            套用
          </Button>
        </div>
      </div>

      {/* 卡片清單 */}
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
