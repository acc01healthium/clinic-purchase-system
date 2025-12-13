// /admin/js/auth-guard.js
// 後台登入防護（GitHub Pages 穩定版）

(async () => {
  // login.html 本身不要做防護
  if (location.pathname.endsWith("/login.html")) return;

  const supabase = window.supabaseClient;
  if (!supabase) {
    console.error("Supabase client not found");
    return;
  }

  // 取得目前 session
  const { data } = await supabase.auth.getSession();

  if (!data.session) {
    // ❌ 未登入 → 強制回登入頁
    location.replace("/clinic-purchase-system/admin/login.html");
  }
})();
