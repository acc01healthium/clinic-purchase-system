// admin/js/auth-guard.js
document.addEventListener("DOMContentLoaded", async () => {
  const supabase = window.supabaseClient;
  const body = document.body;

  if (!supabase) {
    console.error("Supabase client not found");
    return;
  }

  // 🔒 先隱藏畫面
  body.classList.add("hidden");

  // ✅ 檢查目前 session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    location.replace("/clinic-purchase-system/admin/login.html");
    return;
  }

  // ✅ 已登入 → 顯示畫面
  body.classList.remove("hidden");

  // 🔄 監聽後續登出
  supabase.auth.onAuthStateChange((event, newSession) => {
    if (!newSession) {
      location.replace("/clinic-purchase-system/admin/login.html");
    }
  });
});
