// /admin/js/index.js
// 後台商品列表初始化

console.log("後台商品列表初始化");

// 取得 Supabase client（在 admin/js/supabase.js 建立的）
const supabaseClient = window.supabaseClient;

// 安全取得 DOM 元素
const tbody =
  document.getElementById("productTableBody") ||
  document.querySelector("tbody");

const statusEl = document.getElementById("statusMessage");

// 將數字金額轉成 NT$ 格式
function formatPrice(value) {
  if (value === null || value === undefined || value === "") return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return "—";
  return `NT$ ${num}`;
}

// 將時間格式化
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

// 文字簡化（避免列表太長）
function shortenText(text, max = 18) {
  if (!text) return "—";
  if (text.length <= max) return text;
  return text.substring(0, max) + "…";
}

// 載入商品列表
async function loadProducts(keyword = "") {
  if (!supabaseClient) {
    console.error("後台 supabaseClient 不存在！");
    return;
  }

  if (statusEl) statusEl.textContent = "載入中…";

  let query = supabaseClient
    .from("products")
    .select(`
      id,
      name,
      category,
      spec,
      unit,
      description,
      last_price,
      suggested_price,
      last_price_updated_at,
      is_active,
      image_url
    `)
    .order("name", { ascending: true });

  // 若有搜尋
  if (keyword.trim() !== "") {
    query = query.or(`
      name.ilike.%${keyword}%,
      category.ilike.%${keyword}%,
      spec.ilike.%${keyword}%,
      description.ilike.%${keyword}%
    `);
  }

  const { data, error } = await query;

  if (error) {
    console.error("後台載入商品錯誤：", error);
    if (statusEl) statusEl.textContent = "讀取資料發生錯誤，請稍後再試。";
    return;
  }

  if (!tbody) return;
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
      <td>${shortenText(p.description)}</td>
      <td>${formatPrice(p.last_price)}</td>
      <td>${formatPrice(p.suggested_price)}</td>
      <td>${formatDateTime(p.last_price_updated_at)}</td>
      <td>${statusText}</td>
      <td><button class="btn-edit" onclick="editProduct(${p.id})">編輯</button></td>
    `;

    tbody.appendChild(tr);
  });
}

// 點擊編輯
window.editProduct = function (id) {
  if (!id) return;
  location.href = `edit.html?id=${id}`;
};

// 搜尋功能
const adminSearchInput = document.getElementById("adminSearchInput");
if (adminSearchInput) {
  adminSearchInput.addEventListener("input", (e) => {
    loadProducts(e.target.value);
  });
}

// 登出按鈕
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
