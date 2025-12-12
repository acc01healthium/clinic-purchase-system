// /admin/js/upload.js
// 後台 CSV 匯入：預覽 + 批次新增 / 更新（安全版，支援換行 description）

console.log("後台 CSV 匯入 初始化");

// 取得 Supabase client
const supabaseClient = window.supabaseClient;
if (!supabaseClient) {
  console.error("supabaseClient 不存在，請確認 admin/js/supabase.js 是否正確載入。");
}

// 小工具：取第一個存在的元素
function getEl(...ids) {
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) return el;
  }
  return null;
}

// DOM 元素（盡量向下相容舊 id）
const fileInput = getEl("csvFileInput", "csvFile");
const previewBtn = getEl("previewBtn", "startPreviewBtn", "startImportBtn");
const confirmBtn = getEl("confirmImportBtn");
const modeSelect = getEl("modeSelect"); // 匯入模式（例如：全部、僅新增、僅更新）

const previewTbody = getEl("previewTbody", "csvPreviewTbody");
const summaryNew = getEl("summaryNew");
const summaryUpdated = getEl("summaryUpdated");
const summarySkipped = getEl("summarySkipped");

// 預覽結果暫存
let parsedRows = []; // [{ raw, action, productId, existingLastPrice, ... }]

// 將文字轉成數字或 null
function parseNumber(val) {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  if (!s) return null;
  const num = Number(s.replace(/,/g, ""));
  return Number.isNaN(num) ? null : num;
}

// is_active 文字轉 boolean
function parseIsActive(val) {
  if (val === undefined || val === null) return true; // 預設啟用
  const s = String(val).trim().toLowerCase();
  if (!s) return true;
  if (["0", "false", "停用", "n", "no"].includes(s)) return false;
  return true; // 其他都當啟用
}

// 組 key 用來比對現有商品（name + spec）
function makeKey(name, spec) {
  return `${name.trim()}|||${(spec || "").trim()}`;
}

// 從 Supabase 撈出現有商品，建立 map
async function fetchExistingProductsMap() {
  const { data, error } = await supabaseClient
    .from("products")
    .select("id, name, spec, last_price");

  if (error) {
    console.error("讀取現有商品失敗：", error);
    alert("讀取現有商品失敗，請稍後再試。");
    throw error;
  }

  const map = new Map();
  data.forEach((p) => {
    const key = makeKey(p.name || "", p.spec || "");
    map.set(key, {
      id: p.id,
      last_price: p.last_price,
    });
  });

  return map;
}

