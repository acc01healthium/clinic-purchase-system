console.log("前台商品查詢初始化");

// Supabase client
const supabaseClient = window.supabaseClient;

const productList = document.getElementById("productList");
const errorBox = document.getElementById("errorMessage");
const searchInput = document.getElementById("searchInput");
const clearBtn = document.getElementById("clearBtn");

// 主要載入
async function loadProducts() {
  productList.innerHTML = "載入中…";

  const { data, error } = await supabaseClient
    .from("products")
    .select(`
      id, name, category, spec, unit,
      last_price, suggest_price,
      description,
      image_url,
      last_price_updated_at,
      is_active
    `)
    .eq("is_active", true)
    .order("id", { ascending: true });

  if (error) {
    console.error(error);
    productList.innerHTML = "";
    errorBox.textContent = "讀取資料發生錯誤，請稍後再試。";
    return;
  }

  window._allProducts = data;
  renderProducts(data);
}

// 渲染卡片
function renderProducts(list) {
  productList.innerHTML = "";

  if (list.length === 0) {
    productList.innerHTML = "<p>目前沒有符合的商品。</p>";
    return;
  }

  list.forEach((p) => {
    const card = document.createElement("div");
    card.className = "product-card";

    card.innerHTML = `
      <div class="product-image-wrapper">
        ${
          p.image_url
            ? `<img src="${p.image_url}" alt="${p.name}" />`
            : `<div class="product-image-placeholder">尚未上傳圖片</div>`
        }
      </div>

      <div class="product-content">
        <h3 class="product-name">${p.name}</h3>
        <p class="product-spec">${p.spec || ""}</p>

        <div class="product-meta-row">
          <span class="product-meta-tag">${p.category || ""}</span>
          <span class="product-meta-tag">單位：${p.unit || "-"}</span>
        </div>

        <div class="product-price-row">
          <span class="product-price">NT$ ${p.last_price ?? "-"}</span>
        </div>

        <p class="product-updated-at">
          更新：${formatTime(p.last_price_updated_at)}
        </p>

        ${
          p.description
            ? `<p class="product-description">${p.description}</p>`
            : ""
        }
      </div>
    `;

    productList.appendChild(card);
  });
}

// 搜尋
searchInput.addEventListener("input", () => {
  const kw = searchInput.value.trim();

  if (!kw) {
    renderProducts(window._allProducts);
    return;
  }

  const list = window._allProducts.filter((p) =>
    [p.name, p.category, p.spec]
      .join(" ")
      .toLowerCase()
      .includes(kw.toLowerCase())
  );

  renderProducts(list);
});

// 清除按鈕
clearBtn.addEventListener("click", () => {
  searchInput.value = "";
  renderProducts(window._allProducts);
});

// 時間格式
function formatTime(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleString("zh-TW", { hour12: true });
}

loadProducts();
