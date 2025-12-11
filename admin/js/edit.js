// /admin/js/edit.js
console.log("後台 編輯商品 初始化");

const supabaseClient = window.supabaseClient;

// 取得 URL ?id=xxx
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get("id");

// 元素
const form = document.getElementById("editForm");
const msg = document.getElementById("statusMessage");

// 欄位
const nameEl = document.getElementById("name");
const categoryEl = document.getElementById("category");
const specEl = document.getElementById("spec");
const unitEl = document.getElementById("unit");
const lastPriceEl = document.getElementById("last_price");
const suggestedPriceEl = document.getElementById("suggested_price");
const imageUrlEl = document.getElementById("image_url");
const isActiveEl = document.getElementById("is_active");

// 防呆：若沒有 id → 退回列表
if (!productId) {
  alert("缺少商品 ID");
  location.href = "index.html";
}

// 載入商品資料
async function loadProduct() {
  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();

  if (error || !data) {
    msg.textContent = "讀取資料錯誤";
    console.error(error);
    return;
  }

  nameEl.value = data.name ?? "";
  categoryEl.value = data.category ?? "";
  specEl.value = data.spec ?? "";
  unitEl.value = data.unit ?? "";
  lastPriceEl.value = data.last_price ?? "";
  suggestedPriceEl.value = data.suggested_price ?? "";
  imageUrlEl.value = data.image_url ?? "";
  isActiveEl.value = data.is_active ? "true" : "false";
}

loadProduct();

// 提交更新
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  msg.textContent = "儲存中…";

  const updateData = {
    name: nameEl.value,
    category: categoryEl.value,
    spec: specEl.value,
    unit: unitEl.value,
    last_price: lastPriceEl.value ? Number(lastPriceEl.value) : null,
    suggested_price: suggestedPriceEl.value ? Number(suggestedPriceEl.value) : null,
    image_url: imageUrlEl.value || null,
    is_active: isActiveEl.value === "true",
    last_price_updated_at: new Date().toISOString()
  };

  const { error } = await supabaseClient
    .from("products")
    .update(updateData)
    .eq("id", productId);

  if (error) {
    msg.textContent = "更新失敗，請稍後再試";
    console.error(error);
    return;
  }

  msg.textContent = "更新成功，返回列表…";
  setTimeout(() => (location.href = "index.html"), 600);
});

// 登出功能
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    location.href = "login.html";
  });
}
