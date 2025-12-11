// /admin/js/index.js  後台「商品列表」Final 版

console.log("後台商品列表初始化");

const tableBody = document.querySelector("#productTableBody");
const statusText = document.querySelector("#adminStatusText");
const logoutBtn = document.getElementById("logoutBtn");

// 載入列表
async function loadAdminProducts() {
  if (!window.supabaseClient) {
    console.error("supabaseClient 未定義，請檢查 admin/js/supabase.js 是否正確載入。");
    if (statusText) statusText.textContent = "系統初始化失敗，請稍後再試。";
    return;
  }

  if (statusText) statusText.textContent = "載入中...";

  const { data, error } = await supabaseClient
    .from("products")
    .select(
      `
      id,
      name,
      category,
      spec,
      unit,
      description,
      image_url,
      last_price,
      suggested_pri,
      is_active,
      last_price_upd
    `
    )
    .order("id", { ascending: true });

  if (error) {
    console.error("後台讀取商品錯誤：", error);
    if (statusText) statusText.textContent = "讀取資料發生錯誤，請稍後再試。";
    return;
  }

  renderAdminTable(data || []);
  if (statusText) statusText.textContent = "";
}

// 渲染表格
function renderAdminTable(list) {
  if (!tableBody) return;
  tableBody.innerHTML = "";

  if (list.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 9;
    td.textContent = "目前尚無商品資料。";
    tr.appendChild(td);
    tableBody.appendChild(tr);
    return;
  }

  list.forEach((p) => {
    const tr = document.createElement("tr");

    // 名稱
    const nameTd = document.createElement("td");
    nameTd.textContent = p.name || "";
    tr.appendChild(nameTd);

    // 類別
    const catTd = document.createElement("td");
    catTd.textContent = p.category || "";
    tr.appendChild(catTd);

    // 規格／描述
    const specTd = document.createElement("td");
    let specText = p.spec || "";
    if (p.description) specText += specText ? `｜${p.description}` : p.description;
    specTd.textContent = specText;
    tr.appendChild(specTd);

    // 單位
    const unitTd = document.createElement("td");
    unitTd.textContent = p.unit || "";
    tr.appendChild(unitTd);

    // 進價
    const buyTd = document.createElement("td");
    buyTd.textContent =
      p.last_price != null ? `NT$ ${Number(p.last_price).toFixed(0)}` : "—";
    tr.appendChild(buyTd);

    // 建議售價
    const sugTd = document.createElement("td");
    sugTd.textContent =
      p.suggested_pri != null
        ? `NT$ ${Number(p.suggested_pri).toFixed(0)}`
        : "—";
    tr.appendChild(sugTd);

    // 價格更新時間
    const timeTd = document.createElement("td");
    if (p.last_price_upd) {
      const dt = new Date(p.last_price_upd);
      timeTd.textContent = dt.toLocaleString("zh-TW");
    } else {
      timeTd.textContent = "—";
    }
    tr.appendChild(timeTd);

    // 狀態
    const statusTd = document.createElement("td");
    const enabled = p.is_active === true || p.is_active === "true";
    statusTd.textContent = enabled ? "啟用" : "停用";
    statusTd.className = enabled ? "tag-success" : "tag-muted";
    tr.appendChild(statusTd);

    // 操作
    const actionTd = document.createElement("td");
    const editBtn = document.createElement("button");
    editBtn.className = "btn-table";
    editBtn.textContent = "編輯";
    editBtn.addEventListener("click", () => {
      location.href = `edit.html?id=${encodeURIComponent(p.id)}`;
    });
    actionTd.appendChild(editBtn);
    tr.appendChild(actionTd);

    tableBody.appendChild(tr);
  });
}

// 登出（單純回 login 頁即可）
function setupLogout() {
  if (!logoutBtn) return;
  logoutBtn.addEventListener("click", () => {
    // 這裡如果未使用 Supabase Auth，就直接回登入頁
    location.href = "login.html";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupLogout();
  loadAdminProducts();
});
