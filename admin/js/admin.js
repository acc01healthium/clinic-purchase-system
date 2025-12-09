// admin/js/admin.js

const supabaseUrl = "https://utwhtjtgwryeljgwlwzm.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0d2h0anRnd3J5ZWxqZ3dsd3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNTkxNDQsImV4cCI6MjA4MDczNTE0NH0.SexZh_JV9IUT5cL7o6KO-bh6D50aFkZUrhZVf4_fNbs";

const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// 進入頁面先檢查是否登入
async function ensureLoggedIn() {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    // 沒有登入 → 導回登入頁
    window.location.href = "./login.html";
    return null;
  }

  // 顯示登入者 Email
  const userEmailEl = document.getElementById("userEmail");
  if (userEmailEl) userEmailEl.textContent = data.user.email;

  return data.user;
}

// 登出
async function setupLogout() {
  const btn = document.getElementById("logoutBtn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "./login.html";
  });
}

// 載入商品列表
async function loadProducts() {
  const tbody = document.getElementById("productTableBody");
  if (!tbody) return;

  tbody.innerHTML = `
    <tr><td colspan="6" class="center">載入中…</td></tr>
  `;

  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, category, unit, last_price, last_price_updated_at, is_active"
    )
    .order("name", { ascending: true });

  if (error) {
    console.error("載入商品失敗：", error);
    tbody.innerHTML = `
      <tr><td colspan="6" class="center" style="color:red">
        載入商品失敗：${error.message}
      </td></tr>
    `;
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="6" class="center">目前沒有商品資料</td></tr>
    `;
    return;
  }

  const rows = data
    .map((p) => {
      const price = p.last_price ?? "";
      const updatedAt = p.last_price_updated_at
        ? new Date(p.last_price_updated_at).toLocaleString("zh-TW")
        : "—";

      const statusTag = p.is_active
        ? `<span class="tag tag-active">啟用</span>`
        : `<span class="tag tag-inactive">停用</span>`;

      return `
        <tr>
          <td>${p.name ?? ""}</td>
          <td>${p.category ?? ""}</td>
          <td>${p.unit ?? ""}</td>
          <td class="price">${price ? `NT$ ${price}` : "—"}</td>
          <td>
            <div class="muted">${updatedAt}</div>
          </td>
          <td class="center">
            ${statusTag}
          </td>
        </tr>
      `;
    })
    .join("");

  tbody.innerHTML = rows;
}

// 初始化
window.addEventListener("DOMContentLoaded", async () => {
  const user = await ensureLoggedIn();
  if (!user) return; // 已被導回 login

  await setupLogout();
  await loadProducts();
});

