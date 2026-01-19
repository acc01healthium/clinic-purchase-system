// /js/login.js
(() => {
  "use strict";

  const supabaseClient = window.supabaseClient;
  if (!supabaseClient) {
    console.error("❌ supabaseClient 不存在，請確認 /js/supabase.js 是否正確載入。");
    return;
  }

  const SESSION_KEY = "front_session_v1";

  const form = document.getElementById("loginForm");
  const usernameEl = document.getElementById("username");
  const passwordEl = document.getElementById("password");
  const msgEl = document.getElementById("loginMsg");

  function setMsg(text, type = "error") {
    if (!msgEl) return;
    msgEl.textContent = text || "";
    msgEl.style.display = text ? "block" : "none";
    msgEl.dataset.type = type;
  }

  function writeSession({ username, clinic_code }) {
    const now = Date.now();
    const session = {
      username,
      clinic_code,
      issuedAt: now,
      lastActiveAt: now,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function gotoApp() {
    // ✅ 用 replace：避免按上一頁回到 login
    const url = new URL(location.href);
    url.pathname = url.pathname.replace(/\/[^/]*$/, "/index.html");
    url.search = ""; // 清掉 reason 參數
    location.replace(url.toString());
  }

  // 若已登入就直接進前台
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.username) gotoApp();
    }
  } catch {}

  if (!form) {
    console.warn("⚠️ 找不到 #loginForm，請確認 login.html 的表單 id。");
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = (usernameEl?.value || "").trim();
    const password = (passwordEl?.value || "").trim();

    if (!username || !password) {
      setMsg("請輸入帳號與密碼");
      return;
    }

    setMsg("登入中…", "info");

    // ✅ 用 RPC 驗證（不把 password_hash 拉到前端）
    const { data, error } = await supabaseClient.rpc("clinic_login", {
      p_username: username,
      p_password: password,
    });

    if (error) {
      // 這裡最常見就是「沒有 grant execute」或「被 RLS 擋」
      console.error("❌ clinic_login RPC error:", error);
      setMsg(`登入失敗（權限/設定問題）：${error.message}`);
      return;
    }

    // Supabase rpc 回傳：可能是物件或陣列（看 function 寫法）
    const row = Array.isArray(data) ? data[0] : data;

    if (!row || !row.username) {
      setMsg("帳號或密碼錯誤");
      return;
    }

    writeSession({ username: row.username, clinic_code: row.clinic_code });
    setMsg(""); // 清訊息
    gotoApp();
  });
})();
