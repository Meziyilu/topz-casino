// worker/cron.mjs
// 用法：
//   node worker/cron.mjs auto-once      -> 打一次 /admin/auto
//   node worker/cron.mjs auto-loop      -> 連續 60 秒每 5 秒打一次 /admin/auto（給每分鐘排程用）
//   node worker/cron.mjs daily          -> 打一次 /admin/daily-job

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET || "dev_secret";
const ROOM_LIST = (process.env.ROOMS || "R30,R60,R90").split(","); // 若你的 /admin/auto 會處理所有房，就不需要這個

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function hit(path, label) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "x-cron-key": CRON_SECRET },
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`[${label}] ${res.status} ${res.statusText} -> ${text}`);
    throw new Error(`${label} failed`);
  }
  console.log(`[${label}] OK -> ${text}`);
}

async function autoOnce() {
  // 若 /admin/auto 會自動處理所有房，直接打一支即可：
  await hit(`/api/casino/baccarat/admin/auto`, "auto");
  // 如果你的 auto 需要分房處理，改成：
  // for (const r of ROOM_LIST) await hit(`/api/casino/baccarat/admin/auto?room=${r}`, `auto:${r}`);
}

async function autoLoopOneMinute() {
  // 每 5 秒打一次，持續 60 秒，配合「每分鐘」的 Cron 任務
  const started = Date.now();
  do {
    try { await autoOnce(); } catch {}
    await sleep(5000);
  } while (Date.now() - started < 60_000);
}

async function dailyJob() {
  await hit(`/api/casino/baccarat/admin/daily-job`, "daily-job");
}

async function main() {
  const cmd = process.argv[2];
  if (!cmd) {
    console.log("Usage: node worker/cron.mjs <auto-once|auto-loop|daily>");
    process.exit(1);
  }
  if (cmd === "auto-once") await autoOnce();
  else if (cmd === "auto-loop") await autoLoopOneMinute();
  else if (cmd === "daily") await dailyJob();
  else {
    console.log("Unknown cmd:", cmd);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
