// js/index.js

document.addEventListener("DOMContentLoaded", () => {
  const supabase = window.supabaseClient;

  const listEl = document.getElementById("productList");
  const searchInput = document.getElementById("searchInput");
  const clearBtn = document.getElementById("clearBtn");
  const statusEl = document.getElementById("statusMessage");
  const emptyEl = document.getElementById("emptyState");

  let allProducts = [];

  async function loadProducts() {
    if (!listEl) return;
    listEl.innerHTML = "<p>載入中...</p>";

    const { data, error } = await supabase
      .from("products")
      .select(
        "id, name, category, spec, unit, last_price, suggest_price, image_url, last_price_updated_at, description, is_active"
      )
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("前台讀取失敗：", error);
      if (listEl) listEl.innerHTML = "";
      if (statusEl)
        statusEl.textContent = "讀取資料發生錯誤，請稍後再試。";
      return;
    }

    allProducts = data || [];
    if (statusEl) statusEl.textContent = "";
    renderList();
  }

  function renderList() {
    if (!listEl) return;

    const keyword = (searchInput?.value || "").trim().toLowerCase();

    let filtered = allProducts;
    if (keyword) {
      filtered = allProducts.filter((p) => {
        const text =
          (p.name || "") +
          " " +
          (p.category || "") +
          " " +
          (p.spec || "") +
          " " +
          (p.description || "");
        return text.toLowerCase().includes(keyword);
      });
    }

    listEl.innerHTML = "";

    if (!filtered.length) {
      if (emptyEl) emptyEl.style.display = "";
      return;
    } else {
      if (emptyEl) emptyEl.style.display = "none";
    }

    for (const p of filtered) {
      const card = document.createElement("article");
      card.className = "product-card";

      const updatedText = p.last_price_updated_at
        ? new Date(p.last_price_updated_at).toLocaleString("zh-TW")
        : "—";

      card.innerHTML = `
        <div class="product-image-wrapper">
          ${
            p.image_url
              ? `<img src="${p.image_url}" alt="${escapeHtml(p.name || "")}">`
              : `<div class="product-image-placeholder">尚未上傳圖片</div>`
          }
        </div>
        <div class="product-content">
          <h3 class="product-name">${escapeHtml(p.name || "")}</h3>
          <p class="product-spec">${escapeHtml(p.spec || "")}</p>
          <div class="product-meta-row">
            ${
              p.category
                ? `<span class="product-meta-tag">類別：${escapeHtml(
                    p.category
                  )}</span>`
                : ""
            }
            ${
              p.unit
                ? `<span class="product-meta-tag">單位：${escapeHtml(
                    p.unit
                  )}</span>`
                : ""
            }
          </div>

          ${
            p.description
              ? `<p class="product-desc">${escapeHtml(p.description)}</p>`
              : ""
          }

          <div class="product-price-block">
            <div class="price-row">
              <span class="price-label">進　　價：</span>
              <span class="price-value">${
                p.last_price != null ? "NT$ " + p.last_price : "—"
              }</span>
            </div>
            <div class="price-row">
              <span class="price-label">建議售價：</span>
              <span class="price-value">${
                p.suggest_price != null ? "NT$ " + p.suggest_price : "—"
              }</span>
            </div>
          </div>

          <p class="product-updated-at">價格更新時間：${updatedText}</p>
        </div>
      `;

      listEl.appendChild(card);
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      renderList();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      renderList();
    });
  }

  loadProducts();
});
