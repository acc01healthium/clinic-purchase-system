// /admin/js/logout.js
// 後台共用登出（穩定版）

document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");
  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", async () => {
    const supabase = window.supabaseClient;
    if (!supabase) return;

    await supabase.auth.signOut();

    location.replace("/clinic-purchase-system/admin/login.html");
  });
});
