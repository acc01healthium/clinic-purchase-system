// /js/index.js
console.log("前台商品查詢初始化（最終穩定版）");

const supabaseClient = window.supabaseClient;

/* ===============================
   DOM（容錯：新舊版 id 都吃）
================================ */
function getEl(...ids) {
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) return el;
  }
  return null;
}

const productListEl = getEl("productGrid", "productList");
const searchInputEl = getEl("searchInput");
const clearBtnEl = getEl("clearBtn");
const statusEl = getEl("statusMessage");

const categorySelect = getEl("categorySelect");
const sortSelect = getEl("sortSelect");
const pageSizeSelect = getEl("pageSizeSelect");

const prevBtn = getEl("prevPageBtn");
const nextBtn = getEl("nextPageBtn");
const pageInfoEl = getEl("pageInfo");

if (!productListEl) {
  console.error("❌ 找不到商品容器（productGrid / productList）");
}

/* ===============================
   狀態
================================ */
let currentPage = 1;
let pageSize = 10;
let totalPages = 1;
let currentCategory = "";
let currentSort = "updated_desc";
let currentKeyword = "";

/* ===============================
   工具
================================ */
function formatPrice(v) {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  return Number.isNaN(n) ? "—" : `NT$ ${n}`;
}

/* ===============================
   商品卡片
================================ */
function createProductCard(p) {
  const card = document.createElement("article");
  card.className = "product-card";

  card.innerHTML = `
    <div class="product-image-wrapper">
      ${
        p.image_url
          ? `<img src="${p.image_url}" loading="lazy">`
          : `<div class="product-image-placeholder">尚未上傳圖片</div>`
      }
    </div>

    <div class="product-content">
      <h3 class="product-name">${p.name}</h3>
      <p class="product-spec">${p.spec || ""}</p>

      <div class="product-meta-row">
        ${p.category ? `<span class="product-category-tag">${p.category}</span>` : ""}
        ${p.unit ? `<span class="product-meta-line">單位：${p.unit}</span>` : ""}
      </div>

      <div class="product-price-block">
        <div class="price-line">
          <span class="price-label">進　　價：</span>
          <span class="price-value">${formatPrice(p.last_price)}</span>
        </div>
        <div class="price-line">
          <span class="price-label">建議售價：</span>
          <span class="price-value">${formatPrice(p.suggested_price)}</span>
        </div>
      </div>

      ${
        p.description
          ? `<div class="product-description">${p.description.replace(/\n/g, "<br>")}</div>`
          : ""
      }
    </div>
  `;

  return card;
}

/* ===============================
   載入分類
================================ */
async function loadCategories() {
  const { data } = await supabaseClient
    .from("categories")
    .select("name")
    .order("name");

  if (!categorySelect) return;

  categorySelect.innerHTML = `<option value="">全部分類</option>`;
  (data || []).forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.name;
    opt.textContent = c.name;
    categorySelect.appendChild(opt);
  });
}

/* ===============================
   載入商品（真正關鍵）
================================ */
async function loadProducts() {
  if (!productListEl) return;

  productListEl.innerHTML = "";
  statusEl.textContent = "載入中…";

  const from = (currentPage - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabaseClient
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
      image_url
    `,
      { count: "exact" }
    )
    .eq("is_active", true);

  if (currentCategory) q = q.eq("category", currentCategory);

  if (currentKeyword) {
    q = q.or(
      `name.ilike.%${currentKeyword}%,spec.ilike.%${currentKeyword}%,category.ilike.%${currentKeyword}%`
    );
  }

  if (currentSort === "updated_desc") {
    q = q.order("updated_at", { ascending: false });
  } else if (currentSort === "price_asc") {
    q = q.order("last_price", { ascending: true });
  } else if (currentSort === "price_desc") {
    q = q.order("last_price", { ascending: false });
  }

  q = q.range(from, to);

  const { data, error, count } = await q;

  if (error) {
    console.error(error);
    statusEl.textContent = "資料讀取失敗";
    return;
  }

  totalPages = Math.max(1, Math.ceil((count || 0) / pageSize));
  pageInfoEl.textContent = `第 ${currentPage} / ${totalPages} 頁`;

  if (!data || data.length === 0) {
    statusEl.textContent = "找不到符合條件的商品";
    return;
  }

  statusEl.textContent = "";
  data.forEach((p) => productListEl.appendChild(createProductCard(p)));
}

/* ===============================
   事件
================================ */
searchInputEl?.addEventListener("input", () => {
  currentKeyword = searchInputEl.value.trim();
  currentPage = 1;
  loadProducts();
});

clearBtnEl?.addEventListener("click", () => {
  searchInputEl.value = "";
  currentKeyword = "";
  currentPage = 1;
  loadProducts();
});

categorySelect?.addEventListener("change", () => {
  currentCategory = categorySelect.value;
  currentPage = 1;
  loadProducts();
});

sortSelect?.addEventListener("change", () => {
  currentSort = sortSelect.value;
  currentPage = 1;
  loadProducts();
});

pageSizeSelect?.addEventListener("change", () => {
  pageSize = Number(pageSizeSelect.value);
  currentPage = 1;
  loadProducts();
});

prevBtn?.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    loadProducts();
  }
});

nextBtn?.addEventListener("click", () => {
  if (currentPage < totalPages) {
    currentPage++;
    loadProducts();
  }
});

/* ===============================
   初始化
================================ */
document.addEventListener("DOMContentLoaded", async () => {
  await loadCategories();
  await loadProducts();
});
