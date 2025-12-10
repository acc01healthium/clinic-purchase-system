// admin/js/add.js
// 後台：新增商品（不含圖片，上架後再用編輯頁上傳）

console.log("✅ add.js 載入");

const db = window.supabaseClient;

const formAdd = document.getElementById("addForm");
const nameAddEl = document.getElementById("name");
const categoryAddEl = document.getElementById("category");
const specAddEl = document.getElementById("spec");
const unitAddEl = document.getElementById("unit");
const descAddEl = document.getElementById("description");
const costAddEl = document.getElementById("last_price");
const suggestAddEl = document.getElementById("suggest_price");
const activeAddEl = document.getElementById("is_active");

// 產生簡單 SKU：NAME-SPEC-時間戳
function genSku(name, spec) {
  const n = (name || "").replace(/\s+/g, "").slice(0, 6);
  const s = (spec || "").replace(/\s+/g, "").slice(0, 6);
  return `${n || "ITEM"}-${s || "SPEC"}-${Date.now().toString(36)}`.toUpperCase();
}

if (formAdd) {
  formAdd.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = nameAddEl.value.trim();
    const category = categoryAddEl.value.trim();
    const spec = specAddEl.value.trim();
    const unit = unitAddEl.value.trim();

    if (!name || !category || !spec || !unit) {
      alert("請輸入：名稱、類別、規格、單位");
      return;
    }

    const cost = costAddEl.value.trim();
    const suggest = suggestAddEl.value.trim();

    const nowIso = new Date().toISOString();

    const insertData = {
      name,
      category,
      spec,
      unit,
      description: descAddEl.value.trim(),
      last_price: cost ? Number(cost) : null,
      suggest_price: suggest ? Number(suggest) : null,
      is_active: activeAddEl.value === "true",
      sku: genSku(name, spec),
    };

    if (cost) {
      insertData.last_price_updated_at = nowIso;
    }

    const { error } = await db.from("products").insert([insertData]);

    if (error) {
      console.error(error);
      alert("新增失敗：" + error.message);
      return;
    }

    alert("新增成功！之後可到編輯頁上傳圖片。");
    location.href = "index.html";
  });
}
