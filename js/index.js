// /js/index.js
console.log("前台商品查詢（相容強化版）初始化");

const supabaseClient = window.supabaseClient;

// ===== DOM（完全沿用你原本的）=====
const productListEl = document.getElementById("productList");
const searchInputEl = document.getElementById("searchInput");
const clearBtnEl = document.getElementById("clearBtn");
const statusEl = document.getElementById("statusMessage");

// 分頁 / 排序 / 分類（若不存在就略過，不會報錯）
const categorySelect = document.getElementById("categorySelect");
const sortSelect = document.getElementById("sortSelect");
const pageSizeSelect = document.getElementById("pageSizeSelect");
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const pageIndicator = document.getElementById("pageIndicator");

// ===== 狀態 =====
let allProducts = [];
let filteredProducts = [];

let currentCategory = "";
let currentPage = 1;
let pageSize = 10;
let currentSort = "updated_desc";

// ===== 工具 =====
function formatPrice(value) {
  if (value === null || value === undefined || value === "") return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return "—";
  return `NT$ ${num.toLocaleString("zh-Hant")}`;
}

function formatDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(
    d.getDate()
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

// ===== 商品卡片（在原版基礎上加 description 展開）=====
function createProductCard(p) {
  const card = document.createElement("article");
  card.className = "product-card";

  const imgWrapper = document.createElement("div");
  imgWrapper.className = "product-image-wrapper";

  if (p.image_url) {
    const img = document.createElement("img");
    img.src = p.image_url;
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

  const metaRow = document.createElement("div");
  metaRow.className = "product-meta-row";

  if (p.category) {
    const tag = document.createElement("div");
    tag.className = "product-category-tag";
    tag.textContent = p.category;
    metaRow.appendChild(tag);
  }

  if (p.unit) {
    const unit = document.createElement("div");
    unit.className = "product-meta-line";
    unit.textContent = `單位：${p.unit}`;
    metaRow.appendChild(unit);
  }

  const priceBlock = document.createElement("div");
  priceBlock.className = "product-price-block";
  priceBlock.innerHTML = `
    <div class="price-line">
      <span class="price-label">進　　價：</span>
      <span class="price-value">${formatPrice(p.last_price)}</span>
    </div>
    <div class="price-line">
      <span class="price-label">建議售價：</span>
      <span class="price-value">${formatPrice(p.suggested_price)}</span>
    </div>
  `;

  content.appendChild(nameEl);
  content.appendChild(specEl);
  content.appendChild(metaRow);
  content.appendChild(priceBlock);

  // ✅ description（自動斷行 + 展開）
  if (p.description) {
    const desc = document.createElement("div");
    desc.className = "product-description clamp";
    desc.textContent = p.description;

    const toggle = document.createElement("button");
    toggle.className = "desc-toggle";
    toggle.textContent = "查看更多";
    toggle.type = "button";

    toggle.addEventListener("click", () => {
      const expanded = desc.classList.toggle("clamp");
      toggle.textContent = expanded ? "查看更多" : "收合";
    });

    content.appendChild(desc);
    content.appendChild(toggle);
  }

  if (p.last_price_updated_at) {
    const timeEl = document.createElement("p");
    timeEl.className = "product-updated-at";
    timeEl.textContent = `價格更新時間：${formatDateTime(
      p.last_price_updated_at
    )}`;
    content.appendChild(timeEl);
  }

  card.appendChild(imgWrapper);
  card.appendChild(content);

  return card;
}

// ===== 核心渲染 =====
function renderProducts() {
  if (!productListEl) return;

  const keyword = (searchInputEl?.value || "").trim().toLowerCase();

  filteredProducts = allProducts
    .filter((p) => p.is_active)
    .filter((p) => {
      if (currentCategory && p.category !== currentCategory) return false;
      if (!keyword) return true;
      return `${p.name} ${p.category} ${p.spec}`.toLowerCase().includes(keyword);
    });

  // 排序
  filteredProducts.sort((a, b) => {
    if (currentSort === "updated_desc") {
      return new Date(b.last_price_updated_at || 0) - new Date(a.last_price_updated_at || 0);
    }
    return 0;
  });

  const total = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * pageSize;
  const pageItems = filteredProducts.slice(start, start + pageSize);

  productListEl.innerHTML = "";

  if (!pageItems.length) {
    if (statusEl) statusEl.textContent = "目前沒有符合條件的商品";
    return;
  }

  if (statusEl) statusEl.textContent = "";

  pageItems.forEach((p) => {
    productListEl.appendChild(createProductCard(p));
  });

  if (pageIndicator) {
    pageIndicator.textContent = `第 ${currentPage} / ${totalPages} 頁`;
  }
}

// ===== 載入商品 =====
async function loadProducts() {
  if (!supabaseClient) return;

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
      description,
      last_price_updated_at,
      image_url,
      is_active
    `);

  if (error) {
    console.error("載入商品失敗：", error);
    if (statusEl) statusEl.textContent = "讀取資料失敗";
    return;
  }

  allProducts = data || [];
  renderProducts();
}

// ===== 事件 =====
searchInputEl?.addEventListener("input", () => {
  currentPage = 1;
  renderProducts();
});

clearBtnEl?.addEventListener("click", () => {
  if (searchInputEl) searchInputEl.value = "";
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
  currentPage++;
  renderProducts();
});

// ===== 初始化 =====
document.addEventListener("DOMContentLoaded", loadProducts);
