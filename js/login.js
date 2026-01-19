// /js/login.js
(() => {
  "use strict";

  const SESSION_KEY = "front_session_v1";

  const supabaseClient = window.supabaseClient;
  if (!supabaseClient) {
    console.error("❌ supabaseClient 不存在，請確認 ./js/supabase.js 是否載入成功");
    return;
  }

  const form = document.getElementById("loginForm");
  const errEl = document.getElementById("err");
  const userEl = document.getElementById("username");
  const passEl = document.getElementById("password");

  function showError(msg = "帳號或密碼錯誤") {
    if (!errEl) return;
    errEl.textContent = msg;
    errEl.style.display = "block";
  }

  function hideError() {
    if (!errEl) return;
    errEl.style.display = "none";
  }

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();

    const username = (userEl?.value || "").trim();
    const password = passEl?.value || "";

    if (!username || !password) {
      showError("請輸入帳號與密碼");
      return;
    }

    try {
      // ✅ 呼叫 RPC（不會把 password_hash 拉到前端）
      const { data, error } = await supabaseClient.rpc("clinic_login", {
        p_username: username,
        p_password: password,
      });

      if (error) {
        console.error("❌ RPC clinic_login error:", error);
        showError("登入失敗（RPC 錯誤）");
        return;
      }

      // data 可能是 [] 或 [{username, clinic_code}]
      const row = Array.isArray(data) ? data[0] : data;

      if (!row || !row.username) {
        showError("帳號或密碼錯誤");
        return;
      }

      // ✅ 寫 session（不存明文密碼）
      const now = Date.now();
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          username: row.username,
          clinic_code: row.clinic_code || null,
          issuedAt: now,
          lastActiveAt: now,
        })
      );

      // ✅ 成功：進前台
      location.replace("./index.html");
    } catch (err) {
      console.error("❌ login exception:", err);
      showError("登入失敗（例外錯誤）");
    }
  });
})();
