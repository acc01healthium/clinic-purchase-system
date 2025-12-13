import { compressImage, previewImage } from "./image-utils.js";

document.addEventListener("DOMContentLoaded", async () => {
  const supabase = window.supabaseClient;
  const id = new URLSearchParams(location.search).get("id");
  if (!id) return location.href = "index.html";

  const preview = document.getElementById("imagePreview");
  const imageInput = document.getElementById("imageFile");

  imageInput.addEventListener("change", () =>
    previewImage(imageInput, preview)
  );

  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (data.image_url) {
    preview.innerHTML = `<img src="${data.image_url}" />`;
  }

  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    await supabase.from("products")
      .update({
        name: name.value,
        category: category.value || null,
        spec: spec.value || null,
        unit: unit.value || null,
        description: description.value || null,
        last_price: Number(last_price.value),
        suggested_price: suggested_price.value
          ? Number(suggested_price.value)
          : null,
        is_active: isActive.value === "true",
      })
      .eq("id", id);

    if (imageInput.files.length) {
      // 刪舊圖
      const folder = id;
      const { data: files } = await supabase.storage
        .from("product-images")
        .list(folder);
      if (files?.length) {
        await supabase.storage
          .from("product-images")
          .remove(files.map(f => `${folder}/${f.name}`));
      }

      const compressed = await compressImage(imageInput.files[0]);
      const path = `${id}/${Date.now()}.jpg`;

      await supabase.storage
        .from("product-images")
        .upload(path, compressed, { upsert: true });

      const url = supabase.storage
        .from("product-images")
        .getPublicUrl(path).data.publicUrl;

      await supabase.from("products")
        .update({ image_url: url })
        .eq("id", id);
    }

    alert("儲存完成");
    location.href = "index.html";
  });

  deleteBtn.addEventListener("click", async () => {
    if (!confirm("確定刪除？")) return;

    const folder = id;
    const { data: files } = await supabase.storage
      .from("product-images")
      .list(folder);
    if (files?.length) {
      await supabase.storage
        .from("product-images")
        .remove(files.map(f => `${folder}/${f.name}`));
    }

    await supabase.from("products").delete().eq("id", id);
    alert("商品已刪除");
    location.href = "index.html";
  });
});
