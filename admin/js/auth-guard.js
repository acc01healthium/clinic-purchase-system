// /admin/js/auth-guard.js
(async () => {
  const supabase = window.supabaseClient;

  if (!supabase) {
    console.error("❌ supabaseClient 不存在");
    return;
  }

  const { data } = await supabase.auth.getSession();

  if (!data.session) {
    // 未登入 → 回登入頁
    location.replace("/clinic-purchase-system/admin/login.html");
    return;
  }

  // 已登入 → 顯示頁面（解決閃一下）
  document.body.classList.remove("hidden");
})();
