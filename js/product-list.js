console.log("product-list.js 已載入成功");

// DOM
const searchInput = document.getElementById("searchInput");
const productList = document.getElementById("productList");

// 初次載入
loadProducts();

// 🔍 搜尋時重新載入
searchInput.addEventListener("input", loadProducts);

// ==========================
//      主要資料載入函式
// ==========================
async function loadProducts() {
  const keyword = searchInput.value.trim();

  let query = supabase
    .from("products")
    .select(`
      id,
      name,
      sku,
      category,
      description,
      price,
      unit,
      image_url,
      last_price,
      last_price_updated_at
    `)
    .eq("is_active", true);

  // 若有關鍵字 → 搜尋 name / description / sku / category
  if (keyword !== "") {
    query = query.or(
      `name.ilike.%${keyword}%,description.ilike.%${keyword}%,sku.ilike.%${keyword}%,category.ilike.%${keyword}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("資料讀取錯誤：", error);
    productList.innerHTML = `<p style="color:red;">讀取資料錯誤：${error.message}</p>`;
    return;
  }

  // 渲染畫面
  renderProducts(data);
}

// ==========================
//        渲染產品列表
// ==========================
function renderProducts(items) {
  if (!items || items.length === 0) {
    productList.innerHTML = "<p>查無資料</p>";
    return;
  }

  productList.innerHTML = items
    .map(
      (p) => `
      <div class="product-card">
        <img src="${p.image_url || ''}" class="product-img" alt="${p.name}" />

        <h3>${p.name}</h3>
        <p>規格：${p.description || "未提供"}</p>
        <p>單位：${p.unit || "-"}</p>
        <p>售價：${p.price ?? "-"}</p>
        <p>最後採購價：${p.last_price ?? "-"}</p>
        <p>更新時間：${formatDate(p.last_price_updated_at)}</p>
      </div>
    `
    )
    .join("");
}

// 格式化時間
function formatDate(t) {
  if (!t) return "-";
  return new Date(t).toLocaleString("zh-TW");
}
