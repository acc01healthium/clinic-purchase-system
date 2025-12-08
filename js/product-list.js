console.log("產品列表 JS 載入成功");

// ⛔ 千萬不要再次宣告 supabase！
// supabase.js 已經提供全域的 supabase 物件可以直接用。

async function loadProducts(searchText = "") {
  try {
    let query = supabase
      .from("products")
      .select(`
        id,
        name,
        spec,
        unit,
        last_price,
        updated_at,
        product_images (
          image_url
        )
      `);

    if (searchText.trim() !== "") {
      query = query.ilike("name", `%${searchText}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("資料讀取錯誤：", error);
      return;
    }

    renderProducts(data);
  } catch (err) {
    console.error("非預期錯誤：", err);
  }
}

function renderProducts(products) {
  const list = document.getElementById("productList");
  list.innerHTML = "";

  products.forEach(p => {
    const div = document.createElement("div");
    div.classList.add("product-card");

    const imgUrl = p.product_images?.[0]?.image_url || "";
    const imgTag = imgUrl ? `<img src="${imgUrl}" class="p-img">` : "";

    div.innerHTML = `
      ${imgTag}
      <h3>${p.name}</h3>
      <p>規格：${p.spec || "—"}</p>
      <p>單位：${p.unit || "—"}</p>
      <p>最新價格：$${p.last_price || "-"}</p>
      <p class="time">更新時間：${p.updated_at || "-"}</p>
    `;

    list.appendChild(div);
  });
}

document.querySelector("#searchInput").addEventListener("input", (e) => {
  loadProducts(e.target.value);
});

// 預設載入全部產品
loadProducts();
