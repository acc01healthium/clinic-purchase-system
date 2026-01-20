// /js/auth-guard.js
(() => {
  "use strict";

  const SESSION_KEY = "front_session_v1";
  const idleSeconds = 60; // 10 分鐘

  // ✅ 對應你現在的 HTML：idleCounter（並兼容舊版 idleTimer）
  const timerEl =
    document.getElementById("idleCounter") ||
    document.getElementById("idleTimer");

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
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  }

  function logout(reason = "timeout") {
    localStorage.removeItem(SESSION_KEY);
    const url = new URL(location.href);
    url.pathname = url.pathname.replace(/\/[^/]*$/, "/login.html");
    url.searchParams.set("reason", reason);
    location.replace(url.toString());
  }

  // ① 檢查 session
  const session = readSession();
  if (!session) {
    logout("no_session");
    return;
  }

  // ✅ ② 進頁面時「立即刷新活動時間」（關鍵）
  session.lastActiveAt = Date.now();
  writeSession(session);

  // ✅（可選）進頁面立刻顯示一次
  if (timerEl) timerEl.textContent = "閒置登出倒數：10:00";

  // ③ 使用者操作 → 更新 lastActiveAt
  const markActive = () => {
    const s = readSession();
    if (!s) return;
    s.lastActiveAt = Date.now();
    writeSession(s);
  };

  ["mousemove", "mousedown", "keydown", "touchstart", "scroll"].forEach((ev) => {
    window.addEventListener(ev, markActive, { passive: true });
  });

  // ④ 倒數檢查
  setInterval(() => {
    const s = readSession();
    if (!s) return logout("no_session");

    const elapsed = Math.floor((Date.now() - s.lastActiveAt) / 1000);
    const remain = idleSeconds - elapsed;

    if (timerEl) {
      const r = Math.max(0, remain);
      const mm = String(Math.floor(r / 60)).padStart(2, "0");
      const ss = String(r % 60).padStart(2, "0");
      timerEl.textContent = `閒置登出倒數：${mm}:${ss}`;
    }

    if (remain <= 0) logout("idle_timeout");
  }, 1000);

  // 手動登出（index.js 會呼叫）
  window.frontLogout = () => logout("manual");
})();
