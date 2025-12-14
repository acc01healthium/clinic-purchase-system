// /admin/js/add.js
console.log("新增商品頁 初始化（最終穩定版）");

document.addEventListener("DOMContentLoaded", () => {
  const supabase = window.supabaseClient;
  if (!supabase) {
    alert("Supabase 尚未初始化（window.supabaseClient 不存在）");
    return;
  }

  const form = document.getElementById("addForm");
  const cancelBtn = document.getElementById("cancelBtn");
  const imageFileInput = document.getElementById("imageFile");
  const preview = document.getElementById("imagePreview");

  if (!form || !cancelBtn || !imageFileInput || !preview) {
    alert("頁面缺少必要元件（addForm/cancelBtn/imageFile/imagePreview）");
    return;
  }

  // ============ 工具：壓縮圖片到 JPG（最長邊 1280） ============
  async function compressToJpg(file, maxSide = 1280, quality = 0.82) {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;

    let targetW = width;
    let targetH = height;

    if (Math.max(width, height) > maxSide) {
      const scale = maxSide / Math.max(width, height);
      targetW = Math.round(width * scale);
      targetH = Math.round(height * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);

    const blob = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
    });

    if (!blob) throw new Error("圖片壓縮失敗（toBlob 回傳 null）");
    return blob; // image/jpeg
  }

  function setPreviewFromFile(file) {
    preview.innerHTML = "";
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.onload = () => URL.revokeObjectURL(img.src);
    img.style.maxWidth = "220px";
    img.style.borderRadius = "8px";
    img.style.display = "block";
    preview.appendChild(img);
  }

  imageFileInput.addEventListener("change", () => {
    if (imageFileInput.files && imageFileInput.files[0]) {
      setPreviewFromFile(imageFileInput.files[0]);
    } else {
      preview.innerHTML = `<span class="edit-image-placeholder">尚未選擇圖片</span>`;
    }
  });

  cancelBtn.addEventListener("click", () => {
    location.href = "index.html";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      const name = document.getElementById("name").value.trim();
      const last_price_raw = document.getElementById("last_price").value;

      if (!name || last_price_raw === "") {
        alert("請至少填寫：商品名稱、進價");
        return;
      }

      const last_price = Number(last_price_raw);
      if (Number.isNaN(last_price)) {
        alert("進價必須是數字");
        return;
      }

      const suggested_raw = document.getElementById("suggested_price").value;

      const payload = {
        name,
        category: document.getElementById("category").value.trim() || null,
        spec: document.getElementById("spec").value.trim() || null,
        unit: document.getElementById("unit").value.trim() || null,
        description: document.getElementById("description").value.trim() || null,
        last_price,
        suggested_price: suggested_raw === "" ? null : Number(suggested_raw),
        is_active: document.getElementById("isActive").value === "true",
      };

      // ① 新增商品（insert 要用陣列）
      const { data, error } = await supabase
        .from("products")
        .insert([payload])
        .select("id")
        .single();

      if (error || !data?.id) {
        alert("新增失敗：" + (error?.message || "未知錯誤"));
        return;
      }

      const productId = data.id;

      // ② 上傳圖片（如果有）
      if (imageFileInput.files && imageFileInput.files.length > 0) {
        const file = imageFileInput.files[0];

        // 壓縮成 JPG
        const jpgBlob = await compressToJpg(file, 1280, 0.82);

        const filePath = `products/product-${productId}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(filePath, jpgBlob, {
            upsert: true,
            contentType: "image/jpeg",
          });

        if (uploadError) {
          alert("圖片上傳失敗：" + uploadError.message);
          return;
        }

        const publicUrl = supabase.storage
          .from("product-images")
          .getPublicUrl(filePath).data.publicUrl;

        const { error: writeBackError } = await supabase
          .from("products")
          .update({ image_url: publicUrl })
          .eq("id", productId);

        if (writeBackError) {
          alert("回寫 image_url 失敗：" + writeBackError.message);
          return;
        }
      }

      alert("新增成功");
      location.href = "index.html";
    } catch (err) {
      console.error(err);
      alert("發生例外錯誤：" + (err?.message || err));
    }
  });
});
