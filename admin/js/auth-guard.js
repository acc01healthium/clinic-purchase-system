// admin/js/auth-guard.js
(async () => {
  const supabase = window.supabaseClient;

  if (!supabase) {
    console.error("Supabase 尚未初始化");
    return;
  }

  // ✅ 等待 Auth 狀態「確定」後再判斷
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    // 未登入 → 回登入頁
    location.replace("login.html");
  }
})();
