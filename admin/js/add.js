// /admin/js/add.js
console.log("新增商品頁 初始化");

document.addEventListener("DOMContentLoaded", () => {
  const supabase = window.supabaseClient;
  if (!supabase) {
    alert("Supabase 尚未初始化（請確認 js/supabase.js 有載入且建立 window.supabaseClient）");
    return;
  }

  const form = document.getElementById("addForm");
  const cancelBtn = document.getElementById("cancelBtn");
  const imageFileInput = document.getElementById("imageFile");
  const imagePreview = document.getElementById("imagePreview");

  if (!form || !cancelBtn) {
    console.error("找不到 addForm 或 cancelBtn，請確認 HTML id 是否正確");
    return;
  }

  // ========== 圖片壓縮（最長邊 1280，輸出 JPG）==========
  async function compressToJpeg(file, maxSize = 1280, quality = 0.85) {
    // 讀成 Image
    const dataUrl = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });

    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = dataUrl;
    });

    // 計算縮放
    let { width, height } = img;
    const scale = Math.min(1, maxSize / Math.max(width, height));
    width = Math.round(width * scale);
    height = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    // PNG 透明底會變黑的話，先鋪白底（醫材圖通常 OK）
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
    });

    if (!blob) throw new Error("圖片壓縮失敗（toBlob 回傳 null）");

    return new File([blob], "compressed.jpg", { type: "image/jpeg" });
  }

  // ========== 取消 ==========
  cancelBtn.addEventListener("click", () => {
    location.href = "index.html";
  });

  // ========== 選圖即預覽（可選）==========
  if (imageFileInput && imagePreview) {
    imageFileInput.addEventListener("change", () => {
      imagePreview.innerHTML = "";
      const f = imageFileInput.files?.[0];
      if (!f) {
        imagePreview.innerHTML = `<span class="edit-image-placeholder">尚未選擇圖片</span>`;
        return;
      }
      const img = document.createElement("img");
      img.style.maxWidth = "220px";
      img.style.borderRadius = "8px";
      img.style.display = "block";
      img.src = URL.createObjectURL(f);
      imagePreview.appendChild(img);
    });
  }

  // ========== 新增 ==========
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // 防止連點
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
      const name = document.getElementById("name").value.trim();
      const lastPriceStr = document.getElementById("last_price").value;

      if (!name || lastPriceStr === "") {
        alert("請至少填寫：商品名稱、進價");
        return;
      }

      const payload = {
        name,
        category: document.getElementById("category").value.trim() || null,
        spec: document.getElementById("spec").value.trim() || null,
        unit: document.getElementById("unit").value.trim() || null,
        description: document.getElementById("description").value.trim() || null,
        last_price: Number(lastPriceStr),
        suggested_price:
          document.getElementById("suggested_price").value === ""
            ? null
            : Number(document.getElementById("suggested_price").value),
        is_active: document.getElementById("isActive").value === "true",
      };

      if (Number.isNaN(payload.last_price)) {
        alert("進價必須是數字");
        return;
      }

      // ① 新增商品（注意：supabase v2 建議用陣列）
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

      // ② 有圖就壓縮＋上傳＋回寫 image_url
      if (imageFileInput && imageFileInput.files.length > 0) {
        const rawFile = imageFileInput.files[0];

        // 壓縮成 jpg
        const compressed = await compressToJpeg(rawFile, 1280, 0.85);

        // 統一路徑：一個商品一張圖
        const filePath = `products/${productId}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(filePath, compressed, {
            upsert: true,
            contentType: "image/jpeg",
            cacheControl: "3600",
          });

        if (uploadError) {
          alert("圖片上傳失敗：" + uploadError.message);
          return;
        }

        // 用 SDK 取 public url（不要自己拼 SUPABASE_URL，避免 undefined）
        const { data: pub } = supabase.storage
          .from("product-images")
          .getPublicUrl(filePath);

        const imageUrl = pub?.publicUrl || null;

        if (imageUrl) {
          const { error: upErr } = await supabase
            .from("products")
            .update({ image_url: imageUrl })
            .eq("id", productId);

          if (upErr) {
            alert("已上傳圖片，但回寫 image_url 失敗：" + upErr.message);
            return;
          }
        }
      }

      alert("新增成功");
      location.href = "index.html";
    } catch (err) {
      console.error(err);
      alert("發生例外錯誤：" + (err?.message || err));
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
});
