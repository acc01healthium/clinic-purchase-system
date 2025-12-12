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

  card.innerHTML = `
    <div class="card-img">
      ${
        p.image_url
          ? `<img src="${p.image_url}" alt="${p.name}" loading="lazy">`
          : ""
      }
    </div>

    <div class="card-body">
      <h3 class="card-title">${p.name}</h3>

      <div class="card-sub">
        <span>${p.spec || ""}</span>
        <span class="tag">${p.category || ""}</span>
      </div>

      <div class="price">
        <div class="price-line">
          <span class="price-label">進價</span>
          <span class="price-value">${fmtPrice(p.last_price)}</span>
        </div>
        <div class="price-line">
          <span class="price-label">建議售價</span>
          <span class="price-value">${fmtPrice(p.suggested_price)}</span>
        </div>
      </div>

      ${
        p.description
          ? `
        <div class="desc clamp">${p.description}</div>
        <div class="desc-actions">
          <button class="link-btn">查看更多</button>
        </div>
      `
          : ""
      }
    </div>

    <div class="card-footer">
      ${
        p.last_price_updated_at
          ? `價格更新時間：${fmtDate(p.last_price_updated_at)}`
          : ""
      }
    </div>
  `;

  const btn = card.querySelector(".link-btn");
  const desc = card.querySelector(".desc");

  if (btn && desc) {
    btn.onclick = () => {
      desc.classList.toggle("clamp");
      btn.textContent = desc.classList.contains("clamp")
        ? "查看更多"
        : "收合";
    };
  }

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
