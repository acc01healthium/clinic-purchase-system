// admin/js/upload.js
// 後台：CSV 批次匯入商品（name + spec 判斷同筆）

console.log("✅ upload.js 載入");

const db = window.supabaseClient;

const csvForm = document.getElementById("csvForm");
const csvFileInput = document.getElementById("csvFile");
const statusMsgEl = document.getElementById("statusMsg");
const resultTable = document.getElementById("resultTable");
const resultBody = document.getElementById("resultBody");

function setStatus(text, isError = false) {
  if (!statusMsgEl) return;
  statusMsgEl.textContent = text || "";
  statusMsgEl.style.color = isError ? "#c62828" : "#333";
}

function parseBool(val) {
  if (val == null) return false;
  const s = String(val).trim().toLowerCase();
  return ["1", "true", "y", "yes", "啟用", "是"].includes(s);
}

function parseNumber(val) {
  if (val == null || val === "") return null;
  const n = Number(String(val).replace(/,/g, ""));
  return Number.isNaN(n) ? null : n;
}

function genSku(name, spec) {
  const n = (name || "").replace(/\s+/g, "").slice(0, 6);
  const s = (spec || "").replace(/\s+/g, "").slice(0, 6);
  return `${n || "ITEM"}-${s || "SPEC"}-${Date.now().toString(36)}`.toUpperCase();
}

// 從 CSV 文字解析為物件陣列
function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return [];

  const header = lines[0].split(",").map((h) => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const row = {};
    header.forEach((h, idx) => {
      row[h] = (cols[idx] || "").replace(/^"|"$/g, "").trim();
    });
    rows.push(row);
  }

  return rows;
}

async function handleCsvSubmit(e) {
  e.preventDefault();

  if (!csvFileInput.files || csvFileInput.files.length === 0) {
    setStatus("請先選擇 CSV 檔案", true);
    return;
  }

  const file = csvFileInput.files[0];

  setStatus("讀取檔案中…");
  resultTable.style.display = "none";
  resultBody.innerHTML = "";

  const reader = new FileReader();

  reader.onload = async (ev) => {
    try {
      const text = ev.target.result;
      const rows = parseCsv(text);

      if (rows.length === 0) {
        setStatus("檔案沒有資料列", true);
        return;
      }

      let inserted = 0;
      let updated = 0;
      let failed = 0;

      setStatus("匯入中，請稍候…");

      for (const r of rows) {
        const name = r.name?.trim();
        const spec = r.spec?.trim();

        if (!name || !spec) {
          failed++;
          continue;
        }

        const unit = r.unit?.trim() || "";
        const category = r.category?.trim() || "";
        const description = r.description?.trim() || "";
        const lastPrice = parseNumber(r.last_price);
        const suggestPrice = parseNumber(r.suggest_price);
        const isActive = parseBool(r.is_active);

        // 先查是否已存在 name + spec
        const { data: existed, error: queryErr } = await db
          .from("products")
          .select("id, sku")
          .eq("name", name)
          .eq("spec", spec)
          .maybeSingle();

        if (queryErr) {
          console.error("查詢錯誤：", queryErr);
          failed++;
          continue;
        }

        const nowIso = new Date().toISOString();

        if (!existed) {
          // 新增
          const insertData = {
            name,
            spec,
            unit,
            category,
            description,
            last_price: lastPrice,
            suggest_price: suggestPrice,
            is_active: isActive,
            sku: r.sku?.trim() || genSku(name, spec),
          };
          if (lastPrice != null) {
            insertData.last_price_updated_at = nowIso;
          }

          const { error: insErr } = await db
            .from("products")
            .insert([insertData]);

          if (insErr) {
            console.error("新增錯誤：", insErr);
            failed++;
          } else {
            inserted++;
          }
        } else {
          // 更新
          const updateData = {
            unit,
            category,
            description,
            is_active: isActive,
          };

          if (lastPrice != null) {
            updateData.last_price = lastPrice;
            updateData.last_price_updated_at = nowIso;
          }

          if (suggestPrice != null) {
            updateData.suggest_price = suggestPrice;
          }

          if (r.sku && r.sku.trim()) {
            updateData.sku = r.sku.trim();
          }

          const { error: updErr } = await db
            .from("products")
            .update(updateData)
            .eq("id", existed.id);

          if (updErr) {
            console.error("更新錯誤：", updErr);
            failed++;
          } else {
            updated++;
          }
        }
      }

      // 顯示結果
      resultBody.innerHTML = "";

      const makeRow = (action, count, desc) => {
        const tr = document.createElement("tr");
        const td1 = document.createElement("td");
        const td2 = document.createElement("td");
        const td3 = document.createElement("td");
        td1.textContent = action;
        td2.textContent = count;
        td3.textContent = desc;
        tr.appendChild(td1);
        tr.appendChild(td2);
        tr.appendChild(td3);
        resultBody.appendChild(tr);
      };

      makeRow("新增", inserted, "原本不存在的 name+spec，已新增");
      makeRow("更新", updated, "已存在的 name+spec，已更新資料");
      makeRow("失敗", failed, "欄位缺漏或資料庫錯誤");

      resultTable.style.display = "";
      setStatus("匯入完成！");
    } catch (err) {
      console.error("匯入例外：", err);
      setStatus("匯入過程發生錯誤：" + err.message, true);
    }
  };

  reader.onerror = () => {
    setStatus("讀取檔案失敗", true);
  };

  reader.readAsText(file, "utf-8");
}

if (csvForm) {
  csvForm.addEventListener("submit", handleCsvSubmit);
}
