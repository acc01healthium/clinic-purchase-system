// admin/js/upload.js

const supabaseUrl = "https://utwhtjtgwryeljgwlwzm.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0d2h0anRnd3J5ZWxqZ3dsd3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNTkxNDQsImV4cCI6MjA4MDczNTE0NH0.SexZh_JV9IUT5cL7o6KO-bh6D50aFkZUrhZVf4_fNbs";

const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

async function ensureLoggedIn() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    window.location.href = "./login.html";
    return null;
  }

  const userEmailEl = document.getElementById("userEmail");
  if (userEmailEl) userEmailEl.textContent = data.user.email;
  return data.user;
}

async function setupLogout() {
  const btn = document.getElementById("logoutBtn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "./login.html";
  });
}

// 簡單 CSV 解析（支援含引號）
function parseCsv(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter(l => l.trim() !== "");
  if (lines.length === 0) return [];

  const headerLine = lines[0];
  const headers = splitCsvLine(headerLine).map(h => h.trim().toLowerCase());

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    if (cols.length === 1 && cols[0].trim() === "") continue;

    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = cols[idx] !== undefined ? cols[idx].trim() : "";
    });
    rows.push(obj);
  }
  return rows;
}

// 處理一列 CSV，支援 "有逗號, 在引號內" 這種情況
function splitCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      // 看下一個是不是也是引號（代表跳脫）
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function normalizeBool(value) {
  if (!value) return null;
  const v = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y", "是", "啟用"].includes(v)) return true;
  if (["0", "false", "no", "n", "否", "停用"].includes(v)) return false;
  return null;
}

function normalizePrice(row) {
  // 支援欄位名稱：price、last_price
  let raw = row["price"] ?? row["last_price"];
  if (raw === undefined || raw === null || raw === "") return null;
  const cleaned = String(raw).replace(/,/g, "");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

async function handleUpload() {
  const fileInput = document.getElementById("csvFile");
  const statusBox = document.getElementById("statusBox");

  statusBox.textContent = "";
  statusBox.className = "status";

  if (!fileInput.files || fileInput.files.length === 0) {
    statusBox.textContent = "請先選擇一個 CSV 檔案。";
    statusBox.classList.add("error");
    return;
  }

  const file = fileInput.files[0];

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const text = e.target.result;
      const rows = parseCsv(text);

      if (!rows || rows.length === 0) {
        statusBox.textContent = "CSV 內容為空，請確認檔案。";
        statusBox.classList.add("error");
        return;
      }

      // 映射成 products 欄位
      const nowIso = new Date().toISOString();
      const payload = rows.map((r) => {
        const sku = r["sku"] || "";
        const name = r["name"] || "";
        const category = r["category"] || "";
        const unit = r["unit"] || "";
        const spec = r["spec"] || r["規格"] || "";
        const description = r["description"] || r["說明"] || "";
        const price = normalizePrice(r);
        const isActive = normalizeBool(r["is_active"]);

        const obj = {
          sku: sku || null,
          name: name || null,
          category: category || null,
          unit: unit || null,
          spec: spec || null,
          description: description || null
        };

        if (price !== null) {
          obj.last_price = price;
          obj.last_price_updated_at = nowIso;
        }

        if (isActive !== null) {
          obj.is_active = isActive;
        }

        return obj;
      });

      // 呼叫 upsert 寫入 products
      const { data, error } = await supabase
        .from("products")
        .upsert(payload, {
          onConflict: "sku" // 假設你在 products.sku 上有 UNIQUE constraint
        });

      if (error) {
        console.error("匯入失敗：", error);
        statusBox.textContent = "匯入失敗：" + error.message;
        statusBox.classList.add("error");
        return;
      }

      statusBox.textContent = `匯入完成，共處理 ${payload.length} 筆資料。`;
      statusBox.classList.add("ok");
    } catch (err) {
      console.error("解析/匯入過程錯誤：", err);
      statusBox.textContent = "解析或匯入過程發生錯誤，請檢查 CSV 格式。";
      statusBox.classList.add("error");
    }
  };

  reader.onerror = () => {
    statusBox.textContent = "讀取檔案失敗，請重試。";
    statusBox.classList.add("error");
  };

  reader.readAsText(file, "utf-8");
}

window.addEventListener("DOMContentLoaded", async () => {
  const user = await ensureLoggedIn();
  if (!user) return;

  await setupLogout();

  const uploadBtn = document.getElementById("uploadBtn");
  if (uploadBtn) {
    uploadBtn.addEventListener("click", handleUpload);
  }
});

