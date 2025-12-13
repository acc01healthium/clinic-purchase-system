// admin/js/auth-guard.js
// 後台共用登入防護（穩定版）
// 功能：
// 1. 未登入 → 強制導回 login.html
// 2. 已登入 → 正常顯示頁面
// 3. 避免來回跳轉、避免重新整理閃爍

(async () => {
  if (!window.supabaseClient) {
    console.error("❌ Supabase 尚未初始化，請確認 supabase.js 載入順序");
    return;
  }

  const { data, error } = await window.supabaseClient.auth.getSession();

  if (error) {
    console.error("❌ 取得 Session 失敗", error);
    location.replace("login.html");
    return;
  }

  if (!data.session) {
    // 🔒 未登入 → 強制回登入頁（不留歷史紀錄）
    location.replace("login.html");
    return;
  }

  // ✅ 已登入：什麼都不做，讓頁面正常跑
  console.log("✅ Admin 已登入", data.session.user.email);
})();
