console.log("新增商品頁 初始化");

document.addEventListener("DOMContentLoaded", () => {
  const supabase = window.supabaseClient;
  const form = document.getElementById("addForm");
  const cancelBtn = document.getElementById("cancelBtn");
  const imageInput = document.getElementById("imageFile");
  const preview = document.getElementById("imagePreview");

  imageInput.addEventListener("change", () =>
    previewImage(imageInput, preview)
  );

  cancelBtn.addEventListener("click", () => location.href = "index.html");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = nameEl.value.trim();
    if (!name || last_price.value === "") {
      alert("商品名稱與進價必填");
      return;
    }

    const { data: product, error } = await supabase
      .from("products")
      .insert({
        name,
        category: category.value || null,
        spec: spec.value || null,
        unit: unit.value || null,
        description: description.value || null,
        last_price: Number(last_price.value),
        suggested_price: suggested_price.value
          ? Number(suggested_price.value)
          : null,
        is_active: isActive.value === "true",
        last_price_updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return alert(error.message);

    if (imageInput.files.length) {
      const compressed = await compressImage(imageInput.files[0]);
      const path = `${product.id}/${Date.now()}.jpg`;

      await supabase.storage
        .from("product-images")
        .upload(path, compressed, { upsert: true });

      const url = supabase.storage
        .from("product-images")
        .getPublicUrl(path).data.publicUrl;

      await supabase.from("products")
        .update({ image_url: url })
        .eq("id", product.id);
    }

    alert("新增完成");
    location.href = "index.html";
  });
});
