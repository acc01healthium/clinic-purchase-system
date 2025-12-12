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
function createProductCard(p) {
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
async function loadAll() {
  statusMessage.textContent = "載入中…";

  const [{ data: catData, error: catErr }, { data: prodData, error: prodErr }] =
    await Promise.all([
      supabaseClient.from("categories").select("name").order("name"),
      supabaseClient.from("products").select("*").eq("is_active", true),
    ]);

  if (catErr) {
    console.error("❌ 載入分類失敗", catErr);
  }

  if (prodErr) {
    console.error("❌ 載入商品失敗", prodErr);
  }

  allProducts = prodData || [];

  // 分類下拉
  categorySelect.innerHTML = `<option value="">全部分類</option>`;
  (catData || []).forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.name;
    opt.textContent = c.name;
    categorySelect.appendChild(opt);
  });

  render();
}

/* ========= Events ========= */
searchInput.oninput = () => {
  currentPage = 1;
  render();
};
clearBtn.onclick = () => {
  searchInput.value = "";
  categorySelect.value = "";
  currentPage = 1;
  render();
};
categorySelect.onchange = () => {
  currentPage = 1;
  render();
};
sortSelect.onchange = render;
pageSizeSelect.onchange = () => {
  pageSize = Number(pageSizeSelect.value);
  currentPage = 1;
  render();
};
prevBtn.onclick = () => {
  currentPage--;
  render();
};
nextBtn.onclick = () => {
  currentPage++;
  render();
};
allBtn.onclick = () => {
  categorySelect.value = "";
  searchInput.value = "";
  currentPage = 1;
  render();
};
emptyResetBtn.onclick = () => {
  categorySelect.value = "";
  searchInput.value = "";
  currentPage = 1;
  render();
};

document.addEventListener("DOMContentLoaded", loadAll);
