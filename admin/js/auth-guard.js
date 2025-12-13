// /admin/js/auth-guard.js
document.addEventListener("DOMContentLoaded", async () => {
  // 登入頁不做防護
  if (location.pathname.endsWith("/admin/login.html")) return;

  const supabase = window.supabaseClient;
  if (!supabase) return;

  const { data } = await supabase.auth.getSession();

  if (!data.session) {
    location.replace("/clinic-purchase-system/admin/login.html");
  }
});
