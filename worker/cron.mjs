// worker/cron.mjs

function normalizeBaseUrl(u) {
  if (!u) throw new Error("BASE_URL is empty. Set env BASE_URL to your site, e.g. https://topz-casino.onrender.com");
  u = u.trim();

  // 如果像 "topz-casino.onrender.com" 沒有協定，就補 https://
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;

  // 轉成 URL 檢查是否合法，並移除尾端斜線
  const parsed = new URL(u);
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  return parsed.toString();
}

async function hit(path, body = null) {
  const raw = process.env.BASE_URL || process.env.RENDER_EXTERNAL_URL || "";
  const CRON_SECRET = process.env.CRON_SECRET || "";
  const base = normalizeBaseUrl(raw);
  const url = new URL(path, base).toString();

  const headers = { "x-cron-key": CRON_SECRET };
  const opts = body
    ? { method: "POST", headers, body: JSON.stringify(body) }
    : { method: "POST", headers };

  // debug 輸出
  console.log(`[worker] Hitting: ${url}`);
  console.log(`[worker] Headers:`, headers);

  const res = await fetch(url, opts);
  const text = await res.text();
  if (!res.ok) {
    console.error(`[worker] ${res.status} ${res.statusText} -> ${text.slice(0, 300)}`);
    throw new Error(`HTTP ${res.status}`);
  }
  console.log(`[worker] OK -> ${text.slice(0, 300)}`);
}

async function main() {
  const cmd = process.argv[2] || "tick";

  if (cmd === "tick") {
    // 每 5~10 秒跑的自動流程
    await hit("/api/casino/baccarat/admin/auto");
    return;
  }

  if (cmd === "daily") {
    // 每日 00:00 的整包任務（清理 + 歸零 + 開新局）
    await hit("/api/casino/baccarat/admin/daily-reset");
    return;
  }

  // 其他自訂子命令也可放在這裡
  throw new Error(`Unknown command: ${cmd}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
