console.log("後台 編輯商品初始化");

const supabaseClient = window.supabaseClient;

// 取得 URL ?id=xxxx
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get("id");

// DOM 元素
const nameEl = document.getElementById("name");
const categoryEl = document.getElementById("category");
const specEl = document.getElementById("spec");
const unitEl = document.getElementById("unit");
const descriptionEl = document.getElementById("description");
const lastPriceEl = document.getElementById("last_price");
const suggestedPriceEl = document.getElementById("suggested_price");
const isActiveEl = document.getElementById("is_active");
const imageUrlEl = document.getElementById("image_url");
const imageUploadEl = document.getElementById("imageUpload");

// 載入商品資料
async function loadProduct() {
  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();

  if (error) {
    alert("讀取資料錯誤");
    console.error(error);
    return;
  }

  // 填入欄位
  nameEl.value = data.name || "";
  categoryEl.value = data.category || "";
  specEl.value = data.spec || "";
  unitEl.value = data.unit || "";
  descriptionEl.value = data.description || "";
  lastPriceEl.value = data.last_price || "";
  suggestedPriceEl.value = data.suggested_price || "";
  isActiveEl.value = data.is_active ? "true" : "false";
  imageUrlEl.value = data.image_url || "";
}

loadProduct();

// 上傳圖片 → 自動存入 Supabase Storage
imageUploadEl.addEventListener("change", async () => {
  const file = imageUploadEl.files[0];
  if (!file) return;

  const fileName = `product_${productId}_${Date.now()}`;

  const { data, error } = await supabaseClient.storage
    .from("product-images")
    .upload(fileName, file);

  if (error) {
    alert("圖片上傳失敗");
    console.error(error);
    return;
  }

  // 取得公開網址
  const { data: urlData } = supabaseClient.storage
    .from("product-images")
    .getPublicUrl(fileName);

  imageUrlEl.value = urlData.publicUrl;
  alert("圖片上傳完成！");
});

// 儲存修改
document.getElementById("editForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const updateData = {
    name: nameEl.value.trim(),
    category: categoryEl.value.trim(),
    spec: specEl.value.trim(),
    unit: unitEl.value.trim(),
    description: descriptionEl.value.trim(),
    last_price: lastPriceEl.value ? Number(lastPriceEl.value) : null,
    suggested_price: suggestedPriceEl.value ? Number(suggestedPriceEl.value) : null,
    is_active: isActiveEl.value === "true",
    image_url: imageUrlEl.value || null,
    last_price_updated_at: new Date().toISOString()
  };

  const { error } = await supabaseClient
    .from("products")
    .update(updateData)
    .eq("id", productId);

  if (error) {
    alert("更新失敗");
    console.error(error);
    return;
  }

  alert("更新成功！");
  location.href = "index.html";
});
