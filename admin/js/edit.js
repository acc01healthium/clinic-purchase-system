// =======================
// 取得商品 ID
// =======================
const urlParams = new URLSearchParams(location.search);
const productId = urlParams.get("id");

if (!productId) {
  alert("無效的商品 ID");
  location.href = "index.html";
}

const supabase = window.supabaseClient;

// 欄位
const nameEl = document.getElementById("name");
const categoryEl = document.getElementById("category");
const specEl = document.getElementById("spec");
const unitEl = document.getElementById("unit");
const descriptionEl = document.getElementById("description");
const priceEl = document.getElementById("last_price");
const activeEl = document.getElementById("is_active");
const imageUrlEl = document.getElementById("image_url");
const imageFile = document.getElementById("imageFile");
const previewImg = document.getElementById("previewImg");


// =======================
// 載入商品資料
// =======================
async function loadProduct() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();

  if (error || !data) {
    alert("讀取商品失敗：" + error?.message);
    return;
  }

  // 填入表單
  nameEl.value = data.name || "";
  categoryEl.value = data.category || "";
  specEl.value = data.spec || "";
  unitEl.value = data.unit || "";
  descriptionEl.value = data.description || "";
  priceEl.value = data.last_price || "";
  activeEl.value = data.is_active ? "true" : "false";
  imageUrlEl.value = data.image_url || "";

  if (data.image_url) {
    previewImg.src = data.image_url;
    previewImg.style.display = "block";
  }
}

loadProduct();


// =======================
// 上傳圖片
// =======================
async function uploadImage(file) {
  if (!file) return null;

  const ext = file.name.split(".").pop();
  const fileName = `product_${productId}_${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("products")
    .upload(fileName, file, { upsert: true });

  if (uploadError) {
    alert("圖片上傳失敗：" + uploadError.message);
    return null;
  }

  const { data } = supabase.storage
    .from("products")
    .getPublicUrl(fileName);

  return data.publicUrl;
}


// =======================
// 儲存修改
// =======================
document.getElementById("saveBtn").addEventListener("click", async () => {
  let newUrl = imageUrlEl.value;

  if (imageFile.files.length > 0) {
    const uploaded = await uploadImage(imageFile.files[0]);
    if (uploaded) newUrl = uploaded;
  }

  const { error } = await supabase
    .from("products")
    .update({
      name: nameEl.value,
      category: categoryEl.value,
      spec: specEl.value,
      unit: unitEl.value,
      description: descriptionEl.value,
      last_price: Number(priceEl.value),
      is_active: activeEl.value === "true",
      image_url: newUrl,
    })
    .eq("id", productId);

  if (error) {
    alert("更新失敗：" + error.message);
    return;
  }

  alert("更新成功！");
  location.href = "index.html";
});


// =======================
// 刪除商品
// =======================
document.getElementById("deleteBtn").addEventListener("click", async () => {
  if (!confirm("確定要刪除這個商品嗎？")) return;

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId);

  if (error) {
    alert("刪除失敗：" + error.message);
    return;
  }

  alert("刪除成功！");
  location.href = "index.html";
});
