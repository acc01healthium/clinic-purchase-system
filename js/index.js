// js/index.js
// 前台：康醫採購查詢系統 – 商品列表 & 搜尋

console.log("✅ 前台 index.js 載入");

const db = window.supabaseClient;

// DOM 元素
const searchInput = document.getElementById("searchInput");
const clearBtn = document.getElementById("clearBtn");
const productListEl = document.getElementById("productList");
const emptyStateEl = document.getElementById("emptyState");

// 工具：價格格式
function formatPrice(value) {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return n.toLocaleString("zh-TW", { minimumFractionDigits: 0 });
}

// 工具：時間格式（價格更新時間）
function formatDateTime(isoString) {
  if (!isoString) return "—";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// 渲染商品卡片
function renderProducts(rows) {
  productListEl.innerHTML = "";

  if (!rows || rows.length === 0) {
    emptyStateEl.style.display = "block";
    return;
  }

  emptyStateEl.style.display = "none";

  rows.forEach((p) => {
    const card = document.createElement("article");
    card.className = "product-card";

    // 圖片區
    const imgWrap = document.createElement("div");
    imgWrap.className = "product-image-wrapper";

    if (p.image_url) {
      const img = document.createElement("img");
      img.src = p.image_url;
      img.alt = p.name || "商品圖片";
      img.loading = "lazy";
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

    const nameEl = document.createElement("h2");
    nameEl.className = "product-name";
    nameEl.textContent = p.name || "未命名商品";

    const specEl = document.createElement("p");
    specEl.className = "product-spec";
    if (p.spec || p.description) {
      specEl.textContent = p.spec
        ? p.spec + (p.description ? "｜" + p.description : "")
        : p.description;
    } else {
      specEl.textContent = "（無規格／描述）";
    }

    // 類別 + 單位
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

    // 價格區：進價 + 建議售價
    const priceRow = document.createElement("div");
    priceRow.className = "product-price-row";

    const leftCol = document.createElement("div");
    const rightCol = document.createElement("div");

    const costLabel = document.createElement("div");
    costLabel.className = "product-price-label";
    costLabel.textContent = "進價";

    const costVal = document.createElement("div");
    costVal.className = "product-price";
    costVal.textContent = `NT$ ${formatPrice(p.last_price)}`;

    leftCol.appendChild(costLabel);
    leftCol.appendChild(costVal);

    const suggestLabel = document.createElement("div");
    suggestLabel.className = "product-price-label";
    suggestLabel.textContent = "建議售價";

    const suggestVal = document.createElement("div");
    suggestVal.className = "product-price";
    suggestVal.textContent = p.suggest_price
      ? `NT$ ${formatPrice(p.suggest_price)}`
      : "—";

    rightCol.appendChild(suggestLabel);
    rightCol.appendChild(suggestVal);

    priceRow.appendChild(leftCol);
    priceRow.appendChild(rightCol);

    const updatedEl = document.createElement("div");
    updatedEl.className = "product-updated-at";
    updatedEl.textContent = `價格更新時間：${formatDateTime(
      p.last_price_updated_at
    )}`;

    content.appendChild(nameEl);
    content.appendChild(specEl);
    if (metaRow.childElementCount > 0) content.appendChild(metaRow);
    content.appendChild(priceRow);
    content.appendChild(updatedEl);

    card.appendChild(imgWrap);
    card.appendChild(content);

    productListEl.appendChild(card);
  });
}

// 從 Supabase 載入商品
async function loadProducts(keyword = "") {
  try {
    let query = db
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
        suggest_price,
        last_price_updated_at,
        image_url,
        is_active
      `
      )
      .eq("is_active", true)
      .order("name", { ascending: true });

    const kw = keyword.trim();
    if (kw) {
      query = query.or(
        `name.ilike.%${kw}%,spec.ilike.%${kw}%,category.ilike.%${kw}%,description.ilike.%${kw}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("讀取商品失敗：", error);
      productListEl.innerHTML = "";
      emptyStateEl.style.display = "block";
      emptyStateEl.textContent = "讀取資料發生錯誤，請稍後再試。";
      return;
    }

    renderProducts(data || []);
  } catch (err) {
    console.error("讀取商品例外：", err);
    productListEl.innerHTML = "";
    emptyStateEl.style.display = "block";
    emptyStateEl.textContent = "讀取資料發生錯誤，請稍後再試。";
  }
}

// 搜尋事件（簡易 debounce）
let timer = null;

if (searchInput) {
  searchInput.addEventListener("input", () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      loadProducts(searchInput.value);
    }, 250);
  });
}

if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    loadProducts("");
  });
}

// 初始化
document.addEventListener("DOMContentLoaded", () => {
  loadProducts("");
});
