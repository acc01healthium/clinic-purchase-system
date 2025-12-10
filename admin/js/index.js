// /admin/js/index.js
const supabase = window.supabaseClient;

// DOM
const tbody = document.getElementById("productTbody");
const emptyHint = document.getElementById("emptyHint");
const addBtn = document.getElementById("addBtn");
const csvBtn = document.getElementById("csvBtn");

addBtn.addEventListener("click", () => {
  location.href = "add.html";
});

csvBtn.addEventListener("click", () => {
  location.href = "upload.html";
});

document.getElementById("logoutBtn")?.addEventListener("click", () => {
  // 目前沒有登入機制，先做簡單導回登入頁
  location.href = "login.html";
});

async function loadProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error("載入商品失敗", error);
    tbody.innerHTML =
      '<tr><td colspan="8">讀取資料失敗：' + error.message + "</td></tr>";
    emptyHint.style.display = "none";
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = "";
    emptyHint.style.display = "block";
    return;
  }

  emptyHint.style.display = "none";
  tbody.innerHTML = "";

  for (const p of data) {
    const tr = document.createElement("tr");

    const price = p.last_price != null ? `NT$ ${Number(p.last_price)}` : "-";
    const updatedAt = p.last_price_updated_at
      ? formatTime(p.last_price_updated_at)
      : "";

    const statusHtml = p.is_active
      ? '<span class="status-badge status-active">啟用</span>'
      : '<span class="status-badge status-inactive">停用</span>';

    tr.innerHTML = `
      <td>${escapeHtml(p.name || "")}</td>
      <td>${escapeHtml(p.category || "")}</td>
      <td>${escapeHtml(p.spec || "")}</td>
      <td>${escapeHtml(p.unit || "")}</td>
      <td>${price}</td>
      <td>${updatedAt}</td>
      <td>${statusHtml}</td>
      <td>
        <button class="btn-secondary btn-sm" data-id="${p.id}">編輯</button>
      </td>
    `;

    tbody.appendChild(tr);
  }

  tbody.querySelectorAll("button[data-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      location.href = `edit.html?id=${encodeURIComponent(id)}`;
    });
  });
}

function formatTime(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}/${m}/${day} 下午${hh}:${mm}`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

loadProducts();
