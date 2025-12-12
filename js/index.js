// js/index.js
console.log("前台商品查詢初始化（HTML 對齊最終版）");

const supabaseClient = window.supabaseClient;

/* ========= DOM（完全對齊 index.html） ========= */
const productListEl = document.getElementById("productList");
const searchInput = document.getElementById("searchInput");
const clearBtn = document.getElementById("clearBtn");
const categorySelect = document.getElementById("categorySelect");
const sortSelect = document.getElementById("sortSelect");
const pageSizeSelect = document.getElementById("pageSizeSelect");

const statusMessage = document.getElementById("statusMessage");
const prevBtn = document.getElementById("prevPageBtn");
const nextBtn = document.getElementById("nextPageBtn");
const pageInfo = document.getElementById("pageInfo");

const emptyState = document.getElementById("emptyState");
const emptyResetBtn = document.getElementById("emptyResetBtn");
const allBtn = document.getElementById("allBtn");

/* ========= State ========= */
let allProducts = [];
let filtered = [];
let currentPage = 1;
let pageSize = 10;

/* ========= Utils ========= */
const fmtPrice = (v) =>
  v == null || v === "" ? "—" : `NT$ ${Number(v).toLocaleString()}`;

const fmtDate = (v) => {
  if (!v) return "";
  const d = new Date(v);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(
    d.getHours()
  ).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/* ========= Card ========= */
function createCard(p) {
  const card = document.createElement("article");
  card.className = "card";

  /* 圖片區 */
  const imgWrap = document.createElement("div");
  imgWrap.className = "card-img";

  if (p.image_url) {
    const img = document.createElement("img");
    img.src = p.image_url;
    img.alt = p.name || "商品圖片";
    img.loading = "lazy";
    imgWrap.appendChild(img);
  } else {
    imgWrap.innerHTML = `<div class="product-image-placeholder">尚未上傳圖片</div>`;
  }

  /* 內容區 */
  const body = document.createElement("div");
  body.className = "card-body";

  const title = document.createElement("h3");
  title.className = "card-title";
  title.textContent = p.name || "";

  const sub = document.createElement("div");
  sub.className = "card-sub";
  sub.innerHTML = `
    <span>${p.spec || ""}</span>
    ${p.category ? `<span class="tag">${p.category}</span>` : ""}
  `;

  const price = document.createElement("div");
  price.className = "price";
  price.innerHTML = `
    <div class="price-line">
      <span class="price-label">進　價：</span>
      <span class="price-value">${p.last_price ? `NT$ ${p.last_price}` : "—"}</span>
    </div>
    <div class="price-line">
      <span class="price-label">建議價：</span>
      <span class="price-value">${p.suggested_price ? `NT$ ${p.suggested_price}` : "—"}</span>
    </div>
  `;

  body.appendChild(title);
  body.appendChild(sub);
  body.appendChild(price);

  /* 🔽 A️⃣ Description（可展開） */
  if (p.description) {
    const descWrap = document.createElement("div");

    const desc = document.createElement("div");
    desc.className = "desc clamp";
    desc.textContent = p.description;

    const actions = document.createElement("div");
    actions.className = "desc-actions";

    const toggleBtn = document.createElement("button");
    toggleBtn.className = "link-btn";
    toggleBtn.textContent = "查看更多";

    toggleBtn.addEventListener("click", () => {
      const expanded = !desc.classList.contains("clamp");
      desc.classList.toggle("clamp");
      toggleBtn.textContent = expanded ? "查看更多" : "收合";
    });

    actions.appendChild(toggleBtn);
    descWrap.appendChild(desc);
    descWrap.appendChild(actions);
    body.appendChild(descWrap);
  }

  /* footer */
  const footer = document.createElement("div");
  footer.className = "card-footer";
  footer.textContent = p.last_price_updated_at
    ? `價格更新時間：${new Date(p.last_price_updated_at).toLocaleString()}`
    : "";

  card.appendChild(imgWrap);
  card.appendChild(body);
  card.appendChild(footer);

  return card;
}

/* ========= Render ========= */
function render() {
  if (!productListEl) {
    console.error("❌ 找不到 #productList");
    return;
  }

  const kw = searchInput.value.trim().toLowerCase();
  const cat = categorySelect.value;

  filtered = allProducts.filter((p) => {
    if (!p.is_active) return false;
    if (cat && p.category !== cat) return false;
    if (!kw) return true;
    return `${p.name} ${p.spec} ${p.category}`
      .toLowerCase()
      .includes(kw);
  });

  // 排序
switch (sortSelect.value) {
  case "updated_desc":
    filtered.sort(
      (a, b) =>
        new Date(b.last_price_updated_at || 0) -
        new Date(a.last_price_updated_at || 0)
    );
    break;

  case "updated_asc":
    filtered.sort(
      (a, b) =>
        new Date(a.last_price_updated_at || 0) -
        new Date(b.last_price_updated_at || 0)
    );
    break;

  case "name_asc":
    filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    break;

  case "name_desc":
    filtered.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
    break;
}

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  currentPage = Math.min(currentPage, totalPages);

  const start = (currentPage - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  productListEl.innerHTML = "";

  if (!pageItems.length) {
    emptyState.style.display = "block";
    statusMessage.textContent = "找不到符合條件的商品";
  } else {
    emptyState.style.display = "none";
    pageItems.forEach((p) =>
      productListEl.appendChild(createCard(p))
    );
    statusMessage.textContent = `共 ${total} 筆商品`;
  }

  pageInfo.textContent = `第 ${currentPage} / ${totalPages} 頁`;
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;
}

/* ========= Load ========= */
// ====== State ======
let currentPage = 1;
let totalPages = 1;

// 你原本有 pageSize 變數的話就沿用，沒有就用下行
let pageSize = Number(pageSizeSelect.value) || 10;

// ====== Load Categories (只做分類下拉) ======
async function loadCategories() {
  const { data: catData, error: catErr } = await supabaseClient
    .from("categories")
    .select("name")
    .order("name", { ascending: true });

  if (catErr) {
    console.error("❌ 載入分類失敗", catErr);
  }

  // 分類下拉
  categorySelect.innerHTML = `<option value="">全部分類</option>`;
  (catData || []).forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.name;
    opt.textContent = c.name;
    categorySelect.appendChild(opt);
  });
}

