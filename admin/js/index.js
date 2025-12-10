// /admin/js/index.js
const supabase = window.supabaseClient;

const tbody = document.getElementById("productTbody");
const emptyEl = document.getElementById("tableEmpty");

async function loadProducts() {
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, category, spec, unit, last_price, last_price_updated_at, is_active"
    )
    .order("id", { ascending: true });

  if (error) {
    console.error("載入商品失敗", error);
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="error-text">
          載入商品失敗：${error.message}
        </td>
      </tr>`;
    return;
  }

  if (!data || !data.length) {
    tbody.innerHTML = "";
    emptyEl.style.display = "block";
    return;
  }

  emptyEl.style.display = "none";
  renderRows(data);
}

function renderRows(list) {
  tbody.innerHTML = "";

  list.forEach((p) => {
    const tr = document.createElement("tr");

    const price =
      p.last_price != null && p.last_price !== ""
        ? `NT$ ${p.last_price}`
        : "—";

    const updatedAt = p.last_price_updated_at
      ? new Date(p.last_price_updated_at).toLocaleString("zh-TW")
      : "—";

    const statusText = p.is_active ? "啟用" : "停用";
    const statusClass = p.is_active ? "badge-success" : "badge-muted";

    tr.innerHTML = `
      <td>${escapeHtml(p.name || "")}</td>
      <td>${escapeHtml(p.category || "")}</td>
      <td>${escapeHtml(p.spec || "")}</td>
      <td>${escapeHtml(p.unit || "")}</td>
      <td>${price}</td>
      <td>${updatedAt}</td>
      <td><span class="badge ${statusClass}">${statusText}</span></td>
      <td>
        <button class="btn-small" data-id="${p.id}" data-action="edit">編輯</button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  // 綁定編輯按鈕事件
  tbody.querySelectorAll("button[data-action='edit']").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      if (!id) return;
      location.href = `edit.html?id=${encodeURIComponent(id)}`;
    });
  });
}

// 簡單的 XSS 防護
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// 初始化
loadProducts();
