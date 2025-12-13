// admin/js/account.js
(() => {
  const supabase = window.supabaseClient;
  const msg = document.getElementById("msg");

  // 👉 如果已登入，直接進後台首頁
  supabase.auth.getSession().then(({ data }) => {
    if (data.session) {
      location.replace("/admin/users.html");
    }
  });

  const loginBtn = document.getElementById("loginBtn");
  if (!loginBtn) return;

  loginBtn.addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      msg.textContent = "登入失敗：" + error.message;
      return;
    }

    // ✅ 登入成功 → 用 replace（不是 href）
    location.replace("/admin/users.html");
  });
})();

