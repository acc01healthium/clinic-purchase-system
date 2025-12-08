const SUPABASE_URL = "https://utwhtjtgwryeljgwlwzm.supabase.co";
const SUPABASE_ANON_KEY = "你的 anon key";

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANONeyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0d2h0anRnd3J5ZWxqZ3dsd3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNTkxNDQsImV4cCI6MjA4MDczNTE0NH0.SexZh_JV9IUT5cL7o6KO-bh6D50aFkZUrhZVf4_fNbs_KEY);

// 取得全部商品（前台開放查詢 → 使用 RLS）
async function loadProducts() {
  const { data, error } = await supabase
    .from("products")
    .select(`
        id,
        name,
        unit,
        spec,
        price,
        last_price_updated,
        product_images(url)
    `)
    .order("name", { ascending: true });

  if (error) {
    console.error("載入商品失敗：", error);
    return;
  }

  renderProducts(data);
}

// 將商品渲染到前端
function renderProducts(products) {
  const container = document.getElementById("product-list");
  container.innerHTML = "";

  products.forEach((p) => {
    const img = p.product_images?.[0]?.url ?? "no-image.png";

    container.innerHTML += `
      <div class="product-card">
        <img src="${img}" class="product-img" />
        <h3>${p.name}</h3>
        <p>單位：${p.unit}</p>
        <p>規格：${p.spec}</p>
        <p class="price">$${p.price}</p>
        <p class="update-time">最後更新：${p.last_price_updated ?? "—"}</p>
      </div>
    `;
  });
}

// 初始化
loadProducts();
