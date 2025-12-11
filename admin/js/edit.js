// admin/js/edit.js

document.addEventListener("DOMContentLoaded", () => {
  const supabase = window.supabaseClient;

  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id");
  if (!productId) {
    alert("找不到商品 ID");
    location.href = "index.html";
    return;
  }

  const form = document.getElementById("productForm");
  const nameEl = document.getElementById("name");
  const categoryEl = document.getElementById("category");
  const specEl = document.getElementById("spec");
  const unitEl = document.getElementById("unit");
  const costEl = document.getElementById("last_price");
  const suggestEl = document.getElementById("suggest_price");
  const activeEl = document.getElementById("is_active");
  const descEl = document.getElementById("description");
  const imgFileEl = document.getElementById("imageFile");
  const imgPreviewEl = document.getElementById("previewImage");
  const submitBtn = document.getElementById("saveBtn");
  const deleteBtn = document.getElementById("deleteBtn");

  let currentImageUrl = null;

  if (imgFileEl && imgPreviewEl) {
    imgFileEl.addEventListener("change", () => {
      const file = imgFileEl.files[0];
      if (file) imgPreviewEl.src = URL.createObjectURL(file);
    });
  }

  async function uploadImage(file) {
    if (!file) return null;

    const safeName =
      Date.now() + "_" + file.name.replace(/[^\w.\-]/g, "_");
    const filePath = `uploads/${safeName}`;

    const { data, error } = await supabase.storage
      .from("product-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("圖片上傳失敗：", error);
      alert("圖片上傳失敗：" + error.message);
      return null;
    }

    const { data: publicData } = supabase.storage
      .from("product-images")
      .getPublicUrl(filePath);

    return publicData.publicUrl;
  }

  // 載入資料
  async function loadProduct() {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (error) {
      console.error("讀取商品失敗：", error);
      alert("讀取商品失敗：" + error.message);
      location.href = "index.html";
      return;
    }

    nameEl.value = data.name || "";
    categoryEl.value = data.category || "";
    specEl.value = data.spec || "";
    unitEl.value = data.unit || "";
    costEl.value = data.last_price != null ? data.last_price : "";
    suggestEl.value =
      data.suggest_price != null ? data.suggest_price : "";
    activeEl.value = data.is_active ? "true" : "false";
    descEl.value = data.description || "";

    currentImageUrl = data.image_url || null;
    if (currentImageUrl && imgPreviewEl) {
      imgPreviewEl.src = currentImageUrl;
    }
  }

  if (!form) return;
  loadProduct();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!nameEl.value.trim()) {
      alert("請輸入商品名稱");
      nameEl.focus();
      return;
    }
    if (!categoryEl.value.trim()) {
      alert("請輸入類別");
      categoryEl.focus();
      return;
    }
    if (!specEl.value.trim()) {
      alert("請輸入規格");
      specEl.focus();
      return;
    }
    if (!unitEl.value.trim()) {
      alert("請輸入單位");
      unitEl.focus();
      return;
    }
    if (!costEl.value.trim()) {
      alert("請輸入進價");
      costEl.focus();
      return;
    }

    const lastPrice = Number(costEl.value);
    const suggestPrice = suggestEl.value.trim()
      ? Number(suggestEl.value)
      : null;

    if (Number.isNaN(lastPrice)) {
      alert("進價必須是數字");
      costEl.focus();
      return;
    }
    if (suggestEl.value.trim() && Number.isNaN(suggestPrice)) {
      alert("建議售價必須是數字");
      suggestEl.focus();
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "儲存中...";
    }

    try {
      let finalImageUrl = currentImageUrl;
      if (imgFileEl && imgFileEl.files.length > 0) {
        const uploaded = await uploadImage(imgFileEl.files[0]);
        if (uploaded) finalImageUrl = uploaded;
      }

      const nowIso = new Date().toISOString();

      const { error } = await supabase
        .from("products")
        .update({
          name: nameEl.value.trim(),
          category: categoryEl.value.trim(),
          spec: specEl.value.trim(),
          unit: unitEl.value.trim(),
          last_price: lastPrice,
          suggest_price: suggestPrice,
          is_active: activeEl.value === "true",
          description: descEl.value.trim() || null,
          image_url: finalImageUrl,
          last_price_updated_at: nowIso,
        })
        .eq("id", productId);

      if (error) {
        console.error("更新失敗：", error);
        alert("更新失敗：" + error.message);
        return;
      }

      alert("更新成功！");
      location.href = "index.html";
    } catch (err) {
      console.error(err);
      alert("更新過程發生錯誤：" + err.message);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "儲存修改";
      }
    }
  });

  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      if (!confirm("確定要刪除這個商品嗎？")) return;

      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);

      if (error) {
        console.error("刪除失敗：", error);
        alert("刪除失敗：" + error.message);
        return;
      }

      alert("刪除成功！");
      location.href = "index.html";
    });
  }
});
