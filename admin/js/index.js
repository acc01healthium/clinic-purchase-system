console.log("後台商品列表 JS 初始化");

// 1️⃣ 取得 Supabase client
const supabaseClient = window.supabaseClient;

// 2️⃣ DOM
const tbody = document.getElementById("productTableBody");
const loading = document.getElementById("loadingMessage");
const errorBox = document.getElementById("errorMessage");

// 3️⃣ 主要載入函式
async function loadProducts() {
  loading.style.display = "block";
  errorBox.style.display = "none";

  const { data, error } = await supabaseClient
    .from("products")
    .select(`
      id, name, category, spec, unit,
      last_price, suggest_price,
      is_active,
      last_price_updated_at
    `)
    .order("id", { ascending: true });

  loading.style.display = "none";

  if (error) {
    console.error("讀取商品錯誤：", error);
    errorBox.textContent = "讀取資料時發生錯誤，請稍後再試。";
    errorBox.style.display = "block";
    return;
  }

  renderTable(data);
}

// 4️⃣ 建立表格 HTML
function renderTable(list) {
  tbody.innerHTML = "";

  list.forEach((p) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${p.name}</td>
      <td>${p.category || ""}</td>
      <td>${p.spec || ""}</td>
      <td>${p.unit || ""}</td>
      <td>${p.last_price ?? ""}</td>
      <td>${p.suggest_price ?? ""}</td>
      <td>${formatTime(p.last_price_updated_at)}</td>
      <td>${p.is_active ? "啟用" : "停用"}</td>
      <td>
        <button class="btn-edit" onclick="location.href='edit.html?id=${p.id}'">編輯</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

// 5️⃣ 時間格式
function formatTime(ts) {
  if (!ts) return "";
  const time = new Date(ts);
  return time.toLocaleString("zh-TW", { hour12: true });
}

// 6️⃣ 登出
function logout() {
  localStorage.removeItem("loginUser");
  location.href = "login.html";
}

// ⬆ 執行載入
loadProducts();
