// /admin/js/index.js
// 後台商品列表：搜尋 / 排序 / 分頁 / Tooltip

console.log("後台商品列表初始化");

// 取得 Supabase client
const supabaseClient = window.supabaseClient;
if (!supabaseClient) console.error("supabaseClient 載入失敗！");

// DOM
const tbody = document.getElementById("productTbody");
const searchInput = document.getElementById("adminSearchInput");
const pageSizeSelect = document.getElementById("pageSizeSelect");
const pageInfo = document.getElementById("pageInfo");
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");

// 全資料暫存（一次讀全部，前端做分頁 / 排序）
let fullData = [];

// 排序狀態
let currentSort = {
  column: "name",
  asc: true,
};

// 分頁狀態
let currentPage = 1;
let pageSize = 10;

// 格式化金額（NT$）
function formatPrice(n) {
  if (n === null || n === undefined || n === "") return "—";
  return `NT$ ${Number(n)}`;
}

// 格式化時間
function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(
    d.getDate()
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

// 讀取全部商品資料 -------------------------------
async function loadProducts() {
  const { data, error } = await supabaseClient
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
      suggested_price,
      last_price_updated_at,
      is_active
      `
    )
    .order("name", { ascending: true });

  if (error) {
    console.error("讀取資料錯誤：", error);
    alert("讀取資料錯誤");
    return;
  }

  fullData = data || [];
  applyFilters();
}

// 排序處理 ---------------------------------------
function sortData(data) {
  const { column, asc } = currentSort;

  return [...data].sort((a, b) => {
    const v1 = a[column] ?? "";
    const v2 = b[column] ?? "";

    if (typeof v1 === "number" && typeof v2 === "number") {
      return asc ? v1 - v2 : v2 - v1;
    }

    return asc
      ? String(v1).localeCompare(String(v2))
      : String(v2).localeCompare(String(v1));
  });
}

// 搜尋 + 排序 + 分頁 ------------------------------
function applyFilters() {
  const keyword = searchInput.value.trim().toLowerCase();

  let filtered = fullData.filter((p) => {
    return (
      (p.name || "").toLowerCase().includes(keyword) ||
      (p.category || "").toLowerCase().includes(keyword) ||
      (p.spec || "").toLowerCase().includes(keyword) ||
      (p.description || "").toLowerCase().includes(keyword)
    );
  });

  // 排序
  filtered = sortData(filtered);

  // 分頁
  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize);
  if (currentPage > totalPages) currentPage = totalPages || 1;

  const start = (currentPage - 1) * pageSize;
  const paginated = filtered.slice(start, start + pageSize);

  pageInfo.textContent = `第 ${currentPage} / ${totalPages || 1} 頁（共 ${total} 筆）`;

  renderTable(paginated);
}

// 渲染表格 ----------------------------------------
function renderTable(data) {
  tbody.innerHTML = "";

  data.forEach((p) => {
    const tr = document.createElement("tr");

    const statusText = p.is_active ? "啟用" : "停用";

    const descriptionShort =
      p.description && p.description.length > 16
        ? p.description.slice(0, 16) + "…"
        : p.description || "—";

    tr.innerHTML = `
      <td>${p.name || ""}</td>
      <td>${p.category || "—"}</td>
      <td>
        <span class="tooltip" title="${p.description || ""}">
          ${descriptionShort}
        </span>
      </td>
      <td>${p.unit || "—"}</td>
      <td>${formatPrice(p.last_price)}</td>
      <td>${formatPrice(p.suggested_price)}</td>
      <td>${formatDate(p.last_price_updated_at)}</td>
      <td>${statusText}</td>
      <td>
        <button class="btn-edit" onclick="editProduct(${p.id})">編輯</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

// 編輯按鈕
window.editProduct = function (id) {
  location.href = `edit.html?id=${id}`;
};

// 事件綁定 -----------------------------------------
searchInput.addEventListener("input", () => {
  currentPage = 1;
  applyFilters();
});

pageSizeSelect.addEventListener("change", (e) => {
  pageSize = Number(e.target.value);
  currentPage = 1;
  applyFilters();
});

prevPageBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    applyFilters();
  }
});

nextPageBtn.addEventListener("click", () => {
  currentPage++;
  applyFilters();
});


// 欄位排序（點表頭就排序）
document.querySelectorAll("th[data-sort]").forEach((th) => {
  th.addEventListener("click", () => {
    const col = th.dataset.sort;

    if (currentSort.column === col) {
      currentSort.asc = !currentSort.asc;
    } else {
      currentSort.column = col;
      currentSort.asc = true;
    }

    applyFilters();
  });
});

// 初始化 -------------------------------------------
document.addEventListener("DOMContentLoaded", loadProducts);
