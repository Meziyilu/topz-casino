// app/(public)/auth-enhance.ts
// 登入/註冊頁互動增強：卡片 3D 跟隨、密碼顯示切換、分頁指示器
export function initAuthUI() {
  // 卡片 3D 跟隨
  const card = document.querySelector<HTMLElement>(".tc-auth-card.tc-follow");
  if (card) {
    const update = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      const rx = (-y / rect.height) * 6; // -6°~6°
      const ry = (x / rect.width) * 6;
      card.style.setProperty("--rx", `${rx}deg`);
      card.style.setProperty("--ry", `${ry}deg`);
    };
    card.addEventListener("mousemove", update);
    card.addEventListener("mouseleave", () => {
      card.style.setProperty("--rx", `0deg`);
      card.style.setProperty("--ry", `0deg`);
    });
  }

  // 密碼顯示/隱藏
  document.querySelectorAll<HTMLButtonElement>(".tc-eye").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = btn.previousElementSibling as HTMLInputElement | null;
      if (!input) return;
      input.type = input.type === "password" ? "text" : "password";
      btn.setAttribute("aria-pressed", input.type === "text" ? "true" : "false");
    });
  });

  // 分頁指示器 (自動定位)
  const tabs = document.querySelector(".tc-tabs");
  if (tabs) {
    const isRegister = location.pathname.includes("/register");
    tabs.classList.toggle("is-register", isRegister);
    tabs.classList.toggle("is-login", !isRegister);
  }
}
