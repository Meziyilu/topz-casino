import { API_BASE, ROUTES } from "./config";
import { getAccessToken, saveTokens, clearTokens } from "./auth";

async function authedFetch(input: string, init: RequestInit = {}) {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(`${API_BASE}${input}`, { ...init, headers });
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE}${ROUTES.login}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  // 期待後端回傳 { accessToken, refreshToken }（你 v1.1.3 可支援）
  const data = await res.json();
  if (data.accessToken && data.refreshToken) {
    await saveTokens(data.accessToken, data.refreshToken);
  }
  return data;
}

export async function me() {
  const res = await authedFetch(ROUTES.me, { method: "GET" });
  if (res.status === 401) {
    await clearTokens();
    throw new Error("Unauthorized");
  }
  return res.json();
}
