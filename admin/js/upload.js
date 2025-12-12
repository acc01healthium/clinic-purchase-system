// /admin/js/upload.js
// 後台 CSV 匯入商品：解析 / 預覽 / 寫入 Supabase

console.log("後台 CSV 匯入 初始化");

// 取得 Supabase client
const supabaseClient = window.supabaseClient;
if (!supabaseClient) {
  console.error("supabaseClient 不存在，請確認 admin/js/supabase.js 是否正確載入。");
}

// --- DOM 元素（多種 id 做保險） ---
const fileInput =
  document.getElementById("csvFile") ||
  document.getElementById("csvInput") ||
  document.querySelector('input[type="file"]');

const startBtn =
  document.getElementById("startImportBtn") ||
  document.getElementById("csvStartBtn");

const previewTbody =
  document.getElementById("previewTbody") ||
  document.querySelector("#previewTable tbody");

const summaryEl =
  document.getElementById("importSummary") ||
  document.getElementById("summaryText");

const modeSelect =
  document.getElementById("importMode") ||
  document.querySelector("select#importMode");

// 預設模式：新增 + 更新
let currentMode = "insert_update";
if (modeSelect) {
  currentMode = modeSelect.value || "insert_update";
  modeSelect.addEventListener("change", () => {
    currentMode = modeSelect.value || "insert_update";
  });
}

// 暫存解析後資料
let parsedRecords = [];

// -----------------------------
// 工具函式：CSV 解析
// -----------------------------
function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== "");

  if (lines.length < 2) return [];

  const header = splitCsvLine(lines[0]).map((h) => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    if (cols.length === 1 && cols[0].trim() === "") continue;

    const obj = {};
    header.forEach((key, idx) => {
      obj[key] = cols[idx] !== undefined ? cols[idx].trim() : "";
    });
    rows.push(obj);
  }
  return rows;
}

// 簡單 CSV 行解析（處理引號 + 逗點）
function splitCsvLine(line) {
  const result = [];
  let cur = "";
  let inQuote = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === "," && !inQuote) {
      result.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

function toNumberOrNull(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}

function toBoolOrNull(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim().toLowerCase();
  if (!s) return null;
  if (["1", "true", "是", "啟用", "yes"].includes(s)) return true;
  if (["0", "false", "否", "停用", "no"].includes(s)) return false;
  return null;
}

function shortText(s, len = 20) {
  if (!s) return "";
  return s.length > len ? s.slice(0, len) + "…" : s;
}

// -----------------------------
// 讀檔 & 預覽
// -----------------------------
if (startBtn && fileInput) {
  startBtn.addEventListener("click", () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) {
      alert("請先選擇一個 CSV 檔案。");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const rawRows = parseCsv(text);
      if (!rawRows.length) {
        alert("CSV 內容為空或格式錯誤。");
        return;
      }
      await buildPreview(rawRows);
    };
    reader.readAsText(file, "utf-8");
  });
}

// 將 CSV 資料 + DB 現有商品比對，產生預覽
async function buildPreview(rawRows) {
  if (!supabaseClient) return;

  // 先抓現有商品 (name + spec 做 key)
  const { data: existing, error } = await supabaseClient
    .from("products")
    .select("id, name, spec, last_price");

  if (error) {
    console.error("讀取現有商品失敗：", error);
    alert("讀取現有商品失敗，請稍後再試。");
    return;
  }

  const map = new Map();
  (existing || []).forEach((p) => {
    const key = (p.name || "").trim() + "||" + (p.spec || "");
    map.set(key, p);
  });

  parsedRecords = [];
  let countNew = 0;
  let countUpdate = 0;

  if (previewTbody) previewTbody.innerHTML = "";

  rawRows.forEach((r, idx) => {
    const name = (r.name || "").trim();
    if (!name) return; // 沒 name 略過

    const spec = (r.spec || "").trim();
    const key = name + "||" + spec;
    const existed = map.get(key) || null;

    const row = {
      idx: idx + 1,
      name,
      category: (r.category || "").trim() || null,
      spec: spec || null,
      unit: (r.unit || "").trim() || null,
      last_price: toNumberOrNull(r.last_price),
      suggested_price: toNumberOrNull(r.suggested_price),
      is_active: toBoolOrNull(r.is_active),
      description: (r.description || "").trim() || null,
      sku: (r.sku || "").trim() || null,
      existedId: existed ? existed.id : null,
      existedLastPrice: existed ? existed.last_price : null,
    };

    // 判斷預設動作（先不看 mode，後面再套用）
    row.baseAction = existed ? "update" : "insert";

    if (row.baseAction === "insert") countNew++;
    else countUpdate++;

    parsedRecords.push(row);
  });

  // 畫預覽表格
  if (previewTbody) {
    parsedRecords.forEach((r) => {
      const tr = document.createElement("tr");

      const statusText =
        r.baseAction === "insert" ? "新商品" : "更新";
      const statusColor =
        r.baseAction === "insert" ? "#00a86b" : "#ff9800";

      tr.innerHTML = `
        <td>${r.idx}</td>
        <td>${r.name}</td>
        <td>${r.category || "—"}</td>
        <td>${r.spec || "—"}</td>
        <td>${r.unit || "—"}</td>
        <td>${r.last_price ?? "—"}</td>
        <td>${r.suggested_price ?? "—"}</td>
        <td>${r.is_active === null ? "—" : r.is_active ? "啟用" : "停用"}</td>
        <td title="${r.description || ""}">${shortText(r.description, 18) || "—"}</td>
        <td><span style="color:${statusColor};font-weight:600;">${statusText}</span></td>
      `;
      previewTbody.appendChild(tr);
    });
  }

  if (summaryEl) {
    summaryEl.textContent = `預計新增：${countNew} 筆，更新：${countUpdate} 筆（實際執行會依上方模式設定調整）`;
  }

  const modeLabel =
    currentMode === "insert_only"
      ? "【僅新增，不更新既有商品】"
      : currentMode === "update_only"
      ? "【僅更新既有商品，不新增】"
      : "【新增 + 更新】";

  if (
    confirm(
      `${modeLabel}\n\n共解析 ${parsedRecords.length} 筆商品資料。\n\n是否開始寫入 Supabase？`
    )
  ) {
    await applyChangesToSupabase();
  }
}