// 渲染預覽表格
function renderPreview() {
  if (!previewTbody) return;

  previewTbody.innerHTML = "";

  let countNew = 0;
  let countUpdated = 0;
  let countSkipped = 0;

  parsedRows.forEach((row, index) => {
    const tr = document.createElement("tr");

    let actionLabel = "";
    if (row.action === "insert") {
      actionLabel = "新增";
      countNew++;
    } else if (row.action === "update") {
      actionLabel = "更新";
      countUpdated++;
    } else {
      actionLabel = "略過";
      countSkipped++;
    }

    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${row.name || ""}</td>
      <td>${row.category || ""}</td>
      <td>${row.spec || ""}</td>
      <td>${row.unit || ""}</td>
      <td>${row.last_price ?? "—"}</td>
      <td>${row.suggested_price ?? "—"}</td>
      <td class="preview-description" title="${(row.description || "").replace(/"/g, "&quot;")}">
        ${row.description ? row.description.replace(/\n/g, "<br>") : "—"}
      </td>
      <td>${row.is_active ? "啟用" : "停用"}</td>
      <td>${actionLabel}</td>
    `;

    previewTbody.appendChild(tr);
  });

  if (summaryNew) summaryNew.textContent = String(countNew);
  if (summaryUpdated) summaryUpdated.textContent = String(countUpdated);
  if (summarySkipped) summarySkipped.textContent = String(countSkipped);
}

// 依選擇的模式決定要不要「更新 / 新增」
function decideActionForRow(rowHasExisting, mode) {
  // mode：all / only-insert / only-update （若沒有下拉就當 all）
  const m = mode || "all";

  if (rowHasExisting) {
    if (m === "only-insert") return "skip";
    return "update";
  } else {
    if (m === "only-update") return "skip";
    return "insert";
  }
}

// -----------------------------
// 1. 預覽按鈕：讀取 CSV + 解析 + 預覽
// -----------------------------
async function handlePreview() {
  if (!fileInput || !fileInput.files || !fileInput.files[0]) {
    alert("請先選擇一個 CSV 檔案。");
    return;
  }
  if (!supabaseClient) return;

  const file = fileInput.files[0];

  // 只讀取檔案內容，不會修改或刪除原始檔案
  try {
    const existingMap = await fetchExistingProductsMap();

    Papa.parse(file, {
      header: true,
      skipEmptyLines: "greedy",
      encoding: "UTF-8",
      complete: (results) => {
        const rows = results.data || [];
        parsedRows = [];

        const mode = modeSelect ? modeSelect.value : "all";

        rows.forEach((r) => {
          // 去掉完全空白的列
          const rawName = (r.name || "").trim();
          const rawSpec = (r.spec || "").trim();
          if (!rawName && !rawSpec) return;

          const key = makeKey(rawName, rawSpec);
          const existing = existingMap.get(key) || null;

          const row = {
            // 原始欄位處理
            name: rawName,
            category: (r.category || "").trim(),
            spec: rawSpec,
            unit: (r.unit || "").trim(),
            last_price: parseNumber(r.last_price),
            suggested_price: parseNumber(
              r.suggested_price || r.suggested || r.suggested_price_twd
            ),
            description: (r.description || "").trim(),
            is_active: parseIsActive(r.is_active),
            sku: (r.sku || "").trim(),

            // 內部用
            action: "skip",
            productId: existing ? existing.id : null,
            existingLastPrice: existing ? existing.last_price : null,
          };

          row.action = decideActionForRow(!!existing, mode);
          parsedRows.push(row);
        });

        if (parsedRows.length === 0) {
          alert("沒有讀到任何有效資料，請確認 CSV 內容。");
        }

        renderPreview();
      },
      error: (err) => {
        console.error("解析 CSV 失敗：", err);
        alert("解析 CSV 失敗，請確認檔案格式為 UTF-8 CSV。");
      },
    });
  } catch (e) {
    console.error("預覽過程發生錯誤：", e);
  }
}

// -----------------------------
// 2. 真正匯入（新增 / 更新）
// -----------------------------
async function handleConfirmImport() {
  if (!parsedRows || parsedRows.length === 0) {
    alert("請先點『開始匯入預覽』，確認資料無誤後再匯入。");
    return;
  }
  if (!supabaseClient) return;

  if (!confirm("確定要依預覽結果進行匯入嗎？")) return;

  // 分成新增與更新兩組
  const toInsert = [];
  const toUpdate = [];

  parsedRows.forEach((row) => {
    if (row.action === "insert") {
      const payload = {
        name: row.name,
        category: row.category || null,
        spec: row.spec || null,
        unit: row.unit || null,
        last_price: row.last_price,
        suggested_price: row.suggested_price,
        description: row.description || null,
        is_active: row.is_active,
        sku: row.sku || null,
      };

      // 新增時，只要有進價就寫入更新時間
      if (row.last_price !== null) {
        payload.last_price_updated_at = new Date().toISOString();
      }

      toInsert.push(payload);
    } else if (row.action === "update" && row.productId) {
      const payload = {
        id: row.productId,
        name: row.name,
        category: row.category || null,
        spec: row.spec || null,
        unit: row.unit || null,
        last_price: row.last_price,
        suggested_price: row.suggested_price,
        description: row.description || null,
        is_active: row.is_active,
        sku: row.sku || null,
      };

      // ⭐ 只有「進價改變」時才更新 last_price_updated_at
      const oldVal =
        row.existingLastPrice === undefined || row.existingLastPrice === null
          ? null
          : Number(row.existingLastPrice);
      const newVal =
        row.last_price === undefined || row.last_price === null
          ? null
          : Number(row.last_price);

      if (oldVal !== newVal && newVal !== null) {
        payload.last_price_updated_at = new Date().toISOString();
      }

      toUpdate.push(payload);
    }
  });

  try {
    // 先批次新增
    if (toInsert.length > 0) {
      const { error: insertError } = await supabaseClient
        .from("products")
        .insert(toInsert);

      if (insertError) {
        console.error("批次新增失敗：", insertError);
        alert("批次新增商品時發生錯誤：" + insertError.message);
        return;
      }
    }

    // 再依序更新（避免 upsert 牽扯 id 欄位問題）
    for (const row of toUpdate) {
      const id = row.id;
      const { id: _remove, ...updatePayload } = row; // 不要把 id 放在 payload

      const { error: updateError } = await supabaseClient
        .from("products")
        .update(updatePayload)
        .eq("id", id);

      if (updateError) {
        console.error("更新商品失敗 (id=" + id + ")：", updateError);
        alert("更新商品時發生錯誤：" + updateError.message);
        return;
      }
    }

    alert(
      `匯入完成！新增：${toInsert.length} 筆，更新：${toUpdate.length} 筆，其餘略過。`
    );
    window.location.href = "index.html";
  } catch (err) {
    console.error("匯入流程發生錯誤：", err);
    alert("匯入時發生不預期錯誤，請查看 Console 或稍後再試。");
  }
}

// -----------------------------
// 事件綁定
// -----------------------------
if (previewBtn) {
  previewBtn.addEventListener("click", handlePreview);
}
if (confirmBtn) {
  confirmBtn.addEventListener("click", handleConfirmImport);
}
