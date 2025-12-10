// admin/js/index.js
// 後台：商品列表 + 按鈕

console.log("✅ 後台 index.js 載入");

const db = window.supabaseClient;

const tableBody = document.getElementById("productTbody");
const emptyRow = document.getElementById("emptyRow");
const refreshBtn = document.getElementById("refreshBtn");
const addBtn = document.getElementById("addBtn");
const uploadBtn = document.getElementById("uploadBtn");

// 簡單格式化
function fmtPrice(v) {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return v;
  return n.toLocaleString("zh-TW", { minimumFractionDigits: 0 });
}

function fmtTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// 載入商品列表
async function loadProductsAdmin() {
  try {
    tableBody.innerHTML = "";
    if (emptyRow) emptyRow.style.display = "none";

    const { data, error } = await db
      .from("products")
      .select(
        `
        id,
        name,
        category,
        spec,
        unit,
        description,
        last_price,
        suggest_price,
        last_price_updated_at,
        is_active
      `
      )
      .order("name", { ascending: true });

    if (error) {
      console.error("後台讀取商品錯誤：", error);
      if (emptyRow) {
        emptyRow.style.display = "";
        emptyRow.textContent = "讀取資料錯誤";
      }
      return;
    }

    const rows = data || [];

    if (rows.length === 0) {
      if (emptyRow) {
        emptyRow.style.display = "";
        emptyRow.textContent = "目前尚無商品資料";
      }
      return;
    }

    rows.forEach((p) => {
      const tr = document.createElement("tr");

      const tdName = document.createElement("td");
      tdName.textContent = p.name || "";
      tr.appendChild(tdName);

      const tdCat = document.createElement("td");
      tdCat.textContent = p.category || "";
      tr.appendChild(tdCat);

      const tdUnit = document.createElement("td");
      tdUnit.textContent = p.unit || "";
      tr.appendChild(tdUnit);

      const tdSpec = document.createElement("td");
      tdSpec.textContent = p.spec || "";
      tr.appendChild(tdSpec);

      const tdCost = document.createElement("td");
      tdCost.textContent = fmtPrice(p.last_price);
      tr.appendChild(tdCost);

      const tdSuggest = document.createElement("td");
      tdSuggest.textContent = fmtPrice(p.suggest_price);
      tr.appendChild(tdSuggest);

      const tdTime = document.createElement("td");
      tdTime.textContent = fmtTime(p.last_price_updated_at);
      tr.appendChild(tdTime);

      const tdStatus = document.createElement("td");
      tdStatus.textContent = p.is_active ? "啟用" : "停用";
      tr.appendChild(tdStatus);

      const tdAction = document.createElement("td");
      const editBtn = document.createElement("button");
      editBtn.className = "btn-secondary";
      editBtn.textContent = "編輯";
      editBtn.addEventListener("click", () => {
        location.href = `edit.html?id=${encodeURIComponent(p.id)}`;
      });
      tdAction.appendChild(editBtn);
      tr.appendChild(tdAction);

      tableBody.appendChild(tr);
    });
  } catch (err) {
    console.error("後台讀取商品例外：", err);
    if (emptyRow) {
      emptyRow.style.display = "";
      emptyRow.textContent = "讀取資料發生錯誤";
    }
  }
}

// 綁定按鈕
if (refreshBtn) {
  refreshBtn.addEventListener("click", () => {
    loadProductsAdmin();
  });
}

if (addBtn) {
  addBtn.addEventListener("click", () => {
    location.href = "add.html";
  });
}

if (uploadBtn) {
  uploadBtn.addEventListener("click", () => {
    location.href = "upload.html";
  });
}

// 初始化
document.addEventListener("DOMContentLoaded", () => {
  loadProductsAdmin();
});
