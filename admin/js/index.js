// /admin/js/index.js － 後台商品列表

const supabase = window.supabaseClient;
const tbody = document.getElementById("productTbody");
const addBtn = document.getElementById("addBtn");
const csvBtn = document.getElementById("csvBtn");

addBtn.addEventListener("click", () => {
  location.href = "add.html";
});

csvBtn.addEventListener("click", () => {
  location.href = "upload.html";
});

async function loadProducts() {
  tbody.innerHTML = `<tr><td colspan="8">載入中…</td></tr>`;

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error("載入商品失敗", error);
    tbody.innerHTML = `<tr><td colspan="8">載入商品失敗：${error.message}</td></tr>`;
    return;
  }

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="8">目前沒有商品。</td></tr>`;
    return;
  }

  tbody.innerHTML = "";

  data.forEach((p) => {
    const tr = document.createElement("tr");

    const statusText = p.is_active ? "啟用" : "停用";
    const statusClass = p.is_active ? "tag-success" : "tag-muted";

    let updatedText = "";
    if (p.last_price_updated_at) {
      const dt = new Date(p.last_price_updated_at);
      const pad = (n) => (n < 10 ? "0" + n : n);
      const y = dt.getFullYear();
      const m = pad(dt.getMonth() + 1);
      const d = pad(dt.getDate());
      const hh = pad(dt.getHours());
      const mm = pad(dt.getMinutes());
      updatedText = `${y}/${m}/${d} ${hh}:${mm}`;
    }

    tr.innerHTML = `
      <td>${p.name || ""}</td>
      <td>${p.category || ""}</td>
      <td>${p.spec || ""}</td>
      <td>${p.unit || ""}</td>
      <td>${typeof p.last_price === "number" ? "NT$ " + p.last_price : ""}</td>
      <td>${updatedText}</td>
      <td><span class="${statusClass}">${statusText}</span></td>
      <td>
        <button class="btn-small" data-id="${p.id}">編輯</button>
      </td>
    `;

    tr.querySelector("button").addEventListener("click", () => {
      location.href = `edit.html?id=${p.id}`;
    });

    tbody.appendChild(tr);
  });
}

loadProducts();