// ====== Load Products (伺服器分頁 + 排序 + 搜尋 + 分類) ======
async function loadProducts() {
  if (!supabaseClient) return;

  statusMessage.textContent = "載入中…";
  productList.innerHTML = "";
  emptyState.style.display = "none";

  pageSize = Number(pageSizeSelect.value) || 10;
  const from = (currentPage - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseClient
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
  const cat = (categorySelect.value || "").trim();
  if (cat) query = query.eq("category", cat);

  // 搜尋（name/spec/category）
  const kw = (searchInput.value || "").trim();
  if (kw) {
    // 注意：or() 這邊是 Supabase 查詢語法
    query = query.or(
      `name.ilike.%${kw}%,spec.ilike.%${kw}%,category.ilike.%${kw}%`
    );
  }

  // 排序
  const sortVal = sortSelect.value;
  if (sortVal === "updated_asc") {
    query = query.order("last_price_updated_at", { ascending: true, nullsFirst: false });
  } else if (sortVal === "name_asc") {
    query = query.order("name", { ascending: true });
  } else if (sortVal === "name_desc") {
    query = query.order("name", { ascending: false });
  } else {
    // updated_desc（預設）
    query = query.order("last_price_updated_at", { ascending: false, nullsFirst: false });
  }

  // 分頁
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    console.error("❌ 載入商品失敗", error);
    statusMessage.textContent = "資料讀取失敗，請稍後再試";
    return;
  }

  const totalCount = count || 0;
  totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // 如果 currentPage 超出（例如你選了分類後資料變少），自動拉回最後一頁
  if (currentPage > totalPages) {
    currentPage = totalPages;
    return loadProducts();
  }

  // 顯示頁碼資訊
  pageInfo.textContent = `第 ${currentPage} / ${totalPages} 頁`;

  // 沒資料
  if (!data || data.length === 0) {
    statusMessage.textContent = "找不到符合條件的商品";
    emptyState.style.display = "block";
    return;
  }

  // 有資料就清掉載入中文字
  statusMessage.textContent = `共 ${totalCount} 筆商品`;

  // render 卡片（沿用你原本 createProductCard）
  data.forEach((p) => productList.appendChild(createProductCard(p)));
}

// ====== Events：全部改成打 loadProducts() ======
searchInput.oninput = () => {
  currentPage = 1;
  loadProducts();
};

clearBtn.onclick = () => {
  searchInput.value = "";
  categorySelect.value = "";
  currentPage = 1;
  loadProducts();
};

categorySelect.onchange = () => {
  currentPage = 1;
  loadProducts();
};

sortSelect.onchange = () => {
  currentPage = 1;
  loadProducts();
};

pageSizeSelect.onchange = () => {
  currentPage = 1;
  loadProducts();
};

prevBtn.onclick = () => {
  if (currentPage > 1) {
    currentPage--;
    loadProducts();
  }
};

nextBtn.onclick = () => {
  if (currentPage < totalPages) {
    currentPage++;
    loadProducts();
  }
};

allBtn.onclick = () => {
  categorySelect.value = "";
  searchInput.value = "";
  currentPage = 1;
  loadProducts();
};

emptyResetBtn.onclick = () => {
  categorySelect.value = "";
  searchInput.value = "";
  currentPage = 1;
  loadProducts();
};

// ====== Init ======
document.addEventListener("DOMContentLoaded", async () => {
  await loadCategories(); // 先把分類下拉載入
  await loadProducts();   // 再載入第一頁商品
});
