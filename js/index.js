// /js/index.js
// 前台商品查詢（穩定完整版）

console.log("前台商品查詢初始化（穩定版）");

const supabaseClient = window.supabaseClient;

/* ========= DOM ========= */
const gridEl = document.getElementById("grid");
const searchInput = document.getElementById("searchInput");
const clearBtn = document.getElementById("clearBtn");
const categorySelect = document.getElementById("categorySelect");
const sortSelect = document.getElementById("sortSelect");
const pageSizeSelect = document.getElementById("pageSizeSelect");
const metaText = document.getElementById("metaText");
const prevBtn = document.getElementById("prevPageBtn");
const nextBtn = document.getElementById("nextPageBtn");
const pageIndicator = document.getElementById("pageIndicator");
const emptyState = document.getElementById("emptyState");
const emptyResetBtn = document.getElementById("emptyResetBtn");
const allBtn = document.getElementById("allBtn");

/* ========= State ========= */
let allProducts = [];
let filteredProducts = [];
let categories = [];

let currentPage = 1;
let pageSize = 10;

/* ========= Utils ========= */
function formatPrice(v) {
  if (v === null || v === undefined || v === "") return "—";
  return `NT$ ${Number(v).toLocaleString()}`;
}

function formatDate(v) {
  if (!v) return "";
  const d = new Date(v);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(
    d.getHours()
  ).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/* ========= Card ========= */
function createCard(p) {
  const card = document.createElement("article");
  card.className = "card";

  /* image */
  const imgWrap = document.createElement("div");
  imgWrap.className = "card-img";

  if (p.image_url) {
    const img = document.createElement("img");
    img.src = p.image_url;
    img.alt = p.name;
    img.loading = "lazy";
    imgWrap.appendChild(img);
  }
  card.appendChild(imgWrap);

  /* body */
  const body = document.createElement("div");
  body.className = "card-body";

  body.innerHTML = `
    <h3 class="card-title">${p.name}</h3>
    <div class="card-sub">
      <span>${p.spec || ""}</span>
      <span class="tag">${p.category || ""}</span>
    </div>

    <div class="price">
      <div class="price-line">
        <span class="price-label">進價</span>
        <span class="price-value">${formatPrice(p.last_price)}</span>
      </div>
      <div class="price-line">
        <span class="price-label">建議售價</span>
        <span class="price-value">${formatPrice(p.suggested_price)}</span>
      </div>
    </div>
  `;

  /* description */
  if (p.description) {
    const desc = document.createElement("div");
    desc.className = "desc clamp";
    desc.textContent = p.description;

    const actions = document.createElement("div");
    actions.className = "desc-actions";

    const btn = document.createElement("button");
    btn.className = "link-btn";
    btn.textContent = "查看更多";

    btn.onclick = () => {
      desc.classList.toggle("clamp");
      btn.textContent = desc.classList.contains("clamp")
        ? "查看更多"
        : "收合";
    };

    actions.appendChild(btn);
    body.appendChild(desc);
    body.appendChild(actions);
  }

  card.appendChild(body);

  /* footer */
  const footer = document.createElement("div");
  footer.className = "card-footer";
  footer.textContent = p.last_price_updated_at
    ? `價格更新時間：${formatDate(p.last_price_updated_at)}`
    : "";

  card.appendChild(footer);

  return card;
}

/* ========= Render ========= */
function render() {
  if (!gridEl) {
    console.error("❌ 找不到 #grid 容器");
    return;
  }

  const kw = searchInput.value.trim().toLowerCase();
  const cat = categorySelect.value;

  filteredProducts = allProducts.filter((p) => {
    if (!p.is_active) return false;
    if (cat && p.category !== cat) return false;
    if (!kw) return true;
    return (
      `${p.name} ${p.spec} ${p.category}`.toLowerCase().includes(kw)
    );
  });

  /* sort */
  switch (sortSelect.value) {
    case "updated_asc":
      filteredProducts.sort(
        (a, b) =>
          new Date(a.last_price_updated_at) -
          new Date(b.last_price_updated_at)
      );
      break;
    case "price_asc":
      filteredProducts.sort((a, b) => (a.last_price || 0) - (b.last_price || 0));
      break;
    case "price_desc":
      filteredProducts.sort((a, b) => (b.last_price || 0) - (a.last_price || 0));
      break;
    case "name_desc":
      filteredProducts.sort((a, b) => b.name.localeCompare(a.name));
      break;
    default:
      filteredProducts.sort(
        (a, b) =>
          new Date(b.last_price_updated_at) -
          new Date(a.last_price_updated_at)
      );
  }

  const total = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  currentPage = Math.min(currentPage, totalPages);

  const start = (currentPage - 1) * pageSize;
  const pageItems = filteredProducts.slice(start, start + pageSize);

  gridEl.innerHTML = "";

  if (!pageItems.length) {
    emptyState.style.display = "block";
    metaText.textContent = "找不到符合條件的商品";
  } else {
    emptyState.style.display = "none";
    pageItems.forEach((p) => gridEl.appendChild(createCard(p)));
    metaText.textContent = `共 ${total} 筆商品`;
  }

  pageIndicator.textContent = `第 ${currentPage} / ${totalPages} 頁`;
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;
}

/* ========= Load ========= */
async function loadAll() {
  metaText.textContent = "載入中…";

  const [{ data: cats }, { data: prods }] = await Promise.all([
    supabaseClient.from("categories").select("category").order("category"),
    supabaseClient
      .from("products")
      .select(
        "id,name,category,spec,unit,last_price,suggested_price,description,last_price_updated_at,image_url,is_active"
      )
      .eq("is_active", true),
  ]);

  categories = cats || [];
  allProducts = prods || [];

  /* categories */
  categorySelect.innerHTML = `<option value="">全部分類</option>`;
  categories.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.category;
    opt.textContent = c.category;
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

/* ========= Init ========= */
document.addEventListener("DOMContentLoaded", loadAll);
