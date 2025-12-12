// /admin/js/upload.js
// CSV 批次匯入：解析、預覽、衝突判斷、分批匯入、同步分類

console.log("後台 CSV 匯入 初始化");

// 取得 Supabase client
const supabaseClient = window.supabaseClient;
if (!supabaseClient) {
  console.error("supabaseClient 不存在，請確認 js/supabase.js 是否正確載入。");
}

// DOM 元素
const fileInput = document.getElementById("csvFile");
const previewBtn = document.getElementById("previewBtn");
const previewSection = document.getElementById("previewSection");
const previewTbody = document.getElementById("previewTbody");
const statusEl = document.getElementById("statusMessage");
const summaryText = document.getElementById("summaryText");
const confirmBtn = document.getElementById("confirmImportBtn");
const resetBtn = document.getElementById("resetBtn");
const logoutBtn = document.getElementById("logoutBtn");

// 匯入資料暫存
let importedRows = []; // 每筆：{ index, name, category, spec, unit, last_price, suggested_price, description, exists, productId, action }

// -----------------------------
// 小工具：字串 / 數字處理
// -----------------------------
function toNumberOrNull(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  if (trimmed === "") return null;
  const num = Number(trimmed);
  return Number.isNaN(num) ? null : num;
}

// 簡單 CSV 解析（假設欄位中不含逗號）
function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== "");

  if (lines.length < 2) {
    throw new Error("檔案內容不足，至少要有一列標題與一列資料。");
  }

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());

  const colIndex = {
    name: header.indexOf("name"),
    category: header.indexOf("category"),
    spec: header.indexOf("spec"),
    unit: header.indexOf("unit"),
    last_price: header.indexOf("last_price"),
    suggested_price: header.indexOf("suggested_price"),
    description: header.indexOf("description"),
  };

  const requiredCols = ["name", "category", "spec", "unit", "last_price"];
  const missing = requiredCols.filter((k) => colIndex[k] === -1);
  if (missing.length > 0) {
    throw new Error("缺少必填欄位：" + missing.join(", "));
  }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw) continue;
    const parts = raw.split(","); // 簡化處理：假設欄位中沒有逗號

    const name = (parts[colIndex.name] || "").trim();
    const category = (parts[colIndex.category] || "").trim();
    const spec = (parts[colIndex.spec] || "").trim();
    const unit = (parts[colIndex.unit] || "").trim();
    const last_price = toNumberOrNull(parts[colIndex.last_price]);
    const suggested_price =
      colIndex.suggested_price >= 0
        ? toNumberOrNull(parts[colIndex.suggested_price])
        : null;
    const description =
      colIndex.description >= 0 ? (parts[colIndex.description] || "").trim() : "";

    if (!name && !spec) continue; // 完全空白就略過

    rows.push({
      index: i, // 原始列號（含標題）
      name,
      category,
      spec,
      unit,
      last_price,
      suggested_price,
      description,
      exists: false,
      productId: null,
      action: "insert", // 預設
    });
  }

  return rows;
}

// -----------------------------
// 檢查是否有重複商品（name + spec）
// -----------------------------
async function detectConflicts(rows) {
  if (!supabaseClient) return;

  const names = Array.from(new Set(rows.map((r) => r.name).filter(Boolean)));
  const specs = Array.from(new Set(rows.map((r) => r.spec).filter(Boolean)));

  if (names.length === 0 || specs.length === 0) {
    return;
  }

  const { data, error } = await supabaseClient
    .from("products")
    .select("id, name, spec")
    .in("name", names)
    .in("spec", specs);

  if (error) {
    console.error("檢查重複商品失敗：", error);
    return;
  }

  const map = new Map();
  (data || []).forEach((p) => {
    const key = `${p.name}|||${p.spec}`;
    map.set(key, p.id);
  });

  rows.forEach((row) => {
    const key = `${row.name}|||${row.spec}`;
    if (map.has(key)) {
      row.exists = true;
      row.productId = map.get(key);
      row.action = "update"; // 有重複 → 預設更新
    } else {
      row.exists = false;
      row.productId = null;
      row.action = "insert"; // 沒重複 → 預設新增
    }
  });
}

