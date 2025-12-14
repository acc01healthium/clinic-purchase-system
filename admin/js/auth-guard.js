// /admin/js/auth-guard.js
(async () => {
  const supabase = window.supabaseClient;
  if (!supabase) return;

  const { data } = await supabase.auth.getSession();

  if (!data.session) {
    location.replace("login.html");
    return;
  }

  // ✅ 登入成功才顯示畫面（解除 hidden）
  document.body.classList.remove("hidden");
})();
