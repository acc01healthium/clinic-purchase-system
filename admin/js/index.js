// /admin/js/index.js
// 後台商品列表：載入 / 搜尋 / 編輯導頁

console.log("後台 商品列表初始化");

// Supabase client
const supabaseClient = window.supabaseClient;
if (!supabaseClient) {
  console.error("supabaseClient 不存在，請確認 admin/js/supabase.js 是否正確載入。");
}

// DOM
const tbody =
  document.getElementById("productTbody") ||
  document.querySelector("tbody");

const searchInput = document.getElementById("adminSearchInput");
const searchHint = document.querySelector(".admin-search-hint");

let allProducts = [];

// 金額格式
function formatPrice(value) {
  if (value === null || value === undefined || value === "") return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return "—";
  return `NT$ ${num}`;
}

// 時間格式
function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}/${m}/${day} ${hh}:${mm}`;
}

// 渲染表格
function renderTable(list) {
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!list || list.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 9;
    td.textContent = "目前尚未有商品資料。";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  list.forEach((p) => {
    const tr = document.createElement("tr");

    const statusText = p.is_active ? "啟用" : "停用";

    tr.innerHTML = `
      <td>${p.name || ""}</td>
      <td>${p.category || "—"}</td>
      <td>${p.spec || "—"}</td>
      <td>${p.unit || "—"}</td>
      <td>${p.description || "—"}</td>
      <td>${formatPrice(p.last_price)}</td>
      <td>${formatPrice(p.suggested_price)}</td>
      <td>${formatDateTime(p.last_price_updated_at)}</td>
      <td>${statusText}</td>
      <td>
        <button class="btn-edit" onclick="editProduct(${p.id})">編輯</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

// 載入商品
async function loadProducts() {
  if (!supabaseClient) return;

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
    console.error("後台載入商品錯誤：", error);
    renderTable([]);
    return;
  }

  allProducts = data || [];
  renderTable(allProducts);
}

// 搜尋過濾
function applySearch() {
  const q = (searchInput?.value || "").trim().toLowerCase();
  if (!q) {
    renderTable(allProducts);
    return;
  }

  const filtered = allProducts.filter((p) => {
    const fields = [
      p.name,
      p.category,
      p.spec,
      p.description,
      p.unit,
    ]
      .map((v) => (v || "").toString().toLowerCase());
    return fields.some((text) => text.includes(q));
  });

  renderTable(filtered);
}

// 編輯導航（給按鈕 onclick 用）
window.editProduct = function (id) {
  if (!id) return;
  window.location.href = `edit.html?id=${id}`;
};

// 搜尋輸入監聽
if (searchInput) {
  searchInput.addEventListener("input", () => {
    applySearch();
  });
}

// 登出按鈕
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    window.location.href = "login.html";
  });
}

// 初始化
document.addEventListener("DOMContentLoaded", () => {
  loadProducts();
});
