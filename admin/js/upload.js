// admin/js/upload.js

// 會用到共用的 Supabase client
const supabase = window.supabaseClient;

// ===== 小工具：處理字串 / 布林 / SKU / CSV 解析 =====

// 將值轉成乾淨字串
function s(v) {
  return (v ?? "").toString().trim();
}

// 將 CSV 裡 is_active 轉成 boolean
function parseBool(v) {
  const t = s(v).toLowerCase();
  if (!t) return true; // 若沒填就當作啟用
  return (
    t === "1" ||
    t === "true" ||
    t === "y" ||
    t === "yes" ||
    t === "啟用"
  );
}

// 自動產生 SKU：用 name+spec 做縮寫 + 一點隨機碼
function generateSku(name, spec, index) {
  const base = (s(name) + s(spec))
    .replace(/\s+/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8) || "ITEM";

  const suffix = (Date.now() + index)
    .toString(36)
    .slice(-3)
    .toUpperCase();

  return `${base}-${suffix}`;
}

// 超簡單 CSV 解析：不支援欄位內含逗號（一般情況夠用）
function parseCsv(text) {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l);

  if (lines.length < 2) return [];

  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().toLowerCase());

  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = (cols[idx] ?? "").trim();
    });
    rows.push(row);
  }

  return rows;
}

// ===== 主流程：讀檔 + 匯入 =====

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("csvForm");
  const fileInput = document.getElementById("csvFile");
  const statusMsg = document.getElementById("statusMsg");
  const resultTable = document.getElementById("resultTable");
  const resultBody = document.getElementById("resultBody");
  const importBtn = document.getElementById("importBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    resultTable.style.display = "none";
    resultBody.innerHTML = "";
    statusMsg.textContent = "";

    const file = fileInput.files[0];
    if (!file) {
      alert("請先選擇一個 CSV 檔案");
      return;
    }

    importBtn.disabled = true;
    importBtn.textContent = "匯入中，請稍候…";

    try {
      const text = await file.text();
      const rawRows = parseCsv(text);

      if (!rawRows.length) {
        alert("CSV 內容空白或格式不正確");
        return;
      }

      statusMsg.textContent = `讀到 ${rawRows.length} 筆資料，準備匯入中…`;

      // 1. 先抓資料庫現有的 products（只拿 id/name/spec）
      const { data: existing, error: loadError } = await supabase
        .from("products")
        .select("id, name, spec");

      if (loadError) {
        console.error(loadError);
        alert("讀取現有商品失敗：" + loadError.message);
        return;
      }

      const existingMap = new Map(); // key: name|spec → id
      existing.forEach((p) => {
        const key = `${s(p.name)}|${s(p.spec)}`;
        existingMap.set(key, p.id);
      });

      // 2. 準備要新增/更新的資料
      const toInsert = [];
      const toUpdate = [];
      let skipped = 0;

      rawRows.forEach((r, idx) => {
        const name = s(r.name);
        const category = s(r.category);
        const spec = s(r.spec);
        const unit = s(r.unit);
        const priceStr = s(r.last_price);
        const desc = s(r.description);
        const img = s(r.image_url);
        let sku = s(r.sku);
        const isActive = parseBool(r.is_active);

        if (!name || !category || !spec || !unit || !priceStr) {
          // 必填欄位缺一個就跳過
          skipped++;
          return;
        }

        const last_price = Number(priceStr);
        if (!Number.isFinite(last_price)) {
          skipped++;
          return;
        }

        if (!sku) {
          sku = generateSku(name, spec, idx);
        }

        const baseData = {
          name,
          category,
          spec,
          unit,
          last_price,
          is_active: isActive,
          description: desc || null,
          image_url: img || null,
          sku,
          // 其它欄位：給預設值
          currency: "TWD",
          stock_qty: 0,
          last_price_updated_at: new Date().toISOString(),
        };

        const key = `${name}|${spec}`;
        const existingId = existingMap.get(key);

        if (existingId) {
          toUpdate.push({ id: existingId, ...baseData });
        } else {
          toInsert.push(baseData);
        }
      });

      let insertedCount = 0;
      let updatedCount = 0;

      // 3. 先批量新增
      if (toInsert.length) {
        const { error: insertError } = await supabase
          .from("products")
          .insert(toInsert);

        if (insertError) {
          console.error(insertError);
          alert("新增商品失敗：" + insertError.message);
          return;
        }
        insertedCount = toInsert.length;
      }

      // 4. 再逐筆更新（避免 name+spec 衝突問題）
      for (const row of toUpdate) {
        const { id, ...updateData } = row;
        const { error: updateError } = await supabase
          .from("products")
          .update(updateData)
          .eq("id", id);

        if (updateError) {
          console.error(updateError);
          // 單筆錯誤不要中斷全部流程，只是略過
          skipped++;
        } else {
          updatedCount++;
        }
      }

      // 5. 顯示結果
      statusMsg.textContent = "匯入完成！";

      resultBody.innerHTML = `
        <tr>
          <td>新增</td>
          <td>${insertedCount}</td>
          <td>資料庫原本沒有的商品</td>
        </tr>
        <tr>
          <td>更新</td>
          <td>${updatedCount}</td>
          <td>依 name + spec 比對到既有商品，已更新售價/狀態等資料</td>
        </tr>
        <tr>
          <td>略過</td>
          <td>${skipped}</td>
          <td>欄位缺少必填資料或資料格式錯誤</td>
        </tr>
      `;

      resultTable.style.display = "table";

      alert(
        `匯入完成！\n\n` +
          `新增：${insertedCount} 筆\n` +
          `更新：${updatedCount} 筆\n` +
          `略過：${skipped} 筆`
      );
    } catch (err) {
      console.error(err);
      alert("匯入過程發生錯誤：" + err.message);
    } finally {
      importBtn.disabled = false;
      importBtn.textContent = "開始匯入";
    }
  });
});
