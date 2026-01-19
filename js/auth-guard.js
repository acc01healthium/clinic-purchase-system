// /js/auth-guard.js
(() => {
  "use strict";

  // ✅ 這個要跟 login.js 完全一致
  const SESSION_KEY = "clinic_front_session_v1";

  // ✅ 10 分鐘
  const IDLE_SECONDS = 600;

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
    } catch {
      // ignore
    }
  }

  function gotoLogin(reason = "timeout") {
    // ✅ 登出後 replace 到 login（避免按上一頁回到內容頁）
    const url = new URL(location.href);
    url.pathname = url.pathname.replace(/\/[^/]*$/, "/login.html");
    url.searchParams.set("reason", reason);
    location.replace(url.toString());
  }

  function logout(reason = "manual") {
    localStorage.removeItem(SESSION_KEY);
    gotoLogin(reason);
  }

  // ✅ 統一「最後活動時間」欄位（跟 login.js 對齊）
  function touchSession() {
    const s = readSession();
    if (!s) return;

    const now = Date.now();
    s.last_activity_at = now;

    // ✅ 若你 session 有 expires_at，就順便把有效期往後推 10 分鐘（滑鼠動一動就續命）
    s.expires_at = now + IDLE_SECONDS * 1000;

    writeSession(s);
  }

  function formatMMSS(seconds) {
    const r = Math.max(0, seconds);
    const mm = String(Math.floor(r / 60)).padStart(2, "0");
    const ss = String(r % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }

  // ===== Start (等 DOM 好了才抓 timerEl / logoutBtn) =====
  document.addEventListener("DOMContentLoaded", () => {
    const timerEl = document.getElementById("idleTimer");
    const logoutBtn = document.getElementById("logoutBtn");

    // 1) 沒 session → 擋
    const session = readSession();
    if (!session) {
      gotoLogin("no_session");
      return;
    }

    // 1.5) 若已過期（有 expires_at 就用 expires_at 判斷）
    if (session.expires_at && Date.now() > Number(session.expires_at)) {
      logout("expired");
      return;
    }

    // 2) 有操作就更新 last_activity_at
    //    ✅ 用 rAF 節流，避免 mousemove 造成每秒寫入 localStorage 很多次
    let rafPending = false;
    const markActive = () => {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        touchSession();
      });
    };

    // 你要的「沒有操作」：滑鼠/鍵盤/觸控/滾動都算
    ["mousemove", "mousedown", "keydown", "touchstart", "scroll"].forEach((ev) => {
      window.addEventListener(ev, markActive, { passive: true });
    });

    // 切回分頁也算活動（可選，但很實用）
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) markActive();
    });

    // ✅ 綁登出按鈕
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => logout("manual"));
    }

    // 3) 每秒倒數檢查
    const tick = () => {
      const s = readSession();
      if (!s) return logout("no_session");

      const now = Date.now();

      // 優先用 expires_at（最準）
      let remain;
      if (s.expires_at) {
        remain = Math.floor((Number(s.expires_at) - now) / 1000);
      } else {
        // fallback：用 last_activity_at 推算
        const last = Number(s.last_activity_at || s.login_at || 0);
        const elapsed = Math.floor((now - last) / 1000);
        remain = IDLE_SECONDS - elapsed;
      }

      // ✅ 更新倒數 UI
      if (timerEl) {
        timerEl.textContent = `閒置登出倒數：${formatMMSS(remain)}`;
      }

      if (remain <= 0) logout("idle_timeout");
    };

    tick(); // 先跑一次，畫面立刻出現 10:00
    setInterval(tick, 1000);

    // ✅ 提供全域登出（如果你別處想直接呼叫）
    window.frontLogout = () => logout("manual");
  });
})();
