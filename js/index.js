// /js/index.js
// 前台商品查詢（分類 + 排序 + 分頁 + description）

console.log("前台商品查詢初始化（完整版）");

const supabaseClient = window.supabaseClient;

// DOM
const productListEl = document.getElementById("productList");
const searchInputEl = document.getElementById("searchInput");
const clearBtnEl = document.getElementById("clearBtn");
const statusEl = document.getElementById("statusMessage");

const categorySelect = document.getElementById("categorySelect");
const sortSelect = document.getElementById("sortSelect");
const pageSizeSelect = document.getElementById("pageSizeSelect");

const prevBtn = document.getElementById("prevPageBtn");
const nextBtn = document.getElementById("nextPageBtn");
const pageInfoEl = document.getElementById("pageInfo");

// 狀態
let currentPage = 1;
let pageSize = 10;
let totalPages = 1;
let currentCategory = "";
let currentSort = "updated_desc";
let currentKeyword = "";

/* ------------------------
   工具
------------------------ */
function formatPrice(v) {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  return `NT$ ${n}`;
}

function formatDate(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

/* ------------------------
   商品卡片
------------------------ */
function createProductCard(p) {
  const card = document.createElement("article");
  card.className = "product-card";

  card.innerHTML = `
    <div class="product-image-wrapper">
      ${
        p.image_url
          ? `<img src="${p.image_url}" loading="lazy">`
          : `<div class="product-image-placeholder">尚無圖片</div>`
      }
    </div>

    <div class="product-content">
      <h3 class="product-name">${p.name}</h3>
      <p class="product-spec">${p.spec || ""}</p>

      <div class="product-meta-row">
        <span class="product-category-tag">${p.category || ""}</span>
        <span class="product-meta-line">單位：${p.unit || ""}</span>
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
          ? `
          <div class="product-description">
            <div class="desc-short">${p.description.replace(/\n/g, "<br>")}</div>
          </div>
        `
          : ""
      }
    </div>
  `;

  return card;
}

/* ------------------------
   讀取分類
------------------------ */
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

/* ------------------------
   主查詢
------------------------ */
async function loadProducts() {
  if (!supabaseClient) return;

  statusEl.textContent = "載入中…";
  productListEl.innerHTML = "";

  const from = (currentPage - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseClient
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
      image_url
    `,
      { count: "exact" }
    )
    .eq("is_active", true);

  if (currentCategory) {
    query = query.eq("category", currentCategory);
  }

  if (currentKeyword) {
    query = query.or(
      `name.ilike.%${currentKeyword}%,spec.ilike.%${currentKeyword}%,category.ilike.%${currentKeyword}%`
    );
  }

  // 排序
  if (currentSort === "updated_desc") {
    query = query.order("last_price_updated_at", { ascending: false });
  } else if (currentSort === "price_asc") {
    query = query.order("last_price", { ascending: true });
  } else if (currentSort === "price_desc") {
    query = query.order("last_price", { ascending: false });
  } else {
    query = query.order("name", { ascending: true });
  }

  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error(error);
    statusEl.textContent = "讀取資料失敗";
    return;
  }

  totalPages = Math.max(1, Math.ceil((count || 0) / pageSize));
  pageInfoEl.textContent = `第 ${currentPage} / ${totalPages} 頁`;

  if (!data || !data.length) {
    statusEl.textContent = "找不到符合條件的商品";
    return;
  }

  statusEl.textContent = "";
  data.forEach((p) => productListEl.appendChild(createProductCard(p)));
}

/* ------------------------
   事件
------------------------ */
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

/* ------------------------
   初始化
------------------------ */
document.addEventListener("DOMContentLoaded", async () => {
  await loadCategories();
  await loadProducts();
});
