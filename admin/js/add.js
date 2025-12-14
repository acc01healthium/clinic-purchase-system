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

   // 新增商品
const { data, error } = await supabase
  .from("products")
  .insert([payload])
  .select()
  .single();

if (error) {
  alert("新增失敗：" + error.message);
  return;
}

const productId = data.id;

// 上傳圖片（如果有）
if (imageFileInput.files.length > 0) {
  const file = imageFileInput.files[0];
  const ext = file.name.split(".").pop();
  const filePath = `products/product-${productId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(filePath, file, {
      upsert: false,
      contentType: file.type
    });

  if (uploadError) {
    alert("圖片上傳失敗：" + uploadError.message);
    return;
  }

  // 回寫 image_url
  const imageUrl =
    `${SUPABASE_URL}/storage/v1/object/public/product-images/${filePath}`;

  await supabase
    .from("products")
    .update({ image_url: imageUrl })
    .eq("id", productId);
}

alert("新增成功");
location.href = "index.html";
