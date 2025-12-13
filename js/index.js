// /js/index.js
// 前台：分類（categories）+ 排序 + 分頁（伺服器分頁）+ description 展開/收合
// ✅ 變數 / DOM id 完全對應你目前 index.html

(() => {
  "use strict";

  console.log("前台商品查詢初始化（穩定版）");

  // ===== Supabase =====
  const supabaseClient = window.supabaseClient;
  if (!supabaseClient) {
    console.error("❌ supabaseClient 不存在，請確認 /js/supabase.js 是否正確載入。");
    return;
  }

  // ===== DOM =====
  const productList = document.getElementById("productList");
  const searchInput = document.getElementById("searchInput");
  const clearBtn = document.getElementById("clearBtn");
  const statusMessage = document.getElementById("statusMessage");

  const categorySelect = document.getElementById("categorySelect");
  const sortSelect = document.getElementById("sortSelect");
  const pageSizeSelect = document.getElementById("pageSizeSelect");

  const prevBtn = document.getElementById("prevPageBtn");
  const nextBtn = document.getElementById("nextPageBtn");
  const pageInfo = document.getElementById("pageInfo");

  const allBtn = document.getElementById("allBtn");
  const emptyState = document.getElementById("emptyState");
  const emptyResetBtn = document.getElementById("emptyResetBtn");

  if (!productList) {
    console.error("❌ 找不到 #productList，請確認 index.html 有 <section id='productList'>");
    return;
  }

  // ===== State =====
  let currentPage = 1;
  let totalPages = 1;
  let totalCount = 0;

  // ===== Utils =====
  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

 function formatPrice(value) {
  if (value === null || value === undefined || value === "") return "—";

  const num = Number(value);
  if (Number.isNaN(num)) return "—";

  // 千位符號（台灣/國際通用）
  return num.toLocaleString("zh-TW");
}

  function formatDateTime(value) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${y}/${m}/${day} ${hh}:${mm}`;
  }

  // ===== Card =====
  function createProductCard(p) {
    const card = document.createElement("article");
    card.className = "card";

    // 圖片
    const imgWrap = document.createElement("div");
    imgWrap.className = "card-img";

    if (p.image_url) {
      const img = document.createElement("img");
      img.src = p.image_url;
      img.alt = p.name || "商品圖片";
      img.loading = "lazy";
      imgWrap.appendChild(img);
    } else {
      const ph = document.createElement("div");
      ph.style.color = "#6b7280";
      ph.style.fontWeight = "800";
      ph.textContent = "尚未上傳圖片";
      imgWrap.appendChild(ph);
    }

    // 內容
    const body = document.createElement("div");
    body.className = "card-body";

    const title = document.createElement("h3");
    title.className = "card-title";
    title.textContent = p.name || "";

const meta = document.createElement("div");
meta.className = "card-meta";

if (p.category) {
  const item = document.createElement("div");
  item.className = "meta-item";

  const tag = document.createElement("span");
  tag.className = "tag";
  tag.textContent = p.category;

  item.appendChild(tag);
  meta.appendChild(item);
}

if (p.unit) {
  const item = document.createElement("div");
  item.className = "meta-item";

  const icon = document.createElement("span");
  icon.className = "meta-icon";
  icon.textContent = "📦";

  const label = document.createElement("span");
  label.className = "meta-label";
  label.textContent = "單位：";

  const val = document.createElement("span");
  val.textContent = p.unit;

  item.appendChild(icon);
  item.appendChild(label);
  item.appendChild(val);
  meta.appendChild(item);
}

if (p.spec) {
  const item = document.createElement("div");
  item.className = "meta-item";

  const icon = document.createElement("span");
  icon.className = "meta-icon";
  icon.textContent = "📏";

  const label = document.createElement("span");
  label.className = "meta-label";
  label.textContent = "規格：";

  const val = document.createElement("span");
  val.textContent = p.spec;

  item.appendChild(icon);
  item.appendChild(label);
  item.appendChild(val);
  meta.appendChild(item);
}

   // 價格
const price = document.createElement("div");
price.className = "price";

price.innerHTML =
  '<div class="price-line">' +
    '<span class="price-label">進價：</span>' +
    '<span class="price-amount">' +
      '<span class="price-currency">NT$</span>' +
      '<span class="price-value">' + escapeHtml(formatPrice(p.last_price)) + '</span>' +
    '</span>' +
  '</div>' +
  '<div class="price-line">' +
    '<span class="price-label">建議售價：</span>' +
    '<span class="price-amount">' +
      '<span class="price-currency">NT$</span>' +
      '<span class="price-value">' + escapeHtml(formatPrice(p.suggested_price)) + '</span>' +
    '</span>' +
  '</div>';

    // description + 查看更多/收合
    const descText = (p.description || "").trim();
    let descBlock = null;

    if (descText) {
      const desc = document.createElement("div");
      desc.className = "desc clamp";
      desc.textContent = descText;

      const actions = document.createElement("div");
      actions.className = "desc-actions";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "link-btn";
      btn.textContent = "查看更多";

      btn.addEventListener("click", () => {
        const isClamped = desc.classList.contains("clamp");
        if (isClamped) {
          desc.classList.remove("clamp");
          btn.textContent = "收合";
        } else {
          desc.classList.add("clamp");
          btn.textContent = "查看更多";
        }
      });

      actions.appendChild(btn);

      descBlock = document.createElement("div");
      descBlock.appendChild(desc);
      descBlock.appendChild(actions);
    }

    // footer
    const footer = document.createElement("div");
    footer.className = "card-footer";

    const t = document.createElement("div");
    t.textContent = p.last_price_updated_at
      ? `價格更新時間：${formatDateTime(p.last_price_updated_at)}`
      : "";

    footer.appendChild(t);

    body.appendChild(title);
    if (meta.children.length > 0) body.appendChild(meta);
    body.appendChild(price);
    if (descBlock) body.appendChild(descBlock);
    body.appendChild(footer);

    card.appendChild(imgWrap);
    card.appendChild(body);

    return card;
  }

  // ===== UI Helpers =====
  function setEmpty(isEmpty) {
    if (emptyState) emptyState.style.display = isEmpty ? "block" : "none";
  }

  function updatePager() {
    if (pageInfo) pageInfo.textContent = `第 ${currentPage} / ${totalPages} 頁`;
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
  }

  // ===== Load Categories =====
  async function loadCategories() {
    const { data, error } = await supabaseClient
      .from("categories")
      .select("name")
      .order("name", { ascending: true });

    if (error) {
      console.error("❌ 載入分類失敗", error);
      return;
    }

    if (!categorySelect) return;

    categorySelect.innerHTML = `<option value="">全部分類</option>`;
    (data || []).forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.name;
      opt.textContent = c.name;
      categorySelect.appendChild(opt);
    });
  }

  // ===== Load Products (server paging) =====
  async function loadProducts() {
    const pageSize = Number(pageSizeSelect?.value || 10);
    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;

    if (statusMessage) statusMessage.textContent = "載入中…";
    productList.innerHTML = "";
    setEmpty(false);

    let q = supabaseClient
      .from("products")
      .select(
        `
        id,
        name,
        category,
        spec,
        unit,
        last_price,
        suggested_price,
        description,
        image_url,
        is_active,
        last_price_updated_at
      `,
        { count: "exact" }
      )
      .eq("is_active", true);

    // 分類
    const cat = (categorySelect?.value || "").trim();
    if (cat) q = q.eq("category", cat);

    // 搜尋
    const kw = (searchInput?.value || "").trim();
    if (kw) {
      // name/spec/category 模糊
      q = q.or(`name.ilike.%${kw}%,spec.ilike.%${kw}%,category.ilike.%${kw}%`);
    }

    // 排序
    const sort = sortSelect?.value || "updated_desc";
    if (sort === "updated_asc") {
      q = q.order("last_price_updated_at", { ascending: true, nullsFirst: false });
    } else if (sort === "name_asc") {
      q = q.order("name", { ascending: true });
    } else if (sort === "name_desc") {
      q = q.order("name", { ascending: false });
    } else {
      q = q.order("last_price_updated_at", { ascending: false, nullsFirst: false });
    }

    // 分頁
    q = q.range(from, to);

    const { data, count, error } = await q;

    if (error) {
      console.error("❌ 載入商品失敗", error);
      if (statusMessage) statusMessage.textContent = "資料讀取失敗，請稍後再試";
      return;
    }

    totalCount = count || 0;
    totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    // 如果分頁超出（例如篩選後變少），拉回最後一頁再載一次
    if (currentPage > totalPages) {
      currentPage = totalPages;
      return loadProducts();
    }

    updatePager();

    if (!data || data.length === 0) {
      if (statusMessage) statusMessage.textContent = "找不到符合條件的商品";
      setEmpty(true);
      return;
    }

    if (statusMessage) statusMessage.textContent = `共 ${totalCount} 筆商品`;

    data.forEach((p) => productList.appendChild(createProductCard(p)));
  }

  // ===== Events =====
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      currentPage = 1;
      loadProducts();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      if (categorySelect) categorySelect.value = "";
      currentPage = 1;
      loadProducts();
    });
  }

  if (categorySelect) {
    categorySelect.addEventListener("change", () => {
      currentPage = 1;
      loadProducts();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      currentPage = 1;
      loadProducts();
    });
  }

  if (pageSizeSelect) {
    pageSizeSelect.addEventListener("change", () => {
      currentPage = 1;
      loadProducts();
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        loadProducts();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (currentPage < totalPages) {
        currentPage++;
        loadProducts();
      }
    });
  }

  if (allBtn) {
    allBtn.addEventListener("click", () => {
      if (categorySelect) categorySelect.value = "";
      if (searchInput) searchInput.value = "";
      currentPage = 1;
      loadProducts();
    });
  }

  if (emptyResetBtn) {
    emptyResetBtn.addEventListener("click", () => {
      if (categorySelect) categorySelect.value = "";
      if (searchInput) searchInput.value = "";
      currentPage = 1;
      loadProducts();
    });
  }

  // ===== Init =====
  document.addEventListener("DOMContentLoaded", async () => {
    await loadCategories();
    await loadProducts();
  });
})();
