// /admin/js/edit.js
// 編輯單一商品（含圖片上傳、刪除、取消）

console.log("後台編輯商品初始化");

const supabaseClient = window.supabaseClient;

// DOM
const form = document.getElementById("editForm");
const nameInput = document.getElementById("name");
const categoryInput = document.getElementById("category");
const specInput = document.getElementById("spec");
const unitInput = document.getElementById("unit");
const descriptionInput = document.getElementById("description");
const lastPriceInput = document.getElementById("lastPrice");
const suggestedPriceInput = document.getElementById("suggestedPrice");
const isActiveSelect = document.getElementById("isActive");
const imageFileInput = document.getElementById("imageFile");
const imagePreview = document.getElementById("imagePreview");
const statusEl = document.getElementById("editStatus");
const cancelBtn = document.getElementById("cancelBtn");
const deleteBtn = document.getElementById("deleteBtn");
const logoutBtn = document.getElementById("logoutBtn");

// 目前商品 id
const params = new URLSearchParams(location.search);
const productId = Number(params.get("id"));

if (!productId) {
  alert("缺少商品 ID，將返回列表頁。");
  location.href = "index.html";
}

// 取得單筆商品資料
async function loadProduct() {
  if (statusEl) statusEl.textContent = "載入商品資料中…";

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
    .maybeSingle();

  if (error || !data) {
    console.error("讀取商品失敗", error);
    alert("讀取商品資料失敗，請稍後再試。");
    location.href = "index.html";
    return;
  }

  // 填入表單
  nameInput.value = data.name || "";
  categoryInput.value = data.category || "";
  specInput.value = data.spec || "";
  unitInput.value = data.unit || "";
  descriptionInput.value = data.description || "";
  lastPriceInput.value =
    data.last_price !== null && data.last_price !== undefined
      ? data.last_price
      : "";
  suggestedPriceInput.value =
    data.suggested_price !== null && data.suggested_price !== undefined
      ? data.suggested_price
      : "";
  isActiveSelect.value = data.is_active ? "1" : "0";

  // 圖片預覽
  renderImagePreview(data.image_url);

  if (statusEl) statusEl.textContent = "";
}

// 顯示圖片預覽
function renderImagePreview(url) {
  if (!imagePreview) return;
  imagePreview.innerHTML = "";

  if (!url) {
    const span = document.createElement("span");
    span.textContent = "目前尚未設定商品圖片。";
    span.className = "edit-image-placeholder";
    imagePreview.appendChild(span);
    return;
  }

  const img = document.createElement("img");
  img.src = url;
  img.alt = "商品圖片預覽";
  imagePreview.appendChild(img);
}

// 將圖片壓縮為 JPEG（最長邊 maxSize）
function compressImage(file, maxSize = 1280, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width <= maxSize && height <= maxSize) {
        // 不需要縮圖
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            resolve(blob);
          },
          "image/jpeg",
          quality
        );
        return;
      }

      // 等比例縮放
      const ratio = width / height;
      if (width > height) {
        width = maxSize;
        height = Math.round(maxSize / ratio);
      } else {
        height = maxSize;
        width = Math.round(maxSize * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          resolve(blob);
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = reject;

    const url = URL.createObjectURL(file);
    img.src = url;
  });
}

// 上傳圖片到 Supabase Storage
async function uploadImage(file, productId) {
  // ✅ 如果你的 bucket 名稱不是 "product-images"，在這裡改
  const bucket = "product-images";

  const compressed = await compressImage(file);
  const ext = "jpg";
  const filePath = `product-${productId}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabaseClient.storage
    .from(bucket)
    .upload(filePath, compressed, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (uploadError) {
    console.error("上傳圖片失敗", uploadError);
    throw uploadError;
  }

  const {
    data: { publicUrl },
  } = supabaseClient.storage.from(bucket).getPublicUrl(filePath);

  return publicUrl;
}

// 儲存表單
async function handleSubmit(e) {
  e.preventDefault();
  if (!supabaseClient) return;

  if (statusEl) statusEl.textContent = "儲存中…";

  const name = nameInput.value.trim();
  const category = categoryInput.value.trim();
  const spec = specInput.value.trim();
  const unit = unitInput.value.trim();
  const description = descriptionInput.value.trim();
  const lastPriceVal = lastPriceInput.value.trim();
  const suggestedPriceVal = suggestedPriceInput.value.trim();
  const isActive = isActiveSelect.value === "1";

  if (!name) {
    alert("請輸入商品名稱");
    if (statusEl) statusEl.textContent = "";
    return;
  }

  let lastPrice = null;
  let suggestedPrice = null;

  if (lastPriceVal !== "") {
    const num = Number(lastPriceVal);
    if (!Number.isNaN(num)) lastPrice = num;
  }

  if (suggestedPriceVal !== "") {
    const num = Number(suggestedPriceVal);
    if (!Number.isNaN(num)) suggestedPrice = num;
  }

  const updateData = {
    name,
    category: category || null,
    spec: spec || null,
    unit: unit || null,
    description: description || null,
    last_price: lastPrice,
    suggested_price: suggestedPrice,
    is_active: isActive,
    last_price_updated_at: new Date().toISOString(),
  };

  try {
    // 如果有選圖片，先上傳再把 image_url 寫回
    const file = imageFileInput.files[0];
    if (file) {
      const url = await uploadImage(file, productId);
      updateData.image_url = url;
    }

    const { error } = await supabaseClient
      .from("products")
      .update(updateData)
      .eq("id", productId);

    if (error) throw error;

    if (statusEl) statusEl.textContent = "儲存成功，將返回商品列表…";
    setTimeout(() => {
      location.href = "index.html";
    }, 600);
  } catch (err) {
    console.error("儲存失敗", err);
    if (statusEl) statusEl.textContent = "儲存變更失敗，請稍後再試。";
    alert("儲存變更失敗，請稍後再試。");
  }
}

// =========================
// 🔥 刪除商品功能（完整版）
// =========================
document.getElementById("deleteBtn").addEventListener("click", async () => {
  const confirmed = confirm("確定要刪除此商品嗎？此操作無法復原！");
  if (!confirmed) return;

  const productId = getQueryParam("id");
  if (!productId) {
    alert("找不到商品編號，無法刪除。");
    return;
  }

  // 🔥 呼叫 Supabase 刪除
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId);

  if (error) {
    console.error("刪除失敗：", error);
    alert("刪除失敗，請稍後再試！");
    return;
  }

  alert("商品已成功刪除！");
  window.location.href = "/clinic-purchase-system/admin/index.html";
});


// 取消：回列表
function handleCancel() {
  location.href = "index.html";
}

// 登出（先回 login.html）
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    location.href = "login.html";
  });
}

// 初始化
document.addEventListener("DOMContentLoaded", () => {
  loadProduct();

  if (form) {
    form.addEventListener("submit", handleSubmit);
  }
  if (cancelBtn) {
    cancelBtn.addEventListener("click", handleCancel);
  }
  if (deleteBtn) {
    deleteBtn.addEventListener("click", handleDelete);
  }
});
