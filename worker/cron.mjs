// worker/cron.mjs
const BASE = process.env.CRON_BASE_URL || "https://你的域名";
const KEY  = process.env.CRON_SECRET   || "dev_secret";

async function hit(path) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "x-cron-key": KEY }
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`[worker] ${path} -> ${res.status} ${res.statusText} :: ${text}`);
    process.exit(1);
  }
  console.log(`[worker] ${path} -> ${text}`);
}

const mode = process.argv[2];
if (mode === "tick") {
  // 只跑一次 auto（給你在 Render 的 cron job 用：*/5 * * * * *）
  hit("/api/casino/baccarat/admin/auto").then(()=>process.exit(0));
} else if (mode === "daily") {
  hit("/api/casino/baccarat/admin/daily-task").then(()=>process.exit(0));
} else {
  console.log("Usage: node worker/cron.mjs <tick|daily>");
  process.exit(1);
}
