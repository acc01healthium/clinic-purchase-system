// /admin/js/upload.js
// 後台 CSV 匯入：預覽 + 批次新增 / 更新（最終穩定版）

console.log("後台 CSV 匯入 初始化");

const supabaseClient = window.supabaseClient;
if (!supabaseClient) {
  console.error("supabaseClient 不存在");
  alert("Supabase 尚未初始化");
  return;
}

// ---------- DOM ----------
const fileInput = document.getElementById("csvFile");
const previewBtn = document.getElementById("previewBtn");
const confirmBtn = document.getElementById("confirmImportBtn");
const previewSection = document.getElementById("previewSection");
const previewTbody = document.getElementById("previewTbody");
const summaryText = document.getElementById("summaryText");

let parsedRows = [];

// ---------- 工具 ----------
const parseNumber = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim().replace(/,/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
};

const parseIsActive = (v) => {
  if (v === undefined || v === null) return true;
  const s = String(v).trim().toLowerCase();
  if (["0", "false", "停用"].includes(s)) return false;
  return true;
};

const makeKey = (name, spec) =>
  `${name.trim()}|||${(spec || "").trim()}`;

// ---------- 讀取現有商品 ----------
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

// ---------- 預覽 ----------
async function handlePreview() {
  if (!fileInput.files.length) {
    alert("請先選擇 CSV 檔案");
    return;
  }

  const file = fileInput.files[0];
  const existingMap = await fetchExistingMap();

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (res) => {
      parsedRows = [];
      previewTbody.innerHTML = "";

      res.data.forEach((r) => {
        const name = (r.name || "").trim();
        const spec = (r.spec || "").trim();

        // ❗ 沒 name + spec 的直接忽略（避免 description 換行誤判）
        if (!name || !spec) return;

        const key = makeKey(name, spec);
        const existing = existingMap.get(key);

        const row = {
          name,
          category: (r.category || "").trim(),
          spec,
          unit: (r.unit || "").trim(),
          last_price: parseNumber(r.last_price),
          suggested_price: parseNumber(
            r.suggested_price || r.suggested || r["suggested_"]
          ),
          description: (r.description || "").trim(),
          is_active: parseIsActive(r.is_active),
          action: existing ? "update" : "insert",
          productId: existing?.id || null,
          oldLastPrice: existing?.last_price ?? null,
        };

        parsedRows.push(row);
      });

      renderPreview();
    },
    error: (err) => {
      console.error(err);
      alert("CSV 解析失敗，請確認 UTF-8 格式");
    },
  });
}

// ---------- 預覽畫面 ----------
function renderPreview() {
  previewTbody.innerHTML = "";
  let insert = 0,
    update = 0;

  parsedRows.forEach((r, i) => {
    if (r.action === "insert") insert++;
    else update++;

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
      <td title="${r.description.replace(/"/g, "&quot;")}">
        ${r.description.replace(/\n/g, "<br>")}
      </td>
      <td>${r.is_active ? "啟用" : "停用"}</td>
    `;
    previewTbody.appendChild(tr);
  });

  summaryText.textContent = `新增 ${insert} 筆，更新 ${update} 筆`;
  previewSection.style.display = "block";
  confirmBtn.disabled = parsedRows.length === 0;
}

// ---------- 確認匯入 ----------
async function handleConfirmImport() {
  if (!parsedRows.length) return;

  if (!confirm("確定要依預覽結果匯入嗎？")) return;

  const inserts = [];
  const updates = [];

  parsedRows.forEach((r) => {
    if (r.action === "insert") {
      const p = {
        name: r.name,
        category: r.category || null,
        spec: r.spec,
        unit: r.unit,
        last_price: r.last_price,
        suggested_price: r.suggested_price,
        description: r.description || null,
        is_active: r.is_active,
      };
      if (r.last_price !== null) {
        p.last_price_updated_at = new Date().toISOString();
      }
      inserts.push(p);
    } else {
      const p = {
        name: r.name,
        category: r.category || null,
        spec: r.spec,
        unit: r.unit,
        last_price: r.last_price,
        suggested_price: r.suggested_price,
        description: r.description || null,
        is_active: r.is_active,
      };
      if (r.oldLastPrice !== r.last_price && r.last_price !== null) {
        p.last_price_updated_at = new Date().toISOString();
      }
      updates.push({ id: r.productId, payload: p });
    }
  });

  if (inserts.length) {
    const { error } = await supabaseClient.from("products").insert(inserts);
    if (error) return alert(error.message);
  }

  for (const u of updates) {
    const { error } = await supabaseClient
      .from("products")
      .update(u.payload)
      .eq("id", u.id);
    if (error) return alert(error.message);
  }

  alert(`匯入完成：新增 ${inserts.length}，更新 ${updates.length}`);
  location.href = "index.html";
}

// ---------- 綁定 ----------
previewBtn.addEventListener("click", handlePreview);
confirmBtn.addEventListener("click", handleConfirmImport);
