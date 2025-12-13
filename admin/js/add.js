// /admin/js/add.js
console.log("新增商品頁 初始化");

document.addEventListener("DOMContentLoaded", () => {
  const supabase = window.supabaseClient;
  const form = document.getElementById("addForm");
  const cancelBtn = document.getElementById("cancelBtn");
  const imageInput = document.getElementById("imageFile");

  if (!supabase || !form) {
    console.error("Supabase 或表單不存在");
    return;
  }

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

    /* ========= ① 新增商品 ========= */
    const { data: product, error } = await supabase
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

    const productId = product.id;

    /* ========= ② 有選圖片才上傳 ========= */
    if (imageInput && imageInput.files.length > 0) {
      const file = imageInput.files[0];

      // 檔名建議：productId/時間戳-原檔名
      const filePath = `${productId}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        alert("圖片上傳失敗：" + uploadError.message);
        return;
      }

      // 取得公開網址
      const publicUrl = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath).data.publicUrl;

      // 回寫到商品
      await supabase
        .from("products")
        .update({ image_url: publicUrl })
        .eq("id", productId);
    }

    alert("新增成功");
    location.href = "index.html";
  });
});
