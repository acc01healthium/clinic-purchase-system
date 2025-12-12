// /admin/js/add.js
// 新增商品邏輯：新增、圖片上傳、表單驗證

console.log("後台 新增商品頁 初始化");

// 取得 Supabase client
const supabaseClient = window.supabaseClient;

if (!supabaseClient) {
    console.error("supabaseClient 不存在，請確認 supabase.js 是否正確載入。");
}

// DOM
const form = document.getElementById("addForm");

const nameInput = document.getElementById("name");
const categoryInput = document.getElementById("category");
const specInput = document.getElementById("spec");
const unitInput = document.getElementById("unit");
const descriptionInput = document.getElementById("description");
const lastPriceInput = document.getElementById("last_price");
const suggestedPriceInput = document.getElementById("suggested_price");
const isActiveSelect = document.getElementById("isActive");

const imageFileInput = document.getElementById("imageFile");
const imagePreview = document.getElementById("imagePreview");

const cancelBtn = document.getElementById("cancelBtn");
const logoutBtn = document.getElementById("logoutBtn");

let newImageFile = null;

// =========================
// 圖片預覽
// =========================
if (imageFileInput) {
    imageFileInput.addEventListener("change", (e) => {
        const file = e.target.files?.[0];

        imagePreview.innerHTML = "";

        if (!file) {
            imagePreview.innerHTML =
                `<span class="edit-image-placeholder">尚未選擇圖片</span>`;
            newImageFile = null;
            return;
        }

        newImageFile = file;
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        imagePreview.appendChild(img);
    });
}

// =========================
// 上傳圖片（若有）
// =========================
async function uploadImageIfNeeded(productId) {
    if (!newImageFile) return null;

    const ext = newImageFile.name.split(".").pop();
    const fileName = `product-${productId}-${Date.now()}.${ext}`;

    const { data, error } = await supabaseClient.storage
        .from("product-images")
        .upload(fileName, newImageFile, {
            cacheControl: "3600",
            upsert: true,
        });

    if (error) {
        console.error("圖片上傳錯誤：", error);
        return null;
    }

    const { data: publicData } = supabaseClient.storage
        .from("product-images")
        .getPublicUrl(data.path);

    return publicData.publicUrl ?? null;
}

// =========================
// 新增商品（表單送出）
// =========================
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = nameInput.value.trim();
    if (!name) {
        alert("商品名稱不可為空！");
        return;
    }

    const lastPrice =
        lastPriceInput.value === "" ? null : Number(lastPriceInput.value);

    if (lastPrice === null || Number.isNaN(lastPrice)) {
        alert("進價必須為數字！");
        return;
    }

    const suggestedPrice =
        suggestedPriceInput.value === "" ? null : Number(suggestedPriceInput.value);

    if (suggestedPrice !== null && Number.isNaN(suggestedPrice)) {
        alert("建議售價必須為數字！");
        return;
    }

    // 先插入一筆商品（還沒有圖片）
    const { data: insertData, error: insertErr } = await supabaseClient
        .from("products")
        .insert([
            {
                name,
                category: categoryInput.value.trim() || null,
                spec: specInput.value.trim() || null,
                unit: unitInput.value.trim() || null,
                description: descriptionInput.value.trim() || null,
                last_price: lastPrice,
                suggested_price: suggestedPrice,
                is_active: isActiveSelect.value === "true",
                last_price_updated_at: new Date().toISOString(),
                image_url: null,
            },
        ])
        .select("id")
        .single();

    if (insertErr) {
        console.error("新增商品失敗：", insertErr);
        alert("新增商品失敗，請稍後再試。");
        return;
    }

    const productId = insertData.id;

    // 若有圖片 → 上傳圖片 → 更新資料庫
    if (newImageFile) {
        const imageUrl = await uploadImageIfNeeded(productId);

        await supabaseClient
            .from("products")
            .update({ image_url: imageUrl })
            .eq("id", productId);
    }

    alert("商品新增完成！");
    window.location.href = "index.html";
});

// =========================
// 取消按鈕 → 回列表
// =========================
cancelBtn.addEventListener("click", () => {
    window.location.href = "index.html";
});

// =========================
// 登出按鈕
// =========================
logoutBtn.addEventListener("click", () => {
    window.location.href = "login.html";
});
