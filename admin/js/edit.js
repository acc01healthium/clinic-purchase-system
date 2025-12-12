// /admin/js/edit.js
// 編輯商品頁面：載入 / 儲存 / 圖片上傳 / 刪除

console.log("後台 編輯商品頁 初始化");

const supabaseClient = window.supabaseClient;

// -----------------------------
// 取得 URL id
// -----------------------------
function getQueryParam(key) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
}
const productId = Number(getQueryParam("id"));

if (!productId) {
  alert("缺少商品編號！");
  window.location.href = "index.html";
}

// -----------------------------
// DOM 元素
// -----------------------------
const form = document.getElementById("editForm");

const nameInput = document.getElementById("name");
const categoryInput = document.getElementById("category");
const specInput = document.getElementById("spec");
const unitInput = document.getElementById("unit");
const descriptionInput = document.getElementById("description");
const lastPriceInput = document.getElementById("last_price");
const suggestedPriceInput = document.getElementById("suggested_price");
const isActiveSelect = document.getElementById("isActive");

const imageFileInput = document.getElementById("imageFile");
const imagePreview = document.getElementById("imagePreview");

const cancelBtn = document.getElementById("cancelBtn");
const deleteBtn = document.getElementById("deleteBtn");

let currentImageUrl = null;
let newImageFile = null;
let originalLastPrice = null;   // ⭐ 重要：儲存原本價格

// -----------------------------
// 載入商品資料
// -----------------------------
async function loadProduct() {
  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();

  if (error || !data) {
    console.error("商品讀取失敗：", error);
    alert("讀取商品資料失敗！");
    window.location.href = "index.html";
    return;
  }

  // 填入資料
  nameInput.value = data.name ?? "";
  categoryInput.value = data.category ?? "";
  specInput.value = data.spec ?? "";
  unitInput.value = data.unit ?? "";
  descriptionInput.value = data.description ?? "";
  lastPriceInput.value = data.last_price ?? "";
  suggestedPriceInput.value = data.suggested_price ?? "";
  isActiveSelect.value = data.is_active ? "true" : "false";

  currentImageUrl = data.image_url ?? null;
  originalLastPrice = data.last_price;   // ⭐ 保存原本價格

  renderImagePreview();
}

// -----------------------------
// 圖片預覽
// -----------------------------
function renderImagePreview() {
  imagePreview.innerHTML = "";

  if (newImageFile) {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(newImageFile);
    imagePreview.appendChild(img);
    return;
  }

  if (currentImageUrl) {
    const img = document.createElement("img");
    img.src = currentImageUrl;
    imagePreview.appendChild(img);
  } else {
    const span = document.createElement("span");
    span.textContent = "目前沒有圖片";
    imagePreview.appendChild(span);
  }
}

// -----------------------------
// 圖片上傳
// -----------------------------
async function uploadImageIfNeeded() {
  if (!newImageFile) return currentImageUrl;

  const ext = newImageFile.name.split(".").pop();
  const filename = `product-${productId}-${Date.now()}.${ext}`;

  const { data, error } = await supabaseClient.storage
    .from("product-images")
    .upload(filename, newImageFile, { upsert: true });

  if (error) {
    console.error("圖片上傳失敗：", error);
    alert("圖片上傳失敗，將沿用原圖");
    return currentImageUrl;
  }

  const { data: pub } = supabaseClient.storage
    .from("product-images")
    .getPublicUrl(data.path);

  return pub.publicUrl ?? currentImageUrl;
}

// -----------------------------
// 選擇圖片
// -----------------------------
imageFileInput.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  newImageFile = file || null;
  renderImagePreview();
});

// -----------------------------
// 儲存變更
// -----------------------------
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = nameInput.value.trim();
  if (!name) {
    alert("商品名稱不能為空！");
    return;
  }

  const newLastPrice = lastPriceInput.value === "" ? null : Number(lastPriceInput.value);
  const newSuggestedPrice =
    suggestedPriceInput.value === "" ? null : Number(suggestedPriceInput.value);

  if (newLastPrice !== null && Number.isNaN(newLastPrice)) {
    alert("進價必須是數字！");
    return;
  }
  if (newSuggestedPrice !== null && Number.isNaN(newSuggestedPrice)) {
    alert("建議售價必須是數字！");
    return;
  }

  const imageUrl = await uploadImageIfNeeded();

  // ⭐ 最重要：只有變更 price 才更新時間
  const payload = {
    name,
    category: categoryInput.value.trim() || null,
    spec: specInput.value.trim() || null,
    unit: unitInput.value.trim() || null,
    description: descriptionInput.value.trim() || null,
    suggested_price: newSuggestedPrice,
    is_active: isActiveSelect.value === "true",
    image_url: imageUrl,
  };

  // ⭐ 價格是否改變？
  if (newLastPrice !== originalLastPrice) {
    payload.last_price = newLastPrice;
    payload.last_price_updated_at = new Date().toISOString();
  } else {
    payload.last_price = newLastPrice;
    // 不更新 last_price_updated_at
  }

  const { error } = await supabaseClient
    .from("products")
    .update(payload)
    .eq("id", productId);

  if (error) {
    console.error("更新商品失敗：", error);
    alert("儲存失敗！");
    return;
  }

  alert("商品已更新！");
  window.location.href = "index.html";
});

// -----------------------------
// 刪除商品
// -----------------------------
deleteBtn.addEventListener("click", async () => {
  if (!confirm("確定要刪除這個商品？")) return;

  const { error } = await supabaseClient
    .from("products")
    .delete()
    .eq("id", productId);

  if (error) {
    console.error("刪除失敗：", error);
    alert("刪除失敗：" + error.message);
    return;
  }

  alert("商品已成功刪除！");
  window.location.href = "index.html";
});

// -----------------------------
// 初始化
// -----------------------------
document.addEventListener("DOMContentLoaded", () => {
  loadProduct();
});
