// /admin/js/add.js
console.log("新增商品頁 初始化");

document.addEventListener("DOMContentLoaded", () => {
  const supabase = window.supabaseClient;
  if (!supabase) {
    alert("Supabase 尚未初始化");
    return;
  }

  const SUPABASE_URL = window.SUPABASE_URL;

  const form = document.getElementById("addForm");
  const cancelBtn = document.getElementById("cancelBtn");
  const imageFileInput = document.getElementById("imageFile");

  cancelBtn.addEventListener("click", () => {
    location.href = "index.html";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // ===== 1️⃣ 組 payload（之前你少了這個）=====
    const payload = {
      name: document.getElementById("name").value.trim(),
      category: document.getElementById("category").value.trim(),
      spec: document.getElementById("spec").value.trim(),
      unit: document.getElementById("unit").value.trim(),
      description: document.getElementById("description").value.trim(),
      last_price: Number(document.getElementById("last_price").value),
      suggested_price: Number(document.getElementById("suggested_price").value) || null,
      is_active: document.getElementById("is_active").value === "true"
    };

    if (!payload.name || payload.last_price === null) {
      alert("請至少填寫：商品名稱、進價");
      return;
    }

    // ===== 2️⃣ 新增商品 =====
    const { data: product, error: insertError } = await supabase
      .from("products")
      .insert(payload)
      .select()
      .single();

    if (insertError) {
      alert("新增失敗：" + insertError.message);
      return;
    }

    const productId = product.id;

    // ===== 3️⃣ 有選圖片才上傳 =====
    if (imageFileInput.files.length > 0) {
      const file = imageFileInput.files[0];
      const ext = file.name.split(".").pop().toLowerCase();
      const filePath = `products/product-${productId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type
        });

      if (uploadError) {
        alert("圖片上傳失敗：" + uploadError.message);
        return;
      }

      const imageUrl =
        `${SUPABASE_URL}/storage/v1/object/public/product-images/${filePath}`;

      await supabase
        .from("products")
        .update({ image_url: imageUrl })
        .eq("id", productId);
    }

    alert("新增成功");
    location.href = "index.html";
  });
});
