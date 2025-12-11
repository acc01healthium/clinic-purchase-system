/* ================================
   後台列表頁 admin-index.js（Final）
   ================================ */

// 初始化 Supabase（使用 admin 專用 supabase.js）
const sb = supabaseClient;

// DOM
const tableBody = document.querySelector("#productTableBody");

// 初始化
document.addEventListener("DOMContentLoaded", loadProducts);

// 讀取商品列表
async function loadProducts() {
  try {
    const { data, error } = await sb
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    renderTable(data);
  } catch (err) {
    console.error("讀取商品發生錯誤：", err);
    tableBody.innerHTML = `<tr><td colspan="10">資料載入失敗，請稍後再試。</td></tr>`;
  }
}

// 渲染表格
function renderTable(list) {
  if (!list || list.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="10">尚無資料</td></tr>`;
    return;
  }

  let html = "";

  list.forEach((item) => {
    const statusBadge = item.is_active
      ? `<span class="badge badge-success">啟用</span>`
      : `<span class="badge badge-danger">停用</span>`;

    const priceTime = item.last_price_time
      ? new Date(item.last_price_time).toLocaleString("zh-TW")
      : "—";

    html += `
      <tr>
        <td>${item.name}</td>
        <td>${item.category || "—"}</td>
        <td>${item.spec || "—"}</td>
        <td>${item.unit || "—"}</td>
        <td>NT$ ${item.last_price ?? "—"}</td>
        <td>NT$ ${item.suggest_price ?? "—"}</td>
        <td>${priceTime}</td>
        <td>${statusBadge}</td>
        <td>
          <button class="table-action-btn" onclick="editProduct('${item.id}')">
            編輯
          </button>
        </td>
      </tr>
    `;
  });

  tableBody.innerHTML = html;
}

// 前往編輯頁
function editProduct(id) {
  location.href = `edit.html?id=${id}`;
}