// -----------------------------
// 確保 categories 表中有對應分類（若有建 table）
// -----------------------------
async function syncCategories(rows) {
  const categories = Array.from(
    new Set(rows.map((r) => r.category).filter((c) => c && c.trim() !== ""))
  );

  if (categories.length === 0) return;

  try {
    // 先找出已存在的
    const { data: existing, error: selErr } = await supabaseClient
      .from("categories")
      .select("id, name")
      .in("name", categories);

    if (selErr) {
      console.warn("讀取 categories 失敗，將略過分類同步：", selErr.message);
      return;
    }

    const existingMap = new Map();
    (existing || []).forEach((c) => existingMap.set(c.name, c.id));

    const toInsert = categories.filter((c) => !existingMap.has(c));
    if (toInsert.length === 0) return;

    const { error: insErr } = await supabaseClient
      .from("categories")
      .insert(toInsert.map((name) => ({ name })));

    if (insErr) {
      console.warn("新增 categories 失敗，將略過分類同步：", insErr.message);
    }
  } catch (err) {
    console.warn("同步分類時發生錯誤（可能尚未建立 categories 表）：", err.message);
  }
}

// -----------------------------
// 預覽畫面渲染
// -----------------------------
function renderPreview() {
  previewTbody.innerHTML = "";
  if (!importedRows || importedRows.length === 0) {
    previewSection.style.display = "none";
    confirmBtn.disabled = true;
    summaryText.textContent = "";
    return;
  }

  previewSection.style.display = "block";

  let insertCount = 0;
  let updateCount = 0;
  let skipCount = 0;

  importedRows.forEach((row, idx) => {
    const tr = document.createElement("tr");

    const descPreview =
      row.description && row.description.length > 20
        ? row.description.slice(0, 20) + "…"
        : row.description || "—";

    const statusText = row.exists ? "已存在（可更新）" : "新商品";
    const statusColor = row.exists ? "#e67e22" : "#2ecc71";

    // 計算摘要（依 action）
    if (row.action === "insert") insertCount++;
    if (row.action === "update") updateCount++;
    if (row.action === "skip") skipCount++;

    const actionSelectId = `action-${idx}`;

    tr.innerHTML = `
      <td>${row.index}</td>
      <td><span style="color:${statusColor}; font-size:0.9rem;">${statusText}</span></td>
      <td>${row.name || "—"}</td>
      <td>${row.category || "—"}</td>
      <td>${row.spec || "—"}</td>
      <td>${row.unit || "—"}</td>
      <td>${row.last_price ?? "—"}</td>
      <td>${row.suggested_price ?? "—"}</td>
      <td title="${row.description ? row.description.replace(/"/g, "&#34;") : ""}">
        ${descPreview}
      </td>
      <td>
        <select id="${actionSelectId}" data-row-index="${idx}" class="edit-input-short">
          ${row.exists
            ? `
              <option value="update" ${row.action === "update" ? "selected" : ""}>更新現有商品</option>
              <option value="insert" ${row.action === "insert" ? "selected" : ""}>新增另一筆</option>
              <option value="skip" ${row.action === "skip" ? "selected" : ""}>略過</option>
            `
            : `
              <option value="insert" ${row.action === "insert" ? "selected" : ""}>新增商品</option>
              <option value="skip" ${row.action === "skip" ? "selected" : ""}>略過</option>
            `}
        </select>
      </td>
    `;

    previewTbody.appendChild(tr);
  });

  summaryText.textContent = `預計新增：${insertCount} 筆，更新：${updateCount} 筆，略過：${skipCount} 筆`;
  confirmBtn.disabled = false;

  // 綁定 select 事件
  importedRows.forEach((_, idx) => {
    const select = document.getElementById(`action-${idx}`);
    if (!select) return;
    select.addEventListener("change", (e) => {
      const rowIndex = Number(e.target.dataset.rowIndex);
      const action = e.target.value;
      if (!importedRows[rowIndex]) return;
      importedRows[rowIndex].action = action;
      renderPreview(); // 重新計算 summary，但不要重綁事件 => 簡單作法：先移除 listener 再重畫
    });
  });
}

// -----------------------------
// 讀檔 + 預覽
// -----------------------------
async function handlePreview() {
  const file = fileInput.files && fileInput.files[0];
  if (!file) {
    alert("請先選擇一個 CSV 檔案。");
    return;
  }

  statusEl.textContent = "讀取檔案中…";
  confirmBtn.disabled = true;
  previewBtn.disabled = true;
  importedRows = [];

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const text = e.target.result;
      const rows = parseCsv(text);
      if (rows.length === 0) {
        alert("沒有可匯入的資料列。");
        statusEl.textContent = "";
        previewBtn.disabled = false;
        return;
      }

      statusEl.textContent = "檢查重複商品中…";
      await detectConflicts(rows);

      importedRows = rows;

      statusEl.textContent = "";
      previewBtn.disabled = false;

      renderPreview();
    } catch (err) {
      console.error("解析 CSV 失敗：", err);
      alert("解析 CSV 失敗：" + err.message);
      statusEl.textContent = "";
      previewBtn.disabled = false;
    }
  };
  reader.onerror = () => {
    alert("讀取檔案失敗，請重新選擇檔案。");
    statusEl.textContent = "";
    previewBtn.disabled = false;
  };
  reader.readAsText(file, "utf-8");
}

