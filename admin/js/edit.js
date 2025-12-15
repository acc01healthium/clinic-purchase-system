// /admin/js/edit.js
console.log("後台 編輯商品 初始化（最終穩定版）");

document.addEventListener("DOMContentLoaded", async () => {
  const supabase = window.supabaseClient;
  if (!supabase) {
    alert("Supabase 尚未初始化（window.supabaseClient 不存在）");
    return;
  }

  const params = new URLSearchParams(location.search);
  const productId = params.get("id");
  console.log("edit productId =", productId);

  if (!productId) {
    alert("缺少商品 ID");
    location.href = "index.html";
    return;
  }

  const form = document.getElementById("editForm");
  const cancelBtn = document.getElementById("cancelBtn");
  const deleteBtn = document.getElementById("deleteBtn");
  const imageInput = document.getElementById("imageFile");
  const preview = document.getElementById("imagePreview");

  if (!form || !cancelBtn || !deleteBtn || !imageInput || !preview) {
    alert("頁面缺少必要元件（editForm/cancelBtn/deleteBtn/imageFile/imagePreview）");
    return;
  }

  // ============ 工具：壓縮圖片到 JPG（最長邊 1280） ============
  async function compressToJpg(file, maxSide = 1280, quality = 0.82) {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;

    let targetW = width;
    let targetH = height;

    if (Math.max(width, height) > maxSide) {
      const scale = maxSide / Math.max(width, height);
      targetW = Math.round(width * scale);
      targetH = Math.round(height * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);

    const blob = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
    });

    if (!blob) throw new Error("圖片壓縮失敗（toBlob 回傳 null）");

    return blob; // image/jpeg
  }

  function setPreviewFromUrl(url) {
    preview.innerHTML = "";
    if (!url) {
      preview.innerHTML = `<span class="edit-image-placeholder">目前尚無圖片</span>`;
      return;
    }
    const img = document.createElement("img");
    img.src = url;
    img.style.maxWidth = "220px";
    img.style.borderRadius = "8px";
    img.style.display = "block";
    preview.appendChild(img);
  }

  function setPreviewFromFile(file) {
    preview.innerHTML = "";
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.onload = () => URL.revokeObjectURL(img.src);
    img.style.maxWidth = "220px";
    img.style.borderRadius = "8px";
    img.style.display = "block";
    preview.appendChild(img);
  }

  // ① 讀商品資料
 const { data, error } = await supabase
  .from("products")
  .select("*")
  .eq("id", productId)
  .single();

if (error || !data) {
  alert("讀取商品失敗：" + (error?.message || ""));
  location.href = "index.html";
  return;
}

// ⭐ 正確位置
const originalLastPrice = data.last_price;

  // ② 帶入表單
  document.getElementById("name").value = data.name || "";
  document.getElementById("category").value = data.category || "";
  document.getElementById("spec").value = data.spec || "";
  document.getElementById("unit").value = data.unit || "";
  document.getElementById("description").value = data.description || "";
  document.getElementById("last_price").value = data.last_price ?? "";
  document.getElementById("suggested_price").value = data.suggested_price ?? "";
  document.getElementById("isActive").value = String(data.is_active);

  // ②-1 顯示目前圖片
  setPreviewFromUrl(data.image_url);

  // ②-2 選檔立即預覽
  imageInput.addEventListener("change", () => {
    if (imageInput.files && imageInput.files[0]) {
      setPreviewFromFile(imageInput.files[0]);
    }
  });

  cancelBtn.addEventListener("click", () => {
    location.href = "index.html";
  });

  // ③ 儲存
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    const name = document.getElementById("name").value.trim();
    const last_price_raw = document.getElementById("last_price").value;

    if (!name || last_price_raw === "") {
      alert("商品名稱與進價不可空白");
      return;
    }

    const last_price = Number(last_price_raw);
    const suggested_raw = document.getElementById("suggested_price").value;

    const payload = {
      name,
      category: document.getElementById("category").value.trim() || null,
      spec: document.getElementById("spec").value.trim() || null,
      unit: document.getElementById("unit").value.trim() || null,
      description: document.getElementById("description").value.trim() || null,
      last_price,
      suggested_price: suggested_raw === "" ? null : Number(suggested_raw),
      is_active: document.getElementById("isActive").value === "true",
    };

    // ⭐ 價格有變才更新時間
    if (last_price !== originalLastPrice) {
      payload.last_price_updated_at = new Date().toISOString();
    }

    // ① 更新商品資料
    const { error: updateError } = await supabase
      .from("products")
      .update(payload)
      .eq("id", productId);

    if (updateError) {
      alert("儲存商品資料失敗：" + updateError.message);
      return;
    }

    // ② 若有選圖片 → 處理圖片
    if (imageInput.files && imageInput.files.length > 0) {
      const file = imageInput.files[0];
      const jpgBlob = await compressToJpg(file, 1280, 0.82);
      const filePath = `products/product-${productId}.jpg`;

      await supabase.storage
        .from("product-images")
        .remove([filePath]);

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, jpgBlob, {
          upsert: false,
          contentType: "image/jpeg",
        });

      if (uploadError) {
        alert("圖片上傳失敗：" + uploadError.message);
        return;
      }

      const publicUrl = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath).data.publicUrl;

      await supabase
        .from("products")
        .update({ image_url: publicUrl })
        .eq("id", productId);
    }

    alert("儲存完成");
    location.href = "index.html";
  } catch (err) {
    console.error(err);
    alert("發生例外錯誤：" + (err?.message || err));
  }
});

  // ④ 刪除
  deleteBtn.addEventListener("click", async () => {
    if (!confirm("確定要刪除此商品嗎？")) return;

    const { error: delError } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (delError) {
      alert("刪除失敗：" + delError.message);
      return;
    }

    alert("商品已刪除");
    location.href = "index.html";
  });
});
