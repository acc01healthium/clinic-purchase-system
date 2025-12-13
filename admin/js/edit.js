// /admin/js/edit.js
let productId = null;
console.log("後台 編輯商品 初始化");

document.addEventListener("DOMContentLoaded", async () => {
  const supabase = window.supabaseClient;

  // 取得 ID
  const params = new URLSearchParams(location.search);
  productId = params.get("id");
  console.log("edit productId =", productId);

  if (!productId) {
    alert("缺少商品 ID");
    location.href = "index.html";
    return;
  }

  // 表單欄位
  const form = document.getElementById("editForm");
  const cancelBtn = document.getElementById("cancelBtn");
  const deleteBtn = document.getElementById("deleteBtn");

  // 讀取資料
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

  // 帶入表單
  document.getElementById("name").value = data.name || "";
  document.getElementById("category").value = data.category || "";
  document.getElementById("spec").value = data.spec || "";
  document.getElementById("unit").value = data.unit || "";
  document.getElementById("description").value = data.description || "";
  document.getElementById("last_price").value = data.last_price ?? "";
  document.getElementById("suggested_price").value =
    data.suggested_price ?? "";
  document.getElementById("isActive").value = String(data.is_active);

  // 取消
  cancelBtn.addEventListener("click", () => {
    location.href = "index.html";
  });

  // 儲存
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

    const { error } = await supabase
      .from("products")
      .update(payload)
      .eq("id", productId);

    if (error) {
      alert("儲存失敗：" + error.message);
      return;
    }

    alert("儲存完成");
    location.href = "index.html";
  });

  // 刪除（一定要在 submit 外面）
  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      console.log("delete clicked, id =", productId);

      if (!confirm("確定要刪除此商品嗎？此動作無法復原！")) {
        return;
      }

      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);

      if (error) {
        alert("刪除失敗：" + error.message);
        return;
      }

      alert("商品已刪除");
      location.href = "index.html";
    });
  }
});
