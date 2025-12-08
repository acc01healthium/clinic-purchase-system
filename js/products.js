// ./js/products.js

// 查分類
async function loadCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name");

  return data;
}

// 查所有商品（含分類+圖片）
async function loadProducts() {
  const { data, error } = await supabase
    .from("products")
    .select(`
      id,
      name,
      spec,
      unit,
      last_price,
      last_price_updated_at,
      product_images(url)
    `)
    .order("name");

  return data;
}

