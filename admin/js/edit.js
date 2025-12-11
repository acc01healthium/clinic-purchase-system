// /admin/js/edit.js
// 編輯商品頁面：載入 / 儲存 / 圖片上傳 / 刪除

console.log("後台 編輯商品頁 初始化");

// 取得 Supabase client
const supabaseClient = window.supabaseClient;

if (!supabaseClient) {
  console.error("supabaseClient 不存在，請確認 admin/js/supabase.js 是否正確載入。");
}

// 取得 URL 上的 id 參數
function getQueryParam(key) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
}

const productId = getQueryParam("id");
if (!productId) {
  alert("缺少商品編號，將返回商品列表。");
  window.location.href = "index.html";
}

// DOM 元素
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

let currentImageUrl = null;   // 目前圖片網址（資料庫裡）
let newImageFile = null;      // 使用者剛選取要上傳的新檔案

// -----------------------------
// 載入商品資料
// -----------------------------
async function loadProduct() {
  if (!supabaseClient) return;

  const { data, error } = await supabaseClient
    .from("products")
    .select(
      `
        id,
        name,
        category,
        spec,
        unit,
        description,
        last_price,
        suggested_price,
        is_active,
        image_url
      `
    )
    .eq("id", productId)
    .single();

  if (error) {
    console.error("載入商品失敗：", error);
    alert("讀取商品資料失敗，請稍後再試。");
    window.location.href = "index.html";
    return;
  }

  // 填入表單
  nameInput.value = data.name || "";
  categoryInput.value = data.category || "";
  specInput.value = data.spec || "";
  unitInput.value = data.unit || "";
  descriptionInput.value = data.description || "";
  lastPriceInput.value = data.last_price ?? "";
  suggestedPriceInput.value = data.suggested_price ?? "";
  isActiveSelect.value = data.is_active ? "true" : "false";

  currentImageUrl = data.image_url || null;
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
    span.className = "edit-image-placeholder";
    span.textContent = "目前尚無圖片";
    imagePreview.appendChild(span);
  }
}

// -----------------------------
// 圖片上傳到 Supabase Storage
// -----------------------------
async function uploadImageIfNeeded() {
  if (!newImageFile) {
    // 沒換新圖，就用原本的網址
    return currentImageUrl;
  }

  // 壓縮 / 直接上傳 (這裡先直接上傳檔案；若你之後想加壓縮再來調整)
  const fileExt = newImageFile.name.split(".").pop();
  const fileName = `product-${productId}-${Date.now()}.${fileExt}`;
  const filePath = fileName;

  const { data, error } = await supabaseClient.storage
    .from("product-images")          // ⚠️ 這裡使用你目前 B 專案的 bucket 名稱
    .upload(filePath, newImageFile, {
      cacheControl: "3600",
      upsert: true,
    });

  if (error) {
    console.error("圖片上傳失敗：", error);
    alert("圖片上傳失敗，將沿用原本圖片。");
    return currentImageUrl;
  }

  const { data: publicData } = supabaseClient.storage
    .from("product-images")
    .getPublicUrl(data.path);

  const publicUrl = publicData.publicUrl;
  return publicUrl || currentImageUrl;
}

// -----------------------------
// 監聽圖片檔案選取
// -----------------------------
if (imageFileInput) {
  imageFileInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      newImageFile = null;
      renderImagePreview();
      return;
    }
    newImageFile = file;
    renderImagePreview();
  });
}

// -----------------------------
// 表單送出：儲存變更
// -----------------------------
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!supabaseClient) return;

  const name = nameInput.value.trim();
  if (!name) {
    alert("商品名稱不可空白。");
    return;
  }

  const lastPrice = lastPriceInput.value === "" ? null : Number(lastPriceInput.value);
  const suggestedPrice =
    suggestedPriceInput.value === "" ? null : Number(suggestedPriceInput.value);

  if (
    (lastPrice !== null && Number.isNaN(lastPrice)) ||
    (suggestedPrice !== null && Number.isNaN(suggestedPrice))
  ) {
    alert("進價 / 建議售價請輸入數字。");
    return;
  }

  // 先處理圖片上傳（若有）
  const imageUrl = await uploadImageIfNeeded();

  const payload = {
    name,
    category: categoryInput.value.trim() || null,
    spec: specInput.value.trim() || null,
    unit: unitInput.value.trim() || null,
    description: descriptionInput.value.trim() || null,
    last_price: lastPrice,
    suggested_price: suggestedPrice,
    is_active: isActiveSelect.value === "true",
    image_url: imageUrl,
    last_price_updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseClient
    .from("products")
    .update(payload)
    .eq("id", productId);

  if (error) {
    console.error("更新商品失敗：", error);
    alert("儲存失敗，請稍後再試。");
    return;
  }

  alert("商品已更新！");
  window.location.href = "index.html";
});

// -----------------------------
// 刪除商品
// -----------------------------
deleteBtn.addEventListener("click", async () => {
  const ok = confirm("確定要刪除此商品嗎？此操作無法復原。");
  if (!ok) return;

  const { error } = await supabaseClient
    .from("products")
    .delete()
    .eq("id", productId);

  if (error) {
    console.error("刪除失敗：", error);
    alert("刪除失敗，請稍後再試。");
    return;
  }

  alert("商品已刪除！");
  window.location.href = "index.html";
});

// -----------------------------
// 取消：回商品列表
// -----------------------------
cancelBtn.addEventListener("click", () => {
  window.location.href = "index.html";
});

// -----------------------------
// 登出按鈕（目前僅導回 login 頁）
// -----------------------------
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    // 若未來有 auth：可在這裡加入 supabaseClient.auth.signOut()
    window.location.href = "login.html";
  });
}

// -----------------------------
// 初始化
// -----------------------------
document.addEventListener("DOMContentLoaded", () => {
  loadProduct();
  renderImagePreview();
});
