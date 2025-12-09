console.log("edit.js loaded");

const supabase = window.supabaseClient;

// 取得 URL 參數 id
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get("id");

if (!productId) {
  alert("找不到商品 ID");
  location.href = "index.html";
}

// HTML 元素
const nameEl = document.getElementById("name");
const categoryEl = document.getElementById("category");
const specEl = document.getElementById("spec");
const unitEl = document.getElementById("unit");
const descEl = document.getElementById("description");
const priceEl = document.getElementById("last_price");
const activeEl = document.getElementById("is_active");
const imgUrlEl = document.getElementById("image_url");
const imgFileEl = document.getElementById("imageFile");
const previewEl = document.getElementById("previewImage");

// 🔹 載入商品資料
async function loadProduct() {
  const { data, error } = await supabase
    .from("product-images")
    .select("*")
    .eq("id", productId)
    .single();

  if (error) {
    alert("讀取商品失敗：" + error.message);
    return;
  }

  nameEl.value = data.name || "";
  categoryEl.value = data.category || "";
  specEl.value = data.spec || "";
  unitEl.value = data.unit || "";
  descEl.value = data.description || "";
  priceEl.value = data.last_price || "";
  activeEl.value = data.is_active ? "true" : "false";
  imgUrlEl.value = data.image_url || "";

  if (data.image_url) previewEl.src = data.image_url;
}

loadProduct();

// 🔹 圖片預覽
imgFileEl.addEventListener("change", () => {
  const file = imgFileEl.files[0];
  if (file) previewEl.src = URL.createObjectURL(file);
});

// 🔹 上傳圖片（正確版本）
async function uploadImage(file) {
  if (!file) return null;

  const ext = file.name.split(".").pop();
  const fileName = `product_${productId}_${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from("product-images")   // ← 正確 bucket
    .upload(fileName, file, { upsert: true });

  if (uploadErr) {
    alert("圖片上傳失敗：" + uploadErr.message);
    return null;
  }

  // 取得 public URL
  const { data } = supabase.storage
    .from("product-images")
    .getPublicUrl(fileName);

  return data.publicUrl;
}

// 🔹 更新資料
document.getElementById("editForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  let finalImgUrl = imgUrlEl.value;

  if (imgFileEl.files.length > 0) {
    const uploaded = await uploadImage(imgFileEl.files[0]);
    if (uploaded) finalImgUrl = uploaded;
  }

  const updates = {
    name: nameEl.value,
    category: categoryEl.value,
    spec: specEl.value,
    unit: unitEl.value,
    description: descEl.value,
    last_price: Number(priceEl.value),
    is_active: activeEl.value === "true",
    image_url: finalImgUrl,
    last_price_updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from("products")
    .update(updates)
    .eq("id", productId);

  if (error) return alert("更新失敗：" + error.message);

  alert("更新成功！");
  location.href = "index.html";
});

// 🔹 刪除
document.getElementById("deleteBtn").addEventListener("click", async () => {
  if (!confirm("確定刪除？")) return;

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId);

  if (error) return alert("刪除失敗：" + error.message);

  alert("刪除成功！");
  location.href = "index.html";
});
