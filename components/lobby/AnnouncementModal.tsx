"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "/public/styles/announcements.css";

export type ModalAnnouncement = {
  id?: string;              // 後端有 id 就用 id
  title: string;
  body: string;
  updatedAt?: string | Date;// 後端會有 updatedAt；fallback 可無
};

type StorageScope = "local" | "session";

type Props = {
  /** 若 API 沒資料，用這些公告作為後備。可多筆。 */
  fallback?: ModalAnnouncement[];
  /** 初載時自動彈出（若未讀） */
  autoOpen?: boolean; // default: true
  /** 只顯示最新一則（true）或支援左右切換（false） */
  showLatestOnly?: boolean; // default: true
  /** 記憶作用域：localStorage 或 sessionStorage */
  storageScope?: StorageScope; // default: "local"
  /** 自訂 storage key 前綴（同站多專案時可避免衝突） */
  storageKeyPrefix?: string; // default: "ann"
  /** 幾毫秒重新抓取一次最新公告（避免長駐頁錯過新公告） */
  refetchMs?: number; // default: 300000(5min)
  /** 關閉按鈕文字 */
  okText?: string; // default: "知道了"
};

function hashStr(s: string) {
  let h = 0, i, chr;
  if (s.length === 0) return "0";
  for (i = 0; i < s.length; i++) {
    chr = s.charCodeAt(i);
    h = (h << 5) - h + chr;
    h |= 0; // Convert to 32bit int
  }
  return String(Math.abs(h));
}

export default function AnnouncementModal({
  fallback,
  autoOpen = true,
  showLatestOnly = true,
  storageScope = "local",
  storageKeyPrefix = "ann",
  refetchMs = 300000,
  okText = "知道了",
}: Props) {
  const store = useMemo(
    () => (storageScope === "session" ? sessionStorage : localStorage),
    [storageScope]
  );

  const [apiItems, setApiItems] = useState<ModalAnnouncement[]>([]);
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const items: ModalAnnouncement[] = useMemo(() => {
    if (apiItems.length) return showLatestOnly ? [apiItems[0]] : apiItems;
    if (fallback?.length) return showLatestOnly ? [fallback[0]] : fallback;
    return [];
  }, [apiItems, fallback, showLatestOnly]);

  const top = items[idx];

  function keyFor(a: ModalAnnouncement) {
    const idOrHash =
      a.id ??
      hashStr(`${a.title}#${a.body}`); // fallback 無 id 就用內容 hash
    const ts =
      typeof a.updatedAt === "string"
        ? new Date(a.updatedAt).getTime()
        : a.updatedAt instanceof Date
        ? a.updatedAt.getTime()
        : 0;
    return `${storageKeyPrefix}_seen_${idOrHash}_${ts}`;
  }

  function isSeen(a: ModalAnnouncement) {
    try {
      const k = keyFor(a);
      return store.getItem(k) === "1";
    } catch {
      return false;
    }
  }

  function markSeen(a: ModalAnnouncement) {
    try {
      const k = keyFor(a);
      store.setItem(k, "1");
    } catch {}
  }

  async function fetchLatest() {
    try {
      const r = await fetch("/api/announcements/latest", { cache: "no-store" });
      if (!r.ok) throw new Error("bad");
      const d = await r.json();
      const it = d.item ? [d.item] : [];
      setApiItems(it);
      return it;
    } catch {
      setApiItems([]);
      return [];
    }
  }

  function tryOpen(list: ModalAnnouncement[]) {
    if (!autoOpen || !list.length) return;
    // 找到第一個未讀的
    const firstUnseenIdx = list.findIndex((a) => !isSeen(a));
    if (firstUnseenIdx >= 0) {
      setIdx(firstUnseenIdx);
      setOpen(true);
    }
  }

  useEffect(() => {
    let mounted = true;

    (async () => {
      const got = await fetchLatest();
      if (!mounted) return;
      if (!got.length && (fallback?.length ?? 0) > 0) {
        tryOpen(fallback!);
      } else {
        tryOpen(got);
      }
    })();

    if (refetchMs > 0) {
      timerRef.current = setInterval(fetchLatest, refetchMs);
    }

    return () => {
      mounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen, storageScope, storageKeyPrefix, refetchMs]);

  function dismissCurrent() {
    if (top) {
      markSeen(top);
    }
    // 若不只一則，且還有下一個未讀 → 顯示下一個
    if (!showLatestOnly && items.length > 1) {
      const nextUnseen = items.findIndex((a, i) => i !== idx && !isSeen(a));
      if (nextUnseen >= 0) {
        setIdx(nextUnseen);
        return;
      }
    }
    setOpen(false);
  }

  if (!open || !top) return null;

  return (
    <div className="ann-modal-mask" onClick={dismissCurrent}>
      <div className="ann-modal" onClick={(e) => e.stopPropagation()}>
        {!showLatestOnly && items.length > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <button
              className="ann-btn"
              onClick={() => setIdx((i) => (i - 1 + items.length) % items.length)}
              aria-label="上一則"
              title="上一則"
            >
              ◀
            </button>
            <div className="lb-muted" style={{ alignSelf: "center" }}>
              {idx + 1}/{items.length}
            </div>
            <button
              className="ann-btn"
              onClick={() => setIdx((i) => (i + 1) % items.length)}
              aria-label="下一則"
              title="下一則"
            >
              ▶
            </button>
          </div>
        )}

        <div className="ann-title">{top.title}</div>
        <div className="ann-body">{top.body}</div>
        <div className="ann-actions">
          <button className="ann-btn" onClick={dismissCurrent}>
            {okText}
          </button>
        </div>
      </div>
    </div>
  );
}
