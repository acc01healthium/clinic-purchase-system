console.log("後台 編輯商品 初始化");

const supabaseClient = window.supabaseClient;

const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get("id");

if (!productId) {
  alert("缺少商品 ID");
  location.href = "index.html";
}

const form = document.getElementById("editForm");
const msg = document.getElementById("statusMessage");

const nameEl = document.getElementById("name");
const categoryEl = document.getElementById("category");
const specEl = document.getElementById("spec");
const unitEl = document.getElementById("unit");
const descriptionEl = document.getElementById("description");
const lastPriceEl = document.getElementById("last_price");
const suggestedPriceEl = document.getElementById("suggested_price");
const isActiveEl = document.getElementById("is_active");

// 讀取資料
async function loadProduct() {
  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();

  if (error || !data) {
    msg.textContent = "讀取資料錯誤，請稍後重試";
    console.error(error);
    return;
  }

  nameEl.value = data.name ?? "";
  categoryEl.value = data.category ?? "";
  specEl.value = data.spec ?? "";
  unitEl.value = data.unit ?? "";
  descriptionEl.value = data.description ?? "";
  lastPriceEl.value = data.last_price ?? "";
  suggestedPriceEl.value = data.suggested_price ?? "";
  isActiveEl.value = data.is_active ? "true" : "false";
}

loadProduct();

// 儲存更新
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.textContent = "儲存中…";

  const updateData = {
    name: nameEl.value,
    category: categoryEl.value,
    spec: specEl.value,
    unit: unitEl.value,
    description: descriptionEl.value || null,
    last_price: lastPriceEl.value ? Number(lastPriceEl.value) : null,
    suggested_price: suggestedPriceEl.value ? Number(suggestedPriceEl.value) : null,
    is_active: isActiveEl.value === "true",
    last_price_updated_at: new Date().toISOString()
  };

  const { error } = await supabaseClient
    .from("products")
    .update(updateData)
    .eq("id", productId);

  if (error) {
    msg.textContent = "更新失敗";
    console.error(error);
    return;
  }

  msg.textContent = "更新成功，返回列表…";
  setTimeout(() => (location.href = "index.html"), 600);
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  location.href = "login.html";
});
