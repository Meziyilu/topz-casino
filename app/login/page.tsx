// 只展示 onSubmit 內的差異，其他維持你現在版面與動畫

async function onSubmit(e: React.FormEvent) {
  e.preventDefault();
  setBusy(true);
  setErr(null);
  try {
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j?.ok) {
      setErr(j?.error || r.statusText || "登入失敗");
      return;
    }

    // 1) 嘗試從多種欄位拿 token
    const token = j?.token || j?.accessToken || j?.jwt || j?.data?.token;
    if (token) {
      localStorage.setItem("token", token);
      localStorage.setItem("jwt", token);
      localStorage.setItem("access_token", token);
      router.replace(search.get("next") || "/lobby");
      return;
    }

    // 2) 若沒有 token，改用 Cookie 模式：請求 /api/auth/me 驗證是否已登入
    const me = await fetch("/api/auth/me", { cache: "no-store" }).then(x => x.json()).catch(() => null);
    if (me?.ok) {
      // Cookie 有效就直接導頁
      router.replace(search.get("next") || "/lobby");
      return;
    }

    // 3) 仍失敗 → 呈現錯誤
    setErr("未取得登入憑證（token）。請稍後再試或聯繫管理員。");
  } catch {
    setErr("網路或伺服器錯誤");
  } finally {
    setBusy(false);
  }
}
