const supabaseUrl = "https://utwthtjgwrveljgwlwzm.supabase.co";
const supabaseKey = "YOUR_ANON_KEY"; // 請換成你的 anon public key
const supa = supabase.createClient(supabaseUrl, supabaseKey);

async function checkLogin() {
  const { data } = await supa.auth.getUser();
  if (!data.user) {
    window.location.href = "/admin/login.html";
    return;
  }
  document.getElementById("adminEmail").textContent = data.user.email;
}
checkLogin();

async function loadProducts() {
  const { data, error } = await supa
    .from("products")
    .select("*")
    .order("name");

  if (error) {
    alert("讀取商品失敗：" + error.message);
    return;
  }

  const tbody = document.getElementById("productTable");
  tbody.innerHTML = "";

  data.forEach(p => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${p.name}</td>
      <td>${p.category || ""}</td>
      <td>${p.unit || ""}</td>
      <td>NT$ ${p.price ?? ""}</td>
      <td>${formatTime(p.last_price_updated_at)}</td>
      <td>${p.is_active ? "啟用" : "停用"}</td>
      <td>
        <button class="btn-blue btn-small" onclick="editProduct('${p.sku}')">編輯</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

function formatTime(t) {
  if (!t) return "";
  const dt = new Date(t);
  return dt.toLocaleString("zh-TW", { hour12: false });
}

function editProduct(sku) {
  window.location.href = `/admin/edit.html?sku=${sku}`;
}

function goNew() {
  window.location.href = "/admin/edit.html?sku=new";
}

function goUpload() {
  window.location.href = "/admin/upload.html";
}

function logout() {
  supa.auth.signOut();
  window.location.href = "/admin/login.html";
}

loadProducts();
