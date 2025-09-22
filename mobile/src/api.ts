import { API_BASE, ROUTES } from "./config";
import { getAccessToken, saveTokens, clearTokens } from "./auth";

async function authedFetch(path: string, init: RequestInit = {}) {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${API_BASE}${path}`, { ...init, headers });
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE}${ROUTES.login}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const data = await res.json();
  // 期望後端回傳 { accessToken, refreshToken }
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
