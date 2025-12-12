// /admin/js/upload.js
// CSV 匯入 FINAL 版（安全、可預覽、不破壞檔案）

console.log("CSV Upload FINAL 初始化");

// ------------------ 基本檢查 ------------------
const supabaseClient = window.supabaseClient;
if (!supabaseClient) {
  alert("Supabase client 未初始化");
}

// DOM
const fileInput = document.getElementById("csvFile");
const previewBtn = document.getElementById("previewBtn");
const previewSection = document.getElementById("previewSection");
const previewTbody = document.getElementById("previewTbody");
const confirmBtn = document.getElementById("confirmImportBtn");
const resetBtn = document.getElementById("resetBtn");

let parsedRows = [];

// ------------------ 工具 ------------------
const toNumber = (v) => {
  if (v === undefined || v === null || String(v).trim() === "") return null;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isNaN(n) ? null : n;
};

const makeKey = (name, spec) =>
  `${(name || "").trim()}|||${(spec || "").trim()}`;

// ------------------ 讀取現有商品 ------------------
async function fetchExistingMap() {
  const { data, error } = await supabaseClient
    .from("products")
    .select("id, name, spec, last_price");

  if (error) throw error;

  const map = new Map();
  data.forEach((p) => {
    map.set(makeKey(p.name, p.spec), {
      id: p.id,
      last_price: p.last_price,
    });
  });
  return map;
}

// ------------------ 預覽 ------------------
async function handlePreview() {
  if (!fileInput.files.length) {
    alert("請先選擇 CSV 檔案");
    return;
  }

  const existingMap = await fetchExistingMap();
  const file = fileInput.files[0];

  Papa.parse(file, {
    header: true,
    skipEmptyLines: "greedy",
    complete: (res) => {
      parsedRows = [];

      res.data.forEach((r) => {
        const name = (r.name || "").trim();
        const spec = (r.spec || "").trim();
        const unit = (r.unit || "").trim();

        // 防呆：完全空白列直接忽略
        if (!name && !spec && !unit) return;

        const key = makeKey(name, spec);
        const exist = existingMap.get(key);

        parsedRows.push({
          name,
          category: (r.category || "").trim(),
          spec,
          unit,
          last_price: toNumber(r.last_price),
          suggested_price: toNumber(r.suggested_price),
          description: (r.description || "").trim(),
          is_active: true,
          action: exist ? "update" : "insert",
          productId: exist?.id || null,
          oldLastPrice: exist?.last_price ?? null,
        });
      });

      renderPreview();
    },
    error: (err) => {
      console.error(err);
      alert("CSV 解析失敗，請確認格式");
    },
  });
}

// ------------------ 畫面 ------------------
function renderPreview() {
  previewTbody.innerHTML = "";

  parsedRows.forEach((r, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${r.action === "insert" ? "新增" : "更新"}</td>
      <td>${r.name}</td>
      <td>${r.category}</td>
      <td>${r.spec}</td>
      <td>${r.unit}</td>
      <td>${r.last_price ?? "—"}</td>
      <td>${r.suggested_price ?? "—"}</td>
      <td>${r.description.replace(/\n/g, "<br>")}</td>
      <td>${r.is_active ? "啟用" : "停用"}</td>
    `;
    previewTbody.appendChild(tr);
  });

  previewSection.style.display = "block";
  confirmBtn.disabled = parsedRows.length === 0;
}

// ------------------ 匯入 ------------------
async function handleConfirm() {
  if (!parsedRows.length) return;

  const inserts = [];
  const updates = [];

  parsedRows.forEach((r) => {
    if (r.action === "insert") {
      inserts.push({
        name: r.name,
        category: r.category || null,
        spec: r.spec,
        unit: r.unit,
        last_price: r.last_price,
        suggested_price: r.suggested_price,
        description: r.description || null,
        is_active: true,
        last_price_updated_at:
          r.last_price !== null ? new Date().toISOString() : null,
      });
    } else {
      const payload = {
        name: r.name,
        category: r.category || null,
        spec: r.spec,
        unit: r.unit,
        last_price: r.last_price,
        suggested_price: r.suggested_price,
        description: r.description || null,
        is_active: true,
      };

      if (r.oldLastPrice !== r.last_price && r.last_price !== null) {
        payload.last_price_updated_at = new Date().toISOString();
      }

      updates.push({ id: r.productId, payload });
    }
  });

  if (inserts.length) {
    await supabaseClient.from("products").insert(inserts);
  }

  for (const u of updates) {
    await supabaseClient.from("products").update(u.payload).eq("id", u.id);
  }

  alert(`匯入完成：新增 ${inserts.length}，更新 ${updates.length}`);
  location.href = "index.html";
}

// ------------------ 綁定 ------------------
previewBtn.addEventListener("click", handlePreview);
confirmBtn.addEventListener("click", handleConfirm);
resetBtn?.addEventListener("click", () => location.reload());
