// /js/login.js
(() => {
  "use strict";

  const supabaseClient = window.supabaseClient;
  if (!supabaseClient) {
    console.error("❌ supabaseClient 不存在，請確認 /js/supabase.js 是否正確載入。");
    return;
  }

  // ===== DOM (依你的 login.html 調整) =====
  const elUser = document.getElementById("username");
  const elPass = document.getElementById("password");
  const elBtn = document.getElementById("loginBtn");
  const elMsg = document.getElementById("loginMsg");

  // ===== Config =====
  const SESSION_KEY = "clinic_front_session_v1";
  const SESSION_TTL_MS = 10 * 60 * 1000; // 10 分鐘（你之後 idle timer 也用這個）

  function setMsg(text, type = "info") {
    if (!elMsg) return;
    elMsg.textContent = text || "";
    elMsg.style.color = type === "error" ? "#b91c1c" : "#334155";
  }

  function setLoading(isLoading) {
    if (!elBtn) return;
    elBtn.disabled = isLoading;
    elBtn.textContent = isLoading ? "登入中…" : "登入";
  }

  function saveSession(payload) {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn("saveSession failed:", e);
    }
  }

  function buildSession({ username, clinic_code }) {
    const now = Date.now();
    return {
      username,
      clinic_code,
      login_at: now,
      expires_at: now + SESSION_TTL_MS,
      last_activity_at: now, // 之後 idle timer 會更新它
    };
  }

  async function doLogin() {
    const username = (elUser?.value || "").trim();
    const password = (elPass?.value || "").trim();

    if (!username || !password) {
      setMsg("請輸入帳號與密碼", "error");
      return;
    }

    setMsg("");
    setLoading(true);

    try {
      // ✅ 用 RPC 驗證（安全：不會把 password_hash 拉到前端）
      const { data, error } = await supabaseClient.rpc("clinic_login", {
        p_username: username,
        p_password: password,
      });

      if (error) {
        console.error("clinic_login error:", error);
        setMsg("登入失敗（系統錯誤），請稍後再試", "error");
        return;
      }

      // RPC 回傳的是 table（陣列），取第一筆
      const row = Array.isArray(data) ? data[0] : data;
      const ok = !!row?.ok;

      if (!ok) {
        setMsg("帳號或密碼錯誤，或此帳號已停用", "error");
        return;
      }

      const session = buildSession({
        username: row.username || username,
        clinic_code: row.clinic_code || null,
      });

      saveSession(session);

      // 登入成功 → 回到前台
      window.location.href = "./index.html";
    } catch (e) {
      console.error(e);
      setMsg("登入失敗，請稍後再試", "error");
    } finally {
      setLoading(false);
    }
  }

  // ===== Events =====
  if (elBtn) elBtn.addEventListener("click", doLogin);

  // Enter 直接登入
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doLogin();
  });

  // 若已登入且 session 還有效，直接導回 index
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s?.expires_at && Date.now() < s.expires_at) {
        window.location.href = "./index.html";
      }
    }
  } catch {
    // ignore
  }
})();
