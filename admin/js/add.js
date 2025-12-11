// admin/js/add.js

document.addEventListener("DOMContentLoaded", () => {
  const supabase = window.supabaseClient;

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

  // 圖片預覽
  if (imgFileEl && imgPreviewEl) {
    imgFileEl.addEventListener("change", () => {
      const file = imgFileEl.files[0];
      if (file) {
        imgPreviewEl.src = URL.createObjectURL(file);
      } else {
        imgPreviewEl.src = "";
      }
    });
  }

  // 上傳圖片（可重複給 edit.js 用）
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

  if (!form) return;

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

    // 按鈕鎖定 + loading
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "儲存中，請稍候...";
    }

    try {
      let imageUrl = null;
      if (imgFileEl && imgFileEl.files.length > 0) {
        imageUrl = await uploadImage(imgFileEl.files[0]);
        if (!imageUrl) {
          throw new Error("圖片上傳失敗");
        }
      }

      const nowIso = new Date().toISOString();

      const { error } = await supabase.from("products").insert({
        name: nameEl.value.trim(),
        category: categoryEl.value.trim(),
        spec: specEl.value.trim(),
        unit: unitEl.value.trim(),
        last_price: lastPrice,
        suggest_price: suggestPrice,
        is_active: activeEl.value === "true",
        description: descEl.value.trim() || null,
        image_url: imageUrl,
        last_price_updated_at: nowIso,
      });

      if (error) {
        console.error("新增商品失敗：", error);
        alert("新增商品失敗：" + error.message);
        return;
      }

      alert("新增成功！");
      location.href = "index.html";
    } catch (err) {
      console.error(err);
      alert("新增過程發生錯誤：" + err.message);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "儲存新增";
      }
    }
  });
});
