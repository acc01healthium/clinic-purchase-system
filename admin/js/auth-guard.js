// admin/js/auth-guard.js
(async () => {
  const supabase = window.supabaseClient;
  const body = document.body;

  if (!supabase) {
    console.error("Supabase client not found");
    return;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    location.replace("/clinic-purchase-system/admin/login.html");
    return;
  }

  // ✅ 已登入 → 顯示畫面（解除 hidden）
  body.classList.remove("hidden");
})();
