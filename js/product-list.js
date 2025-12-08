// js/product-list.js
// ===============================
// 前台：讀取商品 & 搜尋 & 畫面渲染
// ===============================

console.log("product-list.js 已載入成功");

// 拿到 HTML 元素
const searchInput = document.getElementById("searchInput");
const clearSearchBtn = document.getElementById("clearSearchBtn");
const productListEl = document.getElementById("productList");
const statusMessageEl = document.getElementById("statusMessage");

// 方便存取 Supabase client
const supabase = window.supabaseClient;

// 工具：格式化價格（售價 = 最後採購價）
function formatPrice(value) {
  if (value == null || value === "") return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return num.toLocaleString("zh-TW", { minimumFractionDigits: 0 });
}

// 工具：格式化時間（價格更新時間）
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

// 顯示狀態訊息
function showStatusMessage(text, isError = false) {
  if (!text) {
    statusMessageEl.hidden = true;
    statusMessageEl.textContent = "";
    return;
  }
  statusMessageEl.hidden = false;
  statusMessageEl.textContent = text;
  statusMessageEl.style.color = isError ? "#b23b3b" : "#555";
}

// 渲染商品列表
function renderProducts(products) {
  productListEl.innerHTML = "";

  if (!products || products.length === 0) {
    const empty = document.createElement("div");
    empty.className = "product-empty";
    empty.textContent = "查無資料";
    productListEl.appendChild(empty);
    return;
  }

  for (const p of products) {
    const card = document.createElement("article");
    card.className = "product-card";

    // 圖片區
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

    // 文字內容區
    const content = document.createElement("div");
    content.className = "product-content";

    const nameEl = document.createElement("h2");
    nameEl.className = "product-name";
    nameEl.textContent = p.name || "未命名商品";

    const specEl = document.createElement("p");
    specEl.className = "product-spec";
    specEl.textContent = p.description || "（無規格說明）";

    // meta row：分類 + 單位
    const metaRow = document.createElement("div");
    metaRow.className = "product-meta-row";

    if (p.category) {
      const catTag = document.createElement("span");
      catTag.className = "product-meta-tag";
      catTag.textContent = p.category;
      metaRow.appendChild(catTag);
    }

    if (p.unit) {
      const unitTag = document.createElement("span");
      unitTag.className = "product-meta-tag";
      unitTag.textContent = `單位：${p.unit}`;
      metaRow.appendChild(unitTag);
    }

    // 價格區：售價 = last_price
    const priceRow = document.createElement("div");
    priceRow.className = "product-price-row";

    const priceLabel = document.createElement("span");
    priceLabel.className = "product-price-label";
    priceLabel.textContent = "售價";

    const priceValue = document.createElement("span");
    priceValue.className = "product-price";
    priceValue.textContent = `NT$ ${formatPrice(p.last_price)}`;

    priceRow.appendChild(priceLabel);
    priceRow.appendChild(priceValue);

    // 價格更新時間
    const updatedEl = document.createElement("div");
    updatedEl.className = "product-updated-at";
    updatedEl.textContent = `價格更新時間：${formatDateTime(p.last_price_updated_at)}`;

    // 組裝卡片
    content.appendChild(nameEl);
    content.appendChild(specEl);
    if (metaRow.childElementCount > 0) content.appendChild(metaRow);
    content.appendChild(priceRow);
    content.appendChild(updatedEl);

    card.appendChild(imgWrapper);
    card.appendChild(content);

    productListEl.appendChild(card);
  }
}

// 從 Supabase 讀取商品
async function loadProducts(keyword = "") {
  try {
    showStatusMessage("讀取資料中…");

    let query = supabase
      .from("products")
      .select(
        `
        id,
        name,
        category,
        description,
        unit,
        last_price,
        last_price_updated_at,
        image_url,
        is_active
      `
      )
      .eq("is_active", true) // 僅顯示啟用商品
      .order("name", { ascending: true });

    const trimmed = keyword.trim();
    if (trimmed) {
      // 名稱 / 規格 / 分類 模糊搜尋
      query = query.or(
        `name.ilike.%${trimmed}%,description.ilike.%${trimmed}%,category.ilike.%${trimmed}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase 讀取錯誤：", error);
      showStatusMessage(`讀取資料錯誤：${error.message || "未知錯誤"}`, true);
      renderProducts([]);
      return;
    }

    showStatusMessage(""); // 清除狀態文字
    renderProducts(data || []);
  } catch (err) {
    console.error("讀取資料例外：", err);
    showStatusMessage(`讀取資料錯誤：${err.message || "未知錯誤"}`, true);
    renderProducts([]);
  }
}

// 綁定事件：即時搜尋（稍微 debounce）
let searchTimer = null;
searchInput.addEventListener("input", () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    loadProducts(searchInput.value);
  }, 250);
});

clearSearchBtn.addEventListener("click", () => {
  searchInput.value = "";
  loadProducts("");
});

// 初始化：頁面載入完就讀一次
document.addEventListener("DOMContentLoaded", () => {
  loadProducts("");
});
