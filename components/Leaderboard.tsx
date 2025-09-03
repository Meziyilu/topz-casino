"use client";
import React from "react";

type Item = { rank: number; name: string; value: number };

export default function Leaderboard({ title = "排行榜", items = [] as Item[] }) {
  return (
    <div className="rounded-lg border p-4">
      <h2 className="font-semibold mb-3">{title}</h2>
      <ul className="space-y-1">
        {items.length === 0 ? (
          <li className="text-sm text-gray-500">暫無資料</li>
        ) : (
          items.map((it) => (
            <li key={it.rank} className="flex justify-between text-sm">
              <span>#{it.rank} {it.name}</span>
              <span>{it.value.toLocaleString()}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
