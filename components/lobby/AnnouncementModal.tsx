"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "/public/styles/announcements.css";

export type ModalAnnouncement = {
  id?: string;
  title: string;
  body: string;
  updatedAt?: string | Date;
};

type StorageScope = "local" | "session";

type Props = {
  fallback?: ModalAnnouncement[];
  autoOpen?: boolean;
  showLatestOnly?: boolean;
  storageScope?: StorageScope;
  storageKeyPrefix?: string;
  refetchMs?: number;
  okText?: string;
};

function hashStr(s: string) {
  let h = 0, i, chr;
  if (s.length === 0) return "0";
  for (i = 0; i < s.length; i++) {
    chr = s.charCodeAt(i);
    h = (h << 5) - h + chr;
    h |= 0;
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
  const [apiItems, setApiItems] = useState<ModalAnnouncement[]>([]);
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ✅ 僅在瀏覽器時才可用 storage
  const getStore = () => {
    if (typeof window === "undefined") return null;
    return storageScope === "session" ? window.sessionStorage : window.localStorage;
  };

  const items: ModalAnnouncement[] = useMemo(() => {
    if (apiItems.length) return showLatestOnly ? [apiItems[0]] : apiItems;
    if (fallback?.length) return showLatestOnly ? [fallback[0]] : fallback;
    return [];
  }, [apiItems, fallback, showLatestOnly]);

  const top = items[idx];

  function keyFor(a: ModalAnnouncement) {
    const idOrHash = a.id ?? hashStr(`${a.title}#${a.body}`);
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
      const store = getStore();
      if (!store) return false;
      return store.getItem(keyFor(a)) === "1";
    } catch {
      return false;
    }
  }

  function markSeen(a: ModalAnnouncement) {
    try {
      const store = getStore();
      if (!store) return;
      store.setItem(keyFor(a), "1");
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
  }, []);

  function dismissCurrent() {
    if (top) {
      markSeen(top);
    }
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
