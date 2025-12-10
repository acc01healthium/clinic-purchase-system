// /admin/js/add.js
const supabase = window.supabaseClient;

const form = document.getElementById("addForm");
const imgFileEl = document.getElementById("imageFile");
const previewEl = document.getElementById("previewImage");
const loadingMask = document.getElementById("loadingMask");

// 即時預覽圖片
imgFileEl.addEventListener("change", () => {
  const file = imgFileEl.files[0];
  if (file) {
    previewEl.src = URL.createObjectURL(file);
  } else {
    previewEl.src = "";
  }
});

// 簡易圖片壓縮（壓到大約 300KB 內）
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

async function uploadImage(file) {
  if (!file) return null;

  // 壓縮
  try {
    file = await compressImage(file);
  } catch (e) {
    console.warn("圖片壓縮失敗，改用原檔", e);
  }

  // 安全檔名
  const safeName =
    Date.now() + "_" + file.name.replace(/[^\w.-]/g, "_").toLowerCase();
  const filePath = `uploads/${safeName}`;

  const { data, error } = await supabase.storage
    .from("product-images")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("圖片上傳失敗", error);
    alert("圖片上傳失敗：" + error.message);
    return null;
  }

  const { data: publicData } = supabase.storage
    .from("product-images")
    .getPublicUrl(filePath);

  return publicData.publicUrl;
}

function generateSku(name, id) {
  const prefix = (name || "")
    .replace(/[^\w]/g, "")
    .toUpperCase()
    .slice(0, 4) || "ITEM";
  const num = String(id).padStart(3, "0");
  return `${prefix}-${num}`;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const category = document.getElementById("category").value.trim();
  const spec = document.getElementById("spec").value.trim();
  const unit = document.getElementById("unit").value.trim();
  const last_price = Number(document.getElementById("last_price").value || 0);
  const is_active =
    document.getElementById("is_active").value === "true" ? true : false;
  const description = document.getElementById("description").value.trim();

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
    let imageUrl = null;
    if (imgFileEl.files.length > 0) {
      imageUrl = await uploadImage(imgFileEl.files[0]);
    }

    // 先插入一筆，取得 id
    const { data: inserted, error } = await supabase
      .from("products")
      .insert({
        name,
        category,
        spec,
        unit,
        last_price,
        is_active,
        description,
        image_url: imageUrl,
        last_price_updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error("新增失敗", error);
      alert("新增失敗：" + error.message);
      return;
    }

    // 自動產生 SKU：PREFIX-001
    const sku = generateSku(name, inserted.id);
    const { error: skuErr } = await supabase
      .from("products")
      .update({ sku })
      .eq("id", inserted.id);

    if (skuErr) {
      console.warn("SKU 更新失敗", skuErr);
    }

    alert("新增成功！");
    location.href = "index.html";
  } finally {
    loadingMask.style.display = "none";
  }
});
