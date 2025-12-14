// /admin/js/add.js
console.log("新增商品頁 初始化（穩定最終版）");

document.addEventListener("DOMContentLoaded", () => {
  const supabase = window.supabaseClient;
  const SUPABASE_URL = window.SUPABASE_URL;

  const form = document.getElementById("addForm");
  const cancelBtn = document.getElementById("cancelBtn");
  const imageInput = document.getElementById("imageFile");

  cancelBtn.addEventListener("click", () => {
    location.href = "index.html";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      name: document.getElementById("name").value.trim(),
      category: document.getElementById("category").value.trim() || null,
      spec: document.getElementById("spec").value.trim() || null,
      unit: document.getElementById("unit").value.trim() || null,
      description: document.getElementById("description").value.trim() || null,
      last_price: Number(document.getElementById("last_price").value),
      suggested_price:
        document.getElementById("suggested_price").value === ""
          ? null
          : Number(document.getElementById("suggested_price").value),
      is_active: document.getElementById("isActive").value === "true",
    };

    if (!payload.name || Number.isNaN(payload.last_price)) {
      alert("請至少填寫：商品名稱、進價");
      return;
    }

    // ① 新增商品
    const { data, error } = await supabase
      .from("products")
      .insert(payload)
      .select()
      .single();

    if (error) {
      alert("新增失敗：" + error.message);
      return;
    }

    const productId = data.id;

    // ② 上傳圖片
    if (imageInput.files.length > 0) {
      const file = imageInput.files[0];
      const path = `products/${productId}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(path, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) {
        alert("圖片上傳失敗：" + uploadError.message);
        return;
      }

      const image_url =
        `${SUPABASE_URL}/storage/v1/object/public/product-images/${path}`;

      await supabase
        .from("products")
        .update({ image_url })
        .eq("id", productId);
    }

    alert("新增成功");
    location.href = "index.html";
  });
});
