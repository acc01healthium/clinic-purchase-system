// /js/admin-categories.js
// 後台：分類新增（單筆/批次）+ 防重複 + 自動配 tone（若 DB/Trigger 有做會更穩）
// 依賴：window.supabaseClient（來自 js/supabase.js）
// 建議資料表：product_categories (name unique, tone text nullable)
// 若你還沒建立表：會在畫面提示「表不存在」

(() => {
  "use strict";

  const TABLE = "product_categories"; // 你若用別的表名，改這行即可
  const TONES = [
    "tone-0","tone-1","tone-2","tone-3","tone-4","tone-5",
    "tone-6","tone-7","tone-8","tone-9","tone-10","tone-11"
  ];

  const supabase = window.supabaseClient;
  if (!supabase) {
    console.error("❌ supabaseClient 不存在，請確認後台 supabase.js 載入順序");
    return;
  }

  // ========= Utils =========
  const $ = (sel, root = document) => root.querySelector(sel);

  function normalizeName(s) {
    return String(s || "")
      .trim()
      .replace(/\s+/g, " ");
  }

  function splitNames(raw) {
    // 支援：換行、逗號、頓號、分號、全形逗號
    return String(raw || "")
      .split(/[\n,，、;；]+/g)
      .map(normalizeName)
      .filter(Boolean);
  }

  function unique(arr) {
    return Array.from(new Set(arr));
  }

  function setMsg(el, msg, type = "info") {
    if (!el) return;
    el.textContent = msg || "";
    el.dataset.type = type; // for styling hook if you want
  }

  // ========= UI Builder (自動生成，不用你改 HTML) =========
  function ensurePanel() {
    // 如果你有自己放容器（可選）：<div id="adminTools"></div>
    const host = document.getElementById("adminTools") || document.body;

    // 已存在就不要重複插
    let panel = document.getElementById("categoryAdminPanel");
    if (panel) return panel;

    panel = document.createElement("section");
    panel.id = "categoryAdminPanel";
    panel.style.cssText = `
      max-width: 1200px;
      margin: 14px auto 0;
      padding: 0 18px;
    `;

    panel.innerHTML = `
      <div style="
        background:#fff;border-radius:18px;box-shadow:0 10px 28px rgba(0,0,0,.08);
        padding:16px 16px 14px; border:1px solid rgba(2,132,199,.12)
      ">
        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;justify-content:space-between;">
          <div style="font-weight:900;color:#0f172a;letter-spacing:.3px;">分類管理（單筆 / 批次新增）</div>
          <div id="catMsg" style="font-size:13px;color:#475569;"></div>
        </div>

        <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:12px;align-items:center;">
          <input id="catNameInput" type="text" placeholder="輸入分類名稱（例：清潔用品）"
            style="flex:1;min-width:240px;padding:11px 14px;border-radius:999px;border:1px solid rgba(2,132,199,.25);font-size:15px;"
          />
          <button id="catAddOneBtn" type="button"
            style="border:0;border-radius:999px;padding:10px 16px;font-weight:900;cursor:pointer;color:#fff;
                   background:linear-gradient(135deg,#00aee0,#14c2c5);box-shadow:0 8px 18px rgba(0,0,0,.12);"
          >新增單筆</button>

          <button id="catReloadBtn" type="button"
            style="border-radius:999px;padding:10px 16px;font-weight:900;cursor:pointer;
                   background:#fff;border:2px solid rgba(0,174,224,.45);color:#008bb7;"
          >重新讀取清單</button>
        </div>

        <div style="margin-top:12px;display:grid;gap:10px;">
          <textarea id="catBatchTextarea" rows="4"
            placeholder="批次新增：可用換行/逗號分隔
例：
清潔用品
醫療耗材, 注射針劑"
            style="width:100%;padding:12px 14px;border-radius:16px;border:1px solid rgba(2,132,199,.18);
                   font-size:14px;line-height:1.5;resize:vertical;"
          ></textarea>

          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:flex-end;">
            <button id="catAddBatchBtn" type="button"
              style="border:0;border-radius:999px;padding:10px 16px;font-weight:900;cursor:pointer;color:#fff;
                     background:linear-gradient(135deg,#00aee0,#14c2c5);box-shadow:0 8px 18px rgba(0,0,0,.12);"
            >批次新增</button>
          </div>

          <div style="font-size:12px;color:#64748b;">
            ※ 這裡只「建立分類名」與（可選）tone。前台若要跨瀏覽器顏色一致，請用 DB tone（你之前提的 Trigger/兜底那套會最穩）。
          </div>

          <div id="catListBox" style="
            margin-top:4px;
            border-top:1px dashed rgba(0,0,0,.08);
            padding-top:10px;
            display:flex;flex-wrap:wrap;gap:8px;
          "></div>
        </div>
      </div>
    `;

    // 插到 body 最上方比較直覺（你也可以改插入位置）
    host.prepend(panel);
    return panel;
  }

  // ========= DB Helpers =========
  async function tableHealthCheck() {
    // 用最小查詢測表存在
    const { error } = await supabase.from(TABLE).select("name").limit(1);
    return !error;
  }

  async function fetchExisting() {
    const { data, error } = await supabase
      .from(TABLE)
      .select("name,tone")
      .order("name", { ascending: true });

    if (error) throw error;

    const map = new Map();
    (data || []).forEach((r) => {
      const k = normalizeName(r.name);
      if (k) map.set(k, r.tone || "");
    });
    return map;
  }

  function pickTone(existingMap) {
    // 先拿「未用過」tone，12色用完再輪
    const used = new Set();
    existingMap.forEach((tone) => {
      if (TONES.includes(tone)) used.add(tone);
    });
    const free = TONES.find((t) => !used.has(t));
    return free || TONES[existingMap.size % TONES.length];
  }

  async function insertCategories(names, { autoTone = true } = {}) {
    const clean = unique(names.map(normalizeName)).filter(Boolean);
    if (!clean.length) return { inserted: 0, skipped: 0 };

    const existingMap = await fetchExisting();
    const toInsert = [];

    clean.forEach((name) => {
      if (existingMap.has(name)) return;
      const row = { name };
      if (autoTone) row.tone = pickTone(existingMap); // 若你 DB trigger 會自動塞，也可不塞
      toInsert.push(row);

      // 先把 tone 記到 existingMap，避免同批次一直拿同色
      existingMap.set(name, row.tone || "");
    });

    if (!toInsert.length) return { inserted: 0, skipped: clean.length };

    const { error } = await supabase.from(TABLE).insert(toInsert);
    if (error) throw error;

    return { inserted: toInsert.length, skipped: clean.length - toInsert.length };
  }

  // ========= Render =========
  function renderList(catListBox, map) {
    if (!catListBox) return;
    catListBox.innerHTML = "";

    if (!map || map.size === 0) {
      const empty = document.createElement("div");
      empty.style.cssText = "color:#64748b;font-size:13px;";
      empty.textContent = "目前沒有分類（或尚未讀取）";
      catListBox.appendChild(empty);
      return;
    }

    Array.from(map.entries()).forEach(([name, tone]) => {
      const pill = document.createElement("span");
      pill.textContent = tone ? `${name} · ${tone}` : name;
      pill.style.cssText = `
        display:inline-flex;align-items:center;gap:6px;
        padding:7px 12px;border-radius:999px;
        font-size:13px;font-weight:800;
        background:rgba(2,132,199,.08);
        border:1px solid rgba(2,132,199,.14);
        color:#0f172a;
        white-space:nowrap;
      `;
      catListBox.appendChild(pill);
    });
  }

  // ========= Bind (支援你已存在的 id；沒有就用自動 UI) =========
  document.addEventListener("DOMContentLoaded", async () => {
    const panel = ensurePanel();

    // 若你後台已經有自己的欄位，可以用這些 id（可選）
    // 單筆：#categoryNewInput, #btnAddCategory
    // 批次：#textareaBatchCategories, #btnBatchAddCategories
    const nameInput =
      document.getElementById("categoryNewInput") ||
      document.getElementById("catNameInput");

    const addOneBtn =
      document.getElementById("btnAddCategory") ||
      document.getElementById("catAddOneBtn");

    const batchTextarea =
      document.getElementById("textareaBatchCategories") ||
      document.getElementById("catBatchTextarea");

    const addBatchBtn =
      document.getElementById("btnBatchAddCategories") ||
      document.getElementById("catAddBatchBtn");

    const reloadBtn = document.getElementById("catReloadBtn");
    const msgEl = document.getElementById("catMsg");
    const listBox = document.getElementById("catListBox");

    // 先檢查表存不存在
    const ok = await tableHealthCheck();
    if (!ok) {
      setMsg(
        msgEl,
        `⚠️ 找不到資料表：${TABLE}（請先建立分類表與 unique(name)）`,
        "error"
      );
      console.error(`❌ Table "${TABLE}" not found or no permission.`);
      return;
    }

    // 初始讀取
    async function refresh() {
      try {
        setMsg(msgEl, "讀取分類中…");
        const map = await fetchExisting();
        renderList(listBox, map);
        setMsg(msgEl, `已讀取 ${map.size} 個分類`);
      } catch (e) {
        console.error(e);
        setMsg(msgEl, "❌ 讀取分類失敗，請看 Console", "error");
      }
    }

    // 單筆新增
    async function addOne() {
      try {
        const name = normalizeName(nameInput?.value);
        if (!name) return setMsg(msgEl, "請輸入分類名稱", "warn");

        setMsg(msgEl, "新增中…");
        const res = await insertCategories([name], { autoTone: true });

        if (nameInput) nameInput.value = "";
        setMsg(msgEl, `✅ 完成：新增 ${res.inserted}，略過 ${res.skipped}`);
        await refresh();
      } catch (e) {
        console.error(e);
        setMsg(msgEl, `❌ 新增失敗：${e?.message || "unknown error"}`, "error");
      }
    }

    // 批次新增
    async function addBatch() {
      try {
        const raw = batchTextarea?.value || "";
        const names = unique(splitNames(raw));
        if (!names.length) return setMsg(msgEl, "請輸入要批次新增的分類（換行/逗號分隔）", "warn");

        setMsg(msgEl, `批次新增中…（${names.length}）`);
        const res = await insertCategories(names, { autoTone: true });

        if (batchTextarea) batchTextarea.value = "";
        setMsg(msgEl, `✅ 完成：新增 ${res.inserted}，略過 ${res.skipped}`);
        await refresh();
      } catch (e) {
        console.error(e);
        setMsg(msgEl, `❌ 批次新增失敗：${e?.message || "unknown error"}`, "error");
      }
    }

    // 綁事件
    if (addOneBtn) addOneBtn.addEventListener("click", addOne);
    if (addBatchBtn) addBatchBtn.addEventListener("click", addBatch);
    if (reloadBtn) reloadBtn.addEventListener("click", refresh);

    if (nameInput) {
      nameInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          addOne();
        }
      });
    }

    await refresh();
  });
})();
