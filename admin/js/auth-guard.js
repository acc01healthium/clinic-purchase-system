// admin/js/auth-guard.js
const supabase = window.supabaseClient;

if (!supabase) {
  console.error("Supabase client not found");
} else {
  // 🔒 預設隱藏畫面
  document.body.classList.add("hidden");

  supabase.auth.onAuthStateChange((event, session) => {
    // ❌ 未登入 or 已登出
    if (!session) {
      location.replace("/clinic-purchase-system/admin/login.html");
      return;
    }

    // ✅ 已登入
    document.body.classList.remove("hidden");
  });
}
