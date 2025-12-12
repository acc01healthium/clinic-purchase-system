/*
  /admin/js/index.js
  後台列表：搜尋 + 排序 + 分頁器
*/

console.log("後台商品列表初始化");

const supabaseClient = window.supabaseClient;

// ========== DOM ==========
const tableBody = document.getElementById("productTableBody");
const searchInput = document.getElementById("adminSearchInput");
const pageSizeSelect = document.getElementById("pageSizeSelect");
const paginationDiv = document.getElementById("pagination");

let currentPage = 1;
let pageSize = 10;
let currentSort = { column: "id", order: "asc" };
let currentKeyword = "";


// ===========================================
//  取得資料（搜尋 + 排序 + 分頁）
// ===========================================
async function loadProducts() {
  const from = (currentPage - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseClient
    .from("products")
    .select("*", { count: "exact" })
    .order(currentSort.column, { ascending: currentSort.order === "asc" })
    .range(from, to);

  // 搜尋
  if (currentKeyword.trim() !== "") {
    query = query.or(`name.ilike.%${currentKeyword}%,category.ilike.%${currentKeyword}%,spec.ilike.%${currentKeyword}%,description.ilike.%${currentKeyword}%`);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("載入錯誤：", error);
    return;
  }

  renderTable(data);
  renderPagination(count);
}


// ===========================================
//  顯示表格
// ===========================================
function renderTable(data) {
  tableBody.innerHTML = "";

  data.forEach((p) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${p.name ?? ""}</td>
      <td>${p.category ?? ""}</td>
      <td>${p.spec ?? ""}</td>
      <td>${p.unit ?? ""}</td>

      <td>
        <div class="desc-cell" title="${p.description ?? ""}">
          ${p.description ?? "—"}
        </div>
      </td>

      <td>NT$ ${p.last_price ?? "—"}</td>
      <td>NT$ ${p.suggested_price ?? "—"}</td>

      <td>${p.last_price_updated_at ? new Date(p.last_price_updated_at).toLocaleString("zh-TW") : "—"}</td>

      <td>${p.is_active ? "啟用" : "停用"}</td>

      <td>
        <a class="btn-edit" href="edit.html?id=${p.id}">編輯</a>
      </td>
    `;

    tableBody.appendChild(tr);
  });
}


// ===========================================
//  分頁器
// ===========================================
function renderPagination(total) {
  paginationDiv.innerHTML = "";

  const totalPages = Math.ceil(total / pageSize);

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.className = i === currentPage ? "page-btn active" : "page-btn";
    btn.textContent = i;

    btn.addEventListener("click", () => {
      currentPage = i;
      loadProducts();
    });

    paginationDiv.appendChild(btn);
  }
}


// ===========================================
//  監聽搜尋
// ===========================================
searchInput.addEventListener("input", () => {
  currentKeyword = searchInput.value.trim();
  currentPage = 1;
  loadProducts();
});


// ===========================================
//  每頁顯示筆數 select
// ===========================================
pageSizeSelect.addEventListener("change", () => {
  pageSize = Number(pageSizeSelect.value);
  currentPage = 1;
  loadProducts();
});


// ===========================================
//  點欄位排序
// ===========================================
window.sortBy = function (column) {
  if (currentSort.column === column) {
    currentSort.order = currentSort.order === "asc" ? "desc" : "asc";
  } else {
    currentSort.column = column;
    currentSort.order = "asc";
  }
  loadProducts();
};


// ===========================================
// 初始化
// ===========================================
document.addEventListener("DOMContentLoaded", loadProducts);
