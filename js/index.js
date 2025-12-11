// /js/index.js  前台「商品查詢」邏輯 Final 版

console.log("前台商品查詢初始化");

// DOM
const productListEl = document.getElementById("productList");
const searchInputEl = document.getElementById("searchInput");
const clearBtnEl = document.getElementById("clearBtn");
const statusEl = document.getElementById("statusMessage");
const categoryContainer = document.getElementById("categoryFilters");

let allProducts = [];
let currentCategory = "ALL";

// 讀取商品
async function loadProducts() {
  if (!window.supabaseClient) {
    console.error("supabaseClient 未定義，請檢查 supabase.js 是否正確載入。");
    if (statusEl) statusEl.textContent = "系統初始化失敗，請稍後再試。";
    return;
  }

  if (statusEl) statusEl.textContent = "載入中...";

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
      image_url,
      last_price,
      suggested_pri,
      is_active,
      last_price_upd
    `
    )
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("前台讀取商品錯誤：", error);
    if (statusEl) statusEl.textContent = "讀取資料發生錯誤，請稍後再試。";
    return;
  }

  allProducts = (data || []).filter((p) => p.is_active === true || p.is_active === "true");

  buildCategoryFilters();
  renderProducts();
  if (statusEl) statusEl.textContent = "";
}

// 建立分類按鈕
function buildCategoryFilters() {
  if (!categoryContainer) return;

  categoryContainer.innerHTML = "";

  const categories = Array.from(
    new Set(allProducts.map((p) => (p.category || "").trim()).filter((c) => c !== ""))
  );

  // 加入「全部商品」
  const allBtn = document.createElement("button");
  allBtn.className = "filter-pill" + (currentCategory === "ALL" ? " active" : "");
  allBtn.textContent = "全部商品";
  allBtn.addEventListener("click", () => {
    currentCategory = "ALL";
    renderProducts();
    buildCategoryFilters();
  });
  categoryContainer.appendChild(allBtn);

  categories.forEach((cat) => {
    const btn = document.createElement("button");
    btn.className =
      "filter-pill" + (currentCategory === cat ? " active" : "");
    btn.textContent = cat;
    btn.addEventListener("click", () => {
      currentCategory = cat;
      renderProducts();
      buildCategoryFilters();
    });
    categoryContainer.appendChild(btn);
  });
}

// 渲染商品卡片
function renderProducts() {
  if (!productListEl) return;

  const keyword = (searchInputEl?.value || "").trim().toLowerCase();

  let list = [...allProducts];

  if (currentCategory !== "ALL") {
    list = list.filter((p) => (p.category || "") === currentCategory);
  }

  if (keyword) {
    list = list.filter((p) => {
      const text = `${p.name || ""} ${p.category || ""} ${p.spec || ""} ${p.description || ""}`.toLowerCase();
      return text.includes(keyword);
    });
  }

  productListEl.innerHTML = "";

  if (list.length === 0) {
    productListEl.innerHTML = `<div class="empty-state">目前沒有符合條件的商品</div>`;
    return;
  }

  list.forEach((p) => {
    const card = document.createElement("article");
    card.className = "product-card";

    // 圖片區
    const imgWrap = document.createElement("div");
    imgWrap.className = "product-image-wrapper";

    if (p.image_url) {
      const img = document.createElement("img");
      img.src = p.image_url;
      img.alt = p.name || "商品圖片";
      imgWrap.appendChild(img);
    } else {
      const ph = document.createElement("div");
      ph.className = "product-image-placeholder";
      ph.textContent = "尚未上傳圖片";
      imgWrap.appendChild(ph);
    }

    // 文字內容
    const content = document.createElement("div");
    content.className = "product-content";

    const nameEl = document.createElement("h3");
    nameEl.className = "product-name";
    nameEl.textContent = p.name || "未命名商品";

    const specEl = document.createElement("p");
    specEl.className = "product-spec";
    specEl.textContent = p.spec || "";

    const metaRow = document.createElement("div");
    metaRow.className = "product-meta-row";

    if (p.category) {
      const tag = document.createElement("span");
      tag.className = "product-meta-tag";
      tag.textContent = p.category;
      metaRow.appendChild(tag);
    }

    if (p.unit) {
      const tag = document.createElement("span");
      tag.className = "product-meta-tag";
      tag.textContent = `單位：${p.unit}`;
      metaRow.appendChild(tag);
    }

    const priceRow = document.createElement("div");
    priceRow.className = "product-price-row";
    const leftCol = document.createElement("div");
    const rightCol = document.createElement("div");

    leftCol.className = "price-label-col";
    rightCol.className = "price-value-col";

    // 價格排版：兩行對齊
    const buyLabel = document.createElement("div");
    buyLabel.textContent = "進       價：";
    const sugLabel = document.createElement("div");
    sugLabel.textContent = "建議售價：";

    const buyVal = document.createElement("div");
    buyVal.textContent =
      p.last_price != null ? `NT$ ${Number(p.last_price).toFixed(0)}` : "—";

    const sugVal = document.createElement("div");
    sugVal.textContent =
      p.suggested_pri != null
        ? `NT$ ${Number(p.suggested_pri).toFixed(0)}`
        : "—";

    leftCol.appendChild(buyLabel);
    leftCol.appendChild(sugLabel);
    rightCol.appendChild(buyVal);
    rightCol.appendChild(sugVal);

    priceRow.appendChild(leftCol);
    priceRow.appendChild(rightCol);

    const timeEl = document.createElement("p");
    timeEl.className = "product-updated-at";
    if (p.last_price_upd) {
      const dt = new Date(p.last_price_upd);
      timeEl.textContent = `價格更新時間：${dt.toLocaleString("zh-TW")}`;
    } else {
      timeEl.textContent = "價格更新時間：—";
    }

    if (p.description) {
      const descEl = document.createElement("p");
      descEl.className = "product-desc";
      descEl.textContent = p.description;
      content.appendChild(descEl);
    }

    content.appendChild(nameEl);
    if (p.spec) content.appendChild(specEl);
    content.appendChild(metaRow);
    content.appendChild(priceRow);
    content.appendChild(timeEl);

    card.appendChild(imgWrap);
    card.appendChild(content);

    productListEl.appendChild(card);
  });
}

// 事件綁定
document.addEventListener("DOMContentLoaded", () => {
  if (searchInputEl) {
    searchInputEl.addEventListener("input", () => {
      renderProducts();
    });
  }
  if (clearBtnEl) {
    clearBtnEl.addEventListener("click", () => {
      searchInputEl.value = "";
      renderProducts();
    });
  }

  loadProducts();
});
