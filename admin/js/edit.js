// /admin/js/edit.js
const supabase = window.supabaseClient;

// 取得 URL id
const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

if (!productId) {
  alert("找不到商品 ID");
  location.href = "index.html";
}

// DOM
const form = document.getElementById("editForm");
const imgFileEl = document.getElementById("imageFile");
const previewEl = document.getElementById("previewImage");
const deleteBtn = document.getElementById("deleteBtn");
const loadingMask = document.getElementById("loadingMask");

let currentImageUrl = null;

// 圖片預覽
imgFileEl.addEventListener("change", () => {
  const file = imgFileEl.files[0];
  if (file) {
    previewEl.src = URL.createObjectURL(file);
  } else if (currentImageUrl) {
    previewEl.src = currentImageUrl;
  } else {
    previewEl.src = "";
  }
});

// 與 add.js 共用的壓縮邏輯
async function compressImage(file, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("壓縮失敗"));
          resolve(new File([blob], file.name, { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = reject;
    img.src = url;
  });
}

async function uploadImageAndDeleteOld(file, oldUrl) {
  if (!file) return oldUrl;

  try {
    file = await compressImage(file);
  } catch (e) {
    console.warn("圖片壓縮失敗，改用原檔", e);
  }

  const safeName =
    Date.now() + "_" + file.name.replace(/[^\w.-]/g, "_").toLowerCase();
  const filePath = `uploads/${safeName}`;

  const { error } = await supabase.storage
    .from("product-images")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("圖片上傳失敗", error);
    alert("圖片上傳失敗：" + error.message);
    return oldUrl;
  }

  // 刪舊檔
  if (oldUrl) {
    const prefix = "/object/public/product-images/";
    const idx = oldUrl.indexOf(prefix);
    if (idx !== -1) {
      const path = oldUrl.slice(idx + prefix.length);
      if (path) {
        const { error: delErr } = await supabase.storage
          .from("product-images")
          .remove([path]);
        if (delErr) {
          console.warn("刪除舊圖失敗", delErr);
        }
      }
    }
  }

  const { data: publicData } = supabase.storage
    .from("product-images")
    .getPublicUrl(filePath);

  return publicData.publicUrl;
}

// 載入商品資料
async function loadProduct() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();

  if (error) {
    console.error("讀取商品失敗", error);
    alert("讀取商品失敗：" + error.message);
    location.href = "index.html";
    return;
  }

  document.getElementById("name").value = data.name || "";
  document.getElementById("category").value = data.category || "";
  document.getElementById("spec").value = data.spec || "";
  document.getElementById("unit").value = data.unit || "";
  document.getElementById("last_price").value = data.last_price ?? "";
  document.getElementById("description").value = data.description || "";
  document.getElementById("is_active").value = data.is_active ? "true" : "false";

  currentImageUrl = data.image_url || "";
  if (currentImageUrl) {
    previewEl.src = currentImageUrl;
  } else {
    previewEl.src = "";
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const category = document.getElementById("category").value.trim();
  const spec = document.getElementById("spec").value.trim();
  const unit = document.getElementById("unit").value.trim();
  const last_price = Number(document.getElementById("last_price").value || 0);
  const description = document.getElementById("description").value.trim();
  const is_active =
    document.getElementById("is_active").value === "true" ? true : false;

  if (!name) {
    alert("請輸入商品名稱");
    return;
  }
  if (!last_price || last_price < 0) {
    alert("請輸入合法售價");
    return;
  }

  loadingMask.style.display = "flex";

  try {
    let finalImageUrl = currentImageUrl;

    if (imgFileEl.files.length > 0) {
      finalImageUrl = await uploadImageAndDeleteOld(
        imgFileEl.files[0],
        currentImageUrl
      );
    }

    const { error } = await supabase
      .from("products")
      .update({
        name,
        category,
        spec,
        unit,
        last_price,
        description,
        is_active,
        image_url: finalImageUrl,
        last_price_updated_at: new Date().toISOString(),
      })
      .eq("id", productId);

    if (error) {
      console.error("更新失敗", error);
      alert("更新失敗：" + error.message);
      return;
    }

    alert("更新成功！");
    location.href = "index.html";
  } finally {
    loadingMask.style.display = "none";
  }
});

deleteBtn.addEventListener("click", async () => {
  if (!confirm("確定要刪除這個商品嗎？")) return;

  loadingMask.style.display = "flex";

  try {
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (error) {
      console.error("刪除失敗", error);
      alert("刪除失敗：" + error.message);
      return;
    }

    alert("刪除成功！");
    location.href = "index.html";
  } finally {
    loadingMask.style.display = "none";
  }
});

loadProduct();
