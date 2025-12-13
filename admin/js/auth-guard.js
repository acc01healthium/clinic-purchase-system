(async function () {
  const supabase = window.supabaseClient;
  if (!supabase) {
    console.error("❌ supabaseClient 不存在");
    return;
  }

  // 取得 session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // 未登入 → 強制回 login
  if (!session) {
    location.replace("login.html");
    return;
  }

  // 登出按鈕（如果頁面有）
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await supabase.auth.signOut();
      location.replace("login.html");
    });
  }
})();
