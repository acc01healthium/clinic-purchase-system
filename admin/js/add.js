// /admin/js/add.js

const supabase = window.supabaseClient;

const addForm = document.getElementById("addForm");
const imgFileEl = document.getElementById("imageFile");
const previewEl = document.getElementById("previewImage");
const loadingMask = document.getElementById("loadingMask");

const nameEl = document.getElementById("name");
const categoryEl = document.getElementById("category");
const specEl = document.getElementById("spec");
const unitEl = document.getElementById("unit");
const descEl = document.getElementById("description");
const priceEl = document.getElementById("last_price");
const activeEl = document.getElementById("is_active");

// 即時預覽
imgFileEl.addEventListener("change", () => {
  const file = imgFileEl.files[0];
  if (file) previewEl.src = URL.createObjectURL(file);
});

/** 簡單壓縮圖片（寬度最大 1000px） */
function compressImage(file, maxWidth = 1000) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      if (scale === 1) {
        resolve(file); // 不用壓縮
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          const compressed = new File([blob], file.name, { type: blob.type });
          resolve(compressed);
        },
        "image/jpeg",
        0.85
      );
    };
    img.src = URL.createObjectURL(file);
  });
}

async function uploadImage(file) {
  if (!file) return null;

  const safeName = Date.now() + "_" + file.name.replace(/[^\w.-]/g, "_");
  const path = `uploads/${safeName}`;

  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    alert("圖片上傳失敗：" + error.message);
    console.error(error);
    return null;
  }

  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return data.publicUrl;
}

addForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!nameEl.value.trim()) {
    alert("商品名稱為必填");
    nameEl.focus();
    return;
  }
  if (!priceEl.value) {
    alert("售價為必填");
    priceEl.focus();
    return;
  }

  loadingMask.style.display = "flex";

  let finalImageUrl = null;
  if (imgFileEl.files.length > 0) {
    const compressed = await compressImage(imgFileEl.files[0]);
    finalImageUrl = await uploadImage(compressed);
  }

  const payload = {
    name: nameEl.value.trim(),
    category: categoryEl.value.trim(),
    spec: specEl.value.trim(),
    unit: unitEl.value.trim(),
    description: descEl.value.trim(),
    last_price: Number(priceEl.value),
    is_active: activeEl.value === "true",
    image_url: finalImageUrl,
    last_price_updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("products").insert(payload);

  loadingMask.style.display = "none";

  if (error) {
    alert("新增失敗：" + error.message);
    console.error(error);
    return;
  }

  alert("新增成功！");
  location.href = "index.html";
});
