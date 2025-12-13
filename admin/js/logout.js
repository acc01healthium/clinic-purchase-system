// /admin/js/logout.js
// 後台共用登出邏輯（所有 admin 頁適用）

document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");
  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", async () => {
    const supabase = window.supabaseClient;
    if (!supabase) return;

    await supabase.auth.signOut();

    // 強制回登入頁（GitHub Pages 正確路徑）
    location.replace("/clinic-purchase-system/admin/login.html");
  });
});
