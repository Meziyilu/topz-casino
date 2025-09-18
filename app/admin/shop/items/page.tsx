// app/admin/shop/items/page.tsx
"use client";

import useSWR from "swr";
import { useState } from "react";
import Link from "next/link";

type ItemRow = {
  id: string;
  code: string;
  title: string;
  kind: string;
  currency: "COIN" | "DIAMOND" | "TICKET" | "GACHA_TICKET";
  visible: boolean;
  priceFrom: number;
  skuCount: number;
  skuUsedTotal: number;
  createdAt: string;
};

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((r) => r.json());

export default function AdminShopItemsPage() {
  const { data, mutate, isLoading, error } = useSWR<{ items: ItemRow[] }>(
    "/api/admin/shop/items",
    fetcher
  );

  const [formOpen, setFormOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [f, setF] = useState({
    kind: "HEADFRAME",
    currency: "DIAMOND",
    code: "",
    title: "",
    imageUrl: "",
    basePrice: 999,
    visible: true,
  });

  async function createItem() {
    try {
      setCreating(true);
      const r = await fetch("/api/admin/shop/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(f),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error ?? "新增失敗");
      setFormOpen(false);
      setF({
        kind: "HEADFRAME",
        currency: "DIAMOND",
        code: "",
        title: "",
        imageUrl: "",
        basePrice: 999,
        visible: true,
      });
      mutate();
      alert("新增成功");
    } catch (e: any) {
      alert(e?.message ?? "新增失敗");
    } finally {
      setCreating(false);
    }
  }

  async function toggleVisible(id: string, visible: boolean) {
    const r = await fetch(`/api/admin/shop/items/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ visible }),
    });
    const j = await r.json();
    if (!r.ok) return alert(j?.error ?? "更新失敗");
    mutate();
  }

  async function removeItem(id: string) {
    if (!confirm("確定要刪除這個商品？（會檢查是否已有訂單）")) return;
    const r = await fetch(`/api/admin/shop/items/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const j = await r.json();
    if (!r.ok) return alert(j?.error ?? "刪除失敗");
    mutate();
  }

  return (
    <main className="admin-items">
      <header className="head glass">
        <div>
          <h1>商品 / SKU 管理</h1>
          <p className="sub">建立商品、管理上架與價格</p>
        </div>
        <button className="btn" onClick={() => setFormOpen((v) => !v)}>
          ＋ 新增商品
        </button>
      </header>

      {formOpen && (
        <section className="glass form">
          <div className="row">
            <label>種類</label>
            <select
              value={f.kind}
              onChange={(e) => setF((s) => ({ ...s, kind: e.target.value }))}
            >
              <option value="HEADFRAME">HEADFRAME</option>
              <option value="BADGE">BADGE</option>
              <option value="BUNDLE">BUNDLE</option>
              <option value="OTHER">OTHER</option>
            </select>
          </div>
          <div className="row">
            <label>結帳幣別</label>
            <select
              value={f.currency}
              onChange={(e) =>
                setF((s) => ({ ...s, currency: e.target.value as any }))
              }
            >
              <option value="COIN">COIN</option>
              <option value="DIAMOND">DIAMOND</option>
              <option value="TICKET">TICKET</option>
              <option value="GACHA_TICKET">GACHA_TICKET</option>
            </select>
          </div>
          <div className="row">
            <label>代碼</label>
            <input
              value={f.code}
              onChange={(e) => setF((s) => ({ ...s, code: e.target.value }))}
              placeholder="例：HF_NEON"
            />
          </div>
          <div className="row">
            <label>名稱</label>
            <input
              value={f.title}
              onChange={(e) => setF((s) => ({ ...s, title: e.target.value }))}
              placeholder="例：霓虹旋律"
            />
          </div>
          <div className="row">
            <label>圖片 URL</label>
            <input
              value={f.imageUrl}
              onChange={(e) =>
                setF((s) => ({ ...s, imageUrl: e.target.value }))
              }
              placeholder="/assets/shop/frames/neon.gif"
            />
          </div>
          <div className="row">
            <label>顯示底價</label>
            <input
              type="number"
              value={f.basePrice}
              onChange={(e) =>
                setF((s) => ({ ...s, basePrice: parseInt(e.target.value) || 0 }))
              }
            />
          </div>
          <div className="row">
            <label>是否顯示</label>
            <input
              type="checkbox"
              checked={f.visible}
              onChange={(e) => setF((s) => ({ ...s, visible: e.target.checked }))}
            />
          </div>
          <div className="actions">
            <button className="btn" onClick={createItem} disabled={creating}>
              {creating ? "建立中..." : "建立"}
            </button>
            <button className="btn ghost" onClick={() => setFormOpen(false)}>
              取消
            </button>
          </div>
        </section>
      )}

      <section className="glass list">
        {isLoading ? (
          <p className="muted">載入中…</p>
        ) : error ? (
          <p className="err">讀取失敗</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>代碼</th>
                <th>名稱</th>
                <th>種類</th>
                <th>幣別</th>
                <th>最低價</th>
                <th>SKU數</th>
                <th>SKU使用次數</th>
                <th>顯示</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {data?.items?.map((x) => (
                <tr key={x.id}>
                  <td className="mono">{x.code}</td>
                  <td>{x.title}</td>
                  <td>{x.kind}</td>
                  <td>{x.currency}</td>
                  <td>{x.priceFrom}</td>
                  <td>{x.skuCount}</td>
                  <td>{x.skuUsedTotal}</td>
                  <td>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={x.visible}
                        onChange={(e) => toggleVisible(x.id, e.target.checked)}
                      />
                      <span />
                    </label>
                  </td>
                  <td className="ops">
                    <Link className="btn sm" href={`/shop/${x.code}`} target="_blank">
                      預覽
                    </Link>
                    <button className="btn sm danger" onClick={() => removeItem(x.id)}>
                      刪除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ✅ 正確載入 public 下的 CSS */}
      <link rel="stylesheet" href="/styles/admin/admin-items.css" />
    </main>
  );
}
