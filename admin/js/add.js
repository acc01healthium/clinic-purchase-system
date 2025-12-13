// /admin/js/add.js
console.log("新增商品頁 初始化");

document.addEventListener("DOMContentLoaded", () => {
  const supabase = window.supabaseClient;
  const form = document.getElementById("addForm");
  const cancelBtn = document.getElementById("cancelBtn");

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
      last_price_updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("products").insert(payload);

    if (error) {
      alert("新增失敗：" + error.message);
      return;
    }

    alert("新增成功");
    location.href = "index.html";
  });
});
