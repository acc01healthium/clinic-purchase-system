// /js/index.js
// 前台商品查詢（穩定版：分類 / 排序 / 分頁 / description）

console.log("前台商品查詢初始化（穩定版）");

// ==============================
// Supabase
// ==============================
const supabaseClient = window.supabaseClient;
if (!supabaseClient) {
  console.error("❌ supabaseClient 不存在，請確認 /js/supabase.js");
}

// ==============================
// DOM 元素（⚠️ 不自動建立，只找）
// ==============================
const productListEl = document.getElementById("productList"); // 必須存在
const searchInputEl = document.getElementById("searchInput");
const clearBtnEl = document.getElementById("clearBtn");
const statusEl = document.getElementById("statusMessage");

const categorySelectEl = document.getElementById("categorySelect");
const sortSelectEl = document.getElementById("sortSelect");
const pageSizeSelectEl = document.getElementById("pageSizeSelect");

const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const pageInfoEl = document.getElementById("pageInfo");

if (!productListEl) {
  console.error("❌ 找不到 #productList，請確認 index.html 結構");
}

// ==============================
// 狀態
// ==============================
let allProducts = [];
let filteredProducts = [];

let currentCategory = "";
let currentKeyword = "";
let currentSort = "updated_desc";

let currentPage = 1;
let pageSize = 10;

// ==============================
// 工具
// ==============================
function formatPrice(val) {
  if (val === null || val === undefined || val === "") return "—";
  const n = Number(val);
  return Number.isNaN(n) ? "—" : `NT$ ${n}`;
}

function formatDateTime(val) {
  if (!val) return "";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}/${String(d.getDate()).padStart(2, "0")} ${String(
    d.getHours()
  ).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ==============================
// 建立卡片
// ==============================
function createProductCard(p) {
  const card = document.createElement("article");
  card.className = "product-card";

  // 圖片
  const imgWrap = document.createElement("div");
  imgWrap.className = "product-image-wrapper";

  if (p.image_url) {
    const img = document.createElement("img");
    img.src = p.image_url;
    img.alt = p.name || "";
    img.loading = "lazy";
    imgWrap.appendChild(img);
  } else {
    const ph = document.createElement("div");
    ph.className = "product-image-placeholder";
    ph.textContent = "尚未上傳圖片";
    imgWrap.appendChild(ph);
  }

  // 內容
  const content = document.createElement("div");
  content.className = "product-content";

  const nameEl = document.createElement("h3");
  nameEl.className = "product-name";
  nameEl.textContent = p.name || "";

  const specEl = document.createElement("p");
  specEl.className = "product-spec";
  specEl.textContent = p.spec || "";

  // meta
  const meta = document.createElement("div");
  meta.className = "product-meta-row";

  if (p.category) {
    const tag = document.createElement("span");
    tag.className = "product-category-tag";
    tag.textContent = p.category;
    meta.appendChild(tag);
  }

  if (p.unit) {
    const unit = document.createElement("span");
    unit.className = "product-meta-line";
    unit.textContent = `單位：${p.unit}`;
    meta.appendChild(unit);
  }

  // 價格
  const price = document.createElement("div");
  price.className = "product-price-block";
  price.innerHTML = `
    <div class="price-line">
      <span class="price-label">進　　價：</span>
      <span class="price-value">${formatPrice(p.last_price)}</span>
    </div>
    <div class="price-line">
      <span class="price-label">建議售價：</span>
      <span class="price-value">${formatPrice(p.suggested_price)}</span>
    </div>
  `;

  // description（支援換行）
  if (p.description) {
    const desc = document.createElement("div");
    desc.className = "product-description";
    desc.innerHTML = p.description.replace(/\n/g, "<br>");
    content.appendChild(desc);
  }

  if (p.last_price_updated_at) {
    const t = document.createElement("p");
    t.className = "product-updated-at";
    t.textContent = `價格更新時間：${formatDateTime(
      p.last_price_updated_at
    )}`;
    content.appendChild(t);
  }

  content.prepend(price);
  content.prepend(meta);
  content.prepend(specEl);
  content.prepend(nameEl);

  card.appendChild(imgWrap);
  card.appendChild(content);

  return card;
}

// ==============================
// 篩選 / 排序
// ==============================
function applyFilterAndSort() {
  filteredProducts = allProducts.filter((p) => p.is_active);

  if (currentCategory) {
    filteredProducts = filteredProducts.filter(
      (p) => p.category === currentCategory
    );
  }

  if (currentKeyword) {
    const kw = currentKeyword.toLowerCase();
    filteredProducts = filteredProducts.filter((p) =>
      `${p.name} ${p.category || ""} ${p.spec || ""}`
        .toLowerCase()
        .includes(kw)
    );
  }

  switch (currentSort) {
    case "updated_asc":
      filteredProducts.sort(
        (a, b) =>
          new Date(a.last_price_updated_at) -
          new Date(b.last_price_updated_at)
      );
      break;
    case "name_asc":
      filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
      break;
    default:
      filteredProducts.sort(
        (a, b) =>
          new Date(b.last_price_updated_at) -
          new Date(a.last_price_updated_at)
      );
  }
}

// ==============================
// 渲染
// ==============================
function renderProducts() {
  if (!productListEl) return;

  statusEl.textContent = "";
  productListEl.innerHTML = "";

  applyFilterAndSort();

  const total = filteredProducts.length;
  if (!total) {
    statusEl.textContent = "找不到符合條件的商品";
    return;
  }

  const totalPages = Math.ceil(total / pageSize);
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * pageSize;
  const pageItems = filteredProducts.slice(start, start + pageSize);

  pageItems.forEach((p) =>
    productListEl.appendChild(createProductCard(p))
  );

  if (pageInfoEl) pageInfoEl.textContent = `第 ${currentPage} / ${totalPages} 頁`;
}

// ==============================
// 載入資料
// ==============================
async function loadProducts() {
  statusEl.textContent = "載入中…";

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
      image_url,
      is_active
    `
    );

  if (error) {
    console.error(error);
    statusEl.textContent = "讀取商品失敗";
    return;
  }

  allProducts = data || [];
  currentPage = 1;
  renderProducts();
}

// ==============================
// 事件
// ==============================
searchInputEl?.addEventListener("input", (e) => {
  currentKeyword = e.target.value.trim();
  currentPage = 1;
  renderProducts();
});

clearBtnEl?.addEventListener("click", () => {
  searchInputEl.value = "";
  currentKeyword = "";
  currentCategory = "";
  currentPage = 1;
  renderProducts();
});

categorySelectEl?.addEventListener("change", (e) => {
  currentCategory = e.target.value;
  currentPage = 1;
  renderProducts();
});

sortSelectEl?.addEventListener("change", (e) => {
  currentSort = e.target.value;
  currentPage = 1;
  renderProducts();
});

pageSizeSelectEl?.addEventListener("change", (e) => {
  pageSize = Number(e.target.value) || 10;
  currentPage = 1;
  renderProducts();
});

prevPageBtn?.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderProducts();
  }
});

nextPageBtn?.addEventListener("click", () => {
  const max = Math.ceil(filteredProducts.length / pageSize);
  if (currentPage < max) {
    currentPage++;
    renderProducts();
  }
});

// ==============================
// 初始化
// ==============================
document.addEventListener("DOMContentLoaded", loadProducts);