// -----------------------------
// 確認匯入
// -----------------------------
async function handleConfirmImport() {
  if (!supabaseClient) return;
  if (!importedRows || importedRows.length === 0) {
    alert("目前沒有預覽資料。");
    return;
  }

  const toInsert = importedRows.filter((r) => r.action === "insert");
  const toUpdate = importedRows.filter((r) => r.action === "update");
  const skipped = importedRows.filter((r) => r.action === "skip").length;

  if (toInsert.length === 0 && toUpdate.length === 0) {
    alert("目前所有資料都設定為略過，沒有可匯入的項目。");
    return;
  }

  const confirmMsg = `確認匯入？\n\n新增：${toInsert.length} 筆\n更新：${toUpdate.length} 筆\n略過：${skipped} 筆`;
  if (!window.confirm(confirmMsg)) return;

  statusEl.textContent = "匯入中，請稍候…";
  confirmBtn.disabled = true;
  previewBtn.disabled = true;

  try {
    // 先同步分類（若有 categories 表）
    await syncCategories(importedRows);

    const nowIso = new Date().toISOString();

    // 分批新增
    if (toInsert.length > 0) {
      const chunkSize = 100;
      for (let i = 0; i < toInsert.length; i += chunkSize) {
        const slice = toInsert.slice(i, i + chunkSize);
        const payload = slice.map((r) => ({
          name: r.name,
          category: r.category || null,
          spec: r.spec || null,
          unit: r.unit || null,
          description: r.description || null,
          last_price: r.last_price,
          suggested_price: r.suggested_price,
          is_active: true,
          currency: "TWD",
          last_price_updated_at: nowIso, // CSV 匯入視為成本更新
        }));

        const { error } = await supabaseClient.from("products").insert(payload);
        if (error) {
          console.error("新增商品失敗：", error);
          throw new Error("新增商品時發生錯誤：" + error.message);
        }
      }
    }

    // 分批更新
    if (toUpdate.length > 0) {
      const chunkSize = 50;
      for (let i = 0; i < toUpdate.length; i += chunkSize) {
        const slice = toUpdate.slice(i, i + chunkSize);
        const payload = slice.map((r) => ({
          id: r.productId,
          name: r.name,
          category: r.category || null,
          spec: r.spec || null,
          unit: r.unit || null,
          description: r.description || null,
          last_price: r.last_price,
          suggested_price: r.suggested_price,
          last_price_updated_at: nowIso, // 有填 last_price → 視為成本更新
        }));

        const { error } = await supabaseClient
          .from("products")
          .upsert(payload, { onConflict: "id" });

        if (error) {
          console.error("更新商品失敗：", error);
          throw new Error("更新商品時發生錯誤：" + error.message);
        }
      }
    }

    statusEl.textContent = "";
    alert(
      `匯入完成！\n\n新增：${toInsert.length} 筆\n更新：${toUpdate.length} 筆\n略過：${skipped} 筆`
    );
    window.location.href = "index.html";
  } catch (err) {
    console.error("匯入流程錯誤：", err);
    alert("匯入失敗：" + err.message);
    statusEl.textContent = "";
    confirmBtn.disabled = false;
    previewBtn.disabled = false;
  }
}

// -----------------------------
// Reset 預覽
// -----------------------------
function handleReset() {
  importedRows = [];
  previewTbody.innerHTML = "";
  previewSection.style.display = "none";
  summaryText.textContent = "";
  confirmBtn.disabled = true;
  statusEl.textContent = "";
}

// -----------------------------
// 事件綁定
// -----------------------------
if (fileInput) {
  fileInput.addEventListener("change", () => {
    previewBtn.disabled = !(fileInput.files && fileInput.files[0]);
  });
}
if (previewBtn) {
  previewBtn.addEventListener("click", handlePreview);
}
if (confirmBtn) {
  confirmBtn.addEventListener("click", handleConfirmImport);
}
if (resetBtn) {
  resetBtn.addEventListener("click", handleReset);
}
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    window.location.href = "login.html";
  });
}