// -----------------------------
// 寫入 Supabase（重點：更新不再 insert id）
// -----------------------------
async function applyChangesToSupabase() {
  if (!supabaseClient) return;
  if (!parsedRecords.length) {
    alert("目前沒有可匯入的資料。");
    return;
  }

  let toInsert = [];
  let toUpdate = [];

  parsedRecords.forEach((r) => {
    const hasExisting = !!r.existedId;
    let action = "skip";

    if (currentMode === "insert_only") {
      action = hasExisting ? "skip" : "insert";
    } else if (currentMode === "update_only") {
      action = hasExisting ? "update" : "skip";
    } else {
      // insert_update
      action = hasExisting ? "update" : "insert";
    }

    if (action === "insert") {
      toInsert.push(r);
    } else if (action === "update") {
      toUpdate.push(r);
    }
  });

  // --- 新增商品：使用 insert，不帶 id ---
  if (toInsert.length > 0) {
    const insertPayload = toInsert.map((r) =>
      buildProductPayload(r, /*isNew*/ true)
    );

    const { error: insertErr } = await supabaseClient
      .from("products")
      .insert(insertPayload);

    if (insertErr) {
      console.error("批次新增失敗：", insertErr);
      alert("新增商品發生錯誤：" + insertErr.message);
      return;
    }
  }

  // --- 更新商品：逐筆 update，不再用 upsert / insert id ---
  let updateError = null;
  for (const r of toUpdate) {
    const payload = buildProductPayload(
      r,
      /*isNew*/ false,
      r.existedLastPrice
    );

    const { error: updErr } = await supabaseClient
      .from("products")
      .update(payload)
      .eq("id", r.existedId);

    if (updErr) {
      console.error("更新商品失敗：", updErr, "商品：", r.name, r.spec);
      updateError = updErr;
      break;
    }
  }

  if (updateError) {
    alert("部分商品更新失敗：" + updateError.message);
    return;
  }

  alert(
    `匯入完成！新增 ${toInsert.length} 筆，更新 ${toUpdate.length} 筆，其餘依模式略過。`
  );
  window.location.href = "index.html";
}

// 建立寫入 products 的 payload
// isNew: 是否為新增資料
// existedLastPrice: 舊的 last_price（用來判斷是否要更新 last_price_updated_at）
function buildProductPayload(record, isNew, existedLastPrice) {
  const payload = {
    name: record.name,
    category: record.category,
    spec: record.spec,
    unit: record.unit,
    description: record.description,
    last_price: record.last_price,
    suggested_price: record.suggested_price,
    is_active:
      record.is_active === null ? true : !!record.is_active,
    sku: record.sku,
  };

  // 只在「進價有變」時更新 last_price_updated_at
  const lp = record.last_price;

  if (isNew) {
    if (lp !== null && lp !== undefined) {
      payload.last_price_updated_at = new Date().toISOString();
    }
  } else {
    const oldLp = existedLastPrice;
    const changed =
      (lp === null && oldLp !== null) ||
      (lp !== null && Number(lp) !== Number(oldLp ?? null));
    if (changed) {
      payload.last_price_updated_at = new Date().toISOString();
    }
  }

  return payload;
}
