// admin/js/index.js

document.addEventListener("DOMContentLoaded", () => {
  const supabase = window.supabaseClient;

  const tbody = document.getElementById("productTableBody");
  const newBtn = document.getElementById("btnNew");
  const csvBtn = document.getElementById("btnCsv");
  const frontBtn = document.getElementById("btnFront");
  const logoutBtn = document.getElementById("btnLogout");
  const statusEl = document.getElementById("adminStatus");

  // 事件：新增商品
  if (newBtn) {
    newBtn.addEventListener("click", () => {
      location.href = "add.html";
    });
  }

  // 事件：CSV 匯入
  if (csvBtn) {
    csvBtn.addEventListener("click", () => {
      location.href = "upload.html";
    });
  }

  // 事件：前台查看（新開分頁）
  if (frontBtn) {
    frontBtn.addEventListener("click", () => {
      window.open("../index.html", "_blank");
    });
  }

  // 事件：登出（目前只有回登入頁）
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      location.href = "login.html";
    });
  }

  // 載入商品列表
  async function loadProducts() {
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="9">載入中...</td></tr>`;

    const { data, error } = await supabase
      .from("products")
      .select(
        "id, name, category, spec, unit, last_price, suggest_price, last_price_updated_at, is_active, description"
      )
      .order("name", { ascending: true });

    if (error) {
      console.error("載入商品失敗：", error);
      tbody.innerHTML = `<tr><td colspan="9">讀取資料失敗：${error.message}</td></tr>`;
      if (statusEl) statusEl.textContent = "讀取資料發生錯誤，請稍後再試。";
      return;
    }

    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9">目前尚無商品資料</td></tr>`;
      if (statusEl) statusEl.textContent = "";
      return;
    }

    if (statusEl) statusEl.textContent = "";

    tbody.innerHTML = "";
    for (const p of data) {
      const tr = document.createElement("tr");

      const updatedText = p.last_price_updated_at
        ? new Date(p.last_price_updated_at).toLocaleString("zh-TW")
        : "—";

      tr.innerHTML = `
        <td>${escapeHtml(p.name || "")}</td>
        <td>${escapeHtml(p.category || "")}</td>
        <td>${escapeHtml(p.spec || "")}${
        p.description ? "<br><small>" + escapeHtml(p.description) + "</small>" : ""
      }</td>
        <td>${escapeHtml(p.unit || "")}</td>
        <td>
          <div class="price-row">
            <span class="price-label">進價：</span>
            <span class="price-value">${
              p.last_price != null ? "NT$ " + p.last_price : "—"
            }</span>
          </div>
          <div class="price-row">
            <span class="price-label">建議：</span>
            <span class="price-value">${
              p.suggest_price != null ? "NT$ " + p.suggest_price : "—"
            }</span>
          </div>
        </td>
        <td>${updatedText}</td>
        <td>
          <span class="status-pill ${
            p.is_active ? "status-on" : "status-off"
          }">${p.is_active ? "啟用" : "停用"}</span>
        </td>
        <td>
          <button class="btn-secondary btn-edit" data-id="${
            p.id
          }">編輯</button>
        </td>
      `;

      tbody.appendChild(tr);
    }

    // 綁定編輯按鈕
    tbody.querySelectorAll(".btn-edit").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        if (id) location.href = `edit.html?id=${encodeURIComponent(id)}`;
      });
    });
  }

  // HTML escape 防呆
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  loadProducts();
});
