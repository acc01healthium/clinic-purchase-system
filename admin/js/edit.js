// /admin/js/edit.js

const supabase = window.supabaseClient;

// 取得 URL id
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get("id");
if (!productId) {
  alert("找不到商品 ID");
  location.href = "index.html";
}

// DOM 元素
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
const editForm = document.getElementById("editForm");
const deleteBtn = document.getElementById("deleteBtn");
const loadingMask = document.getElementById("loadingMask");

let originalImageUrl = null;

// 載入商品資料
async function loadProduct() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();

  if (error) {
    alert("讀取資料失敗：" + error.message);
    console.error(error);
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
  originalImageUrl = data.image_url || null;

  if (data.image_url) {
    previewEl.src = data.image_url;
  }
}

loadProduct();

// 即時預覽
imgFileEl.addEventListener("change", () => {
  const file = imgFileEl.files[0];
  if (file) previewEl.src = URL.createObjectURL(file);
});

/** 壓縮圖片 */
function compressImage(file, maxWidth = 1000) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      if (scale === 1) {
        resolve(file);
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          const compressed = new File([blob], file.name, { type: blob.type });
          resolve(compressed);
        },
        "image/jpeg",
        0.85
      );
    };
    img.src = URL.createObjectURL(file);
  });
}

/** 從 public URL 解析出 storage path */
function extractStoragePathFromUrl(url) {
  if (!url) return null;
  const marker = "/storage/v1/object/public/product-images/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.substring(idx + marker.length);
}

async function deleteOldImageIfNeeded() {
  const path = extractStoragePathFromUrl(originalImageUrl);
  if (!path) return;
  await supabase.storage.from("product-images").remove([path]);
}

/** 上傳圖片 */
async function uploadImage(file) {
  if (!file) return null;

  const safeName = Date.now() + "_" + file.name.replace(/[^\w.-]/g, "_");
  const path = `uploads/${safeName}`;

  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    alert("圖片上傳失敗：" + error.message);
    console.error(error);
    return null;
  }

  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return data.publicUrl;
}

// 儲存更新
editForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!nameEl.value.trim()) {
    alert("商品名稱為必填");
    nameEl.focus();
    return;
  }
  if (!priceEl.value) {
    alert("售價為必填");
    priceEl.focus();
    return;
  }

  loadingMask.style.display = "flex";

  let finalImageUrl = imgUrlEl.value;

  // 若選擇新圖片 → 壓縮、刪舊圖、上傳新圖
  if (imgFileEl.files.length > 0) {
    const compressed = await compressImage(imgFileEl.files[0]);
    // 刪除舊檔（若有）
    if (originalImageUrl) {
      await deleteOldImageIfNeeded();
    }
    const uploadedUrl = await uploadImage(compressed);
    if (uploadedUrl) {
      finalImageUrl = uploadedUrl;
    }
  }

  const updates = {
    name: nameEl.value.trim(),
    category: categoryEl.value.trim(),
    spec: specEl.value.trim(),
    unit: unitEl.value.trim(),
    description: descEl.value.trim(),
    last_price: Number(priceEl.value),
    is_active: activeEl.value === "true",
    image_url: finalImageUrl,
    last_price_updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("products")
    .update(updates)
    .eq("id", productId);

  loadingMask.style.display = "none";

  if (error) {
    alert("更新失敗：" + error.message);
    console.error(error);
    return;
  }

  alert("更新成功！");
  location.href = "index.html";
});

// 刪除商品
deleteBtn.addEventListener("click", async () => {
  if (!confirm("確定刪除？")) return;

  loadingMask.style.display = "flex";

  // 刪圖
  if (originalImageUrl) {
    await deleteOldImageIfNeeded();
  }

  const { error } = await supabase.from("products").delete().eq("id", productId);

  loadingMask.style.display = "none";

  if (error) {
    alert("刪除失敗：" + error.message);
    console.error(error);
    return;
  }

  alert("刪除成功！");
  location.href = "index.html";
});
