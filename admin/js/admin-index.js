// admin/js/admin-index.js
// 後台商品列表

console.log("admin-index.js 載入");

const supabase = window.supabaseClient;
const tbody = document.getElementById("productTbody");

function formatPrice(value) {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return n.toLocaleString("zh-TW", { minimumFractionDigits: 0 });
}

function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderRows(list) {
  tbody.innerHTML = "";
  if (!list || list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9">目前尚無商品</td></tr>`;
    return;
  }

  for (const p of list) {
    const tr = document.createElement("tr");

    const desc = p.description || p.spec || "";

    tr.innerHTML = `
      <td>${p.name || ""}</td>
      <td>${p.category || ""}</td>
      <td>${p.unit || ""}</td>
      <td class="td-desc">${desc}</td>
      <td class="td-num">${formatPrice(p.last_price)}</td>
      <td class="td-num">${formatPrice(p.suggested_price)}</td>
      <td>${formatDateTime(p.last_price_updated_at)}</td>
      <td>${p.is_active ? "啟用" : "停用"}</td>
      <td>
        <button class="btn-link" data-id="${p.id}">編輯</button>
      </td>
    `;

    tbody.appendChild(tr);
  }

  // 綁定編輯按鈕
  tbody.querySelectorAll(".btn-link").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      location.href = `edit.html?id=${encodeURIComponent(id)}`;
    });
  });
}

async function loadList() {
  const { data, error } = await supabase
    .from("products")
    .select(
      `
        id,
        name,
        category,
        unit,
        spec,
        description,
        last_price,
        suggested_price,
        last_price_updated_at,
        is_active
      `
    )
    .order("name", { ascending: true });

  if (error) {
    console.error("讀取商品失敗：", error);
    tbody.innerHTML = `<tr><td colspan="9">讀取資料錯誤：${error.message}</td></tr>`;
    return;
  }

  renderRows(data || []);
}

document.addEventListener("DOMContentLoaded", loadList);
