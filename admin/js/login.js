// admin/js/login.js

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("loginBtn");

  if (!btn) {
    console.error("❌ 找不到 loginBtn");
    return;
  }

  btn.addEventListener("click", async () => {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    if (!email || !password) {
      alert("請輸入帳號與密碼");
      return;
    }

    const { error } = await window.supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      alert("登入失敗：" + error.message);
      return;
    }

    // ✅ 登入成功 → 後台首頁（不留歷史）
    location.replace("index.html");
  });
});
