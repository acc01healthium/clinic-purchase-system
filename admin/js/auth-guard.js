// /admin/js/auth-guard.js

(async () => {
  const { data } = await window.supabaseClient.auth.getSession();

  if (!data.session) {
    location.replace("/clinic-purchase-system/admin/login.html");
    return;
  }

  // ✅ 有登入 → 顯示畫面
  document.body.classList.remove("hidden");
})();
