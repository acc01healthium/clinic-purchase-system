// admin/js/edit.js
// 後台：編輯商品 + 上傳圖片（安全檔名）

console.log("✅ edit.js 載入");

const db = window.supabaseClient;

// 取得 URL 參數的商品 ID
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
const costEl = document.getElementById("last_price");
const suggestEl = document.getElementById("suggest_price");
const activeEl = document.getElementById("is_active");
const imgUrlEl = document.getElementById("image_url");
const imgFileEl = document.getElementById("imageFile");
const previewEl = document.getElementById("previewImage");
const formEl = document.getElementById("editForm");
const deleteBtn = document.getElementById("deleteBtn");

// 即時預覽圖片
if (imgFileEl && previewEl) {
  imgFileEl.addEventListener("change", () => {
    const file = imgFileEl.files[0];
    if (file) {
      previewEl.src = URL.createObjectURL(file);
    }
  });
}

// 載入商品資料
async function loadProduct() {
  const { data, error } = await db
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();

  if (error) {
    console.error(error);
    alert("讀取資料失敗：" + error.message);
    return;
  }

  nameEl.value = data.name || "";
  categoryEl.value = data.category || "";
  specEl.value = data.spec || "";
  unitEl.value = data.unit || "";
  descEl.value = data.description || "";
  costEl.value = data.last_price ?? "";
  suggestEl.value = data.suggest_price ?? "";
  activeEl.value = data.is_active ? "true" : "false";
  imgUrlEl.value = data.image_url || "";

  if (data.image_url) {
    previewEl.src = data.image_url;
  } else {
    previewEl.src = "";
  }
}

// 圖片上傳 helper：安全檔名
async function uploadImage(file) {
  if (!file) return null;

  // 產生安全檔名：product-<id>-timestamp.ext
  const ext = file.name.split(".").pop() || "jpg";
  const safeName = `product-${productId}-${Date.now()}.${ext}`;
  const filePath = `uploads/${safeName}`;

  const { error: uploadErr } = await db.storage
    .from("product-images")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadErr) {
    console.error("圖片上傳錯誤：", uploadErr);
    alert("圖片上傳失敗：" + uploadErr.message);
    return null;
  }

  const { data } = db.storage
    .from("product-images")
    .getPublicUrl(filePath);

  return data?.publicUrl ?? null;
}

// 儲存修改
if (formEl) {
  formEl.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!nameEl.value.trim()) {
      alert("請輸入商品名稱");
      return;
    }

    let finalImageUrl = imgUrlEl.value;

    // 若有選新圖片，就上傳
    if (imgFileEl.files.length > 0) {
      const uploadedUrl = await uploadImage(imgFileEl.files[0]);
      if (uploadedUrl) finalImageUrl = uploadedUrl;
    }

    const cost = costEl.value.trim();
    const suggest = suggestEl.value.trim();

    const updateData = {
      name: nameEl.value.trim(),
      category: categoryEl.value.trim(),
      spec: specEl.value.trim(),
      unit: unitEl.value.trim(),
      description: descEl.value.trim(),
      last_price: cost ? Number(cost) : null,
      suggest_price: suggest ? Number(suggest) : null,
      is_active: activeEl.value === "true",
      image_url: finalImageUrl,
    };

    // 若有輸入進價才更新價格時間
    if (cost) {
      updateData.last_price_updated_at = new Date().toISOString();
    }

    const { error } = await db
      .from("products")
      .update(updateData)
      .eq("id", productId);

    if (error) {
      console.error(error);
      alert("更新失敗：" + error.message);
      return;
    }

    alert("更新成功！");
    location.href = "index.html";
  });
}

// 刪除商品
if (deleteBtn) {
  deleteBtn.addEventListener("click", async () => {
    if (!confirm("確定要刪除此商品嗎？")) return;

    const { error } = await db
      .from("products")
      .delete()
      .eq("id", productId);

    if (error) {
      console.error(error);
      alert("刪除失敗：" + error.message);
      return;
    }

    alert("已刪除商品");
    location.href = "index.html";
  });
}

// 初始化
document.addEventListener("DOMContentLoaded", loadProduct);
