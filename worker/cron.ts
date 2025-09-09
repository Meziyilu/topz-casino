// worker/cron.ts
import fetch from "node-fetch";

async function main() {
  const CRON_SECRET = process.env.CRON_SECRET || "dev_secret";
  const BASE_URL = process.env.NEXT_PUBLIC_APP_ORIGIN || "https://你的域名";

  // 要打的 API
  const urls = [
    `${BASE_URL}/api/casino/baccarat/admin/auto`,
    `${BASE_URL}/api/casino/baccarat/admin/daily-reset`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "x-cron-key": CRON_SECRET },
      });
      const text = await res.text();
      console.log(`[CRON] ${url} → ${res.status}`, text);
    } catch (err) {
      console.error(`[CRON] ${url} → ERROR`, err);
    }
  }
}

main();
