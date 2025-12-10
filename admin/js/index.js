// /js/index.js － 前台商品查詢列表

const supabase = window.supabaseClient;

const searchInput = document.getElementById("searchInput");
const clearSearchBtn = document.getElementById("clearSearchBtn");
const cardContainer = document.getElementById("cardContainer");
const cardTpl = document.getElementById("productCardTemplate");

/** 載入所有啟用中的商品 */
async function loadProducts() {
  cardContainer.innerHTML = "載入中…";

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("載入商品失敗", error);
    cardContainer.innerHTML = "載入商品失敗：" + error.message;
    return;
  }

  window.__ALL_PRODUCTS__ = data || [];
  renderCards(window.__ALL_PRODUCTS__);
}

/** 根據清單畫出卡片 */
function renderCards(list) {
  cardContainer.innerHTML = "";

  if (!list.length) {
    cardContainer.innerHTML = `<p style="padding: 1rem;">目前沒有符合條件的商品。</p>`;
    return;
  }

  list.forEach((item) => {
    const node = cardTpl.content.cloneNode(true);
    const img = node.querySelector(".product-image");
    const imgWrap = node.querySelector(".product-image-wrapper");
    const placeholder = node.querySelector(".product-image-placeholder");
    const nameEl = node.querySelector(".product-name");
    const specEl = node.querySelector(".product-spec");
    const tagsEl = node.querySelector(".product-tags");
    const priceEl = node.querySelector(".product-price");
    const updatedEl = node.querySelector(".product-updated");

    if (item.image_url) {
      img.src = item.image_url;
      img.alt = item.name || "商品圖片";
      img.style.display = "block";
      placeholder.style.display = "none";
    } else {
      img.style.display = "none";
      placeholder.style.display = "flex";
    }

    nameEl.textContent = item.name || "";
    specEl.textContent = item.spec || "";
    const tags = [];
    if (item.category) tags.push(`分類：${item.category}`);
    if (item.unit) tags.push(`單位：${item.unit}`);
    tagsEl.textContent = tags.join("　");

    if (typeof item.last_price === "number") {
      priceEl.textContent = `NT$ ${item.last_price}`;
    } else {
      priceEl.textContent = "未設定售價";
    }

    if (item.last_price_updated_at) {
      const dt = new Date(item.last_price_updated_at);
      const pad = (n) => (n < 10 ? "0" + n : n);
      const y = dt.getFullYear();
      const m = pad(dt.getMonth() + 1);
      const d = pad(dt.getDate());
      const hh = pad(dt.getHours());
      const mm = pad(dt.getMinutes());
      updatedEl.textContent = `價格更新時間：${y}/${m}/${d} ${hh}:${mm}`;
    } else {
      updatedEl.textContent = "價格更新時間：尚未設定";
    }

    cardContainer.appendChild(node);
  });
}

/** 搜尋篩選 */
function applySearch() {
  const keyword = (searchInput.value || "").trim().toLowerCase();
  const all = window.__ALL_PRODUCTS__ || [];

  if (!keyword) {
    renderCards(all);
    return;
  }

  const filtered = all.filter((p) => {
    const text = [
      p.name || "",
      p.spec || "",
      p.category || "",
      p.unit || "",
      p.description || "",
    ]
      .join(" ")
      .toLowerCase();
    return text.includes(keyword);
  });

  renderCards(filtered);
}

searchInput.addEventListener("input", () => {
  applySearch();
});

clearSearchBtn.addEventListener("click", () => {
  searchInput.value = "";
  applySearch();
});

// 初始化
loadProducts();
