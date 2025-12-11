// admin/js/upload.js

document.addEventListener("DOMContentLoaded", () => {
  const supabase = window.supabaseClient;

  const form = document.getElementById("csvForm");
  const fileInput = document.getElementById("csvFile");
  const statusEl = document.getElementById("statusMsg");
  const resultTable = document.getElementById("resultTable");
  const resultBody = document.getElementById("resultBody");
  const importBtn = document.getElementById("importBtn");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!fileInput.files.length) {
      alert("請先選擇 CSV 檔案");
      return;
    }

    const file = fileInput.files[0];

    if (importBtn) {
      importBtn.disabled = true;
      importBtn.textContent = "匯入中...";
    }
    if (statusEl) statusEl.textContent = "讀取檔案中...";

    try {
      const text = await file.text();
      const rows = text.split(/\r?\n/).filter((r) => r.trim() !== "");
      if (rows.length <= 1) {
        throw new Error("檔案沒有資料列");
      }

      const header = rows[0].split(",").map((h) => h.trim());
      const required = ["name", "category", "spec", "unit", "last_price"];
      for (const col of required) {
        if (!header.includes(col)) {
          throw new Error(`缺少必要欄位：${col}`);
        }
      }

      const idx = (name) => header.indexOf(name);

      const stats = {
        updated: 0,
        inserted: 0,
        skipped: 0,
        failed: 0,
      };

      for (let i = 1; i < rows.length; i++) {
        const line = rows[i].trim();
        if (!line) continue;

        const cols = line.split(",");
        const get = (name) =>
          idx(name) >= 0 ? (cols[idx(name)] || "").trim() : "";

        const name = get("name");
        const category = get("category");
        const spec = get("spec");
        const unit = get("unit");
        const lastPriceStr = get("last_price");
        const suggestPriceStr = get("suggest_price");
        const isActiveStr = get("is_active");
        const description = get("description");

        if (!name || !category || !spec || !unit || !lastPriceStr) {
          stats.skipped++;
          continue;
        }

        const lastPrice = Number(lastPriceStr);
        const suggestPrice = suggestPriceStr
          ? Number(suggestPriceStr)
          : null;

        if (Number.isNaN(lastPrice)) {
          stats.failed++;
          continue;
        }
        if (suggestPriceStr && Number.isNaN(suggestPrice)) {
          stats.failed++;
          continue;
        }

        const isActive = parseActive(isActiveStr);
        const nowIso = new Date().toISOString();

        // 先檢查是否存在 (name + spec)
        const { data: existing, error: queryErr } = await supabase
          .from("products")
          .select("id")
          .eq("name", name)
          .eq("spec", spec)
          .limit(1);

        if (queryErr) {
          console.error("查詢失敗：", queryErr);
          stats.failed++;
          continue;
        }

        if (existing && existing.length > 0) {
          const id = existing[0].id;
          const { error: updErr } = await supabase
            .from("products")
            .update({
              category,
              unit,
              last_price: lastPrice,
              suggest_price: suggestPrice,
              is_active: isActive,
              description: description || null,
              last_price_updated_at: nowIso,
            })
            .eq("id", id);

          if (updErr) {
            console.error("更新失敗：", updErr);
            stats.failed++;
          } else {
            stats.updated++;
          }
        } else {
          const { error: insErr } = await supabase.from("products").insert({
            name,
            category,
            spec,
            unit,
            last_price: lastPrice,
            suggest_price: suggestPrice,
            is_active: isActive,
            description: description || null,
            last_price_updated_at: nowIso,
          });

          if (insErr) {
            console.error("新增失敗：", insErr);
            stats.failed++;
          } else {
            stats.inserted++;
          }
        }
      }

      if (statusEl)
        statusEl.textContent = "匯入完成，詳情請見下方統計。";

      if (resultTable && resultBody) {
        resultTable.style.display = "";
        resultBody.innerHTML = `
          <tr><td>更新</td><td>${stats.updated}</td><td>已有商品（name+spec）更新進價 / 建議售價等</td></tr>
          <tr><td>新增</td><td>${stats.inserted}</td><td>新增新的商品</td></tr>
          <tr><td>略過</td><td>${stats.skipped}</td><td>必要欄位缺少，未處理</td></tr>
          <tr><td>失敗</td><td>${stats.failed}</td><td>格式或匯入錯誤</td></tr>
        `;
      }
    } catch (err) {
      console.error(err);
      if (statusEl) statusEl.textContent = "匯入失敗：" + err.message;
      alert("匯入失敗：" + err.message);
    } finally {
      if (importBtn) {
        importBtn.disabled = false;
        importBtn.textContent = "開始匯入";
      }
    }
  });

  function parseActive(val) {
    if (!val) return true;
    const v = String(val).trim().toLowerCase();
    if (["1", "true", "啟用", "yes", "y"].includes(v)) return true;
    if (["0", "false", "停用", "no", "n"].includes(v)) return false;
    return true;
  }
});
