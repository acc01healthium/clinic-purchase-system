// /js/index.js
const supabase = window.supabaseClient;

const searchInput = document.getElementById("searchInput");
const clearBtn = document.getElementById("clearBtn");
const productListEl = document.getElementById("productList");
const emptyStateEl = document.getElementById("emptyState");

let allProducts = [];

async function loadProducts() {
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, category, spec, unit, last_price, last_price_updated_at, image_url, is_active"
    )
    .eq("is_active", true)
    .order("id", { ascending: true });

  if (error) {
    console.error("載入商品失敗", error);
    productListEl.innerHTML = `<p class="error-text">載入商品失敗：${error.message}</p>`;
    return;
  }

  allProducts = data || [];
  renderProducts(allProducts);
}

function renderProducts(list) {
  productListEl.innerHTML = "";

  if (!list.length) {
    emptyStateEl.style.display = "block";
    return;
  }

  emptyStateEl.style.display = "none";

  list.forEach((p) => {
    const card = document.createElement("article");
    card.className = "product-card";

    const price = p.last_price != null ? `NT$ ${p.last_price}` : "—";
    const updatedAt = p.last_price_updated_at
      ? new Date(p.last_price_updated_at).toLocaleString("zh-TW")
      : "—";

    card.innerHTML = `
      <div class="product-image-wrap">
        ${
          p.image_url
            ? `<img src="${p.image_url}" alt="${p.name}" />`
            : `<div class="image-placeholder">尚未上傳圖片</div>`
        }
      </div>
      <div class="product-card-body">
        <h3 class="product-name">${p.name || "未命名商品"}</h3>
        <p class="product-spec">${p.spec || ""}</p>
        <p class="product-meta">
          <span class="tag">類別：${p.category || "—"}</span>
          <span class="tag">單位：${p.unit || "—"}</span>
        </p>
        <div class="product-footer">
          <span class="product-price">${price}</span>
          <span class="product-updated">價格更新時間：${updatedAt}</span>
        </div>
      </div>
    `;

    productListEl.appendChild(card);
  });
}

function applySearch() {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) {
    renderProducts(allProducts);
    return;
  }

  const filtered = allProducts.filter((p) => {
    const text = `${p.name || ""} ${p.spec || ""} ${p.category || ""}`.toLowerCase();
    return text.includes(q);
  });

  renderProducts(filtered);
}

searchInput.addEventListener("input", () => {
  // 即時過濾
  applySearch();
});

clearBtn.addEventListener("click", () => {
  searchInput.value = "";
  applySearch();
});

// 初始化
loadProducts();

