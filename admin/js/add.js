// /admin/js/add.js
console.log("新增商品頁 初始化");

document.addEventListener("DOMContentLoaded", () => {
  const supabase = window.supabaseClient;
  const form = document.getElementById("addForm");
  const cancelBtn = document.getElementById("cancelBtn");
  const imageFileInput = document.getElementById("imageFile");

  cancelBtn.addEventListener("click", () => {
    location.href = "index.html";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const last_price = document.getElementById("last_price").value;

    if (!name || last_price === "") {
      alert("請至少填寫：商品名稱、進價");
      return;
    }

    // ① 先新增商品（不含圖片）
    const { data: inserted, error } = await supabase
      .from("products")
      .insert({
        name,
        category: document.getElementById("category").value.trim() || null,
        spec: document.getElementById("spec").value.trim() || null,
        unit: document.getElementById("unit").value.trim() || null,
        description: document.getElementById("description").value.trim() || null,
        last_price: Number(last_price),
        suggested_price:
          document.getElementById("suggested_price").value === ""
            ? null
            : Number(document.getElementById("suggested_price").value),
        is_active: document.getElementById("isActive").value === "true",
        last_price_updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      alert("新增商品失敗：" + error.message);
      return;
    }

    const productId = inserted.id;

    // ② 如果有選圖片 → 上傳圖片
    if (imageFileInput.files.length > 0) {
      const file = imageFileInput.files[0];
      const ext = file.name.split(".").pop();
      const filePath = `products/product-${productId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        alert("圖片上傳失敗：" + uploadError.message);
        return;
      }

      const imageUrl =
        `https://utwhtjtgwryeljgwlwzm.supabase.co/storage/v1/object/public/product-images/` +
        filePath;

      // ③ 回寫 image_url
      await supabase
        .from("products")
        .update({ image_url: imageUrl })
        .eq("id", productId);
    }

    alert("新增成功");
    location.href = "index.html";
  });
});
