// 不可再重複宣告 SUPABASE_URL 或 SUPABASE_KEY

async function loadProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*, product_images(url)")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("資料讀取錯誤：", error);
    return;
  }

  renderProducts(data);
}

function renderProducts(list) {
  const container = document.getElementById("productList");
  container.innerHTML = "";

  list.forEach(item => {
    const div = document.createElement("div");
    div.className = "product-card";

    div.innerHTML = `
      <h3>${item.name}</h3>
      <p>規格：${item.spec}</p>
      <p>單位：${item.unit}</p>
      <p class="price">最新價格：${item.last_price ?? "未設定"}</p>
    `;

    container.appendChild(div);
  });
}

document.getElementById("searchInput").addEventListener("input", async (e) => {
  const keyword = e.target.value.trim();

  const { data } = await supabase
    .from("products")
    .select("*")
    .ilike("name", `%${keyword}%`);

  renderProducts(data);
});

loadProducts();
