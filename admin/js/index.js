// 取得資料
async function loadProducts() {
  const table = document.getElementById("productTableBody");
  table.innerHTML = "<tr><td colspan='10'>讀取中...</td></tr>";

  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error(error);
    table.innerHTML = "<tr><td colspan='10'>讀取資料失敗</td></tr>";
    return;
  }

  // 空資料
  if (!data || data.length === 0) {
    table.innerHTML = "<tr><td colspan='10'>尚無資料</td></tr>";
    return;
  }

  // 渲染表格
  table.innerHTML = data
    .map((p) => {
      return `
      <tr>
        <td>${p.name || ""}</td>
        <td>${p.category || ""}</td>
        <td>${p.spec || ""}<br><span style="color:#666;">${p.description ?? ""}</span></td>
        <td>${p.unit || ""}</td>
        <td>${p.last_price ?? "-"}</td>
        <td>${p.suggested_price ?? "-"}</td>
        <td>${formatTime(p.last_price_updated_at)}</td>
        <td>${p.is_active ? "啟用" : "停用"}</td>
        <td>
          <button class="table-btn edit" onclick="editProduct(${p.id})">編輯</button>
        </td>
      </tr>
      `;
    })
    .join("");
}

function editProduct(id) {
  location.href = `edit.html?id=${id}`;
}

function formatTime(t) {
  if (!t) return "-";
  return new Date(t).toLocaleString("zh-TW");
}

loadProducts();
