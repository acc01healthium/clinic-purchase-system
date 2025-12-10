// admin/js/upload.js
// CSV 匯入：name + spec 判斷同一商品，更新 / 新增
console.log("upload.js 載入");

const supabase = window.supabaseClient;
const fileInput = document.getElementById("csvFile");
const uploadBtn = document.getElementById("uploadBtn");
const logBox = document.getElementById("logBox");

function log(msg) {
  logBox.textContent += msg + "\n";
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length <= 1) return [];

  const header = lines[0].split(",").map((h) => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length === 1 && cols[0].trim() === "") continue;

    const rowObj = {};
    header.forEach((h, idx) => {
      rowObj[h] = (cols[idx] || "").trim();
    });

    rows.push(rowObj);
  }
  return rows;
}

async function upsertRow(row) {
  const name = row.name?.trim();
  const spec = row.spec?.trim();
  const category = row.category?.trim() || null;
  const unit = row.unit?.trim() || null;

  if (!name) {
    log(`略過一筆資料：缺少 name`);
    return;
  }

  const last_price =
    row.last_price !== undefined && row.last_price !== ""
      ? Number(row.last_price)
      : null;

  const suggested_price =
    row.suggested_price !== undefined && row.suggested_price !== ""
      ? Number(row.suggested_price)
      : null;

  let is_active = true;
  if (row.is_active !== undefined && row.is_active !== "") {
    const v = row.is_active.toString().toLowerCase();
    is_active = v === "1" || v === "true" || v === "t" || v === "yes";
  }

  // 先用 name + spec 找是否已存在
  const { data: existList, error: selErr } = await supabase
    .from("products")
    .select("id,last_price")
    .eq("name", name)
    .eq("spec", spec || null);

  if (selErr) {
    log(`查詢失敗：${selErr.message}`);
    return;
  }

  const nowIso = new Date().toISOString();

  if (existList && existList.length > 0) {
    const target = existList[0];

    const updateData = {
      category,
      unit,
      is_active,
    };

    if (last_price !== null) {
      updateData.last_price = last_price;
      updateData.last_price_updated_at = nowIso;
    }

    if (suggested_price !== null) {
      updateData.suggested_price = suggested_price;
    }

    const { error: upErr } = await supabase
      .from("products")
      .update(updateData)
      .eq("id", target.id);

    if (upErr) {
      log(`更新失敗（${name}/${spec}）：${upErr.message}`);
    } else {
      log(`更新成功：${name} / ${spec || ""}`);
    }
  } else {
    // 新增
    const insertData = {
      name,
      spec: spec || null,
      category,
      unit,
      is_active,
      last_price: last_price,
      suggested_price: suggested_price,
      last_price_updated_at: last_price ? nowIso : null,
    };

    const { error: insErr } = await supabase
      .from("products")
      .insert([insertData]);

    if (insErr) {
      log(`新增失敗（${name}/${spec}）：${insErr.message}`);
    } else {
      log(`新增成功：${name} / ${spec || ""}`);
    }
  }
}

uploadBtn.addEventListener("click", async () => {
  logBox.textContent = "";

  const file = fileInput.files[0];
  if (!file) {
    alert("請先選擇 CSV 檔案");
    return;
  }

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length === 0) {
    alert("檔案內容為空或格式不正確");
    return;
  }

  log(`開始匯入，共 ${rows.length} 筆資料…`);

  for (let i = 0; i < rows.length; i++) {
    await upsertRow(rows[i]);
  }

  log("匯入完成！");
});
