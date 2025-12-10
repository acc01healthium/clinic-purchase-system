// /admin/js/upload.js

const supabase = window.supabaseClient;

const csvFileEl = document.getElementById("csvFile");
const uploadBtn = document.getElementById("uploadBtn");
const resultEl = document.getElementById("uploadResult");

/** 簡單 CSV 解析（不處理有逗號在欄位內的超複雜狀況） */
function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    if (!cols.length || !cols[0]) continue;
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = cols[idx] ?? "";
    });
    rows.push(obj);
  }
  return rows;
}

uploadBtn.addEventListener("click", async () => {
  const file = csvFileEl.files[0];
  if (!file) {
    alert("請先選擇 CSV 檔案");
    return;
  }

  const text = await file.text();
  const rows = parseCsv(text);

  if (!rows.length) {
    alert("CSV 內容為空或格式不正確");
    return;
  }

  resultEl.textContent = "匯入中…";

  const payload = rows.map((r) => ({
    name: r.name || "",
    category: r.category || "",
    spec: r.spec || "",
    unit: r.unit || "",
    description: r.description || "",
    last_price: r.last_price ? Number(r.last_price) : null,
    is_active: String(r.is_active).toLowerCase() === "true",
    image_url: r.image_url || null,
    last_price_updated_at: new Date().toISOString(),
  }));

  const { error, count } = await supabase
    .from("products")
    .insert(payload, { count: "exact" });

  if (error) {
    resultEl.textContent = "匯入失敗：" + error.message;
    console.error(error);
    return;
  }

  resultEl.textContent = `匯入完成，共新增 ${count ?? payload.length} 筆`;
});
