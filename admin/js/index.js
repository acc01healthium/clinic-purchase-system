// /admin/js/index.js
// 後台商品列表 + 搜尋

console.log("後台商品列表初始化");

// 取得 Supabase client
const supabaseClient = window.supabaseClient;

// DOM
const tbody =
  document.getElementById("productTableBody") ||
  document.querySelector("tbody");
const statusEl = document.getElementById("statusMessage");
const searchInput = document.getElementById("adminSearchInput");

// 內存所有商品，用來做前端搜尋
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

// 將資料渲染到表格
function renderTable(list) {
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!list || list.length === 0) {
    if (statusEl) statusEl.textContent = "目前尚未有符合條件的商品資料。";
    return;
  }

  if (statusEl) statusEl.textContent = "";

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
        <button class="table-btn" onclick="editProduct(${p.id})">編輯</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

// 從 Supabase 載入全部商品
async function loadProducts() {
  if (!supabaseClient) {
    console.error("supabaseClient 不存在，請檢查 admin/js/supabase.js");
    return;
  }

  if (statusEl) statusEl.textContent = "載入中…";

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
    if (statusEl) statusEl.textContent = "讀取資料發生錯誤，請稍後再試。";
    return;
  }

  allProducts = data || [];
  renderTable(allProducts);
}

// 前端關鍵字搜尋
function filterProducts(keyword) {
  if (!keyword) {
    renderTable(allProducts);
    return;
  }

  const lower = keyword.toLowerCase();

  const filtered = allProducts.filter((p) => {
    const fields = [
      p.name || "",
      p.category || "",
      p.spec || "",
      p.description || "",
    ];
    return fields.some((v) => v.toLowerCase().includes(lower));
  });

  renderTable(filtered);
}

// 搜尋框事件（0.2 秒 debounce）
function setupSearch() {
  if (!searchInput) return;

  let timer = null;
  searchInput.addEventListener("input", () => {
    const value = searchInput.value.trim();
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      filterProducts(value);
    }, 200);
  });
}

// 編輯按鈕
window.editProduct = function (id) {
  if (!id) return;
  location.href = `edit.html?id=${id}`;
};

// 登出按鈕（未啟用 auth，先回 login.html）
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    location.href = "login.html";
  });
}

// 初始化
document.addEventListener("DOMContentLoaded", () => {
  loadProducts();
  setupSearch();
});
