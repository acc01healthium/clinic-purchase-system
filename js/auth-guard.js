// /js/auth-guard.js
(() => {
  "use strict";

  const SESSION_KEY = "front_session_v1";

  // ✅ 10分鐘閒置登出
  const idleSeconds = 600;

  // ✅ 右上角倒數顯示區（放在登出按鈕下方）
  const timerEl = document.getElementById("idleTimer");

  function readSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s || !s.username) return null;
      return s;
    } catch {
      return null;
    }
  }

  function writeSession(s) {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    } catch {}
  }

  function logout(reason = "timeout") {
    localStorage.removeItem(SESSION_KEY);

    // ✅ 登出後 replace 到 login（避免按上一頁回到內容頁）
    const url = new URL(location.href);
    url.pathname = url.pathname.replace(/\/[^/]*$/, "/login.html");
    url.searchParams.set("reason", reason);
    location.replace(url.toString());
  }

  // 1) 沒 session → 擋
  const session = readSession();
  if (!session) {
    logout("no_session");
    return;
  }

  // 2) 有操作就更新 lastActiveAt
  const markActive = () => {
    const s = readSession();
    if (!s) return;
    s.lastActiveAt = Date.now();
    writeSession(s);
  };

  // 你要的「沒有操作」：滑鼠/鍵盤/觸控/滾動都算
  ["mousemove", "mousedown", "keydown", "touchstart", "scroll"].forEach((ev) => {
    window.addEventListener(ev, markActive, { passive: true });
  });

  // 3) 每秒倒數檢查
  setInterval(() => {
    const s = readSession();
    if (!s) return logout("no_session");

    const last = Number(s.lastActiveAt || s.issuedAt || 0);
    const elapsed = Math.floor((Date.now() - last) / 1000);
    const remain = idleSeconds - elapsed;

    // ✅ 更新倒數 UI（格式：mm:ss）
    if (timerEl) {
      const r = Math.max(0, remain);
      const mm = String(Math.floor(r / 60)).padStart(2, "0");
      const ss = String(r % 60).padStart(2, "0");
      timerEl.textContent = `閒置登出倒數：${mm}:${ss}`;
    }

    if (remain <= 0) logout("idle_timeout");
  }, 1000);

  // ✅ 提供全域登出函式給登出按鈕呼叫（可選）
  window.frontLogout = () => logout("manual");
})();
