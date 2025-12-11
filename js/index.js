// /js/index.js
// 前台商品查詢初始化

console.log("前台商品查詢初始化");

// 取得 Supabase client（在 /js/supabase.js 建立的）
const supabaseClient = window.supabaseClient;

// DOM 元素
const productListEl = document.getElementById("productList");
const searchInputEl = document.getElementById("searchInput");
const clearBtnEl = document.getElementById("clearBtn");
const statusEl = document.getElementById("statusMessage");

let allProducts = [];
let currentCategory = ""; // 空字串 = 全部

// 金額格式
function formatPrice(value) {
  if (value === null || value === undefined || value === "") return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return "—";
  return `NT$ ${num}`;
}

// 時間格式（若未來卡片要用得到）
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

// 建立商品卡片 DOM
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

 // 類別 / 單位（上下分開顯示）
const metaRow = document.createElement("div");
metaRow.className = "product-meta-row";

// 類別
if (p.category) {
  const categoryDiv = document.createElement("div");
  categoryDiv.className = "product-meta-line";
  categoryDiv.textContent = p.category;
  metaRow.appendChild(categoryDiv);
}

// 單位
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

  // 若需要顯示價格更新時間，可在卡片下方加一行
  if (p.last_price_updated_at) {
    const timeEl = document.createElement("p");
    timeEl.className = "product-updated-at";
    timeEl.textContent = `價格更新時間：${formatDateTime(
      p.last_price_updated_at
    )}`;
    content.appendChild(timeEl);
  }

  content.prepend(priceBlock);
  content.prepend(metaRow);
  content.prepend(specEl);
  content.prepend(nameEl);

  card.appendChild(imgWrapper);
  card.appendChild(content);

  return card;
}

// 將目前 allProducts + 篩選條件，渲染到畫面上
function renderProducts() {
  if (!productListEl) return;

  const keyword = (searchInputEl?.value || "").trim();

  let filtered = allProducts.filter((p) => p.is_active);

  if (currentCategory) {
    filtered = filtered.filter((p) => p.category === currentCategory);
  }

  if (keyword) {
    const kw = keyword.toLowerCase();
    filtered = filtered.filter((p) => {
      const text =
        `${p.name || ""} ${p.category || ""} ${p.spec || ""}`.toLowerCase();
      return text.includes(kw);
    });
  }

  productListEl.innerHTML = "";

  if (!filtered.length) {
    if (statusEl) statusEl.textContent = "目前沒有符合條件的商品";
    return;
  }

  if (statusEl) statusEl.textContent = "";

  filtered.forEach((p) => {
    productListEl.appendChild(createProductCard(p));
  });
}

// 載入商品（一次打後端）
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
  renderProducts();
}

// 搜尋框 & 清除按鈕事件
if (searchInputEl) {
  searchInputEl.addEventListener("input", () => {
    renderProducts();
  });
}

if (clearBtnEl) {
  clearBtnEl.addEventListener("click", () => {
    if (searchInputEl) searchInputEl.value = "";
    renderProducts();
  });
}

// 如果有「全部商品」或分類按鈕，這裡可以擴充
const allBtn = document.getElementById("allProductsBtn");
if (allBtn) {
  allBtn.addEventListener("click", () => {
    currentCategory = "";
    renderProducts();
  });
}

// 初始化
document.addEventListener("DOMContentLoaded", () => {
  loadProducts();
});
