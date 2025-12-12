// /js/index.js
// 前台商品查詢（穩定版）：一次載入 -> 前端分類 / 排序 / 分頁
// ✅ 不依賴固定容器 id：找不到就自動建立一個，避免你改版面就壞

console.log("前台商品查詢初始化（穩定版）");

// 取得 Supabase client（在 /js/supabase.js 建立的）
const supabaseClient = window.supabaseClient;

/* -----------------------------
   小工具：抓元素（id 優先）
----------------------------- */
function getEl(...ids) {
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) return el;
  }
  return null;
}

/* -----------------------------
   DOM 元素（向下相容 + 自動補容器）
----------------------------- */
let productListEl =
  getEl("productList", "productGrid", "products", "productContainer") ||
  document.querySelector(".product-list") ||
  document.querySelector(".product-grid") ||
  document.querySelector('[data-role="product-list"]');

const searchInputEl = getEl("searchInput");
const clearBtnEl = getEl("clearBtn");
const statusEl = getEl("statusMessage") || document.querySelector('[data-role="status"]');

const categorySelectEl = getEl("categorySelect");
const sortSelectEl = getEl("sortSelect");
const pageSizeEl = getEl("pageSizeSelect", "pageSize");

const prevBtnEl = getEl("prevPageBtn");
const nextBtnEl = getEl("nextPageBtn");
const pageInfoEl = getEl("pageInfo");

// ⭐ 最重要：如果容器不存在，就自己建立一個（避免你每次改 HTML id 就壞）
function ensureProductContainer() {
  if (productListEl) return;

  console.warn("⚠️ 找不到商品容器（productList / productGrid / products...），將自動建立一個容器");

  const main =
    document.querySelector("main") ||
    document.querySelector(".main") ||
    document.querySelector(".container") ||
    document.body;

if (!productListEl) {
  console.error("❌ 找不到商品容器 productList，請確認 index.html 結構");
  if (statusEl) statusEl.textContent = "系統版面設定錯誤";
  return;
}
 // 讓你現有的卡片 grid CSS 能吃到
  wrap.style.minHeight = "160px";

  main.appendChild(wrap);
  productListEl = wrap;

  console.log("✅ 已自動建立商品容器 #productList");
}
ensureProductContainer();

/* -----------------------------
   狀態
----------------------------- */
let allProducts = [];
let currentCategory = ""; // "" = 全部
let currentKeyword = "";
let currentSort = "updated_desc"; // 預設：更新時間 新->舊
let pageSize = 10;
let currentPage = 1;

/* -----------------------------
   格式化
----------------------------- */
function formatPrice(value) {
  if (value === null || value === undefined || value === "") return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return "—";
  return `NT$ ${num}`;
}

function formatDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}/${m}/${day} ${hh}:${mm}`;
}

/* -----------------------------
   建立商品卡片 DOM（保留你原本的視覺結構）
----------------------------- */
function createProductCard(p) {
  const card = document.createElement("article");
  card.className = "product-card";

  const imgWrapper = document.createElement("div");
  imgWrapper.className = "product-image-wrapper";

  if (p.image_url) {
    const img = document.createElement("img");
    img.src = p.image_url;
    img.alt = p.name || "商品圖片";
    img.loading = "lazy";
    imgWrapper.appendChild(img);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "product-image-placeholder";
    placeholder.textContent = "尚未上傳圖片";
    imgWrapper.appendChild(placeholder);
  }

  const content = document.createElement("div");
  content.className = "product-content";

  const nameEl = document.createElement("h3");
  nameEl.className = "product-name";
  nameEl.textContent = p.name || "";

  const specEl = document.createElement("p");
  specEl.className = "product-spec";
  specEl.textContent = p.spec || "";

  // 類別 / 單位
  const metaRow = document.createElement("div");
  metaRow.className = "product-meta-row";

  if (p.category) {
    const categoryDiv = document.createElement("div");
    categoryDiv.className = "product-category-tag";
    categoryDiv.textContent = p.category;
    metaRow.appendChild(categoryDiv);
  }

  if (p.unit) {
    const unitDiv = document.createElement("div");
    unitDiv.className = "product-meta-line";
    unitDiv.textContent = `單位：${p.unit}`;
    metaRow.appendChild(unitDiv);
  }

  // 價格區：進價 / 建議售價（對齊）
  const priceBlock = document.createElement("div");
  priceBlock.className = "product-price-block";

  const line1 = document.createElement("div");
  line1.className = "price-line";
  line1.innerHTML = `
    <span class="price-label">進　　價：</span>
    <span class="price-value">${formatPrice(p.last_price)}</span>
  `;

  const line2 = document.createElement("div");
  line2.className = "price-line";
  line2.innerHTML = `
    <span class="price-label">建議售價：</span>
    <span class="price-value">${formatPrice(p.suggested_price)}</span>
  `;

  priceBlock.appendChild(line1);
  priceBlock.appendChild(line2);

  content.appendChild(nameEl);
  content.appendChild(specEl);
  content.appendChild(metaRow);
  content.appendChild(priceBlock);

  // （先把 description 放進來，之後你要「查看更多」我再加收合功能）
  if (p.description) {
    const desc = document.createElement("div");
    desc.className = "product-description";
    desc.innerHTML = String(p.description).replace(/\n/g, "<br>");
    content.appendChild(desc);
  }

  // 價格更新時間（如果有）
  if (p.last_price_updated_at) {
    const timeEl = document.createElement("p");
    timeEl.className = "product-updated-at";
    timeEl.textContent = `價格更新時間：${formatDateTime(p.last_price_updated_at)}`;
    content.appendChild(timeEl);
  }

  card.appendChild(imgWrapper);
  card.appendChild(content);

  return card;
}

/* -----------------------------
   分類下拉：用「資料中出現過的 category」建清單
   （你已經有 categories 表也可以，但這種最不會壞）
----------------------------- */
function buildCategoryOptions(products) {
  if (!categorySelectEl) return;

  const set = new Set();
  products.forEach((p) => {
    if (p.category) set.add(p.category);
  });

  const categories = Array.from(set).sort((a, b) => a.localeCompare(b, "zh-Hant"));

  categorySelectEl.innerHTML = "";
  const optAll = document.createElement("option");
  optAll.value = "";
  optAll.textContent = "全部分類";
  categorySelectEl.appendChild(optAll);

  categories.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    categorySelectEl.appendChild(opt);
  });

  // 保留當前選擇
  categorySelectEl.value = currentCategory;
}

/* -----------------------------
   套用篩選/排序/分頁
----------------------------- */
function getFilteredProducts() {
  let filtered = allProducts.filter((p) => p.is_active);

  if (currentCategory) {
    filtered = filtered.filter((p) => p.category === currentCategory);
  }

  if (currentKeyword) {
    const kw = currentKeyword.toLowerCase();
    filtered = filtered.filter((p) => {
      const text = `${p.name || ""} ${p.category || ""} ${p.spec || ""} ${p.description || ""}`.toLowerCase();
      return text.includes(kw);
    });
  }

  // 排序
  if (currentSort === "updated_desc") {
    filtered.sort((a, b) => {
      const at = a.last_price_updated_at ? new Date(a.last_price_updated_at).getTime() : 0;
      const bt = b.last_price_updated_at ? new Date(b.last_price_updated_at).getTime() : 0;
      return bt - at;
    });
  } else if (currentSort === "name_asc") {
    filtered.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "zh-Hant"));
  } else if (currentSort === "price_asc") {
    filtered.sort((a, b) => (Number(a.last_price) || 0) - (Number(b.last_price) || 0));
  } else if (currentSort === "price_desc") {
    filtered.sort((a, b) => (Number(b.last_price) || 0) - (Number(a.last_price) || 0));
  }

  return filtered;
}

function renderProducts() {
  ensureProductContainer();
  if (!productListEl) return;

  const filtered = getFilteredProducts();

  // 分頁
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  // 清空 + 渲染
  productListEl.innerHTML = "";

  if (statusEl) {
    statusEl.textContent = total ? "" : "找不到符合條件的商品";
  }

  pageItems.forEach((p) => {
    productListEl.appendChild(createProductCard(p));
  });

  // 頁碼
  if (pageInfoEl) pageInfoEl.textContent = `第 ${currentPage} / ${totalPages} 頁`;
  if (prevBtnEl) prevBtnEl.disabled = currentPage <= 1;
  if (nextBtnEl) nextBtnEl.disabled = currentPage >= totalPages;
}

/* -----------------------------
   載入商品（一次打後端）
----------------------------- */
async function loadProducts() {
  if (!supabaseClient) {
    console.error("前台 supabaseClient 不存在，請確認 /js/supabase.js 是否正確載入。");
    if (statusEl) statusEl.textContent = "系統設定錯誤，請聯絡管理者。";
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
      image_url,
      is_active
    `
    )
    .order("name", { ascending: true });

  if (error) {
    console.error("前台載入商品錯誤：", error);
    if (statusEl) statusEl.textContent = "讀取資料發生錯誤，請稍後再試。";
    return;
  }

  allProducts = data || [];

  // 建分類選單（用資料自動生成，最不會壞）
  buildCategoryOptions(allProducts);

  // 讀取每頁值（若有）
  if (pageSizeEl) {
    const n = Number(pageSizeEl.value);
    if (!Number.isNaN(n) && n > 0) pageSize = n;
  }

  renderProducts();
}

/* -----------------------------
   事件綁定
----------------------------- */
searchInputEl?.addEventListener("input", () => {
  currentKeyword = (searchInputEl.value || "").trim();
  currentPage = 1;
  renderProducts();
});

clearBtnEl?.addEventListener("click", () => {
  if (searchInputEl) searchInputEl.value = "";
  currentKeyword = "";
  currentPage = 1;
  renderProducts();
});

categorySelectEl?.addEventListener("change", () => {
  currentCategory = categorySelectEl.value || "";
  currentPage = 1;
  renderProducts();
});

sortSelectEl?.addEventListener("change", () => {
  currentSort = sortSelectEl.value || "updated_desc";
  currentPage = 1;
  renderProducts();
});

pageSizeEl?.addEventListener("change", () => {
  const n = Number(pageSizeEl.value);
  pageSize = !Number.isNaN(n) && n > 0 ? n : 10;
  currentPage = 1;
  renderProducts();
});

prevBtnEl?.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderProducts();
  }
});

nextBtnEl?.addEventListener("click", () => {
  // totalPages 由 renderProducts 計算，所以這裡直接先加再 render
  currentPage++;
  renderProducts();
});

// 「全部商品」按鈕（你之前提到要正常）
const allBtn = getEl("allProductsBtn");
allBtn?.addEventListener("click", () => {
  currentCategory = "";
  if (categorySelectEl) categorySelectEl.value = "";
  currentPage = 1;
  renderProducts();
});

/* -----------------------------
   初始化
----------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  loadProducts();
});
