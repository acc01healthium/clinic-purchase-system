// /admin/js/edit.js
let productId = null;
console.log("後台 編輯商品 初始化");

document.addEventListener("DOMContentLoaded", async () => {
  const supabase = window.supabaseClient;
  const params = new URLSearchParams(location.search);
  productId = params.get("id");

  if (!productId) {
    alert("缺少商品 ID");
    location.href = "index.html";
    return;
  }

  const form = document.getElementById("editForm");
  const cancelBtn = document.getElementById("cancelBtn");
  const deleteBtn = document.getElementById("deleteBtn");
  const imageInput = document.getElementById("imageFile");

  // 讀取商品
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();

  if (!data) {
    alert("讀取商品失敗");
    location.href = "index.html";
    return;
  }

  // 帶資料
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

  // 儲存
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

    await supabase.from("products").update(payload).eq("id", productId);

    // 有換圖片才上傳
    if (imageInput?.files.length) {
      const file = imageInput.files[0];
      const path = `${productId}/${Date.now()}-${file.name}`;

      await supabase.storage
        .from("product-images")
        .upload(path, file, { upsert: true });

      const publicUrl = supabase.storage
        .from("product-images")
        .getPublicUrl(path).data.publicUrl;

      await supabase
        .from("products")
        .update({ image_url: publicUrl })
        .eq("id", productId);
    }

    alert("儲存完成");
    location.href = "index.html";
  });

  // 刪除
  deleteBtn.addEventListener("click", async () => {
    if (!confirm("確定要刪除此商品？")) return;

    await supabase.from("products").delete().eq("id", productId);
    alert("商品已刪除");
    location.href = "index.html";
  });
});
