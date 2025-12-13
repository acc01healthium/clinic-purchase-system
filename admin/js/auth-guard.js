// admin/js/auth-guard.js
(async () => {
  const supabase = window.supabaseClient;
  const body = document.body;

  if (!supabase) {
    console.error("Supabase client not found");
    return;
  }

  // 🔒 預設隱藏畫面
  body.classList.add("hidden");

  // ✅ 1️⃣ 先主動檢查一次 session（解決空白頁）
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    location.replace("/clinic-purchase-system/admin/login.html");
    return;
  }

  // ✅ 已登入 → 先顯示畫面
  body.classList.remove("hidden");

  // ✅ 2️⃣ 再監聽後續登入 / 登出狀態
  supabase.auth.onAuthStateChange((event, newSession) => {
    if (!newSession) {
      location.replace("/clinic-purchase-system/admin/login.html");
    }
  });
})();
