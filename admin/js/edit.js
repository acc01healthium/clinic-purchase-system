// /admin/js/edit.js
console.log("後台 編輯商品 初始化（終極穩定版）");

document.addEventListener("DOMContentLoaded", async () => {
  const supabase = window.supabaseClient;
  const SUPABASE_URL = window.SUPABASE_URL;

  if (!supabase || !SUPABASE_URL) {
    alert("Supabase 尚未正確初始化");
    return;
  }

  // 取得商品 ID
  const params = new URLSearchParams(location.search);
  const productId = params.get("id");
  console.log("edit productId =", productId);

  if (!productId) {
    alert("缺少商品 ID");
    location.href = "index.html";
    return;
  }

  // DOM
  const form = document.getElementById("editForm");
  const cancelBtn = document.getElementById("cancelBtn");
  const deleteBtn = document.getElementById("deleteBtn");
  const imageInput = document.getElementById("imageFile");
  const preview = document.getElementById("imagePreview");

  /* =========================
     ① 讀取商品資料
  ========================= */
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

  /* =========================
     ② 帶入表單
  ========================= */
  document.getElementById("name").value = data.name || "";
  document.getElementById("category").value = data.category || "";
  document.getElementById("spec").value = data.spec || "";
  document.getElementById("unit").value = data.unit || "";
  document.getElementById("description").value = data.description || "";
  document.getElementById("last_price").value = data.last_price ?? "";
  document.getElementById("suggested_price").value =
    data.suggested_price ?? "";
  document.getElementById("isActive").value = String(data.is_active);

  /* =========================
     ②-1 圖片預覽
  ========================= */
  preview.innerHTML = "";

  if (data.image_url) {
    const img = document.createElement("img");
    img.src = data.image_url;
    img.style.maxWidth = "220px";
    img.style.borderRadius = "8px";
    img.style.display = "block";
    preview.appendChild(img);
  } else {
    preview.innerHTML =
      `<span class="edit-image-placeholder">目前尚無圖片</span>`;
  }

  /* =========================
     取消
  ========================= */
  cancelBtn.addEventListener("click", () => {
    location.href = "index.html";
  });

  /* =========================
     ③ 儲存（商品＋圖片）
  ========================= */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const last_price = document.getElementById("last_price").value;

    if (!name || last_price === "") {
      alert("商品名稱與進價不可空白");
      return;
    }

    // 商品資料
    const payload = {
      name,
      category: document.getElementById("category").value.trim() || null,
      spec: document.getElementById("spec").value.trim() || null,
      unit: document.getElementById("unit").value.trim() || null,
      description:
        document.getElementById("description").value.trim() || null,
      last_price: Number(last_price),
      suggested_price:
        document.getElementById("suggested_price").value === ""
          ? null
          : Number(document.getElementById("suggested_price").value),
      is_active: document.getElementById("isActive").value === "true",
    };

    const { error: updateError } = await supabase
      .from("products")
      .update(payload)
      .eq("id", productId);

    if (updateError) {
      alert("商品更新失敗：" + updateError.message);
      return;
    }

    /* ---------- 圖片更新 ---------- */
    if (imageInput.files.length > 0) {
      const file = imageInput.files[0];
      const ext = file.name.split(".").pop().toLowerCase();
      const filePath = `products/product-${productId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) {
        alert("圖片上傳失敗：" + uploadError.message);
        return;
      }

      const image_url =
        `${SUPABASE_URL}/storage/v1/object/public/product-images/${filePath}`;

      const { error: imgUpdateError } = await supabase
        .from("products")
        .update({ image_url })
        .eq("id", productId);

      if (imgUpdateError) {
        alert("圖片連結更新失敗：" + imgUpdateError.message);
        return;
      }
    }

    alert("儲存完成");
    location.href = "index.html";
  });

  /* =========================
     ④ 刪除商品
  ========================= */
  deleteBtn.addEventListener("click", async () => {
    if (!confirm("確定要刪除此商品嗎？")) return;

    const { error: deleteError } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (deleteError) {
      alert("刪除失敗：" + deleteError.message);
      return;
    }

    alert("商品已刪除");
    location.href = "index.html";
  });
});
