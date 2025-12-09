const supabaseUrl = "https://utwthtjgwrveljgwlwzm.supabase.co";
const supabaseKey = "YOUR_SERVICE_ROLE_OR_ANON_KEY";
const supa = supabase.createClient(supabaseUrl, supabaseKey);

// 取得 URL 中 ?sku=XXXX
const urlParams = new URLSearchParams(window.location.search);
const sku = urlParams.get("sku");

async function loadProduct() {
  if (!sku) return;

  const { data, error } = await supa
    .from("products")
    .select("*")
    .eq("sku", sku)
    .single();

  if (error) {
    document.getElementById("msg").textContent = "讀取商品失敗：" + error.message;
    return;
  }

  document.getElementById("name").value = data.name || "";
  document.getElementById("category").value = data.category || "";
  document.getElementById("spec").value = data.spec || "";
  document.getElementById("unit").value = data.unit || "";
  document.getElementById("description").value = data.description || "";
  document.getElementById("price").value = data.price || "";
  document.getElementById("is_active").value = data.is_active ? "true" : "false";
  document.getElementById("image_url").value = data.image_url || "";
}

async function saveProduct() {
  const payload = {
    name: document.getElementById("name").value,
    category: document.getElementById("category").value,
    spec: document.getElementById("spec").value,
    unit: document.getElementById("unit").value,
    description: document.getElementById("description").value,
    price: Number(document.getElementById("price").value),
    is_active: document.getElementById("is_active").value === "true",
    image_url: document.getElementById("image_url").value
  };

  const { error } = await supa
    .from("products")
    .update(payload)
    .eq("sku", sku);

  if (error) {
    document.getElementById("msg").textContent = "儲存失敗：" + error.message;
    return;
  }

  alert("儲存成功！");
  window.location.href = "/admin/index.html";
}

function goBack() {
  window.location.href = "/admin/index.html";
}

loadProduct();

