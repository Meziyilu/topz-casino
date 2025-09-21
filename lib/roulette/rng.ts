// 可替換為可驗證隨機（例如 server 端 seed + 客端 salt）
export function nextResult(): { result: number } {
  // 0~36 均勻
  const n = Math.floor(Math.random() * 37);
  return { result: n };
}
