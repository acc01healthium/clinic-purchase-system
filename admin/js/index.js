// /admin/js/index.js
// 後台商品列表初始化

console.log("後台商品列表初始化");

// Supabase client（由 admin/js/supabase.js 建立）
const supabaseClient = window.supabaseClient;

// 取得 DOM
const tbody = document.getElementById("productTableBody");
const statusEl = document.getElementById("statusMessage");

// 金額格式化
function formatPrice(value) {
  if (value === null || value === undefined || value === "") return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return "—";
  return `NT$ ${num}`;
}

// 時間格式化
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

// 載入商品列表
async function loadProducts() {
  if (!supabaseClient) {
    console.error("supabaseClient 不存在，請確認 admin/js/supabase.js 是否正確載入");
    return;
  }

  if (statusEl) statusEl.textContent = "載入中…";

 const { data, error } = await supabaseClient
  .from("products")
  .select(`
      id,
      name,
      category,
      spec,
      unit,
      last_price,
      suggested_price,
      last_price_updated_at,
      is_active,
      description
  `)
  .order("name", { ascending: true });


  if (error) {
    console.error("後台載入商品錯誤：", error);
    if (statusEl) statusEl.textContent = "讀取資料發生錯誤，請稍後再試。";
    return;
  }

  tbody.innerHTML = "";

  if (!data || data.length === 0) {
    if (statusEl) statusEl.textContent = "目前尚未有商品資料。";
    return;
  }

  if (statusEl) statusEl.textContent = "";

  data.forEach((p) => {
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

// 編輯
window.editProduct = function (id) {
  if (!id) return;
  location.href = `edit.html?id=${id}`;
};

// 登出
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    location.href = "login.html";
  });
}

// 初始化
document.addEventListener("DOMContentLoaded", () => {
  loadProducts();
});
