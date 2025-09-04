async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  setLoading(true);
  const fd = new FormData(e.currentTarget);
  const body: Record<string, string> = {};
  fd.forEach((v, k) => (body[k] = String(v)));

  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));
  setLoading(false);

  if (!res.ok || !json?.ok) {
    alert(`登入失敗：${json?.error || res.statusText}`);
    return;
  }

  // 確保 cookie 寫入後再跳轉
  window.location.href = "/";
}
