// scripts/validate-structure.ts
// Node/TS 檢查工具：
// 1) 若有 ./scripts/expected-tree.txt -> 以檔內列出的相對路徑為準做比對
// 2) 若沒有 expected-tree.txt -> 用預設 mustExistPaths 清單做存在性檢查
//
// 會輸出：缺少檔案 (missing) 與 多出檔案 (extra)（若使用 expected-tree 模式）
//
// 執行：npm run validate:structure

import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join, relative, sep } from "path";

const ROOT = process.cwd();
const EXPECTED_FILE = join(ROOT, "scripts", "expected-tree.txt");

// 預設「必要檔案清單」：若沒有 expected-tree.txt 就用這份
const mustExistPaths = [
  ".env.example",
  "next.config.js",
  "tailwind.config.cjs",
  "tsconfig.json",
  ".eslintrc.json",
  "package.json",
  "styles/globals.css",

  // lib（核心）
  "lib/auth.ts",
  "lib/prisma.ts",
  "lib/ledger.ts",
  "lib/game-config.ts",
  "lib/utils.ts",

  // 共用服務（可自行擴充）
  "services/users.service.ts",
  "services/ledger.service.ts",
  "services/checkin.service.ts",
  "services/reward.service.ts",
  "services/leaderboard.service.ts",
  "services/chat.service.ts",
  "services/bank.service.ts",

  // Lotto 2.0
  "app/api/lotto/state/route.ts",
  "app/api/lotto/bet/route.ts",
  "app/api/lotto/my-bets/route.ts",
  "app/api/lotto/history/route.ts",
  "app/api/lotto/admin/config/route.ts",
  "app/api/lotto/admin/draw/route.ts",
  "lib/lotto.ts",
  "services/lotto.service.ts",

  // Baccarat
  "app/api/baccarat/state/route.ts",
  "app/api/baccarat/bet/route.ts",
  "app/api/baccarat/my-bets/route.ts",
  "app/api/baccarat/history/route.ts",
  "app/api/baccarat/settle/route.ts",
  "app/api/baccarat/admin/route.ts",
  "services/baccarat.service.ts",

  // Sicbo
  "app/api/sicbo/bet/route.ts",
  "app/api/sicbo/admin/route.ts",
  "services/sicbo.service.ts",

  // Blackjack（雙模式）
  "app/api/blackjack/personal/state/route.ts",
  "app/api/blackjack/personal/bet/route.ts",
  "app/api/blackjack/personal/action/route.ts",
  "app/api/blackjack/personal/history/route.ts",
  "app/api/blackjack/personal/stream/route.ts",
  "app/api/blackjack/table/list/route.ts",
  "app/api/blackjack/table/join/route.ts",
  "app/api/blackjack/table/leave/route.ts",
  "app/api/blackjack/table/state/route.ts",
  "app/api/blackjack/table/bet/route.ts",
  "app/api/blackjack/table/action/route.ts",
  "app/api/blackjack/table/stream/route.ts",
  "lib/blackjack.ts",
  "lib/blackjack-scheduler.ts",
  "services/blackjack.service.ts",

  // Chat
  "app/api/chat/send/route.ts",
  "app/api/chat/stream/route.ts",

  // Bank
  "app/api/bank/deposit/route.ts",
  "app/api/bank/withdraw/route.ts",
  "app/api/bank/transfer/route.ts",
  "app/api/bank/fixed/route.ts",
  "app/api/bank/wallet/route.ts",

  // Users / Ledger / Leaderboard
  "app/api/users/me/route.ts",
  "app/api/users/admin/route.ts",
  "app/api/ledger/route.ts",
  "app/api/leaderboard/route.ts",

  // Prisma / migrations（重要兩筆）
  "prisma/schema.prisma",
  "prisma/migrations/20250902_lotto_v20_daily_reset/migration.sql",
  "prisma/migrations/20250902_blackjack_v112/migration.sql"
];

// 走訪專案樹，產生實際檔案清單
const IGNORES = new Set<string>([
  "node_modules",
  ".git",
  ".next",
  ".turbo",
  "dist",
  "build",
  ".DS_Store"
]);

function listFilesRecursive(dir: string): string[] {
  const out: string[] = [];
  function walk(d: string) {
    for (const name of readdirSync(d)) {
      if (IGNORES.has(name)) continue;
      const full = join(d, name);
      const st = statSync(full);
      if (st.isDirectory()) {
        walk(full);
      } else if (st.isFile()) {
        const rel = relative(ROOT, full).split(sep).join("/");
        out.push(rel);
      }
    }
  }
  walk(dir);
  return out.sort();
}

// 讀 expected-tree.txt（若存在）
function readExpectedList(): string[] {
  const raw = readFileSync(EXPECTED_FILE, "utf8");
  const lines = raw.split(/\r?\n/);
  const paths: string[] = [];
  for (const line of lines) {
    const s = line.trim();
    if (!s || s.startsWith("#")) continue;
    // 只接受相對路徑；Windows 用 / 作比較
    paths.push(s.replace(/\\/g, "/"));
  }
  return paths;
}

function main() {
  if (existsSync(EXPECTED_FILE)) {
    // 模式 A：比對 expected-tree
    const expected = new Set(readExpectedList());
    const actual = new Set(listFilesRecursive(ROOT));

    const missing: string[] = [];
    for (const p of expected) if (!actual.has(p)) missing.push(p);

    const extra: string[] = [];
    for (const p of actual) if (!expected.has(p)) {
      // 忽略一些你不會列在 expected 的產物
      const base = p.split("/")[0];
      if (IGNORES.has(base)) continue;
      if (p.startsWith("package-lock.json")) continue;
      if (p.startsWith("yarn.lock")) continue;
      extra.push(p);
    }

    if (missing.length || extra.length) {
      if (missing.length) {
        console.error("❌ 缺少檔案/路徑（expected 內有列，但實際沒找到）：");
        for (const m of missing) console.error(" -", m);
      }
      if (extra.length) {
        console.error("\n⚠️  多出檔案（實際存在，但 expected 未列；確認是否應該加入或忽略）：");
        for (const e of extra) console.error(" +", e);
      }
      process.exit(1);
    } else {
      console.log("✅ 與 scripts/expected-tree.txt 完全一致！");
      process.exit(0);
    }
  } else {
    // 模式 B：只做「必要存在性」檢查
    const missing = mustExistPaths.filter(p => !existsSync(join(ROOT, p)));
    if (missing.length) {
      console.error("❌ 缺少這些必要檔案/路徑：");
      for (const p of missing) console.error(" -", p);
      process.exit(1);
    } else {
      console.log("✅ 必要檔案都找到了！(未提供 expected-tree.txt)");
      process.exit(0);
    }
  }
}

main();
