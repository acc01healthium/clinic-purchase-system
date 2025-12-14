// /admin/js/edit.js
console.log("後台 編輯商品 初始化");

document.addEventListener("DOMContentLoaded", async () => {
  const supabase = window.supabaseClient;

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

  // ① 讀資料
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();

  if (error || !data) {
    alert("讀取商品失敗");
    location.href = "index.html";
    return;
  }

  // ② 帶入表單
  document.getElementById("name").value = data.name || "";
  document.getElementById("category").value = data.category || "";
  document.getElementById("spec").value = data.spec || "";
  document.getElementById("unit").value = data.unit || "";
  document.getElementById("description").value = data.description || "";
  document.getElementById("last_price").value = data.last_price ?? "";
  document.getElementById("suggested_price").value =
    data.suggested_price ?? "";
  document.getElementById("isActive").value = String(data.is_active);

  cancelBtn.addEventListener("click", () => {
    location.href = "index.html";
  });

  // ③ 儲存
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const last_price = document.getElementById("last_price").value;

    if (!name || last_price === "") {
      alert("商品名稱與進價不可空白");
      return;
    }

    const payload = {
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
    };

    await supabase.from("products").update(payload).eq("id", productId);

    // 圖片更新
    if (imageInput.files.length > 0) {
      const file = imageInput.files[0];
      const ext = file.name.split(".").pop();
      const path = `${productId}.${ext}`;

      await supabase.storage
        .from("product-images")
        .upload(path, file, { upsert: true });

      const image_url = supabase.storage
        .from("product-images")
        .getPublicUrl(path).data.publicUrl;

      await supabase
        .from("products")
        .update({ image_url })
        .eq("id", productId);
    }

    alert("儲存完成");
    location.href = "index.html";
  });

  // ④ 刪除
  deleteBtn.addEventListener("click", async () => {
    if (!confirm("確定要刪除此商品嗎？")) return;

    await supabase.from("products").delete().eq("id", productId);
    alert("商品已刪除");
    location.href = "index.html";
  });
});

if (product.image_url) {
  const img = document.getElementById("imagePreview");
  img.src = product.image_url;
  img.style.display = "block";
}
