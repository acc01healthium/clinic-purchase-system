// js/index.js
// ===============================
// 前台：讀取商品 & 搜尋 & 畫面渲染（進價＋建議售價＋描述展開）
// ===============================

console.log("前台 index.js 已載入");

// 拿到 DOM 元素
const supabase = window.supabaseClient;
const searchInput = document.getElementById("searchInput");
const clearBtn = document.getElementById("clearBtn");
const productListEl = document.getElementById("productList");
const emptyStateEl = document.getElementById("emptyState");

// 價格格式
function formatPrice(value) {
  if (value == null || value === "") return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return num.toLocaleString("zh-TW", { minimumFractionDigits: 0 });
}

// 時間格式（價格更新時間）
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

// 產生一張商品卡片
function createProductCard(p) {
  const card = document.createElement("article");
  card.className = "product-card";

  // ===== 圖片區 =====
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

  // ===== 文字內容區 =====
  const content = document.createElement("div");
  content.className = "product-content";

  // 名稱
  const nameEl = document.createElement("h2");
  nameEl.className = "product-name";
  nameEl.textContent = p.name || "未命名商品";

  // 規格 / 描述（統一用 description，沒有就顯示 spec）
  const fullDesc =
    p.description ||
    p.spec ||
    "（尚未填寫描述）";

  const descWrap = document.createElement("div");
  descWrap.className = "product-desc-wrapper";

  const descEl = document.createElement("p");
  descEl.className = "product-spec";

  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.className = "product-desc-toggle";

  // 收合邏輯：預設顯示前 40～60 字
  const MAX_LEN = 60;
  const isLong = fullDesc.length > MAX_LEN;

  descEl.dataset.full = fullDesc;

  if (isLong) {
    descEl.dataset.collapsed = fullDesc.slice(0, MAX_LEN) + "…";
    descEl.textContent = descEl.dataset.collapsed;
    toggleBtn.textContent = "更多";
    toggleBtn.addEventListener("click", () => {
      const expanded = descEl.dataset.state === "expanded";
      if (expanded) {
        // 收起
        descEl.textContent = descEl.dataset.collapsed;
        descEl.dataset.state = "collapsed";
        toggleBtn.textContent = "更多";
      } else {
        // 展開
        descEl.textContent = descEl.dataset.full;
        descEl.dataset.state = "expanded";
        toggleBtn.textContent = "收起";
      }
    });
  } else {
    descEl.textContent = fullDesc;
    toggleBtn.style.display = "none";
  }

  descWrap.appendChild(descEl);
  descWrap.appendChild(toggleBtn);

  // meta row：分類 + 單位
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

  // 價格區：進價 / 建議售價
  const priceRow = document.createElement("div");
  priceRow.className = "product-price-row";

  const priceBlock = document.createElement("div");
  priceBlock.className = "product-price-block";

  const costLine = document.createElement("div");
  costLine.className = "product-price-line";
  costLine.innerHTML = `<span class="product-price-label">進價</span><span class="product-price-value">NT$ ${formatPrice(p.last_price)}</span>`;

  const suggLine = document.createElement("div");
  suggLine.className = "product-price-line";
  suggLine.innerHTML = `<span class="product-price-label">建議售價</span><span class="product-price-value">NT$ ${formatPrice(p.suggested_price)}</span>`;

  priceBlock.appendChild(costLine);
  priceBlock.appendChild(suggLine);
  priceRow.appendChild(priceBlock);

  // 價格更新時間
  const updatedEl = document.createElement("div");
  updatedEl.className = "product-updated-at";
  updatedEl.textContent = `價格更新時間：${formatDateTime(
    p.last_price_updated_at
  )}`;

  // 組裝卡片
  content.appendChild(nameEl);
  content.appendChild(descWrap);
  if (metaRow.childElementCount > 0) content.appendChild(metaRow);
  content.appendChild(priceRow);
  content.appendChild(updatedEl);

  card.appendChild(imgWrap);
  card.appendChild(content);

  return card;
}

// 渲染商品列表
function renderProducts(list) {
  productListEl.innerHTML = "";

  if (!list || list.length === 0) {
    emptyStateEl.style.display = "block";
    return;
  }

  emptyStateEl.style.display = "none";

  for (const p of list) {
    const card = createProductCard(p);
    productListEl.appendChild(card);
  }
}

// 從 Supabase 讀資料
async function loadProducts(keyword = "") {
  try {
    let query = supabase
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
      .eq("is_active", true)
      .order("name", { ascending: true });

    const trimmed = keyword.trim();
    if (trimmed) {
      query = query.or(
        `name.ilike.%${trimmed}%,spec.ilike.%${trimmed}%,description.ilike.%${trimmed}%,category.ilike.%${trimmed}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("讀取商品錯誤：", error);
      emptyStateEl.style.display = "block";
      productListEl.innerHTML = "";
      return;
    }

    renderProducts(data || []);
  } catch (err) {
    console.error("例外錯誤：", err);
    emptyStateEl.style.display = "block";
    productListEl.innerHTML = "";
  }
}

// 搜尋事件（簡單 debounce）
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
