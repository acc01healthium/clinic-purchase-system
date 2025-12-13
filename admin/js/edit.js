// /admin/js/edit.js
// 編輯商品頁面：載入 / 儲存 / 圖片上傳 / 刪除

console.log("後台 編輯商品頁 初始化");

const supabaseClient = window.supabaseClient;

// 取得 URL 上的 id
function getQueryParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

const productId = getQueryParam("id");
if (!productId) {
  alert("缺少商品編號，將返回列表");
  window.location.href = "index.html";
}

// DOM
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
const logoutBtn = document.getElementById("logoutBtn");

let currentImageUrl = null;
let newImageFile = null;
let original_last_price = null;

// -----------------------------
// 載入商品資料
// -----------------------------
async function loadProduct() {
  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();

  if (error) {
    alert("讀取資料失敗");
    window.location.href = "index.html";
    return;
  }

  nameInput.value = data.name || "";
  categoryInput.value = data.category || "";
  specInput.value = data.spec || "";
  unitInput.value = data.unit || "";
  descriptionInput.value = data.description || "";
  lastPriceInput.value = data.last_price ?? "";
  suggestedPriceInput.value = data.suggested_price ?? "";
  isActiveSelect.value = data.is_active ? "true" : "false";

  currentImageUrl = data.image_url;
  original_last_price = data.last_price;

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
    const placeholder = document.createElement("span");
    placeholder.className = "edit-image-placeholder";
    placeholder.textContent = "目前尚無圖片";
    imagePreview.appendChild(placeholder);
  }
}

// -----------------------------
// 圖片上傳
// -----------------------------
async function uploadImageIfNeeded() {
  if (!newImageFile) return currentImageUrl;

  const ext = newImageFile.name.split(".").pop();
  const fileName = `product-${productId}-${Date.now()}.${ext}`;

  const { data, error } = await supabaseClient.storage
    .from("product-images")
    .upload(fileName, newImageFile, { upsert: true });

  if (error) {
    alert("圖片上傳失敗");
    return currentImageUrl;
  }

  const { data: publicData } = supabaseClient.storage
    .from("product-images")
    .getPublicUrl(data.path);

  return publicData.publicUrl;
}

imageFileInput.addEventListener("change", (e) => {
  newImageFile = e.target.files?.[0] || null;
  renderImagePreview();
});

// -----------------------------
// 表單送出（只有 last_price 變更才更新時間）
// -----------------------------
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = nameInput.value.trim();
  if (!name) return alert("商品名稱必填");

  const lastPriceVal = lastPriceInput.value === "" ? null : Number(lastPriceInput.value);
  const suggestedPriceVal =
    suggestedPriceInput.value === "" ? null : Number(suggestedPriceInput.value);

  const imageUrl = await uploadImageIfNeeded();

  let payload = {
    name,
    category: categoryInput.value.trim() || null,
    spec: specInput.value.trim() || null,
    unit: unitInput.value.trim() || null,
    description: descriptionInput.value.trim() || null,
    last_price: lastPriceVal,
    suggested_price: suggestedPriceVal,
    is_active: isActiveSelect.value === "true",
    image_url: imageUrl,
  };

  // ⭐ 只有 last_price 有變更才更新時間
  if (lastPriceVal !== original_last_price) {
    payload.last_price_updated_at = new Date().toISOString();
  }

  const { error } = await supabaseClient
    .from("products")
    .update(payload)
    .eq("id", productId);

  if (error) return alert("更新失敗：" + error.message);

  alert("已成功更新商品！");
  window.location.href = "index.html";
});

// -----------------------------
// 刪除商品
// -----------------------------
deleteBtn.addEventListener("click", async () => {
  if (!confirm("確定要刪除？")) return;

  const { error } = await supabaseClient
    .from("products")
    .delete()
    .eq("id", productId);

  if (error) return alert("刪除失敗：" + error.message);

  alert("商品已刪除");
  window.location.href = "index.html";
});

// -----------------------------
// 取消
// -----------------------------
cancelBtn.addEventListener("click", () => {
  window.location.href = "index.html";
});

// -----------------------------
// 修正：edit.html 的登出按鈕沒有綁事件
// -----------------------------
logoutBtn.addEventListener("click", () => {
  window.location.href = "login.html";
});

// -----------------------------
// 初始化
// -----------------------------
document.addEventListener("DOMContentLoaded", loadProduct);

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    location.replace("/clinic-purchase-system/admin/login.html");
  });
}

