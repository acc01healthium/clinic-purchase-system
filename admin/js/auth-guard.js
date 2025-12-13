// /admin/js/auth-guard.js
// GitHub Pages + Supabase 穩定防護版（不會誤踢）

document.addEventListener("DOMContentLoaded", async () => {
  // login.html 本身不做防護
  if (location.pathname.endsWith("/login.html")) return;

  const supabase = window.supabaseClient;
  if (!supabase) {
    console.error("Supabase client not ready");
    return;
  }

  try {
    // 等 session 完全恢復
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error("Get session error:", error);
    }

    if (!data.session) {
      // 未登入 → 強制回登入頁
      location.replace("/clinic-purchase-system/admin/login.html");
    }
  } catch (err) {
    console.error("Auth guard exception:", err);
    location.replace("/clinic-purchase-system/admin/login.html");
  }
});
