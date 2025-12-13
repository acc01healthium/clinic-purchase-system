// admin/js/auth-guard.js
(async () => {
  const supabase = window.supabaseClient;
  const body = document.body;

  if (!supabase) {
    console.error("Supabase client not found");
    return;
  }

  // ❗ 不要用 getSession 直接判斷
  // 要等 auth 狀態「真正 ready」
  supabase.auth.onAuthStateChange((event, session) => {
    if (!session) {
      location.replace("/clinic-purchase-system/admin/login.html");
      return;
    }

    // ✅ 確定登入後才顯示畫面
    body.classList.remove("hidden");
  });
})();
