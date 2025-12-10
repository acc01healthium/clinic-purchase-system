// ===========================
//  前台商品列表渲染 Final 版本
// ===========================

async function loadProducts() {
  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("載入產品錯誤:", error);
    return;
  }

  renderProducts(data);
}

// ===========================
//  渲染商品卡片（符合 style.css）
// ===========================
function renderProducts(products) {
  const list = document.getElementById("productList");
  const emptyState = document.getElementById("emptyState");
  list.innerHTML = "";

  if (!products.length) {
    emptyState.style.display = "block";
    return;
  } else {
    emptyState.style.display = "none";
  }

  products.forEach((p) => {
    const imgHTML = p.image_url
      ? `<img src="${p.image_url}" alt="${p.name}" />`
      : `<div class="product-image-placeholder">尚未上傳圖片</div>`;

    const card = `
      <div class="product-card">
        <div class="product-image-wrapper">
            ${imgHTML}
        </div>

        <div class="product-content">
          <h3 class="product-name">${p.name}</h3>

          <p class="product-spec">${p.spec ?? ""}</p>

          <div class="product-meta-row">
            <span class="product-meta-tag">${p.category || "未分類"}</span>
            <span class="product-meta-tag">單位：${p.unit || "-"}</span>
          </div>

          <div class="product-price-row">
            <span class="product-price-label">售價</span>
            <span class="product-price">NT$ ${p.last_price ?? "-"}</span>
          </div>

          <div class="product-updated-at">
            價格更新時間：${formatDatetime(p.last_price_updated_at)}
          </div>
        </div>
      </div>
    `;

    list.insertAdjacentHTML("beforeend", card);
  });
}

// 日期格式化
function formatDatetime(dt) {
  if (!dt) return "-";
  return new Date(dt).toLocaleString("zh-TW", { hour12: false });
}

// ========= 搜尋功能 =========
document.getElementById("searchInput").addEventListener("input", applySearch);
document.getElementById("clearBtn").addEventListener("click", () => {
  document.getElementById("searchInput").value = "";
  loadProducts();
});

async function applySearch() {
  const keyword = document.getElementById("searchInput").value.trim();
  if (!keyword) return loadProducts();

  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .ilike("name", `%${keyword}%`);

  renderProducts(data || []);
}

// 初始載入
loadProducts();
