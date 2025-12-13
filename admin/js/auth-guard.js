// /admin/js/auth-guard.js
document.addEventListener("DOMContentLoaded", () => {
  const supabase = window.supabaseClient;
  if (!supabase) return;

  // 延遲檢查，避免 race condition
  setTimeout(async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      location.href = "/clinic-purchase-system/admin/login.html";
    }
  }, 500);
});
